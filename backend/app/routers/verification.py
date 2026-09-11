from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from app.models import ResolutionEvidenceSubmitRequest, ConfirmResolutionRequest, CitizenFeedbackRequest
from app.database import get_complaint, save_complaint, get_agent_log, save_agent_log, save_notification
from app.firebase import verify_firebase_token, require_role
from app.services.verification import (
    generate_verification_token,
    generate_qr_code_data_uri,
    check_token,
    check_location,
    check_timestamp,
    combine_verification_result,
)
from app.services.resolution_vision import run_resolution_vision_check

router = APIRouter(prefix="/api/complaints", tags=["verification"])


async def _log_event(complaint_id: str, event_type: str, message: str):
    log = await get_agent_log(complaint_id) or {"complaintId": complaint_id, "events": []}
    log["events"].append({"type": event_type, "message": message, "timestamp": datetime.utcnow().isoformat()})
    await save_agent_log(log)


@router.post("/{complaint_id}/request-verification")
async def request_verification(
    complaint_id: str,
    auth_payload: Dict[str, Any] = Depends(require_role("admin", "authority"))
):
    """
    Authority marks a resolved issue as ready for resolution verification.
    Generates a one-time token (bound to this issue) that the evidence
    submission must present.
    """
    complaint = await get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if complaint.get("status") != "resolved":
        raise HTTPException(status_code=400, detail="Issue must be marked 'resolved' before requesting verification.")

    token_record = generate_verification_token(complaint_id)
    complaint["verificationToken"] = token_record
    complaint["verificationStatus"] = "PENDING_EVIDENCE"
    complaint["resolutionEvidence"] = None
    complaint["verificationResult"] = None
    await save_complaint(complaint)

    await _log_event(complaint_id, "verification_requested", f"Authority requested resolution verification for {complaint_id}.")

    return {
        "status": "verification_requested",
        "complaintId": complaint_id,
        "token": token_record["token"],
        "expiresAt": token_record["expiresAt"],
        "qrCode": generate_qr_code_data_uri(token_record["token"]),
    }


