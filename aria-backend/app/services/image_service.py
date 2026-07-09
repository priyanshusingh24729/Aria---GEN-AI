"""Image Generation service.

generate_image() and ensure_image_dir() are copied from app.py without any
modification — both were already pure Python with zero Streamlit coupling.
"""
import datetime
import os

import fal_client
import requests

from app.config.settings import get_settings

settings = get_settings()


def ensure_image_dir() -> str:
    """Create the configured image output directory if it doesn't exist."""
    os.makedirs(settings.image_output_dir, exist_ok=True)
    return settings.image_output_dir


def generate_image(prompt: str) -> dict:
    """
    Generate an image via FLUX Schnell (Fal AI), download it locally, and
    return a structured result dict — unchanged from app.py.
    """
    try:
        result = fal_client.subscribe(
            "fal-ai/flux/schnell",
            arguments={"prompt": prompt},
        )

        images = result.get("images") or []
        if not images:
            return {"success": False, "url": None, "filepath": None,
                     "error": "No images returned by the API."}

        image_url = images[0].get("url") or images[0].get("image_url") or ""
        if not image_url:
            return {"success": False, "url": None, "filepath": None,
                     "error": "Could not parse image URL from API response."}

        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"aria_img_{timestamp}.png"
        folder = ensure_image_dir()
        filepath = os.path.join(folder, filename)

        response = requests.get(image_url, timeout=60)
        response.raise_for_status()
        with open(filepath, "wb") as f:
            f.write(response.content)

        return {"success": True, "url": image_url, "filepath": filepath, "error": None}

    except fal_client.FalClientError as e:
        return {"success": False, "url": None, "filepath": None, "error": f"Fal AI API error: {e}"}
    except requests.RequestException as e:
        return {"success": False, "url": None, "filepath": None, "error": f"Failed to download image: {e}"}
    except Exception as e:
        return {"success": False, "url": None, "filepath": None, "error": f"Unexpected error: {e}"}
