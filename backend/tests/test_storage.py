from unittest.mock import MagicMock

from tests.conftest import FAKE_USER


class TestUploadImage:
    def test_upload_success(self, authenticated_client, mock_supabase):
        mock_supabase.storage.from_.return_value.upload.return_value = None
        mock_supabase.storage.from_.return_value.get_public_url.return_value = (
            "https://storage.example.com/image.jpg"
        )

        response = authenticated_client.post(
            "/api/v1/storage/upload",
            files={"file": ("photo.jpg", b"image content", "image/jpeg")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["path"] == f"{FAKE_USER['id']}/photo.jpg"
        assert data["url"] == "https://storage.example.com/image.jpg"

    def test_upload_non_image_returns_400(self, authenticated_client, mock_supabase):
        response = authenticated_client.post(
            "/api/v1/storage/upload",
            files={"file": ("doc.pdf", b"pdf content", "application/pdf")},
        )
        assert response.status_code == 400
        assert "image" in response.json()["detail"].lower()

    def test_upload_requires_auth(self, client):
        response = client.post(
            "/api/v1/storage/upload",
            files={"file": ("photo.jpg", b"content", "image/jpeg")},
        )
        assert response.status_code == 401


class TestGetImageUrl:
    def test_get_url_success(self, authenticated_client, mock_supabase):
        mock_supabase.storage.from_.return_value.create_signed_url.return_value = {
            "signedURL": "https://storage.example.com/signed/image.jpg"
        }

        response = authenticated_client.get("/api/v1/storage/url/user-123/image.jpg")
        assert response.status_code == 200
        assert response.json()["url"] == "https://storage.example.com/signed/image.jpg"


class TestDeleteImage:
    def test_delete_own_image_success(self, authenticated_client, mock_supabase):
        mock_supabase.storage.from_.return_value.remove.return_value = None

        response = authenticated_client.delete(
            f"/api/v1/storage/delete/{FAKE_USER['id']}/image.jpg"
        )
        assert response.status_code == 204

    def test_delete_other_user_image_returns_403(self, authenticated_client, mock_supabase):
        response = authenticated_client.delete(
            "/api/v1/storage/delete/other-user/image.jpg"
        )
        assert response.status_code == 403
