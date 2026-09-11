from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.firebase import require_role
from app.services.recurrence import get_recurring_issues

router = APIRouter(prefix="/api/authority", tags=["recurrence"])


@router.get("/recurring-issues")
async def list_recurring_issues(
    auth_payload: Dict[str, Any] = Depends(require_role("admin", "authority"))
):
    """
    Authority dashboard: issues that have recurred after being closed at
    least once, most-recurring first. Purely computed from stored complaint
    data (recurrenceCount is incremented deterministically in the agent
    pipeline — no AI call on this read path).
    """
    return await get_recurring_issues()
