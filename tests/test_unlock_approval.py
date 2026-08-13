import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from notification_api import _apply_unlock_approval_effect


class FakeSnapshot:
    def __init__(self, data):
        self._data = data

    @property
    def exists(self):
        return self._data is not None

    def to_dict(self):
        return dict(self._data or {})


class FakeDocument:
    def __init__(self, database, collection, document_id):
        self.database = database
        self.collection = collection
        self.id = document_id

    def get(self):
        return FakeSnapshot(self.database.data.get(self.collection, {}).get(self.id))

    def set(self, values, merge=False):
        target = self.database.data.setdefault(self.collection, {}).setdefault(self.id, {})
        if merge:
            target.update(dict(values))
        else:
            self.database.data[self.collection][self.id] = dict(values)

    def update(self, values):
        self.database.data.setdefault(self.collection, {}).setdefault(self.id, {}).update(dict(values))


class FakeCollection:
    def __init__(self, database, name):
        self.database = database
        self.name = name

    def document(self, document_id):
        return FakeDocument(self.database, self.name, document_id)


class FakeDatabase:
    def __init__(self, data):
        self.data = data

    def collection(self, name):
        return FakeCollection(self, name)


class FakeAuthUser:
    uid = "student-uid"


class FakeAuth:
    def get_user_by_email(self, email):
        return FakeAuthUser()


class UnlockApprovalTest(unittest.TestCase):
    def test_approval_grants_30_minute_password_expiry_grace(self):
        database = FakeDatabase({
            "users": {"student-uid": {"role": "sinhvien", "mustChangePassword": False}},
            "login_unlock_requests": {"request-1": {}},
        })
        reference = database.collection("login_unlock_requests").document("request-1")
        before = datetime.now(timezone.utc)
        with patch("notification_api.get_firebase_auth", return_value=FakeAuth()):
            result = _apply_unlock_approval_effect(database, reference, {
                "status": "approved",
                "email": "student@example.com",
                "decidedBy": "admin-uid",
            })

        profile = database.data["users"]["student-uid"]
        request_data = database.data["login_unlock_requests"]["request-1"]
        self.assertTrue(result["accessGranted"])
        self.assertGreater(profile["passwordExpiryGraceUntil"], before)
        self.assertTrue(request_data["approvalEffectApplied"])
        self.assertTrue(request_data["accessGranted"])

    def test_approval_does_not_bypass_temporary_password(self):
        database = FakeDatabase({
            "users": {"student-uid": {"role": "sinhvien", "mustChangePassword": True}},
            "login_unlock_requests": {"request-1": {}},
        })
        reference = database.collection("login_unlock_requests").document("request-1")
        with patch("notification_api.get_firebase_auth", return_value=FakeAuth()):
            result = _apply_unlock_approval_effect(database, reference, {
                "status": "approved",
                "email": "student@example.com",
                "decidedBy": "admin-uid",
            })

        self.assertFalse(result["accessGranted"])
        self.assertNotIn("passwordExpiryGraceUntil", database.data["users"]["student-uid"])


if __name__ == "__main__":
    unittest.main()
