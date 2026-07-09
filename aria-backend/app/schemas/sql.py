"""Request/response models for SQL assistant endpoints."""
from pydantic import BaseModel


class SqlUploadResponse(BaseModel):
    session_id: str
    tables: list[str]
    schema_text: str
    source_name: str


class SqlSchemaResponse(BaseModel):
    session_id: str
    tables: list[str]
    schema_text: str
    source_name: str


class SqlQueryRequest(BaseModel):
    session_id: str
    question: str
