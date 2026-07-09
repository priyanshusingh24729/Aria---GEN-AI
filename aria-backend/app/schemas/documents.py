"""Request/response models for document endpoints."""
from pydantic import BaseModel


class DocumentStatusResponse(BaseModel):
    ready: bool
    num_chunks: int
    doc_names: list[str]


class ProcessDocumentsResponse(BaseModel):
    success: bool
    num_chunks: int = 0
    doc_names: list[str] = []
    error: str | None = None
