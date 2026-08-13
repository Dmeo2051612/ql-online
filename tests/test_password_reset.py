import os
import re
import unittest
from email.message import EmailMessage
from unittest.mock import patch

from password_reset_api import (
    _normalize_email,
    _otp_digest,
    _parse_bool,
    _password_policy_error,
    _send_otp_email,
)


class FakeSMTP:
    sent_message = None

    def __init__(self, host, port, timeout):
        self.host = host
        self.port = port
        self.timeout = timeout

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def ehlo(self):
        return None

    def starttls(self, context):
        self.context = context

    def login(self, user, password):
        self.user = user
        self.password = password

    def send_message(self, message: EmailMessage):
        FakeSMTP.sent_message = message


class PasswordResetTests(unittest.TestCase):
    def test_normalizes_email(self):
        self.assertEqual(_normalize_email("  Student@Example.COM "), "student@example.com")

    def test_parses_boolean_environment_values(self):
        for value in ("1", "true", "YES", "on"):
            self.assertTrue(_parse_bool(value))
        for value in ("0", "false", "", None):
            self.assertFalse(_parse_bool(value))

    def test_otp_digest_is_stable_and_request_specific(self):
        with patch.dict(os.environ, {"OTP_SECRET": "a-secure-test-secret-123"}):
            first = _otp_digest("request-a", "012345")
            self.assertEqual(first, _otp_digest("request-a", "012345"))
            self.assertNotEqual(first, _otp_digest("request-b", "012345"))
            self.assertNotIn("012345", first)

    def test_password_policy(self):
        self.assertEqual(_password_policy_error("StrongPass!246", "student@example.com"), "")
        self.assertIn("12", _password_policy_error("Short!2"))
        self.assertIn("chữ hoa", _password_policy_error("lowercase!246"))
        self.assertIn("tài khoản email", _password_policy_error("Student!Pass246", "student@example.com"))

    def test_email_contains_six_digit_otp_and_expiry(self):
        env = {
            "SMTP_HOST": "smtp.example.com",
            "SMTP_PORT": "587",
            "SMTP_USE_TLS": "1",
            "SMTP_USER": "sender@example.com",
            "SMTP_APP_PASSWORD": "app-password",
            "SMTP_FROM": "sender@example.com",
        }
        FakeSMTP.sent_message = None
        with patch.dict(os.environ, env, clear=False), patch("password_reset_api.smtplib.SMTP", FakeSMTP):
            _send_otp_email("student@example.com", "042731")

        message = FakeSMTP.sent_message
        self.assertIsNotNone(message)
        self.assertEqual(message["To"], "student@example.com")
        body = message.get_body(preferencelist=("plain",)).get_content()
        self.assertRegex(body, re.compile(r"\b042731\b"))
        self.assertIn("10 phút", body)


if __name__ == "__main__":
    unittest.main()
