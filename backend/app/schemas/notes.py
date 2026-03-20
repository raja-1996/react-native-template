from pydantic import BaseModel


# --- Rooms ---


class RoomCreate(BaseModel):
    name: str


class RoomUpdate(BaseModel):
    name: str | None = None


class RoomResponse(BaseModel):
    id: str
    name: str
    created_by: str
    created_at: str
    updated_at: str


class RoomMemberResponse(BaseModel):
    id: str
    room_id: str
    user_id: str
    joined_at: str


# --- Messages ---


class MessageCreate(BaseModel):
    content: str = ""
    image_path: str | None = None


class MessageUpdate(BaseModel):
    content: str | None = None


class MessageResponse(BaseModel):
    id: str
    room_id: str
    user_id: str
    content: str
    image_path: str | None = None
    created_at: str
    updated_at: str


# --- Pagination ---


class PaginatedMessages(BaseModel):
    data: list[MessageResponse]
    next_cursor: str | None = None
    has_more: bool = False
