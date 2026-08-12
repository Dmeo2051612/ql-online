import os


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
