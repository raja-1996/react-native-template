from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.notes import router as notes_router
from app.api.v1.storage import router as storage_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(notes_router)
api_router.include_router(storage_router)
