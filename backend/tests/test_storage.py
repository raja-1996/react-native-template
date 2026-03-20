from io import BytesIO
from unittest.mock import MagicMock

from tests.conftest import FAKE_NOTE, FAKE_USER


class TestUploadFile:
    def test_upload_success(self, authenticated_client, mock_supabase):
        # Note lookup succeeds
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"id": "note-1"}
        )
        # Storage upload
        mock_supabase.storage.from_.return_value.upload.return_value = None
        # Note update
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = None
        # Public URL
        mock_supabase.storage.from_.return_value.get_public_url.return_value = (
            "https://storage.example.com/file.txt"
        )

        response = authenticated_client.post(
            "/api/v1/storage/upload/note-1",
            files={"file": ("test.txt", b"file content", "text/plain")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["path"] == f"{FAKE_USER['id']}/note-1/test.txt"
        assert data["url"] == "https://storage.example.com/file.txt"

    def test_upload_note_not_found(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data=None
        )

        response = authenticated_client.post(
            "/api/v1/storage/upload/bad-note",
            files={"file": ("test.txt", b"content", "text/plain")},
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Note not found"

    def test_upload_requires_auth(self, client):
        response = client.post(
            "/api/v1/storage/upload/note-1",
            files={"file": ("test.txt", b"content", "text/plain")},
        )
        assert response.status_code == 401


class TestGetDownloadUrl:
    def test_download_url_success(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"attachment_path": "user-123/note-1/file.txt"}
        )
        mock_supabase.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://storage.example.com/signed/file.txt"
        }

        response = authenticated_client.get("/api/v1/storage/download/note-1")
        assert response.status_code == 200
        assert response.json()["url"] == "https://storage.example.com/signed/file.txt"

    def test_download_no_attachment(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"attachment_path": None}
        )

        response = authenticated_client.get("/api/v1/storage/download/note-1")
        assert response.status_code == 404
        assert response.json()["detail"] == "No attachment found"

    def test_download_note_not_found(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data=None
        )

        response = authenticated_client.get("/api/v1/storage/download/note-1")
        assert response.status_code == 404


class TestDeleteFile:
    def test_delete_file_success(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"attachment_path": "user-123/note-1/file.txt"}
        )
        mock_supabase.storage.from_.return_value.remove.return_value = None
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = None

        response = authenticated_client.delete("/api/v1/storage/delete/note-1")
        assert response.status_code == 204

    def test_delete_file_no_attachment(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"attachment_path": None}
        )

        response = authenticated_client.delete("/api/v1/storage/delete/note-1")
        assert response.status_code == 404
        assert response.json()["detail"] == "No attachment found"
