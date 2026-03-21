import io
from unittest.mock import MagicMock, patch

from tests.conftest import AUTH_HEADERS


def _make_mock_user_sb(signed_url="https://storage.example.com/signed"):
    mock_sb = MagicMock()
    signed = MagicMock()
    signed.signed_url = signed_url
    mock_sb.storage.from_.return_value.create_signed_url.return_value = signed
    return mock_sb


class TestUploadFile:
    def test_upload_success(self, client):
        mock_sb = _make_mock_user_sb()

        with patch("app.api.v1.storage.get_user_supabase", return_value=mock_sb):
            resp = client.post(
                "/api/v1/storage/upload",
                files={"file": ("test.txt", io.BytesIO(b"hello"), "text/plain")},
                headers=AUTH_HEADERS,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert "path" in data
        assert data["url"] == "https://storage.example.com/signed"

    def test_upload_with_custom_path(self, client):
        mock_sb = _make_mock_user_sb()

        with patch("app.api.v1.storage.get_user_supabase", return_value=mock_sb):
            resp = client.post(
                "/api/v1/storage/upload",
                files={"file": ("photo.jpg", io.BytesIO(b"imgdata"), "image/jpeg")},
                data={"path": "user-123/custom/photo.jpg"},
                headers=AUTH_HEADERS,
            )

        assert resp.status_code == 200
        assert resp.json()["path"] == "user-123/custom/photo.jpg"

    def test_upload_storage_error(self, client):
        mock_sb = MagicMock()
        mock_sb.storage.from_.return_value.upload.side_effect = Exception("bucket not found")

        with patch("app.api.v1.storage.get_user_supabase", return_value=mock_sb):
            resp = client.post(
                "/api/v1/storage/upload",
                files={"file": ("test.txt", io.BytesIO(b"data"), "text/plain")},
                headers=AUTH_HEADERS,
            )

        assert resp.status_code == 400

    def test_upload_no_file_extension(self, client):
        mock_sb = _make_mock_user_sb()

        with patch("app.api.v1.storage.get_user_supabase", return_value=mock_sb):
            resp = client.post(
                "/api/v1/storage/upload",
                files={"file": ("noext", io.BytesIO(b"data"), "application/octet-stream")},
                headers=AUTH_HEADERS,
            )

        assert resp.status_code == 200
        # path should end with .bin for files without extension
        assert resp.json()["path"].endswith(".bin")


class TestDownloadFile:
    def test_download_success(self, client):
        mock_sb = _make_mock_user_sb("https://storage.example.com/signed-dl")

        with patch("app.api.v1.storage.get_user_supabase", return_value=mock_sb):
            resp = client.get("/api/v1/storage/download/user-123/photo.jpg", headers=AUTH_HEADERS)

        assert resp.status_code == 200
        assert resp.json()["url"] == "https://storage.example.com/signed-dl"

    def test_download_not_found(self, client):
        mock_sb = MagicMock()
        mock_sb.storage.from_.return_value.create_signed_url.side_effect = Exception("not found")

        with patch("app.api.v1.storage.get_user_supabase", return_value=mock_sb):
            resp = client.get("/api/v1/storage/download/missing/file.jpg", headers=AUTH_HEADERS)

        assert resp.status_code == 404

    def test_download_nested_path(self, client):
        mock_sb = _make_mock_user_sb("https://storage.example.com/signed-nested")

        with patch("app.api.v1.storage.get_user_supabase", return_value=mock_sb):
            resp = client.get(
                "/api/v1/storage/download/user-123/nested/deep/file.png",
                headers=AUTH_HEADERS,
            )

        assert resp.status_code == 200


class TestDeleteFile:
    def test_delete_success(self, client):
        mock_sb = MagicMock()

        with patch("app.api.v1.storage.get_user_supabase", return_value=mock_sb):
            resp = client.delete("/api/v1/storage/delete/user-123/photo.jpg", headers=AUTH_HEADERS)

        assert resp.status_code == 204
        mock_sb.storage.from_.return_value.remove.assert_called_once_with(["user-123/photo.jpg"])

    def test_delete_error(self, client):
        mock_sb = MagicMock()
        mock_sb.storage.from_.return_value.remove.side_effect = Exception("remove error")

        with patch("app.api.v1.storage.get_user_supabase", return_value=mock_sb):
            resp = client.delete("/api/v1/storage/delete/user-123/photo.jpg", headers=AUTH_HEADERS)

        assert resp.status_code == 400
