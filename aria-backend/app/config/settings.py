"""App settings loaded from environment variables.

Every constant that was hardcoded at the top of the original Streamlit
app.py (CHROMA_DIR, MISTRAL_MODEL, EMBED_MODEL, IMAGE_OUTPUT_DIR,
SQL_TEMP_DIR) now lives here as an environment variable with the same
default value, so behaviour is unchanged unless a .env overrides it.
"""
from functools import lru_cache
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── AI provider keys ─────────────────────────────────────────────────
    mistral_api_key: str = ""
    fal_key: str = ""

    # ── Model names (unchanged from app.py) ─────────────────────────────
    mistral_model: str = "mistral-small-2506"
    embed_model: str = "mistral-embed"

    # ── Storage paths (unchanged from app.py) ───────────────────────────
    chroma_dir: str = "chroma_db"
    image_output_dir: str = "generated_images"
    sql_temp_dir: str = "sql_temp"

    # ── Supported document types (unchanged from app.py) ───────────────
    supported_doc_types: list[str] = ["pdf", "docx", "txt", "md", "csv"]

    # ── Auth (Supabase) ───────────────────────────────────────────────────
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    skip_auth: bool = True  # set false once Supabase auth is wired up

    # ── CORS ───────────────────────────────────────────────────────────────
    cors_origins: list[str] = [
    "http://localhost:3000",
    "https://agent-6a4f768db4d46d2b6d7f5927--aria-leo.netlify.app",
    "http://aria-gen-ai-nine.vercel.app/"
]
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor — call this everywhere instead of constructing Settings() directly."""

    settings = Settings()

    if settings.mistral_api_key:
        os.environ.setdefault("MISTRAL_API_KEY", settings.mistral_api_key)

    if settings.fal_key:
        os.environ.setdefault("FAL_KEY", settings.fal_key)

    return settings
