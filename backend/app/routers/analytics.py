from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.firebase import require_role
from app.database import get_all_complaints

router = APIRouter(prefix="/api/authority", tags=["analytics"])


@router.get("/area-analytics")
async def get_area_analytics(
    auth_payload: Dict[str, Any] = Depends(require_role("admin", "authority"))
):
    """
    Real area/locality-wise breakdown of civic issues, grouped by the
    deterministic `area` label captured at complaint-creation time (see
    services/geocoding.py::get_area_label). No fake data: areas with zero
    complaints simply don't appear.
    """
    complaints = await get_all_complaints()
    areas: Dict[str, Dict[str, Any]] = {}

    for c in complaints:
        area = c.get("area") or "Unknown Area"
        bucket = areas.setdefault(area, {
            "area": area,
            "total": 0,
            "byCategory": {},
            "byStatus": {},
            "criticalCount": 0,
            "communitySupportTotal": 0,
        })

        bucket["total"] += 1

        category = c.get("category", "other")
        bucket["byCategory"][category] = bucket["byCategory"].get(category, 0) + 1

        status = c.get("status", "submitted")
        bucket["byStatus"][status] = bucket["byStatus"].get(status, 0) + 1

        if c.get("priority") == "CRITICAL":
            bucket["criticalCount"] += 1

        bucket["communitySupportTotal"] += c.get("communitySupportCount", 0)

    result = sorted(areas.values(), key=lambda a: a["total"], reverse=True)
    return {"totalAreas": len(result), "areas": result}
