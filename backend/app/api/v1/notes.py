from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import get_current_user
from app.core.supabase import get_user_supabase
from app.schemas.notes import (
    MessageCreate,
    MessageResponse,
    MessageUpdate,
    PaginatedMessages,
    RoomCreate,
    RoomResponse,
    RoomUpdate,
)

rooms_router = APIRouter(prefix="/rooms", tags=["rooms"])
messages_router = APIRouter(prefix="/rooms/{room_id}/messages", tags=["messages"])

PAGE_SIZE = 30


# ---- Rooms ----


@rooms_router.get("", response_model=list[RoomResponse])
async def list_rooms(user: dict = Depends(get_current_user)):
    supabase = get_user_supabase(user["token"])
    response = (
        supabase.table("rooms")
        .select("*")
        .order("updated_at", desc=True)
        .execute()
    )
    return response.data


@rooms_router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(data: RoomCreate, user: dict = Depends(get_current_user)):
    supabase = get_user_supabase(user["token"])
    response = (
        supabase.table("rooms")
        .insert({"name": data.name, "created_by": user["id"]})
        .execute()
    )
    return response.data[0]


@rooms_router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: str, user: dict = Depends(get_current_user)):
    supabase = get_user_supabase(user["token"])
    response = (
        supabase.table("rooms")
        .select("*")
        .eq("id", room_id)
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return response.data


@rooms_router.patch("/{room_id}", response_model=RoomResponse)
async def update_room(room_id: str, data: RoomUpdate, user: dict = Depends(get_current_user)):
    supabase = get_user_supabase(user["token"])
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update"
        )
    response = (
        supabase.table("rooms")
        .update(update_data)
        .eq("id", room_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return response.data[0]


@rooms_router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(room_id: str, user: dict = Depends(get_current_user)):
    supabase = get_user_supabase(user["token"])
    response = (
        supabase.table("rooms")
        .delete()
        .eq("id", room_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")


# ---- Messages ----


@messages_router.get("", response_model=PaginatedMessages)
async def list_messages(
    room_id: str,
    cursor: str | None = Query(None),
    limit: int = Query(PAGE_SIZE, le=100),
    user: dict = Depends(get_current_user),
):
    supabase = get_user_supabase(user["token"])
    query = (
        supabase.table("messages")
        .select("*")
        .eq("room_id", room_id)
        .order("created_at", desc=True)
        .limit(limit + 1)
    )
    if cursor:
        query = query.lt("created_at", cursor)
    response = query.execute()
    items = response.data
    has_more = len(items) > limit
    if has_more:
        items = items[:limit]
    next_cursor = items[-1]["created_at"] if items and has_more else None
    return PaginatedMessages(data=items, next_cursor=next_cursor, has_more=has_more)


@messages_router.post("", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    room_id: str, data: MessageCreate, user: dict = Depends(get_current_user)
):
    supabase = get_user_supabase(user["token"])
    response = (
        supabase.table("messages")
        .insert({
            "room_id": room_id,
            "user_id": user["id"],
            "content": data.content,
            "image_path": data.image_path,
        })
        .execute()
    )
    return response.data[0]


@messages_router.patch("/{message_id}", response_model=MessageResponse)
async def update_message(
    room_id: str, message_id: str, data: MessageUpdate, user: dict = Depends(get_current_user)
):
    supabase = get_user_supabase(user["token"])
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update"
        )
    response = (
        supabase.table("messages")
        .update(update_data)
        .eq("id", message_id)
        .eq("room_id", room_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return response.data[0]


@messages_router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    room_id: str, message_id: str, user: dict = Depends(get_current_user)
):
    supabase = get_user_supabase(user["token"])
    response = (
        supabase.table("messages")
        .delete()
        .eq("id", message_id)
        .eq("room_id", room_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
