from pydantic import BaseModel


class NoteCreate(BaseModel):
    title: str
    content: str = ""


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


class NoteResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    attachment_path: str | None = None
    created_at: str
    updated_at: str
