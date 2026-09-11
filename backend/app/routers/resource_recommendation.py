from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from app.firebase import require_role
from app.database import get_complaint
from app.services.resource_recommendation import recommend_for_complaint, recommend_for_area

router = APIRouter(tags=["resource-recommendation"])


@router.get("/api/complaints/{complaint_id}/resource-recommendation")
async def get_complaint_resource_recommendation(
    complaint_id: str,
    auth_payload: Dict[str, Any] = Depends(require_role("admin", "authority"))
):
    complaint = await get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return await recommend_for_complaint(complaint)


@router.get("/api/authority/resource-recommendation")
async def get_area_resource_recommendation(
    area: str,
    auth_payload: Dict[str, Any] = Depends(require_role("admin", "authority"))
):
    return await recommend_for_area(area)
