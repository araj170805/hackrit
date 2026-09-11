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


def _extract_area_label(address_components: Dict[str, Any], display_name: str) -> str:
    """
    Picks a coarse, ward/locality-ish label for area-wise analytics grouping.
    Prefers Nominatim's structured address components (most granular first);
    falls back to a heuristic slice of the display name when unavailable.
    """
    for key in ("suburb", "neighbourhood", "city_district", "town", "village", "city", "county"):
        val = address_components.get(key)
        if val:
            return str(val)

    parts = [p.strip() for p in (display_name or "").split(",") if p.strip()]
    if len(parts) >= 3:
        return parts[-4] if len(parts) >= 4 else parts[-3]
    return display_name or "Unknown Area"


# Separate cache (own key namespace) so this doesn't disturb the existing
# address-only cache shape relied on by reverse_geocode() above.
_area_cache_mem: Dict[str, str] = {}


async def get_area_label(lat: float, lon: float, address_hint: Optional[str] = None) -> str:
    """
    Returns a coarse area/locality label for a coordinate, used to group
    complaints for area-wise analytics. Caches to avoid repeated Nominatim
    calls; reuses the same reverse-geocode request rather than issuing a
    second one when possible.
    """
    cache_key = f"{round(lat, 4)},{round(lon, 4)}"

    if not db_wrapper.is_mock and db_wrapper.db is not None:
        cached = await db_wrapper.db.geocode_area_cache.find_one({"key": cache_key})
        if cached:
            return cached["area"]
    elif cache_key in _area_cache_mem:
        return _area_cache_mem[cache_key]

    headers = {"User-Agent": "CivicFix-App/1.0 (civicfix-hackathon@app.internal)"}
    url = f"{settings.NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat={lat}&lon={lon}"
    area = None

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                area = _extract_area_label(data.get("address", {}) or {}, data.get("display_name", ""))
    except Exception as e:
        logger.warning(f"Area lookup via Nominatim failed: {e}")

    if not area:
        area = _extract_area_label({}, address_hint or "")

    if not db_wrapper.is_mock and db_wrapper.db is not None:
        await db_wrapper.db.geocode_area_cache.insert_one({"key": cache_key, "area": area})
    else:
        _area_cache_mem[cache_key] = area

    return area
