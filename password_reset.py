import hashlib
import hmac
import os
import secrets
import smtplib
import threading
import time
from email.message import EmailMessage

from flask import Blueprint, jsonify, request


password_reset_bp = Blueprint("password_reset", __name__)

_OTP_TTL_SECONDS = 10 * 60
_MAX_VERIFY_ATTEMPTS = 5
_MIN_REQUEST_INTERVAL = 60
_otp_store = {}
_last_request = {}
_store_lock = threading.Lock()
_otp_secret = os.environ.get("OTP_SECRET") or secrets.token_hex(32)


def _password_policy_error(password, email=""):
    if len(password) < 12:
        return "Mật khẩu phải có ít nhất 12 ký tự."
    if len(password) > 128:
        return "Mật khẩu không được vượt quá 128 ký tự."
    if any(character.isspace() for character in password):
        return "Mật khẩu không được chứa khoảng trắng."
    if not any(character.islower() for character in password):
        return "Mật khẩu cần có ít nhất một chữ thường."
    if not any(character.isupper() for character in password):
        return "Mật khẩu cần có ít nhất một chữ hoa."
    if not any(character.isdigit() for character in password):
        return "Mật khẩu cần có ít nhất một chữ số."
    if not any(not character.isalnum() for character in password):
        return "Mật khẩu cần có ít nhất một ký tự đặc biệt."
    email_name = email.split("@", 1)[0].strip().lower()
    if len(email_name) >= 3 and email_name in password.lower():
        return "Mật khẩu không nên chứa tên tài khoản email."
    return ""


def get_firebase_auth():
    try:
        import firebase_admin
        from firebase_admin import auth, credentials
    except ImportError as exc:
        raise RuntimeError("Chưa cài firebase-admin.") from exc

    if not firebase_admin._apps:
        service_account = os.environ.get("FIREBASE_SERVICE_ACCOUNT", "").strip()
        if not service_account:
            raise RuntimeError("Chưa cấu hình FIREBASE_SERVICE_ACCOUNT.")
        firebase_admin.initialize_app(credentials.Certificate(service_account))

    return auth


def _hash_code(email, code):
    payload = f"{email}:{code}".encode("utf-8")
    return hmac.new(_otp_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()


def _send_code_email(recipient, code):
    host = os.environ.get("SMTP_HOST", "smtp.gmail.com").strip()
    port = int(os.environ.get("SMTP_PORT", "587"))
    username = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_APP_PASSWORD", "").strip()
    sender = os.environ.get("SMTP_FROM", username).strip()

    if not username or not password or not sender:
        raise RuntimeError("Chưa cấu hình tài khoản SMTP và App Password.")

    message = EmailMessage()
    message["Subject"] = "Mã xác nhận đặt lại mật khẩu QL Online"
    message["From"] = sender
    message["To"] = recipient
    message.set_content(
        "Mã xác nhận của bạn là: "
        f"{code}\n\nMã có hiệu lực trong 10 phút. "
        "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này."
    )

    with smtplib.SMTP(host, port, timeout=15) as smtp:
        smtp.ehlo()
        if os.environ.get("SMTP_USE_TLS", "1") != "0":
            smtp.starttls()
            smtp.ehlo()
        smtp.login(username, password)
        smtp.send_message(message)


@password_reset_bp.post("/api/password-reset/request")
def request_password_reset():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    if "@" not in email or len(email) > 254:
        return jsonify(error="Email không hợp lệ."), 400

    now = time.time()
    rate_key = f"{request.remote_addr}:{email}"
    with _store_lock:
        wait_seconds = _MIN_REQUEST_INTERVAL - (now - _last_request.get(rate_key, 0))
        if wait_seconds > 0:
            return jsonify(error=f"Vui lòng chờ {int(wait_seconds) + 1} giây rồi gửi lại."), 429
        _last_request[rate_key] = now

    try:
        firebase_auth = get_firebase_auth()
        try:
            user = firebase_auth.get_user_by_email(email)
        except firebase_auth.UserNotFoundError:
            return jsonify(accepted=True), 200

        code = f"{secrets.randbelow(1_000_000):06d}"
        _send_code_email(email, code)
        with _store_lock:
            _otp_store[email] = {
                "uid": user.uid,
                "code_hash": _hash_code(email, code),
                "expires_at": now + _OTP_TTL_SECONDS,
                "attempts": 0,
            }
        return jsonify(accepted=True), 200
    except RuntimeError as exc:
        return jsonify(error=str(exc)), 503
    except (OSError, smtplib.SMTPException):
        return jsonify(error="Không gửi được email. Hãy kiểm tra cấu hình SMTP."), 502
    except Exception:
        return jsonify(error="Dịch vụ đặt lại mật khẩu đang gặp lỗi."), 500


@password_reset_bp.post("/api/password-reset/confirm")
def confirm_password_reset():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    code = str(data.get("code", "")).strip()
    password = str(data.get("password", ""))

    if not code.isdigit() or len(code) != 6:
        return jsonify(error="Mã xác nhận phải gồm 6 chữ số."), 400
    password_error = _password_policy_error(password, email)
    if password_error:
        return jsonify(error=password_error), 400

    now = time.time()
    with _store_lock:
        record = _otp_store.get(email)
        if not record or record["expires_at"] < now:
            _otp_store.pop(email, None)
            return jsonify(error="Mã đã hết hạn hoặc không tồn tại."), 400
        if record["attempts"] >= _MAX_VERIFY_ATTEMPTS:
            _otp_store.pop(email, None)
            return jsonify(error="Bạn đã nhập sai quá nhiều lần. Hãy yêu cầu mã mới."), 429
        if not hmac.compare_digest(record["code_hash"], _hash_code(email, code)):
            record["attempts"] += 1
            return jsonify(error="Mã xác nhận không đúng."), 400
        uid = record["uid"]

    try:
        get_firebase_auth().update_user(uid, password=password)
    except RuntimeError as exc:
        return jsonify(error=str(exc)), 503
    except Exception:
        return jsonify(error="Không thể cập nhật mật khẩu."), 500

    with _store_lock:
        _otp_store.pop(email, None)
    return jsonify(success=True), 200
