import unittest
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

    def update(self, data):
        self.database.data[self.collection_name][self.id].update(dict(data))

    def delete(self):
        self.database.data.get(self.collection_name, {}).pop(self.id, None)


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


class FakeDatabase:
    def __init__(self, data):
        self.data = data

    def collection(self, name):
        return FakeCollection(self, name)


class DepartmentManagementTest(unittest.TestCase):
    def test_admin_can_rename_department(self):
        database = FakeDatabase({"khoa": {"CNTT": {"tenkhoa": "Tên cũ"}}})
        with (
            patch("notification_api._admin_identity", return_value={"uid": "admin"}),
            patch("notification_api.firestore.client", return_value=database),
        ):
            response = app.test_client().patch(
                "/api/admin/departments/CNTT",
                json={"tenkhoa": "Công nghệ thông tin"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(database.data["khoa"]["CNTT"]["tenkhoa"], "Công nghệ thông tin")

    def test_referenced_department_cannot_be_deleted(self):
        database = FakeDatabase({
            "khoa": {"CNTT": {"tenkhoa": "Công nghệ thông tin"}},
            "sinhvien": {"SV01": {"makhoa": "CNTT"}},
            "giaovien": {},
            "monhoc": {},
        })
        with (
            patch("notification_api._admin_identity", return_value={"uid": "admin"}),
            patch("notification_api.firestore.client", return_value=database),
        ):
            response = app.test_client().delete("/api/admin/departments/CNTT")

        self.assertEqual(response.status_code, 409)
        self.assertIn("CNTT", database.data["khoa"])

    def test_unused_department_can_be_deleted(self):
        database = FakeDatabase({
            "khoa": {"LOG": {"tenkhoa": "Logistics"}},
            "sinhvien": {},
            "giaovien": {},
            "monhoc": {},
        })
        with (
            patch("notification_api._admin_identity", return_value={"uid": "admin"}),
            patch("notification_api.firestore.client", return_value=database),
        ):
            response = app.test_client().delete("/api/admin/departments/LOG")

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("LOG", database.data["khoa"])


if __name__ == "__main__":
    unittest.main()
