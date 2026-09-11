from typing import Any, Dict, List

from app.database import get_complaint, get_all_complaints, get_nearby_complaints_geo
from app.services.recurrence import get_recurring_issues
from app.services.haversine import haversine_distance

"""
Controlled backend tool surface for the Civic Assistant. Gemini never talks
to MongoDB directly — it can only request one of these named tools, the
backend executes it against real data, and the (sanitized) result is fed
back to Gemini to summarize. Every tool strips private fields (uid/email)
before returning.
"""

TOOL_DECLARATIONS: List[Dict[str, Any]] = [
    {
        "name": "get_nearby_issues",
        "description": "Get real civic issues reported near a given GPS location, within a radius in kilometers (max 50).",
        "parameters": {
            "type": "object",
            "properties": {
                "latitude": {"type": "number"},
                "longitude": {"type": "number"},
                "radius_km": {"type": "number", "description": "Search radius in kilometers, default 5, max 50"},
            },
            "required": ["latitude", "longitude"],
        },
    },
    {
        "name": "get_issue_details",
        "description": "Get full details (status, category, priority, community support) for one civic issue by its complaint ID.",
        "parameters": {
            "type": "object",
            "properties": {"complaint_id": {"type": "string"}},
            "required": ["complaint_id"],
        },
    },
    {
        "name": "get_area_statistics",
        "description": "Get a breakdown of issue counts by category for a given area (within radius_km of a GPS point).",
        "parameters": {
            "type": "object",
            "properties": {
                "latitude": {"type": "number"},
                "longitude": {"type": "number"},
                "radius_km": {"type": "number", "description": "default 5, max 50"},
            },
            "required": ["latitude", "longitude"],
        },
    },
    {
        "name": "get_recurring_issues",
        "description": "Get civic issues that have recurred after previously being closed (repeat problems).",
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "get_my_complaints",
        "description": "Get the current signed-in user's own submitted complaints and their status.",
        "parameters": {"type": "object", "properties": {}},
    },
]


def _sanitize(complaint: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "complaintId": complaint.get("complaintId"),
        "category": complaint.get("category"),
        "summary": complaint.get("summary") or complaint.get("description", "")[:120],
        "status": complaint.get("status"),
        "priority": complaint.get("priority"),
        "department": complaint.get("department"),
        "communitySupportCount": complaint.get("communitySupportCount", 0),
        "address": complaint.get("address"),
        "createdAt": complaint.get("createdAt"),
        "isRecurrence": complaint.get("isRecurrence", False),
        "recurrenceCount": complaint.get("recurrenceCount", 0),
    }


async def execute_tool(name: str, args: Dict[str, Any], caller_uid: str) -> Any:
    if name == "get_nearby_issues":
        radius_m = min(float(args.get("radius_km", 5)), 50.0) * 1000.0
        issues = await get_nearby_complaints_geo(float(args["latitude"]), float(args["longitude"]), radius_m)
        return [_sanitize(c) for c in issues[:15]]

    if name == "get_issue_details":
        complaint = await get_complaint(str(args["complaint_id"]))
        if not complaint:
            return {"error": "No issue found with that ID."}
        return _sanitize(complaint)

    if name == "get_area_statistics":
        radius_m = min(float(args.get("radius_km", 5)), 50.0) * 1000.0
        issues = await get_nearby_complaints_geo(float(args["latitude"]), float(args["longitude"]), radius_m)
        breakdown: Dict[str, int] = {}
        for c in issues:
            cat = c.get("category", "other")
            breakdown[cat] = breakdown.get(cat, 0) + 1
        return {"totalIssues": len(issues), "byCategory": breakdown}

    if name == "get_recurring_issues":
        recurring = await get_recurring_issues()
        return [_sanitize(c) for c in recurring[:10]]

    if name == "get_my_complaints":
        # Always scoped to the authenticated caller — the LLM cannot request another user's data.
        mine = await get_all_complaints({"userId": caller_uid})
        return [_sanitize(c) for c in mine[:20]]

    return {"error": f"Unknown tool: {name}"}
