import httpx
import logging
from typing import Dict, Any, Optional
from app.config import settings
from app.database import db_wrapper

logger = logging.getLogger("civicfix.geocoding")

async def reverse_geocode(lat: float, lon: float) -> str:
    """
    Converts (latitude, longitude) into a human-readable address string using Nominatim API.
    Caches results to avoid hitting API usage limits.
    """
    cache_key = f"{round(lat, 4)},{round(lon, 4)}"
    
    # Check database/memory cache first
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        cached = await db_wrapper.db.geocode_cache.find_one({"key": cache_key})
        if cached:
            return cached["address"]
    elif cache_key in db_wrapper.memory_geocode_cache:
        return db_wrapper.memory_geocode_cache[cache_key]

    headers = {
        "User-Agent": "CivicFix-App/1.0 (civicfix-hackathon@app.internal)"
    }
    url = f"{settings.NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat={lat}&lon={lon}"

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                display_name = data.get("display_name")
                if display_name:
                    address = str(display_name)
                    # Cache in DB / Memory
                    if not db_wrapper.is_mock and db_wrapper.db is not None:
                        await db_wrapper.db.geocode_cache.insert_one({"key": cache_key, "address": address})
                    else:
                        db_wrapper.memory_geocode_cache[cache_key] = address
                    return address
    except Exception as e:
        logger.warning(f"Reverse geocoding request to Nominatim failed: {e}")

    # Fallback formatting if Nominatim is unreachable or rate limited
    fallback_address = f"Location at {lat:.4f}° N, {lon:.4f}° E"
    return fallback_address
