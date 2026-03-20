import sys
from unittest.mock import MagicMock, patch

# Mock the supabase module before any app imports, since the real library
# has native dependencies that may not be available in every environment.
_mock_supabase_mod = MagicMock()
sys.modules.setdefault("supabase", _mock_supabase_mod)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.auth import get_current_user  # noqa: E402
from app.main import app  # noqa: E402


FAKE_USER = {"id": "user-123", "email": "test@example.com", "token": "fake-token"}

FAKE_ROOM = {
    "id": "room-1",
    "name": "General",
    "created_by": "user-123",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
}

FAKE_MESSAGE = {
    "id": "msg-1",
    "room_id": "room-1",
    "user_id": "user-123",
    "content": "Hello world",
    "image_path": None,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z",
}

FAKE_MEMBER = {
    "id": "member-1",
    "room_id": "room-1",
    "user_id": "user-123",
    "joined_at": "2026-01-01T00:00:00Z",
}


@pytest.fixture()
def mock_supabase():
    """Provides a MagicMock supabase client and patches both get_supabase and get_supabase_anon."""
    mock_client = MagicMock()
    with (
        patch("app.core.supabase.get_supabase", return_value=mock_client),
        patch("app.core.supabase.get_supabase_anon", return_value=mock_client),
        patch("app.api.v1.auth.get_supabase_anon", return_value=mock_client),
        patch("app.api.v1.auth.get_supabase", return_value=mock_client),
        patch("app.api.v1.notes.get_supabase", return_value=mock_client),
        patch("app.api.v1.storage.get_supabase", return_value=mock_client),
    ):
        yield mock_client


@pytest.fixture()
def authenticated_client(mock_supabase):
    """TestClient with auth dependency overridden to return a fake user."""

    async def _fake_user():
        return FAKE_USER

    app.dependency_overrides[get_current_user] = _fake_user
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture()
def client():
    """Unauthenticated TestClient."""
    with TestClient(app) as c:
        yield c
