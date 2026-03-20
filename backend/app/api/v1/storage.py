from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.auth import get_current_user
from app.core.supabase import get_supabase
from app.schemas.storage import PresignedUrlResponse, UploadResponse

router = APIRouter(prefix="/storage", tags=["storage"])

BUCKET = "chat-images"


@router.post("/upload", response_model=UploadResponse)
async def upload_image(
    file: UploadFile,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed"
        )

    file_path = f"{user['id']}/{file.filename}"
    content = await file.read()

    supabase.storage.from_(BUCKET).upload(
        file_path,
        content,
        {"content-type": file.content_type},
    )

    url = supabase.storage.from_(BUCKET).get_public_url(file_path)

    return UploadResponse(path=file_path, url=url)


@router.get("/url/{file_path:path}", response_model=PresignedUrlResponse)
async def get_image_url(
    file_path: str,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()

    result = supabase.storage.from_(BUCKET).create_signed_url(
        file_path, expires_in=3600
    )

    return PresignedUrlResponse(url=result["signedURL"])


@router.delete("/delete/{file_path:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    file_path: str,
    user: dict = Depends(get_current_user),
):
    supabase = get_supabase()

    # Only allow users to delete their own files
    if not file_path.startswith(f"{user['id']}/"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete other users' files"
        )

    supabase.storage.from_(BUCKET).remove([file_path])
