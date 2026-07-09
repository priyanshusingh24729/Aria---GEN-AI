"""Request/response models for image generation endpoints."""
from pydantic import BaseModel


class ImageGenerateRequest(BaseModel):
    prompt: str


class ImageGenerateResponse(BaseModel):
    success: bool
    url: str | None = None
    filepath: str | None = None
    error: str | None = None
