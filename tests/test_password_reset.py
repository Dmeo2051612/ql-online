import os
import json
import re
import urllib.error
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


class FakeBrevoResponse:
    status = 201

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


class FakeBody:
    def __init__(self, value):
        self.value = value

    def read(self, *_args):
        return self.value

    def close(self):
        return None


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
            "BREVO_API_KEY": "",
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

    def test_brevo_email_uses_https_api_with_verified_sender(self):
        env = {
            "BREVO_API_KEY": "xkeysib-test-key",
            "BREVO_SENDER_EMAIL": "sender@example.com",
            "BREVO_SENDER_NAME": "QL Online",
        }
        captured = {}

        def fake_urlopen(request, timeout):
            captured["url"] = request.full_url
            captured["headers"] = dict(request.header_items())
            captured["payload"] = json.loads(request.data.decode("utf-8"))
            captured["timeout"] = timeout
            return FakeBrevoResponse()

        with patch.dict(os.environ, env, clear=False), patch(
            "password_reset_api.urllib.request.urlopen", fake_urlopen
        ):
            provider = _send_otp_email("student@example.com", "735204")

        self.assertEqual(provider, "brevo")
        self.assertEqual(captured["url"], "https://api.brevo.com/v3/smtp/email")
        self.assertEqual(captured["payload"]["sender"]["email"], "sender@example.com")
        self.assertEqual(captured["payload"]["to"][0]["email"], "student@example.com")
        self.assertIn("735204", captured["payload"]["htmlContent"])
        self.assertEqual(captured["headers"].get("Api-key"), "xkeysib-test-key")

    def test_brevo_reports_invalid_api_key_without_exposing_it(self):
        env = {
            "BREVO_API_KEY": "xkeysib-secret-value",
            "BREVO_SENDER_EMAIL": "sender@example.com",
            "BREVO_SENDER_NAME": "QL Online",
        }
        error_body = json.dumps({"code": "unauthorized", "message": "Key not found"}).encode()

        def reject_request(request, timeout):
            raise urllib.error.HTTPError(request.full_url, 401, "Unauthorized", {}, FakeBody(error_body))

        with patch.dict(os.environ, env, clear=False), patch(
            "password_reset_api.urllib.request.urlopen", reject_request
        ):
            with self.assertRaisesRegex(RuntimeError, "API key không hợp lệ") as context:
                _send_otp_email("student@example.com", "735204")

        self.assertNotIn("xkeysib-secret-value", str(context.exception))


if __name__ == "__main__":
    unittest.main()
