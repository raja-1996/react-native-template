from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import get_current_user
from app.core.supabase import get_supabase
from app.schemas.notes import (
    MessageCreate,
    MessageResponse,
    MessageUpdate,
    PaginatedMessages,
    RoomCreate,
    RoomMemberResponse,
    RoomResponse,
    RoomUpdate,
)

rooms_router = APIRouter(prefix="/rooms", tags=["rooms"])
messages_router = APIRouter(prefix="/rooms/{room_id}/messages", tags=["messages"])

PAGE_SIZE = 30


# ---- Rooms ----


@rooms_router.get("", response_model=list[RoomResponse])
async def list_rooms(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    memberships = (
        supabase.table("room_members")
        .select("room_id")
        .eq("user_id", user["id"])
        .execute()
    )
    room_ids = [m["room_id"] for m in memberships.data]
    if not room_ids:
        return []
    response = (
        supabase.table("rooms")
        .select("*")
        .in_("id", room_ids)
        .order("updated_at", desc=True)
        .execute()
    )
    return response.data


@rooms_router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(data: RoomCreate, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("rooms")
        .insert({"name": data.name, "created_by": user["id"]})
        .execute()
    )
    room = response.data[0]
    # Add creator as member
    supabase.table("room_members").insert(
        {"room_id": room["id"], "user_id": user["id"]}
    ).execute()
    return room


@rooms_router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    _verify_membership(supabase, room_id, user["id"])
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
    supabase = get_supabase()
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update"
        )
    response = (
        supabase.table("rooms")
        .update(update_data)
        .eq("id", room_id)
        .eq("created_by", user["id"])
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return response.data[0]


@rooms_router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(room_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("rooms")
        .delete()
        .eq("id", room_id)
        .eq("created_by", user["id"])
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")


# ---- Room Members ----


@rooms_router.get("/{room_id}/members", response_model=list[RoomMemberResponse])
async def list_members(room_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    _verify_membership(supabase, room_id, user["id"])
    response = (
        supabase.table("room_members")
        .select("*")
        .eq("room_id", room_id)
        .execute()
    )
    return response.data


@rooms_router.post(
    "/{room_id}/members/{member_user_id}",
    response_model=RoomMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(room_id: str, member_user_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    _verify_membership(supabase, room_id, user["id"])
    response = (
        supabase.table("room_members")
        .insert({"room_id": room_id, "user_id": member_user_id})
        .execute()
    )
    return response.data[0]


@rooms_router.delete(
    "/{room_id}/members/{member_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member(room_id: str, member_user_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    # Only allow removing self or room creator removing others
    room = supabase.table("rooms").select("created_by").eq("id", room_id).single().execute()
    if not room.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    if member_user_id != user["id"] and room.data["created_by"] != user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    supabase.table("room_members").delete().eq("room_id", room_id).eq(
        "user_id", member_user_id
    ).execute()


# ---- Messages ----


@messages_router.get("", response_model=PaginatedMessages)
async def list_messages(
    room_id: str,
    cursor: str | None = Query(None),
    limit: int = Query(PAGE_SIZE, le=100),
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()
    _verify_membership(supabase, room_id, user["id"])
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
    supabase = get_supabase()
    _verify_membership(supabase, room_id, user["id"])
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
    supabase = get_supabase()
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
        .eq("user_id", user["id"])
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return response.data[0]


@messages_router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    room_id: str, message_id: str, user: dict = Depends(get_current_user)
):
    supabase = get_supabase()
    response = (
        supabase.table("messages")
        .delete()
        .eq("id", message_id)
        .eq("room_id", room_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")


# ---- Helpers ----


def _verify_membership(supabase, room_id: str, user_id: str):
    membership = (
        supabase.table("room_members")
        .select("id")
        .eq("room_id", room_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not membership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this room"
        )
