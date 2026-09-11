from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.firebase import verify_firebase_token
from app.database import (
    get_nearby_complaints_geo,
    get_complaint,
    save_complaint,
    get_user_vote,
    add_user_vote,
    remove_user_vote,
    get_user_report,
    add_user_report,
    get_all_community_reports,
    save_notification
)
from app.services.priority import calculate_final_priority
from app.services.haversine import haversine_distance

router = APIRouter(prefix="/api/community", tags=["community"])

class ReportIssueRequest(BaseModel):
    reason: str
    description: Optional[str] = ""

class ModerationActionRequest(BaseModel):
    action: str  # CONFIRMED, REJECTED, NORMAL

COMMUNITY_REPORT_REVIEW_THRESHOLD = 3
NOTIFICATION_THRESHOLDS = [10, 25, 50]

@router.get("/issues/nearby")
async def get_nearby_community_issues(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius: float = Query(50000.0),
    auth_payload: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Returns real civic issues within a 50 KM radius of citizen's coordinates using MongoDB 2dsphere / Haversine.
    Capped at 50,000 meters backend-side.
    Excludes private reporter data (email, phone, UID).
    Includes current user's voting & reporting status.
    """
    effective_radius = min(radius, 50000.0)
    raw_issues = await get_nearby_complaints_geo(latitude, longitude, effective_radius)
    user_id = auth_payload.get("uid") if auth_payload else None

    sanitized_issues = []
    for issue in raw_issues:
        # Distance calculation
        loc = issue.get("location", {})
        c_lat = loc.get("latitude", 0.0)
        c_lon = loc.get("longitude", 0.0)
        dist_m = haversine_distance(latitude, longitude, c_lat, c_lon)
        dist_km = round(dist_m / 1000.0, 1)

        # Check user support & report status
        has_voted = False
        has_reported = False
        is_own_issue = False

        if user_id:
            if issue.get("userId") == user_id:
                is_own_issue = True
            has_voted = await get_user_vote(issue["complaintId"], user_id)
            has_reported = await get_user_report(issue["complaintId"], user_id)

        sanitized_issues.append({
            "complaintId": issue.get("complaintId"),
            "category": issue.get("category"),
            "summary": issue.get("summary"),
            "description": issue.get("description"),
            "address": issue.get("address"),
            "imageUrl": issue.get("imageUrl"),
            "status": issue.get("status"),
            "priority": issue.get("priority"),
            "priorityScore": issue.get("priorityScore"),
            "finalPriorityScore": issue.get("finalPriorityScore", issue.get("priorityScore", 1)),
            "communitySupportCount": issue.get("communitySupportCount", 0),
            "communitySignal": issue.get("communitySignal", "LOW"),
            "moderationStatus": issue.get("moderationStatus", "NORMAL"),
            "createdAt": issue.get("createdAt"),
            "distanceKm": dist_km,
            "location": loc,
            "hasVoted": has_voted,
            "hasReported": has_reported,
            "isOwnIssue": is_own_issue
        })

    # Sort by final priority score descending
    sanitized_issues.sort(key=lambda x: x["finalPriorityScore"], reverse=True)
    return sanitized_issues


@router.post("/issues/{issue_id}/support")
async def support_community_issue(
    issue_id: str,
    auth_payload: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Toggles or adds a support vote for a community issue.
    Enforces:
    - User cannot support their own reported issue.
    - Unique vote constraint (1 user = 1 vote).
    """
    user_id = auth_payload.get("uid")
    if not user_id or user_id == "demo-user-123":
        user_id = auth_payload.get("uid", "demo-user-123")

    complaint = await get_complaint(issue_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Issue not found")

    if complaint.get("userId") == user_id:
        raise HTTPException(status_code=400, detail="You reported this issue and cannot support your own report.")

    already_voted = await get_user_vote(issue_id, user_id)
    if already_voted:
        # Toggle off / remove vote
        success = await remove_user_vote(issue_id, user_id)
        if success:
            new_count = max(0, complaint.get("communitySupportCount", 1) - 1)
            complaint["communitySupportCount"] = new_count
            
            # Recalculate hybrid priority score
            final_score, priority_lvl, signal, _ = calculate_final_priority(complaint)
            complaint["finalPriorityScore"] = final_score
            complaint["priority"] = priority_lvl
            complaint["communitySignal"] = signal
            
            await save_complaint(complaint)
            return {
                "status": "unsupported",
                "communitySupportCount": new_count,
                "hasVoted": False,
                "finalPriorityScore": final_score,
                "priority": priority_lvl,
                "communitySignal": signal
            }

    # Add vote
    added = await add_user_vote(issue_id, user_id)
    if not added:
        raise HTTPException(status_code=400, detail="You have already supported this issue.")

    new_count = complaint.get("communitySupportCount", 0) + 1
    complaint["communitySupportCount"] = new_count

    # Recalculate hybrid priority score
    final_score, priority_lvl, signal, _ = calculate_final_priority(complaint)
    complaint["finalPriorityScore"] = final_score
    complaint["priority"] = priority_lvl
    complaint["communitySignal"] = signal

    # Check notification thresholds (10, 25, 50 votes)
    triggered = complaint.get("communityThresholdsTriggered", [])
    for threshold in NOTIFICATION_THRESHOLDS:
        if new_count >= threshold and threshold not in triggered:
            triggered.append(threshold)
            complaint["communityThresholdsTriggered"] = triggered
            
            # Notify authority
            await save_notification({
                "userId": "authority_admin",
                "title": f"🔥 Community Support Milestone: {issue_id}",
                "body": f"Issue {issue_id} reached {new_count} community support votes! Priority elevated to {priority_lvl}.",
                "type": "community_threshold",
                "complaintId": issue_id,
                "createdAt": datetime.utcnow().isoformat()
            })

    await save_complaint(complaint)

    return {
        "status": "supported",
        "communitySupportCount": new_count,
        "hasVoted": True,
        "finalPriorityScore": final_score,
        "priority": priority_lvl,
        "communitySignal": signal
    }


@router.post("/issues/{issue_id}/report")
async def report_community_issue(
    issue_id: str,
    payload: ReportIssueRequest,
    auth_payload: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Flags/Reports an issue for moderation (e.g., non-existent, wrong location, duplicate).
    Enforces 1 report per citizen per issue.
    When report count >= 3, sets moderationStatus to UNDER_REVIEW.
    """
    user_id = auth_payload.get("uid", "demo-user-123")

    complaint = await get_complaint(issue_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Issue not found")

    already_reported = await get_user_report(issue_id, user_id)
    if already_reported:
        raise HTTPException(status_code=400, detail="You have already reported this issue for review.")

    added = await add_user_report(issue_id, user_id, payload.reason, payload.description or "")
    if not added:
        raise HTTPException(status_code=400, detail="Failed to record moderation report.")

    new_rep_count = complaint.get("communityReportCount", 0) + 1
    complaint["communityReportCount"] = new_rep_count

    if new_rep_count >= COMMUNITY_REPORT_REVIEW_THRESHOLD and complaint.get("moderationStatus") == "NORMAL":
        complaint["moderationStatus"] = "UNDER_REVIEW"

    await save_complaint(complaint)

    return {
        "status": "reported",
        "communityReportCount": new_rep_count,
        "moderationStatus": complaint.get("moderationStatus"),
        "hasReported": True
    }


@router.get("/reports")
async def list_community_reports(
    auth_payload: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Authority Command Center endpoint: Lists all flagged community reports needing moderation.
    """
    reports = await get_all_community_reports()
    return reports


@router.patch("/issues/{issue_id}/moderation")
async def update_issue_moderation_status(
    issue_id: str,
    payload: ModerationActionRequest,
    auth_payload: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Authority Command Center endpoint: Updates moderation status (CONFIRMED, REJECTED, NORMAL).
    """
    complaint = await get_complaint(issue_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Issue not found")

    complaint["moderationStatus"] = payload.action
    await save_complaint(complaint)

    return {
        "status": "updated",
        "issueId": issue_id,
        "moderationStatus": payload.action
    }
