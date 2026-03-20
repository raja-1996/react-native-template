from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.auth import get_current_user
from app.core.supabase import get_supabase
from app.schemas.storage import PresignedUrlResponse, UploadResponse

router = APIRouter(prefix="/storage", tags=["storage"])

BUCKET = "attachments"


@router.post("/upload/{note_id}", response_model=UploadResponse)
async def upload_file(
    note_id: str,
    file: UploadFile,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()

    # Verify note belongs to user
    note = (
        supabase.table("notes")
        .select("id")
        .eq("id", note_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not note.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    file_path = f"{user['id']}/{note_id}/{file.filename}"
    content = await file.read()

    supabase.storage.from_(BUCKET).upload(
        file_path,
        content,
        {"content-type": file.content_type or "application/octet-stream"},
    )

    # Update note with attachment path
    supabase.table("notes").update({"attachment_path": file_path}).eq("id", note_id).execute()

    # Get public URL
    url = supabase.storage.from_(BUCKET).get_public_url(file_path)

    return UploadResponse(path=file_path, url=url)


@router.get("/download/{note_id}", response_model=PresignedUrlResponse)
async def get_download_url(
    note_id: str,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()

    note = (
        supabase.table("notes")
        .select("attachment_path")
        .eq("id", note_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not note.data or not note.data.get("attachment_path"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No attachment found"
        )

    result = supabase.storage.from_(BUCKET).create_signed_url(
        note.data["attachment_path"], expires_in=3600
    )

    return PresignedUrlResponse(url=result["signedURL"])


@router.delete("/delete/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    note_id: str,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()

    note = (
        supabase.table("notes")
        .select("attachment_path")
        .eq("id", note_id)
        .eq("user_id", user["id"])
        .single()
        .execute()
    )
    if not note.data or not note.data.get("attachment_path"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No attachment found"
        )

    supabase.storage.from_(BUCKET).remove([note.data["attachment_path"]])
    supabase.table("notes").update({"attachment_path": None}).eq("id", note_id).execute()
