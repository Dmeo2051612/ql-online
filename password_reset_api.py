import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
import ssl
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from flask import Blueprint, jsonify, request
from firebase_admin import firestore

from firebase_admin_config import get_firebase_auth
from password_security import (
    build_password_history,
    normalize_password_policy,
    password_matches_history,
)


password_reset_api_bp = Blueprint("password_reset_api", __name__)

OTP_TTL_MINUTES = 10
RESET_TOKEN_TTL_MINUTES = 10
MAX_OTP_ATTEMPTS = 5


def _utc_now():
    return datetime.now(timezone.utc)


def _normalize_email(value):
    return str(value or "").strip().lower()


def _valid_email(value):
    return bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value)) and len(value) <= 254


def _parse_bool(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _otp_secret():
    value = os.environ.get("OTP_SECRET", "").strip()
    if len(value) < 16:
        raise RuntimeError("Máy chủ chưa cấu hình OTP_SECRET an toàn.")
    return value.encode("utf-8")


def _otp_digest(request_id, otp):
    return hmac.new(
        _otp_secret(),
        f"otp:{request_id}:{otp}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _token_digest(request_id, token):
    return hmac.new(
        _otp_secret(),
        f"token:{request_id}:{token}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _email_key(email):
    return hmac.new(_otp_secret(), email.encode("utf-8"), hashlib.sha256).hexdigest()


def _password_policy_error(password, email=""):
    value = str(password or "")
    if len(value) < 12:
        return "Mật khẩu phải có ít nhất 12 ký tự."
    if len(value) > 128:
        return "Mật khẩu không được vượt quá 128 ký tự."
    if re.search(r"\s", value):
        return "Mật khẩu không được chứa khoảng trắng."
    if not re.search(r"[a-z]", value):
        return "Mật khẩu cần có ít nhất một chữ thường."
    if not re.search(r"[A-Z]", value):
        return "Mật khẩu cần có ít nhất một chữ hoa."
    if not re.search(r"[0-9]", value):
        return "Mật khẩu cần có ít nhất một chữ số."
    if not re.search(r"[^A-Za-z0-9]", value):
        return "Mật khẩu cần có ít nhất một ký tự đặc biệt."
    email_name = _normalize_email(email).split("@", 1)[0]
    if len(email_name) >= 3 and email_name in value.lower():
        return "Mật khẩu không nên chứa tên tài khoản email."
    return ""


def _smtp_settings():
    settings = {
        "host": os.environ.get("SMTP_HOST", "smtp.gmail.com").strip(),
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "use_tls": _parse_bool(os.environ.get("SMTP_USE_TLS", "1")),
        "user": os.environ.get("SMTP_USER", "").strip(),
        "password": os.environ.get("SMTP_APP_PASSWORD", "").strip(),
        "sender": os.environ.get("SMTP_FROM", "").strip(),
    }
    if not settings["user"] or not settings["password"]:
        raise RuntimeError("Máy chủ chưa cấu hình tài khoản SMTP gửi email.")
    if not settings["sender"]:
        settings["sender"] = settings["user"]
    return settings


def _otp_email_content(otp):
    text_content = (
        "Mã OTP đặt lại mật khẩu QL Online của bạn là: "
        f"{otp}\n\nMã có hiệu lực trong {OTP_TTL_MINUTES} phút. "
        "Không cung cấp mã này cho bất kỳ ai.\n\n"
        "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này."
    )
    html_content = f"""
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
          <h2 style="color:#1d4ed8">QL Online</h2>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
          <p style="font-size:14px;color:#64748b">Mã OTP của bạn là:</p>
          <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#1d4ed8;
                      background:#eff6ff;padding:18px 22px;border-radius:12px;text-align:center">{otp}</div>
          <p>Mã có hiệu lực trong <strong>{OTP_TTL_MINUTES} phút</strong>. Không cung cấp mã này cho bất kỳ ai.</p>
          <p style="font-size:13px;color:#64748b">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
        </div>
        """
    return text_content, html_content


def _send_otp_with_brevo(email, otp, api_key):
    sender_email = os.environ.get("BREVO_SENDER_EMAIL", "").strip()
    sender_name = os.environ.get("BREVO_SENDER_NAME", "QL Online").strip() or "QL Online"
    if not _valid_email(sender_email):
        raise RuntimeError("Máy chủ chưa cấu hình BREVO_SENDER_EMAIL hợp lệ.")

    text_content, html_content = _otp_email_content(otp)
    payload = json.dumps({
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": email}],
        "subject": "Mã OTP đặt lại mật khẩu QL Online",
        "textContent": text_content,
        "htmlContent": html_content,
        "tags": ["password-reset-otp"],
    }).encode("utf-8")
    request_object = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json",
            "user-agent": "QL-Online/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request_object, timeout=20) as response:
            if response.status not in {200, 201, 202}:
                raise RuntimeError("Dịch vụ email Brevo từ chối yêu cầu gửi OTP.")
    except urllib.error.HTTPError as exc:
        try:
            error_payload = json.loads(exc.read().decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            error_payload = {}
        brevo_code = str(error_payload.get("code") or "").strip().lower()
        brevo_message = str(error_payload.get("message") or "").strip().lower()
        if exc.code == 401 or brevo_code in {"unauthorized", "invalid_parameter"} and "api" in brevo_message:
            message = "Brevo API key không hợp lệ. Hãy tạo key API v3 mới và cập nhật BREVO_API_KEY trên Render."
        elif exc.code == 400 and any(word in brevo_message for word in ("sender", "from", "email")):
            message = "Brevo chưa chấp nhận địa chỉ gửi. BREVO_SENDER_EMAIL phải đúng sender QL Online đã Verified."
        elif exc.code == 402:
            message = "Tài khoản Brevo đã hết lượt gửi email trong ngày."
        elif exc.code == 403:
            message = "Tài khoản Brevo chưa được cấp quyền gửi email giao dịch. Hãy hoàn tất kích hoạt tài khoản Brevo."
        elif exc.code == 429:
            message = "Brevo đang giới hạn quá nhiều yêu cầu. Vui lòng thử lại sau."
        else:
            message = f"Brevo từ chối gửi OTP (HTTP {exc.code}). Hãy kiểm tra API key và sender đã xác minh."
        raise RuntimeError(message) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError("Không thể kết nối dịch vụ email Brevo.") from exc


def _send_otp_with_smtp(email, otp):
    settings = _smtp_settings()
    text_content, html_content = _otp_email_content(otp)
    message = EmailMessage()
    message["Subject"] = "Mã OTP đặt lại mật khẩu QL Online"
    message["From"] = settings["sender"]
    message["To"] = email
    message.set_content(text_content)
    message.add_alternative(html_content, subtype="html")

    with smtplib.SMTP(settings["host"], settings["port"], timeout=20) as smtp:
        smtp.ehlo()
        if settings["use_tls"]:
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
        smtp.login(settings["user"], settings["password"])
        smtp.send_message(message)


def _send_otp_email(email, otp):
    brevo_api_key = os.environ.get("BREVO_API_KEY", "").strip()
    if brevo_api_key:
        _send_otp_with_brevo(email, otp, brevo_api_key)
        return "brevo"
    _send_otp_with_smtp(email, otp)
    return "smtp"


def _json_error(message, status, **extra):
    response = jsonify(error=message, **extra)
    response.headers["Cache-Control"] = "no-store"
    return response, status


def _json_success(payload, status=200):
    response = jsonify(**payload)
    response.headers["Cache-Control"] = "no-store"
    return response, status


def _load_password_reset_policy(database):
    snapshot = database.collection("system_settings").document("password_policy").get()
    return normalize_password_policy(snapshot.to_dict() if snapshot.exists else {})


def _check_rate_limit(database, email, now, policy):
    reference = database.collection("password_reset_rate_limits").document(_email_key(email))
    snapshot = reference.get()
    current = snapshot.to_dict() or {} if snapshot.exists else {}
    if not policy["passwordResetProtectionEnabled"]:
        return reference, 0, 0, now

    cooldown_seconds = policy["passwordResetCooldownSeconds"]
    locked_until = current.get("lockedUntil")
    if isinstance(locked_until, datetime) and now < locked_until:
        return (
            reference,
            max(1, int((locked_until - now).total_seconds())),
            int(current.get("requestCount") or 0),
            current.get("seriesStartedAt") or now,
        )

    last_requested = current.get("lastRequestedAt")
    request_count = int(current.get("requestCount") or 0)
    series_started = current.get("seriesStartedAt")
    if (
        not isinstance(last_requested, datetime)
        or (now - last_requested).total_seconds() >= cooldown_seconds
    ):
        return reference, 0, 0, now
    return reference, 0, request_count, series_started if isinstance(series_started, datetime) else now


def _record_password_reset_request(reference, now, request_count, series_started, policy):
    if not policy["passwordResetProtectionEnabled"]:
        return {"locked": False, "attemptsRemaining": None, "retryAfterSeconds": 0}
    next_count = request_count + 1
    max_requests = policy["passwordResetMaxRequests"]
    locked = next_count >= max_requests
    cooldown_seconds = policy["passwordResetCooldownSeconds"]
    data = {
        "lastRequestedAt": now,
        "seriesStartedAt": series_started,
        "requestCount": next_count,
        "lockReason": "request_limit" if locked else "",
    }
    if locked:
        data["lockedUntil"] = now + timedelta(seconds=cooldown_seconds)
    reference.set(data)
    return {
        "locked": locked,
        "attemptsRemaining": max(0, max_requests - next_count),
        "retryAfterSeconds": cooldown_seconds if locked else 0,
    }


def _lock_password_reset_after_completion(database, email, now, policy):
    if not policy["passwordResetProtectionEnabled"]:
        return
    database.collection("password_reset_rate_limits").document(_email_key(email)).set({
        "lastRequestedAt": now,
        "seriesStartedAt": now,
        "requestCount": 0,
        "lockedUntil": now + timedelta(seconds=policy["passwordResetCooldownSeconds"]),
        "lockReason": "password_reset_completed",
    })


@password_reset_api_bp.post("/api/password-reset/request")
def request_password_reset():
    payload = request.get_json(silent=True) or {}
    email = _normalize_email(payload.get("email"))
    if not _valid_email(email):
        return _json_error("Vui lòng nhập một địa chỉ email hợp lệ.", 400)

    try:
        auth_client = get_firebase_auth()
        database = firestore.client()
        now = _utc_now()
        reset_policy = _load_password_reset_policy(database)
        rate_reference, retry_after, request_count, series_started = _check_rate_limit(
            database, email, now, reset_policy
        )
        if retry_after:
            response, status = _json_error(
                f"Email đang tạm khóa gửi OTP. Vui lòng thử lại sau {retry_after} giây.",
                429,
                retryAfterSeconds=retry_after,
            )
            response.headers["Retry-After"] = str(retry_after)
            return response, status

        try:
            user = auth_client.get_user_by_email(email)
        except auth_client.UserNotFoundError:
            request_state = _record_password_reset_request(
                rate_reference, now, request_count, series_started, reset_policy
            )
            return _json_success({
                "success": True,
                "requestId": secrets.token_urlsafe(24),
                "expiresInSeconds": OTP_TTL_MINUTES * 60,
                "resendAfterSeconds": request_state["retryAfterSeconds"],
                "attemptsRemaining": request_state["attemptsRemaining"],
                "requestLimit": reset_policy["passwordResetMaxRequests"],
                "emailLocked": request_state["locked"],
            })

        request_id = secrets.token_urlsafe(24)
        otp = f"{secrets.randbelow(1_000_000):06d}"
        for previous in database.collection("password_reset_otps").where("email", "==", email).stream():
            previous.reference.delete()
        reference = database.collection("password_reset_otps").document(request_id)
        reference.set({
            "uid": user.uid,
            "email": email,
            "otpHash": _otp_digest(request_id, otp),
            "attempts": 0,
            "createdAt": now,
            "expiresAt": now + timedelta(minutes=OTP_TTL_MINUTES),
            "status": "pending",
        })
        try:
            _send_otp_email(email, otp)
        except Exception:
            reference.delete()
            raise

        request_state = _record_password_reset_request(
            rate_reference, now, request_count, series_started, reset_policy
        )
        return _json_success({
            "success": True,
            "requestId": request_id,
            "expiresInSeconds": OTP_TTL_MINUTES * 60,
            "resendAfterSeconds": request_state["retryAfterSeconds"],
            "attemptsRemaining": request_state["attemptsRemaining"],
            "requestLimit": reset_policy["passwordResetMaxRequests"],
            "emailLocked": request_state["locked"],
        })
    except RuntimeError as exc:
        return _json_error(str(exc), 503)
    except (smtplib.SMTPException, OSError, ValueError):
        return _json_error("Không thể gửi email OTP. Vui lòng thử lại sau hoặc liên hệ quản trị viên.", 503)
    except Exception:
        return _json_error("Không thể tạo mã OTP lúc này. Vui lòng thử lại sau.", 500)


@password_reset_api_bp.post("/api/password-reset/verify")
def verify_password_reset_otp():
    payload = request.get_json(silent=True) or {}
    request_id = str(payload.get("requestId") or "").strip()
    otp = re.sub(r"\D", "", str(payload.get("otp") or ""))
    if not request_id or not re.fullmatch(r"\d{6}", otp):
        return _json_error("Vui lòng nhập đúng mã OTP gồm 6 chữ số.", 400)

    try:
        get_firebase_auth()
        database = firestore.client()
        reference = database.collection("password_reset_otps").document(request_id)
        snapshot = reference.get()
        if not snapshot.exists:
            return _json_error("Mã OTP không hợp lệ hoặc đã hết hạn.", 400)
        data = snapshot.to_dict() or {}
        now = _utc_now()
        expires_at = data.get("expiresAt")
        attempts = int(data.get("attempts") or 0)
        if data.get("status") != "pending" or not isinstance(expires_at, datetime) or now >= expires_at:
            reference.delete()
            return _json_error("Mã OTP không hợp lệ hoặc đã hết hạn.", 400)
        if attempts >= MAX_OTP_ATTEMPTS:
            reference.delete()
            return _json_error("Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu mã mới.", 429)
        if not secrets.compare_digest(str(data.get("otpHash") or ""), _otp_digest(request_id, otp)):
            attempts += 1
            reference.update({"attempts": attempts})
            remaining = max(0, MAX_OTP_ATTEMPTS - attempts)
            return _json_error(f"Mã OTP không đúng. Bạn còn {remaining} lần thử.", 400)

        reset_token = secrets.token_urlsafe(32)
        reference.update({
            "status": "verified",
            "otpHash": firestore.DELETE_FIELD,
            "resetTokenHash": _token_digest(request_id, reset_token),
            "verifiedAt": now,
            "verifiedUntil": now + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
        })
        return _json_success({
            "success": True,
            "resetToken": reset_token,
            "expiresInSeconds": RESET_TOKEN_TTL_MINUTES * 60,
        })
    except RuntimeError as exc:
        return _json_error(str(exc), 503)
    except Exception:
        return _json_error("Không thể xác minh mã OTP lúc này. Vui lòng thử lại.", 500)


@password_reset_api_bp.post("/api/password-reset/complete")
def complete_password_reset():
    payload = request.get_json(silent=True) or {}
    request_id = str(payload.get("requestId") or "").strip()
    reset_token = str(payload.get("resetToken") or "").strip()
    password = str(payload.get("password") or "")
    if not request_id or not reset_token:
        return _json_error("Phiên đặt lại mật khẩu không hợp lệ.", 400)

    try:
        auth_client = get_firebase_auth()
        database = firestore.client()
        reference = database.collection("password_reset_otps").document(request_id)
        snapshot = reference.get()
        if not snapshot.exists:
            return _json_error("Phiên đặt lại mật khẩu đã hết hạn.", 400)
        data = snapshot.to_dict() or {}
        now = _utc_now()
        verified_until = data.get("verifiedUntil")
        expected_token = str(data.get("resetTokenHash") or "")
        supplied_token = _token_digest(request_id, reset_token)
        if (
            data.get("status") != "verified"
            or not isinstance(verified_until, datetime)
            or now >= verified_until
            or not secrets.compare_digest(expected_token, supplied_token)
        ):
            reference.delete()
            return _json_error("Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.", 400)

        policy_error = _password_policy_error(password, data.get("email"))
        if policy_error:
            return _json_error(policy_error, 400)

        uid = str(data.get("uid") or "")
        profile_reference = database.collection("users").document(uid)
        profile_snapshot = profile_reference.get()
        profile = profile_snapshot.to_dict() or {} if profile_snapshot.exists else {}
        policy_snapshot = database.collection("system_settings").document("password_policy").get()
        policy = normalize_password_policy(policy_snapshot.to_dict() if policy_snapshot.exists else {})
        if str(profile.get("role") or "").strip().lower() == "admin":
            policy = {**policy, "passwordAgeEnabled": False, "maxAgeSeconds": 0, "historyCount": 0}
        history_count = policy["historyCount"] if policy["passwordAgeEnabled"] else 0
        history = list(profile.get("passwordHistory") or [])
        enforced_history = history[:history_count]
        if password_matches_history(password, enforced_history):
            return _json_error(
                f"Mật khẩu mới trùng với một trong {history_count} mật khẩu gần nhất.",
                409,
            )

        auth_client.update_user(uid, password=password)
        auth_client.revoke_refresh_tokens(uid)
        if profile_snapshot.exists:
            profile_reference.set({
                "passwordChangedAt": now,
                "passwordHistory": build_password_history(
                    password, history, history_count
                ),
                "passwordExpiryWarningKey": firestore.DELETE_FIELD,
                "mustChangePassword": False,
                "temporaryPasswordIssuedAt": firestore.DELETE_FIELD,
                "temporaryPasswordIssuedBy": firestore.DELETE_FIELD,
                "passwordExpiryGraceUntil": firestore.DELETE_FIELD,
                "passwordExpiryGraceApprovedAt": firestore.DELETE_FIELD,
                "passwordExpiryGraceApprovedBy": firestore.DELETE_FIELD,
            }, merge=True)
        _lock_password_reset_after_completion(
            database,
            str(data.get("email") or ""),
            now,
            policy,
        )
        reference.delete()
        return _json_success({"success": True})
    except RuntimeError as exc:
        return _json_error(str(exc), 503)
    except Exception:
        return _json_error("Không thể cập nhật mật khẩu lúc này. Vui lòng thử lại.", 500)
