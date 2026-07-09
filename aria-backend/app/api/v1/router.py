"""Aggregates all feature routers under their endpoint prefixes."""
from fastapi import APIRouter


from app.api.v1.endpoints import chat, documents, images, sql ,datacleaning , analytics

api_router = APIRouter()
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(images.router, prefix="/images", tags=["images"])
api_router.include_router(sql.router, prefix="/sql", tags=["sql"])
api_router.include_router(datacleaning.router)
api_router.include_router(analytics.router)  