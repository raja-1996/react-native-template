from fastapi import APIRouter
from app.api.v1 import auth, todos

v1_router = APIRouter()
v1_router.include_router(auth.router, prefix="/auth", tags=["auth"])
v1_router.include_router(todos.router, prefix="/todos", tags=["todos"])
