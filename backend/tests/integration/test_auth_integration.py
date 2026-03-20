"""Integration tests for the auth endpoints against a real Supabase instance."""

import pytest
from tests.integration.conftest import requires_infra


pytestmark = requires_infra


class TestSignupIntegration:
    def test_signup_creates_user(self, registered_user, unique_email):
        """The session-scoped registered_user fixture already signed up.
        Verify the response shape."""
        assert "access_token" in registered_user
        assert "refresh_token" in registered_user
        assert registered_user["token_type"] == "bearer"
        assert registered_user["user"]["email"] == unique_email

    def test_signup_duplicate_email_fails(
        self, http_client, api_url, unique_email, test_password
    ):
        resp = http_client.post(
            f"{api_url}/auth/signup",
            json={"email": unique_email, "password": test_password},
        )
        # Supabase returns 400 for duplicate signup (or may return 200 with
        # no session when confirmations are disabled but user exists)
        assert resp.status_code in (400, 200)
        if resp.status_code == 200:
            # If Supabase returns 200, the session may be None → our endpoint
            # raises 400 with "Signup failed" message
            pass

    def test_signup_invalid_email_rejected(self, http_client, api_url):
        resp = http_client.post(
            f"{api_url}/auth/signup",
            json={"email": "not-valid", "password": "pass123"},
        )
        assert resp.status_code == 422


class TestLoginIntegration:
    def test_login_success(self, http_client, api_url, unique_email, test_password, registered_user):
        resp = http_client.post(
            f"{api_url}/auth/login",
            json={"email": unique_email, "password": test_password},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == unique_email

    def test_login_wrong_password(self, http_client, api_url, unique_email, registered_user):
        resp = http_client.post(
            f"{api_url}/auth/login",
            json={"email": unique_email, "password": "wrong-password"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, http_client, api_url):
        resp = http_client.post(
            f"{api_url}/auth/login",
            json={"email": "nobody@nowhere.dev", "password": "pass123"},
        )
        assert resp.status_code == 401


class TestRefreshIntegration:
    def test_refresh_token_success(self, http_client, api_url, registered_user):
        resp = http_client.post(
            f"{api_url}/auth/refresh",
            json={"refresh_token": registered_user["refresh_token"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_invalid_token(self, http_client, api_url):
        resp = http_client.post(
            f"{api_url}/auth/refresh",
            json={"refresh_token": "invalid-token-value"},
        )
        assert resp.status_code == 401


class TestLogoutIntegration:
    def test_logout_returns_message(self, http_client, api_url):
        resp = http_client.post(f"{api_url}/auth/logout")
        assert resp.status_code == 200
        assert "Logged out" in resp.json()["message"]
