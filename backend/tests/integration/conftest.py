"""Shared fixtures for integration tests that talk to a real Supabase instance.

These tests require a running local Supabase (``supabase start``) and a
backend ``.env`` file with valid keys.  When the Supabase instance is not
reachable the entire integration suite is skipped automatically.

Run only integration tests:
    pytest tests/integration/ -v

Run with the rest of the suite:
    pytest tests/ -v
"""

import os
import uuid

import httpx
import pytest

# ---------------------------------------------------------------------------
# Environment helpers – read from .env or fall back to env vars / defaults
# ---------------------------------------------------------------------------

_SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:54321")
_SUPABASE_PUBLISHABLE_KEY = (
    os.getenv("SUPABASE_PUBLISHABLE_DEFAULT_KEY")
    or os.getenv("SUPABASE_ANON_KEY", "")
)
_SUPABASE_SECRET_KEY = (
    os.getenv("SUPABASE_SECRET_DEFAULT_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
)
_BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")


def _supabase_reachable() -> bool:
    """Return True when the local Supabase API Gateway responds."""
    try:
        r = httpx.get(f"{_SUPABASE_URL}/rest/v1/", timeout=3)
        return r.status_code < 500
    except Exception:
        return False


def _backend_reachable() -> bool:
    """Return True when the FastAPI backend health endpoint responds."""
    try:
        r = httpx.get(f"{_BACKEND_URL}/health", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


# Skip the whole module when infrastructure is unavailable
requires_supabase = pytest.mark.skipif(
    not _supabase_reachable(),
    reason="Local Supabase is not running – run `supabase start` first",
)

requires_backend = pytest.mark.skipif(
    not _backend_reachable(),
    reason="Backend server is not running – start it first",
)

requires_infra = pytest.mark.skipif(
    not (_supabase_reachable() and _backend_reachable()),
    reason="Both Supabase and backend must be running for integration tests",
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def supabase_url():
    return _SUPABASE_URL


@pytest.fixture(scope="session")
def supabase_anon_key():
    return _SUPABASE_PUBLISHABLE_KEY


@pytest.fixture(scope="session")
def supabase_service_role_key():
    return _SUPABASE_SECRET_KEY


@pytest.fixture(scope="session")
def backend_url():
    return _BACKEND_URL


@pytest.fixture(scope="session")
def api_url(backend_url):
    return f"{backend_url}/api/v1"


@pytest.fixture(scope="session")
def unique_email():
    """Generate a unique email for the test run to avoid collisions."""
    uid = uuid.uuid4().hex[:8]
    return f"inttest-{uid}@example.com"


@pytest.fixture(scope="session")
def test_password():
    return "IntegrationTest123!"


@pytest.fixture(scope="session")
def http_client():
    """A shared httpx client for the whole session."""
    with httpx.Client(timeout=10) as client:
        yield client


@pytest.fixture(scope="session")
def registered_user(http_client, api_url, unique_email, test_password):
    """Sign up a user and return the auth response dict.

    This fixture runs once per session so all integration tests share
    the same user, keeping the test run fast and predictable.
    """
    resp = http_client.post(
        f"{api_url}/auth/signup",
        json={"email": unique_email, "password": test_password},
    )
    assert resp.status_code == 200, f"Signup failed: {resp.text}"
    return resp.json()


@pytest.fixture(scope="session")
def auth_headers(registered_user):
    """Authorization header dict for authenticated requests."""
    return {"Authorization": f"Bearer {registered_user['access_token']}"}
