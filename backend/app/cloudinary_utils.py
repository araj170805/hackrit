import os
import base64
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger("civicfix.cloudinary")

cloudinary_configured = False
try:
    import cloudinary
    import cloudinary.uploader
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_CLOUD_NAME != "demo":
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET
        )
        cloudinary_configured = True
        logger.info("Cloudinary client configured successfully.")
except Exception as e:
    logger.warning(f"Cloudinary configuration skipped: {e}")

async def upload_image_to_cloudinary(file_bytes: bytes, file_name: str = "civicfix_photo.jpg") -> str:
    """
    Uploads photo binary data to Cloudinary storage.
    If Cloudinary credentials are not set, converts image bytes into a data URI.
    """
    if cloudinary_configured:
        try:
            res = cloudinary.uploader.upload(file_bytes, folder="civicfix_complaints")
            return res.get("secure_url")
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {e}")

    # Fallback to data URI for zero-dependency local demo support
    encoded = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"
