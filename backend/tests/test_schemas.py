import pytest
from pydantic import ValidationError

from app.schemas.auth import AuthResponse, LoginRequest, RefreshRequest, SignUpRequest
from app.schemas.notes import NoteCreate, NoteResponse, NoteUpdate
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


class TestNoteSchemas:
    def test_note_create_with_defaults(self):
        note = NoteCreate(title="T")
        assert note.content == ""

    def test_note_create_full(self):
        note = NoteCreate(title="T", content="C")
        assert note.title == "T"
        assert note.content == "C"

    def test_note_create_missing_title(self):
        with pytest.raises(ValidationError):
            NoteCreate()

    def test_note_update_all_none(self):
        update = NoteUpdate()
        assert update.title is None
        assert update.content is None

    def test_note_update_partial(self):
        update = NoteUpdate(title="New Title")
        assert update.title == "New Title"
        assert update.content is None

    def test_note_update_model_dump_excludes_none(self):
        update = NoteUpdate(title="X")
        dumped = update.model_dump(exclude_none=True)
        assert dumped == {"title": "X"}

    def test_note_response_with_attachment(self):
        resp = NoteResponse(
            id="1",
            user_id="u1",
            title="T",
            content="C",
            attachment_path="path/file.txt",
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        assert resp.attachment_path == "path/file.txt"

    def test_note_response_without_attachment(self):
        resp = NoteResponse(
            id="1",
            user_id="u1",
            title="T",
            content="C",
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        assert resp.attachment_path is None


class TestStorageSchemas:
    def test_upload_response(self):
        resp = UploadResponse(path="p", url="https://example.com/f")
        assert resp.path == "p"

    def test_presigned_url_response(self):
        resp = PresignedUrlResponse(url="https://example.com/signed")
        assert resp.url == "https://example.com/signed"