@router.post("/{complaint_id}/resolution-evidence")
async def submit_resolution_evidence(
    complaint_id: str,
    payload: ResolutionEvidenceSubmitRequest,
    auth_payload: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Citizen or authority field worker submits resolution evidence (photo +
    GPS + timestamp + one-time token). Runs the Resolution Verification
    Agent: deterministic GPS/timestamp/token checks plus a single cached
    Gemini vision call.
    """
    complaint = await get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    token_record = complaint.get("verificationToken")
    token_valid, token_reason = check_token(token_record, payload.token, complaint_id)
    if not token_valid:
        raise HTTPException(status_code=400, detail=token_reason)

    server_received_at = datetime.utcnow().isoformat()
    location_check = check_location(complaint.get("category", ""), complaint.get("location", {}), payload.latitude, payload.longitude)
    timestamp_check = check_timestamp(payload.capturedAt, server_received_at)
    vision_check = await run_resolution_vision_check(
        complaint.get("category", ""), complaint.get("summary") or complaint.get("description", ""), payload.imageUrl
    )
    combined = combine_verification_result(location_check, timestamp_check, token_valid, vision_check)

    complaint["verificationToken"]["used"] = True
    complaint["resolutionEvidence"] = {
        "imageUrl": payload.imageUrl,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "accuracy": payload.accuracy,
        "capturedAt": payload.capturedAt,
        "serverReceivedAt": server_received_at,
        "submittedBy": auth_payload.get("uid"),
        "locationCheck": location_check,
        "timestampCheck": timestamp_check,
        "visionCheck": vision_check,
    }
    complaint["verificationResult"] = combined
    complaint["verificationStatus"] = "PENDING_REVIEW"
    await save_complaint(complaint)

    await _log_event(
        complaint_id, "resolution_evidence",
        f"Resolution evidence submitted. GPS: {location_check['result']}, Timestamp: {timestamp_check['result']}, "
        f"AI Vision: {vision_check.get('resolutionEvidence')}. Recommendation: {combined['recommendation']}."
    )

    await save_notification({
        "userId": "authority_admin",
        "title": f"📋 Resolution Evidence Submitted: {complaint_id}",
        "body": f"Evidence submitted for {complaint_id}. Verification recommendation: {combined['recommendation']}.",
        "type": "resolution_evidence_submitted",
        "complaintId": complaint_id,
        "createdAt": server_received_at
    })

    return {"complaintId": complaint_id, "verificationStatus": complaint["verificationStatus"], "verificationResult": combined, "resolutionEvidence": complaint["resolutionEvidence"]}


@router.get("/{complaint_id}/verification")
async def get_verification_status(
    complaint_id: str,
    auth_payload: Dict[str, Any] = Depends(verify_firebase_token)
):
    complaint = await get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    return {
        "complaintId": complaint_id,
        "verificationStatus": complaint.get("verificationStatus", "NONE"),
        "resolutionEvidence": complaint.get("resolutionEvidence"),
        "verificationResult": complaint.get("verificationResult"),
    }


@router.post("/{complaint_id}/confirm-resolution")
async def confirm_resolution(
    complaint_id: str,
    payload: ConfirmResolutionRequest,
    auth_payload: Dict[str, Any] = Depends(require_role("admin", "authority"))
):
    """
    Authority's final decision on resolution verification evidence. Only
    this action can permanently close an issue — AI/GPS/token checks are
    recommendations, never an automatic close.
    """
    complaint = await get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if complaint.get("verificationStatus") != "PENDING_REVIEW" and payload.action != "request_new":
        raise HTTPException(status_code=400, detail="No pending verification evidence to act on.")

    if payload.action == "confirm":
        complaint["status"] = "closed"
        complaint["verificationStatus"] = "VERIFIED"
        complaint["closedAt"] = datetime.utcnow().isoformat()
        notif_title, notif_body = f"✅ Issue Closed: {complaint_id}", "Authority confirmed the resolution evidence. Your issue is now closed."
        event_msg = f"Authority confirmed resolution evidence for {complaint_id}. Issue CLOSED."
    elif payload.action == "reject":
        complaint["status"] = "in_progress"
        complaint["verificationStatus"] = "REJECTED"
        notif_title, notif_body = f"⚠️ Evidence Rejected: {complaint_id}", f"Authority rejected the resolution evidence{': ' + payload.note if payload.note else ''}. Work continues."
        event_msg = f"Authority rejected resolution evidence for {complaint_id}."
    elif payload.action == "request_new":
        token_record = generate_verification_token(complaint_id)
        complaint["verificationToken"] = token_record
        complaint["verificationStatus"] = "PENDING_EVIDENCE"
        complaint["resolutionEvidence"] = None
        complaint["verificationResult"] = None
        notif_title, notif_body = f"🔄 New Evidence Requested: {complaint_id}", "Authority requested new resolution evidence."
        event_msg = f"Authority requested new resolution evidence for {complaint_id}."
    else:
        raise HTTPException(status_code=400, detail="action must be one of: confirm, reject, request_new")

    await save_complaint(complaint)
    await _log_event(complaint_id, "verification_decision", event_msg)
    await save_notification({
        "userId": complaint["userId"],
        "title": notif_title,
        "body": notif_body,
        "type": "verification_decision",
        "complaintId": complaint_id,
        "createdAt": datetime.utcnow().isoformat()
    })

    response = dict(complaint)
    if payload.action == "request_new":
        response["qrCode"] = generate_qr_code_data_uri(token_record["token"])
    return response


@router.post("/{complaint_id}/citizen-feedback")
async def citizen_resolution_feedback(
    complaint_id: str,
    payload: CitizenFeedbackRequest,
    auth_payload: Dict[str, Any] = Depends(verify_firebase_token)
):
    """
    Asks the original reporter to confirm a closed issue is actually fixed —
    an additional verification signal, distinct from the authority's own
    confirmation.
    """
    complaint = await get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if complaint.get("userId") != auth_payload.get("uid"):
        raise HTTPException(status_code=403, detail="Only the original reporter can submit feedback on this issue.")
    if complaint.get("status") != "closed":
        raise HTTPException(status_code=400, detail="Feedback can only be given once the issue is closed.")

    complaint["citizenConfirmedFixed"] = payload.fixed

    if payload.fixed:
        event_msg = f"Citizen confirmed {complaint_id} is fixed."
        await save_complaint(complaint)
        await _log_event(complaint_id, "citizen_feedback", event_msg)
        return complaint

    complaint["status"] = "reopened"
    complaint["verificationStatus"] = "NEEDS_REVIEW"
    await save_complaint(complaint)
    await _log_event(complaint_id, "citizen_feedback", f"Citizen reported {complaint_id} is still NOT fixed. Issue REOPENED.")
    await save_notification({
        "userId": "authority_admin",
        "title": f"🔁 Issue Reopened: {complaint_id}",
        "body": f"The original reporter says {complaint_id} is not actually fixed. Issue reopened for review.",
        "type": "issue_reopened",
        "complaintId": complaint_id,
        "createdAt": datetime.utcnow().isoformat()
    })

    return complaint
