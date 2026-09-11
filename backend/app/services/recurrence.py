from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.database import get_all_complaints, save_complaint
from app.services.haversine import haversine_distance

RECURRENCE_RADIUS_METERS = 150.0
RECURRENCE_WINDOW_DAYS = 120


async def detect_recurrence(category: str, latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    """
    Deterministic recurrence check: is there a previously CLOSED issue of the
    same category near this new complaint, closed within the recurrence
    window? First-pass filter only — proximity + category + recency, no AI.
    """
    cat_clean = (category or "").lower().replace(" ", "_")
    cutoff = (datetime.utcnow() - timedelta(days=RECURRENCE_WINDOW_DAYS)).isoformat()

    all_complaints = await get_all_complaints({"status": "closed"})
    best_match = None
    best_distance = None

    for c in all_complaints:
        if c.get("category", "").lower().replace(" ", "_") != cat_clean:
            continue
        closed_at = c.get("closedAt") or ""
        if closed_at < cutoff:
            continue
        loc = c.get("location", {})
        c_lat, c_lon = loc.get("latitude"), loc.get("longitude")
        if c_lat is None or c_lon is None:
            continue
        dist = haversine_distance(latitude, longitude, c_lat, c_lon)
        if dist <= RECURRENCE_RADIUS_METERS and (best_distance is None or dist < best_distance):
            best_match, best_distance = c, dist

    if not best_match:
        return None

    return {
        "complaintId": best_match["complaintId"],
        "distanceMeters": best_distance,
        "closedAt": best_match.get("closedAt"),
        "confidence": "HIGH" if best_distance <= 50 else "MEDIUM",
    }


async def register_recurrence(previous_complaint_id: str) -> None:
    """Increments the recurrence counter on the original (now-recurring) issue."""
    from app.database import get_complaint
    original = await get_complaint(previous_complaint_id)
    if not original:
        return
    original["recurrenceCount"] = original.get("recurrenceCount", 0) + 1
    original["lastRecurrenceAt"] = datetime.utcnow().isoformat()
    await save_complaint(original)


async def get_recurring_issues() -> List[Dict[str, Any]]:
    """All issues that have had at least one recurrence, most-recurring first."""
    all_complaints = await get_all_complaints()
    recurring = [c for c in all_complaints if c.get("recurrenceCount", 0) > 0]
    recurring.sort(key=lambda c: c.get("recurrenceCount", 0), reverse=True)
    return recurring
