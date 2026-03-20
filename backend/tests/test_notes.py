from unittest.mock import MagicMock

from tests.conftest import FAKE_MESSAGE, FAKE_ROOM


# ---- Rooms ----


class TestListRooms:
    def test_list_rooms_returns_user_rooms(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value = MagicMock(
            data=[FAKE_ROOM]
        )

        response = authenticated_client.get("/api/v1/rooms")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "General"

    def test_list_rooms_empty(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value = MagicMock(
            data=[]
        )

        response = authenticated_client.get("/api/v1/rooms")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_rooms_requires_auth(self, client):
        response = client.get("/api/v1/rooms")
        assert response.status_code == 401


class TestCreateRoom:
    def test_create_room_success(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[FAKE_ROOM]
        )

        response = authenticated_client.post(
            "/api/v1/rooms",
            json={"name": "General"},
        )
        assert response.status_code == 201
        assert response.json()["name"] == "General"

    def test_create_room_missing_name_returns_422(self, authenticated_client):
        response = authenticated_client.post(
            "/api/v1/rooms",
            json={},
        )
        assert response.status_code == 422


class TestUpdateRoom:
    def test_update_room_success(self, authenticated_client, mock_supabase):
        updated = {**FAKE_ROOM, "name": "Renamed"}
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[updated]
        )

        response = authenticated_client.patch(
            "/api/v1/rooms/room-1",
            json={"name": "Renamed"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Renamed"

    def test_update_room_empty_body_returns_400(self, authenticated_client):
        response = authenticated_client.patch(
            "/api/v1/rooms/room-1",
            json={},
        )
        assert response.status_code == 400

    def test_update_room_not_found(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        response = authenticated_client.patch(
            "/api/v1/rooms/nonexistent",
            json={"name": "X"},
        )
        assert response.status_code == 404


class TestDeleteRoom:
    def test_delete_room_success(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[FAKE_ROOM]
        )

        response = authenticated_client.delete("/api/v1/rooms/room-1")
        assert response.status_code == 204

    def test_delete_room_not_found(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        response = authenticated_client.delete("/api/v1/rooms/nonexistent")
        assert response.status_code == 404


# ---- Messages ----


class TestListMessages:
    def test_list_messages_success(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
            data=[FAKE_MESSAGE]
        )

        response = authenticated_client.get("/api/v1/rooms/room-1/messages")
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1
        assert data["has_more"] is False

    def test_list_messages_requires_auth(self, client):
        response = client.get("/api/v1/rooms/room-1/messages")
        assert response.status_code == 401


class TestCreateMessage:
    def test_create_message_success(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[FAKE_MESSAGE]
        )

        response = authenticated_client.post(
            "/api/v1/rooms/room-1/messages",
            json={"content": "Hello world"},
        )
        assert response.status_code == 201
        assert response.json()["content"] == "Hello world"


class TestUpdateMessage:
    def test_update_message_success(self, authenticated_client, mock_supabase):
        updated = {**FAKE_MESSAGE, "content": "Edited"}
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[updated]
        )

        response = authenticated_client.patch(
            "/api/v1/rooms/room-1/messages/msg-1",
            json={"content": "Edited"},
        )
        assert response.status_code == 200
        assert response.json()["content"] == "Edited"

    def test_update_message_empty_body_returns_400(self, authenticated_client, mock_supabase):
        response = authenticated_client.patch(
            "/api/v1/rooms/room-1/messages/msg-1",
            json={},
        )
        assert response.status_code == 400


class TestDeleteMessage:
    def test_delete_message_success(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[FAKE_MESSAGE]
        )

        response = authenticated_client.delete("/api/v1/rooms/room-1/messages/msg-1")
        assert response.status_code == 204

    def test_delete_message_not_found(self, authenticated_client, mock_supabase):
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[]
        )

        response = authenticated_client.delete("/api/v1/rooms/room-1/messages/nonexistent")
        assert response.status_code == 404
