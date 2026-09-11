from typing import Any, Dict, List

from app.database import get_all_complaints

"""
Resource Recommendation Agent — entirely deterministic (no Gemini call):
resourcing is an operations-research question ("how many crews, how urgent"),
not a language-understanding one, so an LLM call here would just add latency
and cost for no accuracy gain. CivicFix has no real equipment/staff inventory
system, so recommendations are always clearly labeled as generic guidance,
never presented as scheduled/available resources.
"""

RESOURCE_PROFILES: Dict[str, Dict[str, Any]] = {
    "pothole": {"department": "Road Maintenance", "manpower": "2-person road repair crew", "equipment": "Asphalt patching kit, road roller"},
    "garbage": {"department": "Sanitation & Waste Management", "manpower": "Sanitation collection crew", "equipment": "Garbage collection truck"},
    "broken_streetlight": {"department": "Electrical Maintenance", "manpower": "1 electrical maintenance technician", "equipment": "Replacement fixture/bulb, bucket truck if pole-mounted"},
    "water_leakage": {"department": "Water Department & Utility", "manpower": "Plumbing/pipeline repair crew", "equipment": "Pipe repair kit, water shutoff tools"},
    "general_civic": {"department": "General Civic Services", "manpower": "General maintenance staff", "equipment": "Assessed on inspection"},
}


def _urgency_for(critical_count: int, total_count: int) -> str:
    if critical_count >= 1:
        return "IMMEDIATE — within 24 hours (critical safety issue present)"
    if total_count >= 10:
        return "HIGH — within 3 days (high issue concentration)"
    if total_count >= 3:
        return "MODERATE — within 1 week"
    return "ROUTINE — standard scheduling"


async def recommend_for_complaint(complaint: Dict[str, Any]) -> Dict[str, Any]:
    """
    Resourcing recommendation scoped to one complaint, informed by how many
    similar issues exist nearby (same area + category) — real DB signal, not
    guesswork.
    """
    category = (complaint.get("category") or "general_civic").lower().replace(" ", "_")
    profile = RESOURCE_PROFILES.get(category, RESOURCE_PROFILES["general_civic"])
    area = complaint.get("area")

    similar = []
    if area:
        all_complaints = await get_all_complaints({"category": complaint.get("category"), "area": area})
        similar = [c for c in all_complaints if c.get("status") not in ("closed",)]

    critical_count = len([c for c in similar if c.get("priority") == "CRITICAL"]) or (1 if complaint.get("priority") == "CRITICAL" else 0)
    total_count = max(len(similar), 1)

    return {
        "complaintId": complaint.get("complaintId"),
        "category": category,
        "department": profile["department"],
        "recommendedManpower": profile["manpower"],
        "recommendedEquipment": profile["equipment"],
        "urgency": _urgency_for(critical_count, total_count),
        "similarOpenIssuesInArea": len(similar),
        "communitySupportCount": complaint.get("communitySupportCount", 0),
        "isRecurrence": complaint.get("isRecurrence", False),
        "disclaimer": "Resource availability data is not configured — this is a generic recommendation based on issue category, severity, and area concentration, not a live inventory allocation.",
    }


async def recommend_for_area(area: str) -> Dict[str, Any]:
    """Aggregated resourcing recommendation across every open category in one area."""
    all_complaints = await get_all_complaints({"area": area})
    open_complaints = [c for c in all_complaints if c.get("status") not in ("closed",)]

    by_category: Dict[str, List[Dict[str, Any]]] = {}
    for c in open_complaints:
        cat = (c.get("category") or "general_civic").lower().replace(" ", "_")
        by_category.setdefault(cat, []).append(c)

    recommendations = []
    for cat, items in by_category.items():
        profile = RESOURCE_PROFILES.get(cat, RESOURCE_PROFILES["general_civic"])
        critical_count = len([c for c in items if c.get("priority") == "CRITICAL"])
        recommendations.append({
            "category": cat,
            "department": profile["department"],
            "openIssueCount": len(items),
            "criticalCount": critical_count,
            "recommendedManpower": profile["manpower"],
            "recommendedEquipment": profile["equipment"],
            "urgency": _urgency_for(critical_count, len(items)),
        })

    recommendations.sort(key=lambda r: r["openIssueCount"], reverse=True)

    return {
        "area": area,
        "totalOpenIssues": len(open_complaints),
        "recommendations": recommendations,
        "disclaimer": "Resource availability data is not configured — recommendations are generic staffing/equipment guidance based on real issue volume in this area, not a live inventory allocation.",
    }
