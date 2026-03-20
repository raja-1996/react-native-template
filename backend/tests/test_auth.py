from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from tests.conftest import FAKE_USER


class TestSignup:
    def test_signup_success(self, authenticated_client, mock_supabase):
        session = MagicMock()
        session.access_token = "access-tok"
        session.refresh_token = "refresh-tok"
        session.expires_in = 3600
        session.user.id = "user-123"
        session.user.email = "new@example.com"

        mock_supabase.auth.sign_up.return_value = MagicMock(session=session)

        response = authenticated_client.post(
            "/api/v1/auth/signup",
            json={"email": "new@example.com", "password": "strongpass123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "access-tok"
        assert data["refresh_token"] == "refresh-tok"
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 3600
        assert data["user"]["email"] == "new@example.com"

    def test_signup_no_session_returns_400(self, authenticated_client, mock_supabase):
        mock_supabase.auth.sign_up.return_value = MagicMock(session=None)

        response = authenticated_client.post(
            "/api/v1/auth/signup",
            json={"email": "new@example.com", "password": "strongpass123"},
        )
        assert response.status_code == 400
        assert "Signup failed" in response.json()["detail"]

    def test_signup_exception_returns_400(self, authenticated_client, mock_supabase):
        mock_supabase.auth.sign_up.side_effect = Exception("Duplicate email")

        response = authenticated_client.post(
            "/api/v1/auth/signup",
            json={"email": "dup@example.com", "password": "strongpass123"},
        )
        assert response.status_code == 400
        assert "Duplicate email" in response.json()["detail"]

    def test_signup_invalid_email_returns_422(self, authenticated_client):
        response = authenticated_client.post(
            "/api/v1/auth/signup",
            json={"email": "not-an-email", "password": "strongpass123"},
        )
        assert response.status_code == 422

    def test_signup_missing_password_returns_422(self, authenticated_client):
        response = authenticated_client.post(
            "/api/v1/auth/signup",
            json={"email": "user@example.com"},
        )
        assert response.status_code == 422


class TestLogin:
    def test_login_success(self, authenticated_client, mock_supabase):
        session = MagicMock()
        session.access_token = "access-tok"
        session.refresh_token = "refresh-tok"
        session.expires_in = 3600
        session.user.id = "user-123"
        session.user.email = "user@example.com"

        mock_supabase.auth.sign_in_with_password.return_value = MagicMock(session=session)

        response = authenticated_client.post(
            "/api/v1/auth/login",
            json={"email": "user@example.com", "password": "pass123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "access-tok"
        assert data["user"]["id"] == "user-123"

    def test_login_invalid_credentials_returns_401(self, authenticated_client, mock_supabase):
        mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid credentials")

        response = authenticated_client.post(
            "/api/v1/auth/login",
            json={"email": "user@example.com", "password": "wrong"},
        )
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]


class TestRefresh:
    def test_refresh_success(self, authenticated_client, mock_supabase):
        session = MagicMock()
        session.access_token = "new-access"
        session.refresh_token = "new-refresh"
        session.expires_in = 3600
        session.user.id = "user-123"
        session.user.email = "user@example.com"

        mock_supabase.auth.refresh_session.return_value = MagicMock(session=session)

        response = authenticated_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "old-refresh"},
        )
        assert response.status_code == 200
        assert response.json()["access_token"] == "new-access"

    def test_refresh_invalid_token_returns_401(self, authenticated_client, mock_supabase):
        mock_supabase.auth.refresh_session.side_effect = Exception("Invalid token")

        response = authenticated_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "bad-token"},
        )
        assert response.status_code == 401


class TestLogout:
    def test_logout_returns_message(self, authenticated_client):
        response = authenticated_client.post("/api/v1/auth/logout")
        assert response.status_code == 200
        assert response.json()["message"] == "Logged out — discard tokens client-side"
