import unittest
from unittest.mock import patch

from app import app


class FakeReference:
    def __init__(self, path):
        self.path = path


class FakeSnapshot:
    def __init__(self, collection, document_id, data):
        self.id = document_id
        self._data = data
        self.reference = FakeReference(f"{collection}/{document_id}")

    def to_dict(self):
        return self._data


class FakeCollection:
    def __init__(self, snapshots):
        self.snapshots = snapshots

    def stream(self):
        return iter(self.snapshots)


class FakeBatch:
    def __init__(self, deleted):
        self.deleted = deleted
        self.pending = []

    def delete(self, reference):
        self.pending.append(reference.path)

    def commit(self):
        self.deleted.extend(self.pending)


class FakeDatabase:
    def __init__(self):
        self.deleted = []
        self.collections = {
            "login_unlock_requests": FakeCollection([
                FakeSnapshot("login_unlock_requests", "waiting", {"status": "pending"}),
                FakeSnapshot("login_unlock_requests", "accepted", {"status": "approved"}),
                FakeSnapshot("login_unlock_requests", "denied", {"status": "rejected"}),
            ]),
            "notifications": FakeCollection([
                FakeSnapshot("notifications", "related", {
                    "actionType": "login_unlock", "actionId": "accepted"
                }),
                FakeSnapshot("notifications", "unrelated", {
                    "actionType": "announcement", "actionId": "accepted"
                }),
            ]),
        }

    def collection(self, name):
        return self.collections[name]

    def batch(self):
        return FakeBatch(self.deleted)


class UnlockCleanupTest(unittest.TestCase):
    def test_only_processed_requests_and_related_notifications_are_deleted(self):
        database = FakeDatabase()
        with (
            patch("notification_api._admin_identity", return_value={"uid": "admin"}),
            patch("notification_api.firestore.client", return_value=database),
        ):
            response = app.test_client().delete("/api/admin/login-unlock-requests/processed")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["deletedRequests"], 2)
        self.assertEqual(response.get_json()["deletedNotifications"], 1)
        self.assertCountEqual(database.deleted, [
            "login_unlock_requests/accepted",
            "login_unlock_requests/denied",
            "notifications/related",
        ])
        self.assertNotIn("login_unlock_requests/waiting", database.deleted)
        self.assertNotIn("notifications/unrelated", database.deleted)


if __name__ == "__main__":
    unittest.main()
