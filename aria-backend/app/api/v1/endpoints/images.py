"""Image Generation endpoint: prompt → image URL + local filepath."""
from fastapi import APIRouter, Depends

from app.auth.supabase_jwt import get_current_user
from app.schemas.images import ImageGenerateRequest, ImageGenerateResponse
from app.services.image_service import generate_image

router = APIRouter()


@router.post("/generate", response_model=ImageGenerateResponse)
async def generate(payload: ImageGenerateRequest, user: dict = Depends(get_current_user)):
    """Generate an image from a text prompt via FLUX Schnell and save it to the local filesystem."""
    result = generate_image(payload.prompt)
    return ImageGenerateResponse(**result)
