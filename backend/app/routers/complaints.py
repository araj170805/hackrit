from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.models import ComplaintSubmitRequest, StatusUpdateRequest
from app.database import get_all_complaints, get_complaint, save_complaint, get_agent_log, save_agent_log, save_notification
from app.firebase import verify_firebase_token, require_role
from app.services.community_impact import calculate_community_impact_score
from app.services.priority import calculate_priority_score
from app.agent.graph import process_civic_complaint_agent
from app.services.duplicate import find_nearby_complaints
from app.cloudinary_utils import upload_image_to_cloudinary

router = APIRouter(prefix="/api/complaints", tags=["complaints"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB


def _sanitize_complaint(complaint: Dict[str, Any]) -> Dict[str, Any]:
    """
    Strips the raw one-time verification token before a complaint is returned
    from any general read endpoint — these endpoints have no role/ownership
    check, so the secret token (which grants the ability to submit resolution
    evidence) must never ride along. verificationStatus is still exposed.
    """
    if "verificationToken" not in complaint:
        return complaint
    sanitized = dict(complaint)
    token_record = sanitized.pop("verificationToken", None)
    if token_record:
        sanitized["verificationTokenIssued"] = not token_record.get("used", False)
    return sanitized

@router.post("")
async def create_complaint(
    payload: ComplaintSubmitRequest,
    auth_payload: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    User -> Agent -> Tools -> Database -> Actions -> Monitoring -> Escalation
    Triggers the LangGraph Agent pipeline to analyze, classify, reverse-geocode, score priority,
    detect duplicates, assign department, and persist complaint.
    """
    request_dict = payload.dict()
    if auth_payload.get("uid"):
        request_dict["userId"] = auth_payload.get("uid")
        request_dict["userEmail"] = auth_payload.get("email")

    result = await process_civic_complaint_agent(request_dict)
    return result

@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    auth_payload: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Uploads issue photo binary to Cloudinary.
    Validates content-type and size server-side — never trusts the client's
    declared MIME type alone (content-type header can be spoofed, so we also
    sniff the actual image magic bytes).
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type. Only JPEG, PNG, WEBP, or HEIC images are allowed.")

    contents = await file.read()

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail=f"Image exceeds the {MAX_IMAGE_BYTES // (1024 * 1024)}MB size limit.")
    if not _looks_like_image(contents):
        raise HTTPException(status_code=400, detail="File does not appear to be a valid image.")

    try:
        url = await upload_image_to_cloudinary(contents, file.filename or "photo.jpg")
        return {"imageUrl": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")


def _looks_like_image(data: bytes) -> bool:
    """Sniffs common image magic bytes so a renamed/mislabeled non-image file is rejected."""
    if data.startswith(b"\xff\xd8\xff"):  # JPEG
        return True
    if data.startswith(b"\x89PNG\r\n\x1a\n"):  # PNG
        return True
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":  # WEBP
        return True
    if data[4:12] in (b"ftypheic", b"ftypheix", b"ftypmif1", b"ftypheim"):  # HEIC/HEIF
        return True
    return False

@router.get("")
async def list_complaints(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    userId: Optional[str] = None
):
    filters = {}
    if category and category != "all":
        filters["category"] = category
    if priority and priority != "all":
        filters["priority"] = priority
    if status and status != "all":
        filters["status"] = status
    if department and department != "all":
        filters["department"] = department
    if userId:
        filters["userId"] = userId

    complaints = await get_all_complaints(filters)
    return [_sanitize_complaint(c) for c in complaints]

@router.get("/nearby")
async def search_nearby(lat: float = Query(...), lon: float = Query(...), radius: float = Query(200.0)):
    nearby = await find_nearby_complaints(lat, lon, radius_meters=radius)
    return [_sanitize_complaint(c) for c in nearby]

@router.get("/{complaint_id}")
async def get_complaint_details(complaint_id: str):
    complaint = await get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    agent_log = await get_agent_log(complaint_id)
    return {
        "complaint": _sanitize_complaint(complaint),
        "agentLog": agent_log.get("events", []) if agent_log else []
    }

@router.patch("/{complaint_id}/status")
async def update_complaint_status(
    complaint_id: str,
    body: StatusUpdateRequest,
    auth_payload: Dict[str, Any] = Depends(require_role("admin", "authority"))
):
    complaint = await get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_status = complaint.get("status")
    complaint["status"] = body.status
    if body.department:
        complaint["department"] = body.department

    if body.status == "resolved":
        complaint["resolvedAt"] = datetime.utcnow().isoformat()
        if body.resolutionImageUrl:
            complaint["resolutionEvidence"] = {"imageUrl": body.resolutionImageUrl, "submittedBy": auth_payload.get("uid", "authority")}

    await save_complaint(complaint)

    # Log action
    log = await get_agent_log(complaint_id) or {"complaintId": complaint_id, "events": []}
    
    log_message = f"Status updated from '{old_status}' to '{body.status}'" + (f" (Department: {body.department})" if body.department else "")
    if body.resolutionImageUrl:
        log_message += " — Photographic proof of resolution attached."

    log["events"].append({
        "type": "status_update",
        "message": log_message,
        "timestamp": datetime.utcnow().isoformat()
    })
    await save_agent_log(log)

    # Notify citizen
    await save_notification({
        "userId": complaint["userId"],
        "title": f"Status Update: {complaint_id}",
        "body": f"Your complaint is now marked as {body.status.upper().replace('_', ' ')}.",
        "type": "status_change",
        "complaintId": complaint_id,
        "createdAt": datetime.utcnow().isoformat()
    })

    return complaint

@router.post("/{complaint_id}/escalate")
async def escalate_complaint_endpoint(
    complaint_id: str,
    auth_payload: Dict[str, Any] = Depends(require_role("admin", "authority"))
):
    complaint = await get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint["escalated"] = True
    complaint["status"] = "escalated"
    complaint["priority"] = "CRITICAL"
    await save_complaint(complaint)

    # Log event
    log = await get_agent_log(complaint_id) or {"complaintId": complaint_id, "events": []}
    log["events"].append({
        "type": "escalation",
        "message": f"🚨 Case {complaint_id} manually escalated to CRITICAL priority by admin command.",
        "timestamp": datetime.utcnow().isoformat()
    })
    await save_agent_log(log)

    return complaint
