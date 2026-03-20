from unittest.mock import MagicMock

from tests.conftest import FAKE_NOTE, FAKE_USER


class TestListNotes:
    def test_list_notes_returns_user_notes(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
            data=[FAKE_NOTE]
        )

        response = authenticated_client.get("/api/v1/notes")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == "note-1"
        assert data[0]["title"] == "Test Note"

    def test_list_notes_empty(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
            data=[]
        )

        response = authenticated_client.get("/api/v1/notes")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_notes_requires_auth(self, client):
        response = client.get("/api/v1/notes")
        assert response.status_code == 401


class TestGetNote:
    def test_get_note_success(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data=FAKE_NOTE
        )

        response = authenticated_client.get("/api/v1/notes/note-1")
        assert response.status_code == 200
        assert response.json()["id"] == "note-1"

    def test_get_note_not_found(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data=None
        )

        response = authenticated_client.get("/api/v1/notes/nonexistent")
        assert response.status_code == 404
        assert response.json()["detail"] == "Note not found"


class TestCreateNote:
    def test_create_note_success(self, authenticated_client, mock_supabase):
        created = {**FAKE_NOTE, "title": "New Note", "content": "Body"}
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[created]
        )

        response = authenticated_client.post(
            "/api/v1/notes",
            json={"title": "New Note", "content": "Body"},
        )
        assert response.status_code == 201
        assert response.json()["title"] == "New Note"

    def test_create_note_default_content(self, authenticated_client, mock_supabase):
        created = {**FAKE_NOTE, "title": "Title Only", "content": ""}
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[created]
        )

        response = authenticated_client.post(
            "/api/v1/notes",
            json={"title": "Title Only"},
        )
        assert response.status_code == 201
        assert response.json()["content"] == ""

    def test_create_note_missing_title_returns_422(self, authenticated_client):
        response = authenticated_client.post(
            "/api/v1/notes",
            json={"content": "No title"},
        )
        assert response.status_code == 422


class TestUpdateNote:
    def test_update_note_success(self, authenticated_client, mock_supabase):
        updated = {**FAKE_NOTE, "title": "Updated"}
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[updated]
        )

        response = authenticated_client.patch(
            "/api/v1/notes/note-1",
            json={"title": "Updated"},
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Updated"

    def test_update_note_empty_body_returns_400(self, authenticated_client, mock_supabase):
        response = authenticated_client.patch(
            "/api/v1/notes/note-1",
            json={},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "No fields to update"

    def test_update_note_not_found(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        response = authenticated_client.patch(
            "/api/v1/notes/nonexistent",
            json={"title": "X"},
        )
        assert response.status_code == 404


class TestDeleteNote:
    def test_delete_note_success(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[FAKE_NOTE]
        )

        response = authenticated_client.delete("/api/v1/notes/note-1")
        assert response.status_code == 204

    def test_delete_note_not_found(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        response = authenticated_client.delete("/api/v1/notes/nonexistent")
        assert response.status_code == 404
