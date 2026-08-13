import hashlib
import hmac
import os
import re
import secrets
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from flask import Blueprint, jsonify, request
from firebase_admin import firestore

from firebase_admin_config import get_firebase_auth


password_reset_api_bp = Blueprint("password_reset_api", __name__)

OTP_TTL_MINUTES = 10
RESET_TOKEN_TTL_MINUTES = 10
MAX_OTP_ATTEMPTS = 5
MIN_RESEND_SECONDS = 60
MAX_REQUESTS_PER_HOUR = 5


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


def _send_otp_email(email, otp):
    settings = _smtp_settings()
    message = EmailMessage()
    message["Subject"] = "Mã OTP đặt lại mật khẩu QL Online"
    message["From"] = settings["sender"]
    message["To"] = email
    message.set_content(
        "Mã OTP đặt lại mật khẩu QL Online của bạn là: "
        f"{otp}\n\nMã có hiệu lực trong {OTP_TTL_MINUTES} phút. "
        "Không cung cấp mã này cho bất kỳ ai.\n\n"
        "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này."
    )
    message.add_alternative(
        f"""
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
          <h2 style="color:#1d4ed8">QL Online</h2>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
          <p style="font-size:14px;color:#64748b">Mã OTP của bạn là:</p>
          <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#1d4ed8;
                      background:#eff6ff;padding:18px 22px;border-radius:12px;text-align:center">{otp}</div>
          <p>Mã có hiệu lực trong <strong>{OTP_TTL_MINUTES} phút</strong>. Không cung cấp mã này cho bất kỳ ai.</p>
          <p style="font-size:13px;color:#64748b">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
        </div>
        """,
        subtype="html",
    )

    with smtplib.SMTP(settings["host"], settings["port"], timeout=20) as smtp:
        smtp.ehlo()
        if settings["use_tls"]:
            smtp.starttls(context=ssl.create_default_context())
            smtp.ehlo()
        smtp.login(settings["user"], settings["password"])
        smtp.send_message(message)


def _json_error(message, status):
    response = jsonify(error=message)
    response.headers["Cache-Control"] = "no-store"
    return response, status


def _json_success(payload, status=200):
    response = jsonify(**payload)
    response.headers["Cache-Control"] = "no-store"
    return response, status


def _check_rate_limit(database, email, now):
    reference = database.collection("password_reset_rate_limits").document(_email_key(email))
    snapshot = reference.get()
    current = snapshot.to_dict() or {} if snapshot.exists else {}
    last_requested = current.get("lastRequestedAt")
    window_started = current.get("windowStartedAt")
    request_count = int(current.get("requestCount") or 0)

    if isinstance(last_requested, datetime) and (now - last_requested).total_seconds() < MIN_RESEND_SECONDS:
        wait_seconds = MIN_RESEND_SECONDS - int((now - last_requested).total_seconds())
        return reference, max(1, wait_seconds), request_count, window_started

    if not isinstance(window_started, datetime) or now - window_started >= timedelta(hours=1):
        return reference, 0, 0, now
    if request_count >= MAX_REQUESTS_PER_HOUR:
        wait_seconds = int((window_started + timedelta(hours=1) - now).total_seconds())
        return reference, max(1, wait_seconds), request_count, window_started
    return reference, 0, request_count, window_started


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
        rate_reference, retry_after, request_count, window_started = _check_rate_limit(database, email, now)
        if retry_after:
            response, status = _json_error(
                f"Bạn vừa yêu cầu mã. Vui lòng thử lại sau {retry_after} giây.", 429
            )
            response.headers["Retry-After"] = str(retry_after)
            return response, status

        try:
            user = auth_client.get_user_by_email(email)
        except auth_client.UserNotFoundError:
            return _json_success({
                "success": True,
                "requestId": secrets.token_urlsafe(24),
                "expiresInSeconds": OTP_TTL_MINUTES * 60,
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

        rate_reference.set({
            "lastRequestedAt": now,
            "windowStartedAt": window_started,
            "requestCount": request_count + 1,
        })
        return _json_success({
            "success": True,
            "requestId": request_id,
            "expiresInSeconds": OTP_TTL_MINUTES * 60,
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

        auth_client.update_user(str(data.get("uid") or ""), password=password)
        auth_client.revoke_refresh_tokens(str(data.get("uid") or ""))
        reference.delete()
        return _json_success({"success": True})
    except RuntimeError as exc:
        return _json_error(str(exc), 503)
    except Exception:
        return _json_error("Không thể cập nhật mật khẩu lúc này. Vui lòng thử lại.", 500)
