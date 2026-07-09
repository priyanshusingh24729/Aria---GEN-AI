"""Request/response models for chat endpoints."""
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class GeneralChatRequest(BaseModel):
    query: str
    history: list[ChatMessage] = []


class RagChatRequest(BaseModel):
    query: str
    history: list[ChatMessage] = []
