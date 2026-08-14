import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from firebase_admin import firestore

from firebase_admin_config import get_firebase_auth
from notification_api import _admin_identity, _current_identity, _identity_cache
from password_reset_api import _password_policy_error
from password_security import (
    MAX_HISTORY_COUNT,
    MAX_PASSWORD_RESET_COOLDOWN_SECONDS,
    MAX_PASSWORD_RESET_MAX_REQUESTS,
    MIN_ENABLED_AGE_SECONDS,
    MIN_PASSWORD_RESET_COOLDOWN_SECONDS,
    MIN_PASSWORD_RESET_MAX_REQUESTS,
    build_password_history,
    normalize_password_policy,
    password_matches_history,
)


password_policy_api_bp = Blueprint("password_policy_api", __name__)
POLICY_DOCUMENT = "password_policy"
FIREBASE_WEB_API_KEY = "AIzaSyAnIgEAwo5DTfawaz5qcEwqlyqoDK1YdJw"


def _utc_now():
    return datetime.now(timezone.utc)


def _policy_reference(database):
    return database.collection("system_settings").document(POLICY_DOCUMENT)


def _load_policy(database):
    snapshot = _policy_reference(database).get()
    return normalize_password_policy(snapshot.to_dict() if snapshot.exists else {})


def _timestamp_millis(value):
    return int(value.timestamp() * 1000) if isinstance(value, datetime) else 0


