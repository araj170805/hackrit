from fastapi import APIRouter
from app.database import get_all_complaints

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats")
async def get_dashboard_stats():
    complaints = await get_all_complaints()
    
    total = len(complaints)
    active_cases = len([c for c in complaints if c.get("status") in ["submitted", "in_progress", "escalated"]])
    high_priority = len([c for c in complaints if c.get("priority") in ["HIGH", "CRITICAL"]])
    sla_breached = len([c for c in complaints if c.get("escalated", False) or c.get("status") == "escalated"])
    resolved = len([c for c in complaints if c.get("status") == "resolved"])
    
    affected_citizens = sum([c.get("affectedCitizens", 1) for c in complaints])

    # Calculate department-wise breakdown dynamically from real MongoDB data
    department_stats = {}
    for c in complaints:
        dept = c.get("department", "Unassigned")
        if dept not in department_stats:
            department_stats[dept] = {
                "total": 0,
                "active": 0,
                "resolved": 0,
                "slaBreached": 0
            }
        department_stats[dept]["total"] += 1
        st = c.get("status")
        if st in ["submitted", "in_progress", "escalated"]:
            department_stats[dept]["active"] += 1
        if st == "resolved":
            department_stats[dept]["resolved"] += 1
        if c.get("escalated", False) or st == "escalated":
            department_stats[dept]["slaBreached"] += 1

    return {
        "totalComplaints": total,
        "activeCases": active_cases,
        "highPriority": high_priority,
        "slaBreached": sla_breached,
        "resolved": resolved,
        "citizensAffected": affected_citizens,
        "departmentBreakdown": department_stats
    }
