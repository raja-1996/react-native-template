from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.core.supabase import get_supabase
from app.schemas.notes import NoteCreate, NoteResponse, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[NoteResponse])
async def list_notes(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("notes")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("notes")
        .select("*")
        .eq("id", note_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return response.data


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(data: NoteCreate, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("notes")
        .insert({"user_id": user["id"], "title": data.title, "content": data.content})
        .execute()
    )
    return response.data[0]


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str, data: NoteUpdate, user: dict = Depends(get_current_user)
):
    supabase = get_supabase()
    update_data = data.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update"
        )
    response = (
        supabase.table("notes")
        .update(update_data)
        .eq("id", note_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return response.data[0]


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: str, user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    response = (
        supabase.table("notes")
        .delete()
        .eq("id", note_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