def _verify_current_password(email, password, expected_uid):
    api_key = os.environ.get("FIREBASE_WEB_API_KEY", FIREBASE_WEB_API_KEY).strip()
    payload = json.dumps({
        "email": email,
        "password": password,
        "returnSecureToken": False,
    }).encode("utf-8")
    request_object = urllib.request.Request(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request_object, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code in {400, 401}:
            raise ValueError("Mật khẩu hiện tại không đúng.") from exc
        raise RuntimeError("Không thể xác minh mật khẩu hiện tại.") from exc
    except (urllib.error.URLError, OSError, ValueError) as exc:
        raise RuntimeError("Không thể kết nối dịch vụ xác thực mật khẩu.") from exc
    if str(data.get("localId") or "") != str(expected_uid or ""):
        raise ValueError("Mật khẩu hiện tại không đúng.")


@password_policy_api_bp.get("/api/admin/password-policy")
def get_admin_password_policy():
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được xem chính sách mật khẩu."), 403
    return jsonify(_load_policy(firestore.client())), 200


@password_policy_api_bp.put("/api/admin/password-policy")
def update_admin_password_policy():
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được cập nhật chính sách mật khẩu."), 403

    payload = request.get_json(silent=True) or {}
    try:
        password_age_enabled = bool(payload.get("passwordAgeEnabled"))
        max_age_seconds = int(payload.get("maxAgeSeconds") or 0)
        history_count = int(payload.get("historyCount") or 0)
        password_reset_protection_enabled = bool(
            payload.get("passwordResetProtectionEnabled")
        )
        password_reset_cooldown_seconds = int(
            payload.get("passwordResetCooldownSeconds") or 0
        )
        password_reset_max_requests = int(
            payload.get("passwordResetMaxRequests") or 0
        )
    except (TypeError, ValueError):
        return jsonify(error="Giá trị chính sách mật khẩu không hợp lệ."), 400
    if max_age_seconds < 0 or 0 < max_age_seconds < MIN_ENABLED_AGE_SECONDS:
        return jsonify(error=f"Tuổi mật khẩu phải bằng 0 hoặc ít nhất {MIN_ENABLED_AGE_SECONDS} giây."), 400
    if history_count < 0 or history_count > MAX_HISTORY_COUNT:
        return jsonify(error=f"Lịch sử mật khẩu phải nằm trong khoảng 0–{MAX_HISTORY_COUNT}."), 400

    if not (
        MIN_PASSWORD_RESET_COOLDOWN_SECONDS
        <= password_reset_cooldown_seconds
        <= MAX_PASSWORD_RESET_COOLDOWN_SECONDS
    ):
        return jsonify(error=(
            "Thời gian khóa email phải từ "
            f"{MIN_PASSWORD_RESET_COOLDOWN_SECONDS} đến "
            f"{MAX_PASSWORD_RESET_COOLDOWN_SECONDS} giây."
        )), 400
    if not (
        MIN_PASSWORD_RESET_MAX_REQUESTS
        <= password_reset_max_requests
        <= MAX_PASSWORD_RESET_MAX_REQUESTS
    ):
        return jsonify(error=(
            "Số lần gửi OTP liên tiếp phải từ "
            f"{MIN_PASSWORD_RESET_MAX_REQUESTS} đến "
            f"{MAX_PASSWORD_RESET_MAX_REQUESTS}."
        )), 400

    database = firestore.client()
    _policy_reference(database).set({
        "passwordAgeEnabled": password_age_enabled,
        "maxAgeSeconds": max_age_seconds,
        "historyCount": history_count,
        "passwordResetProtectionEnabled": password_reset_protection_enabled,
        "passwordResetCooldownSeconds": password_reset_cooldown_seconds,
        "passwordResetMaxRequests": password_reset_max_requests,
        "updatedAt": firestore.SERVER_TIMESTAMP,
        "updatedBy": admin["uid"],
    }, merge=True)
    return jsonify(
        success=True,
        passwordAgeEnabled=password_age_enabled,
        maxAgeSeconds=max_age_seconds,
        historyCount=history_count,
        passwordResetProtectionEnabled=password_reset_protection_enabled,
        passwordResetCooldownSeconds=password_reset_cooldown_seconds,
        passwordResetMaxRequests=password_reset_max_requests,
    ), 200


@password_policy_api_bp.get("/api/password-policy/status")
def password_policy_status():
    try:
        identity = _current_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not identity:
        return jsonify(error="Bạn chưa đăng nhập."), 401

    if identity["role"] == "admin":
        return jsonify(
            enabled=False,
            maxAgeSeconds=0,
            historyCount=0,
            passwordChangedAtMillis=0,
            expiresAtMillis=0,
            remainingSeconds=0,
            warning=False,
            expired=False,
            exempt=True,
            mustChangePassword=False,
            graceActive=False,
            ageExpired=False,
        ), 200

    database = firestore.client()
    policy = _load_policy(database)
    max_age_seconds = policy["maxAgeSeconds"] if policy["passwordAgeEnabled"] else 0
    profile_ref = database.collection("users").document(identity["uid"])
    profile_snapshot = profile_ref.get()
    profile = profile_snapshot.to_dict() or {} if profile_snapshot.exists else {}
    now = _utc_now()
    must_change_password = bool(profile.get("mustChangePassword"))
    grace_until = profile.get("passwordExpiryGraceUntil")
    changed_at = profile.get("passwordChangedAt")
    if not isinstance(changed_at, datetime):
        changed_at = now
        profile_ref.set({"passwordChangedAt": changed_at}, merge=True)

    expires_at = changed_at + timedelta(seconds=max_age_seconds) if max_age_seconds else None
    age_expired = bool(expires_at and now >= expires_at)
    grace_active = bool(
        isinstance(grace_until, datetime)
        and now < grace_until
        and not must_change_password
    )
    effective_expires_at = grace_until if age_expired and grace_active else expires_at
    remaining_seconds = (
        max(0, int((effective_expires_at - now).total_seconds()))
        if effective_expires_at else 0
    )
    expired = must_change_password or (age_expired and not grace_active)
    warning = bool(effective_expires_at and not expired and remaining_seconds <= 3600)

    if warning:
        warning_key = str(int(effective_expires_at.timestamp()))
        if str(profile.get("passwordExpiryWarningKey") or "") != warning_key:
            database.collection("notifications").document().set({
                "title": "Mật khẩu sắp hết hạn",
                "message": "Mật khẩu của bạn còn dưới 1 giờ hiệu lực. Hãy đổi mật khẩu để tránh bị gián đoạn đăng nhập.",
                "audiences": [],
                "recipientUids": [identity["uid"]],
                "recipientType": identity["role"],
                "createdAt": firestore.SERVER_TIMESTAMP,
                "createdBy": "password-policy",
                "actionType": "password_expiry",
                "actionId": warning_key,
            })
            profile_ref.set({"passwordExpiryWarningKey": warning_key}, merge=True)

    return jsonify(
        enabled=bool(max_age_seconds),
        maxAgeSeconds=max_age_seconds,
        historyCount=policy["historyCount"],
        passwordChangedAtMillis=_timestamp_millis(changed_at),
        expiresAtMillis=_timestamp_millis(effective_expires_at),
        remainingSeconds=remaining_seconds,
        warning=warning,
        expired=expired,
        mustChangePassword=must_change_password,
        graceActive=grace_active,
        ageExpired=age_expired,
    ), 200


@password_policy_api_bp.post("/api/admin/accounts/<uid>/temporary-password")
def set_temporary_password(uid):
    try:
        admin = _admin_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not admin:
        return jsonify(error="Chỉ quản trị viên được cấp mật khẩu tạm thời."), 403

    target_uid = str(uid or "").strip()
    payload = request.get_json(silent=True) or {}
    temporary_password = str(payload.get("temporaryPassword") or "")
    if not target_uid or not temporary_password:
        return jsonify(error="Vui lòng nhập mật khẩu tạm thời."), 400

    database = firestore.client()
    profile_ref = database.collection("users").document(target_uid)
    profile_snapshot = profile_ref.get()
    if not profile_snapshot.exists:
        return jsonify(error="Không tìm thấy tài khoản cần cấp mật khẩu tạm thời."), 404

    profile = profile_snapshot.to_dict() or {}
    role = str(profile.get("role") or "").strip().lower()
    if role == "admin":
        return jsonify(error="Không thể áp dụng mật khẩu tạm thời cho tài khoản quản trị."), 403
    if role not in {"sinhvien", "giaovien"}:
        return jsonify(error="Loại tài khoản không hỗ trợ mật khẩu tạm thời."), 400

    email = str(profile.get("email") or "").strip().lower()
    policy_error = _password_policy_error(temporary_password, email)
    if policy_error:
        return jsonify(error=policy_error), 400

    policy = _load_policy(database)
    history = list(profile.get("passwordHistory") or [])
    history_count = policy["historyCount"] if policy["passwordAgeEnabled"] else 0
    if password_matches_history(temporary_password, history[:history_count]):
        return jsonify(
            error=f"Mật khẩu tạm trùng với một trong {history_count} mật khẩu gần nhất."
        ), 409

    try:
        auth_api = get_firebase_auth()
        auth_api.update_user(target_uid, password=temporary_password)
        auth_api.revoke_refresh_tokens(target_uid)
    except Exception:
        return jsonify(error="Không thể cấp mật khẩu tạm thời lúc này."), 500

    profile_ref.set({
        "mustChangePassword": True,
        "temporaryPasswordIssuedAt": _utc_now(),
        "temporaryPasswordIssuedBy": admin["uid"],
        "passwordChangedAt": _utc_now(),
        "passwordHistory": build_password_history(
            temporary_password,
            history,
            history_count,
        ),
        "passwordExpiryWarningKey": firestore.DELETE_FIELD,
        "passwordExpiryGraceUntil": firestore.DELETE_FIELD,
        "passwordExpiryGraceApprovedAt": firestore.DELETE_FIELD,
        "passwordExpiryGraceApprovedBy": firestore.DELETE_FIELD,
    }, merge=True)
    _identity_cache.pop(target_uid, None)
    return jsonify(success=True, mustChangePassword=True), 200


@password_policy_api_bp.post("/api/password-policy/change")
def change_password_with_policy():
    try:
        identity = _current_identity()
    except Exception:
        return jsonify(error="Phiên đăng nhập không hợp lệ."), 401
    if not identity:
        return jsonify(error="Bạn chưa đăng nhập."), 401

    payload = request.get_json(silent=True) or {}
    current_password = str(payload.get("currentPassword") or "")
    new_password = str(payload.get("newPassword") or "")
    if not current_password or not new_password:
        return jsonify(error="Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới."), 400
    if current_password == new_password:
        return jsonify(error="Mật khẩu mới phải khác mật khẩu hiện tại."), 400
    policy_error = _password_policy_error(new_password, identity["email"])
    if policy_error:
        return jsonify(error=policy_error), 400

    database = firestore.client()
    profile_ref = database.collection("users").document(identity["uid"])
    profile_snapshot = profile_ref.get()
    profile = profile_snapshot.to_dict() or {} if profile_snapshot.exists else {}
    policy = _load_policy(database)
    if identity["role"] == "admin":
        policy = {**policy, "passwordAgeEnabled": False, "maxAgeSeconds": 0, "historyCount": 0}
    history_count = policy["historyCount"] if policy["passwordAgeEnabled"] else 0
    history = list(profile.get("passwordHistory") or [])
    enforced_history = history[:history_count]
    if password_matches_history(new_password, enforced_history):
        return jsonify(error=f"Mật khẩu mới trùng với một trong {history_count} mật khẩu gần nhất."), 409

    try:
        _verify_current_password(identity["email"], current_password, identity["uid"])
        auth_api = get_firebase_auth()
        auth_api.update_user(identity["uid"], password=new_password)
        auth_api.revoke_refresh_tokens(identity["uid"])
    except ValueError as exc:
        return jsonify(error=str(exc)), 400
    except RuntimeError as exc:
        return jsonify(error=str(exc)), 503
    except Exception:
        return jsonify(error="Không thể cập nhật mật khẩu lúc này."), 500

    profile_ref.set({
        "passwordChangedAt": _utc_now(),
        "passwordHistory": build_password_history(
            new_password,
            history,
            history_count,
            current_password=current_password,
        ),
        "passwordExpiryWarningKey": firestore.DELETE_FIELD,
        "mustChangePassword": False,
        "temporaryPasswordIssuedAt": firestore.DELETE_FIELD,
        "temporaryPasswordIssuedBy": firestore.DELETE_FIELD,
        "passwordExpiryGraceUntil": firestore.DELETE_FIELD,
        "passwordExpiryGraceApprovedAt": firestore.DELETE_FIELD,
        "passwordExpiryGraceApprovedBy": firestore.DELETE_FIELD,
    }, merge=True)
    _identity_cache.pop(identity["uid"], None)
    return jsonify(success=True), 200
