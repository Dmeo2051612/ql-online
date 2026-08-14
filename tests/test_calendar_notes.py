import unittest
from unittest.mock import patch

from app import app
from notification_api import _calendar_note_payload


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
        previous = collection.get(self.id, {}) if merge else {}
        collection[self.id] = {**previous, **dict(data)}

    def delete(self):
        self.database.data.get(self.collection_name, {}).pop(self.id, None)


class FakeQuery:
    def __init__(self, database, collection_name, filters=None):
        self.database = database
        self.collection_name = collection_name
        self.filters = filters or []

    def where(self, field, operator, value):
        self.filters.append((field, operator, value))
        return self

    def stream(self):
        for document_id, data in self.database.data.get(self.collection_name, {}).items():
            if all(operator == "==" and data.get(field) == value for field, operator, value in self.filters):
                yield FakeSnapshot(document_id, data)


class FakeCollection(FakeQuery):
    def document(self, document_id):
        return FakeDocument(self.database, self.collection_name, document_id)


class FakeDatabase:
    def __init__(self):
        self.data = {}

    def collection(self, name):
        return FakeCollection(self, name)


class CalendarNotesTest(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True)
        self.client = app.test_client()
        self.database = FakeDatabase()
        self.identity = {
            "uid": "student-uid",
            "role": "sinhvien",
            "masv": "SV001",
            "email": "student@example.com",
        }
        self.database_patch = patch("notification_api.firestore.client", return_value=self.database)
        self.identity_patch = patch("notification_api._student_identity", return_value=self.identity)
        self.database_patch.start()
        self.identity_patch.start()

    def tearDown(self):
        self.identity_patch.stop()
        self.database_patch.stop()

    def test_note_validation_rejects_invalid_date_and_time(self):
        with self.assertRaises(ValueError):
            _calendar_note_payload({"ngay": "2026-02-30", "gio": "07:00", "noidung": "Thi"})
        with self.assertRaises(ValueError):
            _calendar_note_payload({"ngay": "2026-08-14", "gio": "25:00", "noidung": "Thi"})

    def test_create_list_and_delete_own_note(self):
        response = self.client.post(
            "/api/student/calendar-notes",
            json={"ngay": "2026-08-14", "gio": "07:30", "noidung": "Nộp bài"},
        )
        self.assertEqual(response.status_code, 201)
        note_id = response.get_json()["note"]["id"]

        response = self.client.get("/api/student/calendar-notes")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["notes"][0]["noidung"], "Nộp bài")

        response = self.client.delete(f"/api/student/calendar-notes/{note_id}")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(note_id, self.database.data["calendar_notes"])

    def test_cannot_delete_another_students_note(self):
        self.database.data["calendar_notes"] = {
            "foreign": {"ownerUid": "another-uid", "ngay": "2026-08-14", "gio": "", "noidung": "Riêng"}
        }
        response = self.client.delete("/api/student/calendar-notes/foreign")
        self.assertEqual(response.status_code, 403)
        self.assertIn("foreign", self.database.data["calendar_notes"])


class NotificationReadStateTest(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True)
        self.client = app.test_client()
        self.database = FakeDatabase()
        self.identity = {
            "uid": "student-uid",
            "role": "sinhvien",
            "masv": "SV001",
            "email": "student@example.com",
        }
        self.database_patch = patch("notification_api.firestore.client", return_value=self.database)
        self.identity_patch = patch("notification_api._current_identity", return_value=self.identity)
        self.database_patch.start()
        self.identity_patch.start()

    def tearDown(self):
        self.identity_patch.stop()
        self.database_patch.stop()

    def test_read_state_is_saved_per_user(self):
        response = self.client.post("/api/notifications/calendar-note-abc123/read")
        self.assertEqual(response.status_code, 200)

        response = self.client.get("/api/notification-read-state")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["readIds"], ["calendar-note-abc123"])

    def test_read_state_rejects_invalid_identifier(self):
        response = self.client.post("/api/notifications/invalid%20identifier/read")
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
