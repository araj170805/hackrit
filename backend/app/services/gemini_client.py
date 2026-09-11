import base64
import json
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

logger = logging.getLogger("civicfix.gemini")

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
MAX_IMAGE_FETCH_BYTES = 8 * 1024 * 1024


def gemini_configured() -> bool:
    return bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 5)


async def fetch_image_as_inline_part(image_url: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Builds a Gemini multimodal `inline_data` part from an image URL so the
    model actually sees the pixels, instead of just being told a URL string
    (Gemini cannot fetch arbitrary URLs itself). Supports both data: URIs
    (Cloudinary-not-configured fallback) and real https:// Cloudinary URLs.
    Returns None on any failure — callers must fall back to text-only analysis.
    """
    if not image_url:
        return None

    try:
        if image_url.startswith("data:"):
            header, _, b64data = image_url.partition(",")
            mime_type = header.split(";")[0].replace("data:", "") or "image/jpeg"
            return {"inline_data": {"mime_type": mime_type, "data": b64data}}

        if image_url.startswith("http://") or image_url.startswith("https://"):
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(image_url)
                if res.status_code != 200 or len(res.content) > MAX_IMAGE_FETCH_BYTES:
                    return None
                mime_type = res.headers.get("content-type", "image/jpeg").split(";")[0]
                if not mime_type.startswith("image/"):
                    return None
                encoded = base64.b64encode(res.content).decode("utf-8")
                return {"inline_data": {"mime_type": mime_type, "data": encoded}}
    except Exception as e:
        logger.warning(f"Failed to fetch image for Gemini vision analysis: {e}")

    return None


async def call_gemini_json(prompt: str, image_part: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """
    Single shared entry point for every Gemini call in the app so cost
    control (timeout, JSON-only response, one retry-free attempt) lives in
    one place. Returns None on any failure so callers use deterministic
    fallbacks rather than retrying Gemini.
    """
    if not gemini_configured():
        return None

    parts: List[Dict[str, Any]] = [{"text": prompt}]
    if image_part:
        parts.append(image_part)

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"response_mime_type": "application/json"}
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(GEMINI_URL.format(key=settings.GEMINI_API_KEY), json=payload)
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
            logger.warning(f"Gemini API returned {res.status_code}: {res.text[:200]}")
    except Exception as e:
        logger.warning(f"Gemini API call failed: {e}")

    return None
