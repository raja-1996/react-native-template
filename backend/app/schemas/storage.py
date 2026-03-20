from pydantic import BaseModel


class UploadResponse(BaseModel):
    path: str
    url: str


class PresignedUrlResponse(BaseModel):
    url: str
