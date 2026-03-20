import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    SignUpRequest,
)
from app.schemas.notes import (
    MessageCreate,
    MessageResponse,
    MessageUpdate,
    PaginatedMessages,
    RoomCreate,
    RoomResponse,
    RoomUpdate,
)
from app.schemas.storage import PresignedUrlResponse, UploadResponse


class TestAuthSchemas:
    def test_signup_request_valid(self):
        req = SignUpRequest(email="user@example.com", password="pass123")
        assert req.email == "user@example.com"

    def test_signup_request_invalid_email(self):
        with pytest.raises(ValidationError):
            SignUpRequest(email="not-an-email", password="pass123")

    def test_login_request_valid(self):
        req = LoginRequest(email="user@example.com", password="pass")
        assert req.password == "pass"

    def test_refresh_request_valid(self):
        req = RefreshRequest(refresh_token="tok")
        assert req.refresh_token == "tok"

    def test_auth_response_defaults(self):
        resp = AuthResponse(
            access_token="a",
            refresh_token="r",
            expires_in=3600,
            user={"id": "1", "email": "u@e.com"},
        )
        assert resp.token_type == "bearer"

    def test_password_reset_request_valid(self):
        req = PasswordResetRequest(email="user@example.com")
        assert req.email == "user@example.com"

    def test_password_reset_confirm_valid(self):
        req = PasswordResetConfirm(access_token="tok", new_password="newpass")
        assert req.new_password == "newpass"


class TestRoomSchemas:
    def test_room_create_valid(self):
        room = RoomCreate(name="General")
        assert room.name == "General"

    def test_room_create_missing_name(self):
        with pytest.raises(ValidationError):
            RoomCreate()

    def test_room_update_all_none(self):
        update = RoomUpdate()
        assert update.name is None

    def test_room_update_with_name(self):
        update = RoomUpdate(name="New Name")
        assert update.name == "New Name"

    def test_room_update_model_dump_excludes_none(self):
        update = RoomUpdate(name="X")
        dumped = update.model_dump(exclude_none=True)
        assert dumped == {"name": "X"}

    def test_room_response(self):
        resp = RoomResponse(
            id="1",
            name="General",
            created_by="u1",
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        assert resp.name == "General"


class TestMessageSchemas:
    def test_message_create_default_content(self):
        msg = MessageCreate()
        assert msg.content == ""
        assert msg.image_path is None

    def test_message_create_with_content(self):
        msg = MessageCreate(content="Hello")
        assert msg.content == "Hello"

    def test_message_update_all_none(self):
        update = MessageUpdate()
        assert update.content is None

    def test_message_response_with_image(self):
        resp = MessageResponse(
            id="1",
            room_id="r1",
            user_id="u1",
            content="Hi",
            image_path="path/img.jpg",
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        assert resp.image_path == "path/img.jpg"

    def test_message_response_without_image(self):
        resp = MessageResponse(
            id="1",
            room_id="r1",
            user_id="u1",
            content="Hi",
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        assert resp.image_path is None

    def test_paginated_messages(self):
        msg = MessageResponse(
            id="1",
            room_id="r1",
            user_id="u1",
            content="Hi",
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        page = PaginatedMessages(data=[msg], next_cursor="2026-01-01T00:00:00Z", has_more=True)
        assert len(page.data) == 1
        assert page.has_more is True


class TestStorageSchemas:
    def test_upload_response(self):
        resp = UploadResponse(path="p", url="https://example.com/f")
        assert resp.path == "p"

    def test_presigned_url_response(self):
        resp = PresignedUrlResponse(url="https://example.com/signed")
        assert resp.url == "https://example.com/signed"
