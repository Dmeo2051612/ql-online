import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app import app
from password_security import build_password_history, password_matches_history


class FakeSnapshot:
    def __init__(self, document_id, data=None):
        self.id = document_id
        self._data = data

    @property
    def exists(self):
        return self._data is not None

    def to_dict(self):
        return dict(self._data or {})


class FakeDocument:
    def __init__(self, database, collection_name, document_id):
        self.database = database
        self.collection_name = collection_name
        self.id = document_id

    def get(self):
        return FakeSnapshot(
            self.id,
            self.database.data.get(self.collection_name, {}).get(self.id),
        )

    def set(self, data, merge=False):
        collection = self.database.data.setdefault(self.collection_name, {})
        if merge:
            collection.setdefault(self.id, {}).update(dict(data))
        else:
            collection[self.id] = dict(data)


class FakeCollection:
    def __init__(self, database, name):
        self.database = database
        self.name = name

    def document(self, document_id=None):
        if document_id is None:
            document_id = f"auto-{len(self.database.data.get(self.name, {})) + 1}"
        return FakeDocument(self.database, self.name, document_id)


class FakeDatabase:
    def __init__(self, data):
        self.data = data

    def collection(self, name):
        return FakeCollection(self, name)


class PasswordPolicyTest(unittest.TestCase):
    def test_admin_is_exempt_from_password_age_policy(self):
        with patch("password_policy_api._current_identity", return_value={
            "uid": "admin-uid", "email": "admin@example.com", "role": "admin"
        }):
            response = app.test_client().get("/api/password-policy/status")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["exempt"])
        self.assertFalse(response.get_json()["enabled"])
        self.assertFalse(response.get_json()["expired"])

    def test_password_history_detects_recent_password(self):
        history = build_password_history(
            "NewPassword@123",
            [],
            5,
            current_password="OldPassword@123",
        )
        self.assertTrue(password_matches_history("NewPassword@123", history))
        self.assertTrue(password_matches_history("OldPassword@123", history))
        self.assertFalse(password_matches_history("AnotherPassword@123", history))

    def test_password_history_respects_configured_limit(self):
        history = build_password_history(
            "NewPassword@123",
            [],
            1,
            current_password="OldPassword@123",
        )
        self.assertEqual(len(history), 1)
        self.assertTrue(password_matches_history("NewPassword@123", history))

    def test_password_history_does_not_duplicate_seeded_current_password(self):
        seeded = build_password_history("OldPassword@123", [], 5)
        history = build_password_history(
            "NewPassword@123",
            seeded,
            5,
            current_password="OldPassword@123",
        )
        self.assertEqual(len(history), 2)
        self.assertTrue(password_matches_history("NewPassword@123", history))
        self.assertTrue(password_matches_history("OldPassword@123", history))

    def test_expired_password_is_reported(self):
        now = datetime(2026, 8, 13, 12, 0, tzinfo=timezone.utc)
        database = FakeDatabase({
            "system_settings": {"password_policy": {"maxAgeSeconds": 30, "historyCount": 5}},
            "users": {"student-uid": {"passwordChangedAt": now - timedelta(seconds=31)}},
            "notifications": {},
        })
        with (
            patch("password_policy_api._current_identity", return_value={
                "uid": "student-uid", "email": "student@example.com", "role": "sinhvien"
            }),
            patch("password_policy_api.firestore.client", return_value=database),
            patch("password_policy_api._utc_now", return_value=now),
        ):
            response = app.test_client().get("/api/password-policy/status")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["expired"])
        self.assertEqual(response.get_json()["remainingSeconds"], 0)

    def test_temporary_password_flag_forces_password_change(self):
        now = datetime(2026, 8, 13, 12, 0, tzinfo=timezone.utc)
        database = FakeDatabase({
            "system_settings": {"password_policy": {"maxAgeSeconds": 86400, "historyCount": 5}},
            "users": {"student-uid": {
                "passwordChangedAt": now,
                "mustChangePassword": True,
            }},
            "notifications": {},
        })
        with (
            patch("password_policy_api._current_identity", return_value={
                "uid": "student-uid", "email": "student@example.com", "role": "sinhvien"
            }),
            patch("password_policy_api.firestore.client", return_value=database),
            patch("password_policy_api._utc_now", return_value=now),
        ):
            response = app.test_client().get("/api/password-policy/status")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["expired"])
        self.assertTrue(response.get_json()["mustChangePassword"])

    def test_approved_grace_temporarily_allows_expired_password(self):
        now = datetime(2026, 8, 13, 12, 0, tzinfo=timezone.utc)
        database = FakeDatabase({
            "system_settings": {"password_policy": {"maxAgeSeconds": 30, "historyCount": 5}},
            "users": {"student-uid": {
                "passwordChangedAt": now - timedelta(seconds=31),
                "passwordExpiryGraceUntil": now + timedelta(minutes=10),
            }},
            "notifications": {},
        })
        with (
            patch("password_policy_api._current_identity", return_value={
                "uid": "student-uid", "email": "student@example.com", "role": "sinhvien"
            }),
            patch("password_policy_api.firestore.client", return_value=database),
            patch("password_policy_api._utc_now", return_value=now),
        ):
            response = app.test_client().get("/api/password-policy/status")

        data = response.get_json()
        self.assertFalse(data["expired"])
        self.assertTrue(data["ageExpired"])
        self.assertTrue(data["graceActive"])
        self.assertEqual(data["remainingSeconds"], 600)

    def test_temporary_password_cannot_use_approved_grace(self):
        now = datetime(2026, 8, 13, 12, 0, tzinfo=timezone.utc)
        database = FakeDatabase({
            "system_settings": {"password_policy": {"maxAgeSeconds": 30, "historyCount": 5}},
            "users": {"student-uid": {
                "passwordChangedAt": now,
                "mustChangePassword": True,
                "passwordExpiryGraceUntil": now + timedelta(minutes=30),
            }},
            "notifications": {},
        })
        with (
            patch("password_policy_api._current_identity", return_value={
                "uid": "student-uid", "email": "student@example.com", "role": "sinhvien"
            }),
            patch("password_policy_api.firestore.client", return_value=database),
            patch("password_policy_api._utc_now", return_value=now),
        ):
            response = app.test_client().get("/api/password-policy/status")

        data = response.get_json()
        self.assertTrue(data["expired"])
        self.assertFalse(data["graceActive"])

    def test_admin_can_issue_temporary_password_to_student(self):
        class FakeAuth:
            def __init__(self):
                self.updated = []
                self.revoked = []

            def update_user(self, uid, password):
                self.updated.append((uid, password))

            def revoke_refresh_tokens(self, uid):
                self.revoked.append(uid)

        now = datetime(2026, 8, 13, 12, 0, tzinfo=timezone.utc)
        database = FakeDatabase({
            "system_settings": {"password_policy": {"maxAgeSeconds": 86400, "historyCount": 5}},
            "users": {"student-uid": {
                "email": "student@example.com",
                "role": "sinhvien",
                "passwordHistory": [],
            }},
        })
        auth = FakeAuth()
        with (
            patch("password_policy_api._admin_identity", return_value={"uid": "admin-uid"}),
            patch("password_policy_api.firestore.client", return_value=database),
            patch("password_policy_api.get_firebase_auth", return_value=auth),
            patch("password_policy_api._utc_now", return_value=now),
        ):
            response = app.test_client().post(
                "/api/admin/accounts/student-uid/temporary-password",
                json={"temporaryPassword": "StrongTemp@2026"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(database.data["users"]["student-uid"]["mustChangePassword"])
        self.assertEqual(auth.updated, [("student-uid", "StrongTemp@2026")])
        self.assertEqual(auth.revoked, ["student-uid"])

    def test_warning_creates_bell_notification_once(self):
        now = datetime(2026, 8, 13, 12, 0, tzinfo=timezone.utc)
        database = FakeDatabase({
            "system_settings": {"password_policy": {"maxAgeSeconds": 3600, "historyCount": 5}},
            "users": {"student-uid": {"passwordChangedAt": now - timedelta(seconds=1)}},
            "notifications": {},
        })
        identity = {"uid": "student-uid", "email": "student@example.com", "role": "sinhvien"}
        with (
            patch("password_policy_api._current_identity", return_value=identity),
            patch("password_policy_api.firestore.client", return_value=database),
            patch("password_policy_api._utc_now", return_value=now),
        ):
            first = app.test_client().get("/api/password-policy/status")
            second = app.test_client().get("/api/password-policy/status")

        self.assertTrue(first.get_json()["warning"])
        self.assertTrue(second.get_json()["warning"])
        self.assertEqual(len(database.data["notifications"]), 1)


if __name__ == "__main__":
    unittest.main()
