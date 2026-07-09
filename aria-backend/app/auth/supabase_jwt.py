"""Supabase JWT validation — a FastAPI dependency that protects routes.

app.py had no authentication at all. Per the earlier decision to keep
auth unscoped for now, this dependency defaults to SKIP_AUTH=true so every
endpoint works without a token during local development. Flip SKIP_AUTH
to false and fill in SUPABASE_JWT_SECRET once the Next.js auth pages
(Phase 3) issue real Supabase tokens.
"""
import jwt
from fastapi import Header, HTTPException, status

from app.config.settings import get_settings

settings = get_settings()


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """Validate a Supabase-issued JWT from the Authorization: Bearer <token> header."""
    if settings.skip_auth:
        return {"sub": "local-dev-user"}

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")

    return payload
