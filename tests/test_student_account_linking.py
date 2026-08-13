import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app import app


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


class FakeCollection:
    def __init__(self, database, name):
        self.database = database
        self.name = name

    def document(self, document_id):
        return FakeDocument(self.database, self.name, document_id)

    def stream(self):
        return iter([
            FakeSnapshot(document_id, data)
            for document_id, data in self.database.data.get(self.name, {}).items()
        ])


class FakeBatch:
    def __init__(self, database):
        self.database = database
        self.pending = []

    def set(self, reference, data, merge=False):
        self.pending.append((reference, dict(data), merge))

    def commit(self):
        for reference, data, merge in self.pending:
            collection = self.database.data.setdefault(reference.collection_name, {})
            if merge:
                collection.setdefault(reference.id, {}).update(data)
            else:
                collection[reference.id] = data


class FakeDatabase:
    def __init__(self):
        self.data = {"sinhvien": {}, "users": {}}

    def collection(self, name):
        return FakeCollection(self, name)

    def batch(self):
        return FakeBatch(self)


class FakeAuth:
    class UserNotFoundError(Exception):
        pass

    class EmailAlreadyExistsError(Exception):
        pass

    def __init__(self, users=None):
        self.users = dict(users or {})
        self.created = []
        self.deleted = []

    def get_user_by_email(self, email):
        if email not in self.users:
            raise self.UserNotFoundError()
        return self.users[email]

    def create_user(self, email, password):
        user = SimpleNamespace(uid=f"uid-{len(self.users) + 1}", email=email)
        self.users[email] = user
        self.created.append((email, password))
        return user

    def delete_user(self, uid):
        self.deleted.append(uid)


def student_payload(email="orphan@example.com"):
    return {
        "masv": "SV007",
        "hoten": "Sinh Vien Thu Bay",
        "mail": email,
        "matkhau": "StrongPassword@123",
        "ngaysinh": "2000-03-31",
        "makhoa": "CNTT",
        "namnhaphoc": "2024",
    }


class StudentAccountLinkingTest(unittest.TestCase):
    def test_links_existing_auth_user_and_creates_missing_profile(self):
        database = FakeDatabase()
        auth = FakeAuth({"orphan@example.com": SimpleNamespace(uid="orphan-uid")})

        with (
            patch("notification_api._admin_identity", return_value={"uid": "admin"}),
            patch("notification_api.firestore.client", return_value=database),
            patch("notification_api.get_firebase_auth", return_value=auth),
        ):
            response = app.test_client().post(
                "/api/admin/students", json=student_payload()
            )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.get_json()["linkedExistingAccount"])
        self.assertEqual(database.data["users"]["orphan-uid"]["role"], "sinhvien")
        self.assertEqual(database.data["users"]["orphan-uid"]["masv"], "SV007")
        self.assertEqual(database.data["sinhvien"]["SV007"]["uid"], "orphan-uid")
        self.assertEqual(auth.created, [])

    def test_creates_auth_user_when_email_is_new(self):
        database = FakeDatabase()
        auth = FakeAuth()

        with (
            patch("notification_api._admin_identity", return_value={"uid": "admin"}),
            patch("notification_api.firestore.client", return_value=database),
            patch("notification_api.get_firebase_auth", return_value=auth),
        ):
            response = app.test_client().post(
                "/api/admin/students", json=student_payload("new@example.com")
            )

        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.get_json()["linkedExistingAccount"])
        self.assertEqual(auth.created, [("new@example.com", "StrongPassword@123")])
        self.assertEqual(database.data["users"]["uid-1"]["role"], "sinhvien")
        self.assertEqual(database.data["sinhvien"]["SV007"]["mail"], "new@example.com")


if __name__ == "__main__":
    unittest.main()
