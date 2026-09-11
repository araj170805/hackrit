from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from app.services.sla import monitor_and_escalate_slas
from app.database import get_complaint, save_complaint, save_agent_log, get_agent_log, save_notification

router = APIRouter(prefix="/api/monitor", tags=["monitor"])

@router.post("/sla")
async def trigger_sla_monitoring():
    """
    Scheduled SLA Monitoring Endpoint (called every 15 minutes by Cron job).
    Scans for breached SLAs, elevates priority, escalates, and sends notifications.
    Idempotent and safe for repeated calls.
    """
    escalated_cases = await monitor_and_escalate_slas()
    return {
        "status": "success",
        "timestamp": datetime.utcnow().isoformat(),
        "escalatedCount": len(escalated_cases),
        "escalatedCases": [c["complaintId"] for c in escalated_cases]
    }

@router.post("/simulate-breach/{complaint_id}")
async def simulate_sla_breach(complaint_id: str):
    """
    Admin Demo Feature: Instant SLA Breach Simulation.
    Sets deadline to the past, triggers monitoring, escalates case to CRITICAL, dispatches notification.
    """
    complaint = await get_complaint(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Set deadline to 24 hours in the past
    past_deadline = (datetime.utcnow() - timedelta(hours=24)).isoformat()
    complaint["deadline"] = past_deadline
    complaint["escalated"] = True
    complaint["status"] = "escalated"
    complaint["priority"] = "CRITICAL"

    await save_complaint(complaint)

    # Log in agent activity
    log = await get_agent_log(complaint_id) or {"complaintId": complaint_id, "events": []}
    log["events"].append({
        "type": "escalation",
        "message": f"🚨 SIMULATED SLA BREACH: Resolution deadline ({past_deadline}) exceeded! Case {complaint_id} escalated autonomously to CRITICAL priority.",
        "timestamp": datetime.utcnow().isoformat()
    })
    await save_agent_log(log)

    # Send Notification
    await save_notification({
        "userId": complaint["userId"],
        "title": f"🚨 SLA BREACHED: {complaint_id}",
        "body": f"Complaint {complaint_id} exceeded its SLA resolution deadline. CivicFix automatically escalated the case to Department Head.",
        "type": "escalation",
        "complaintId": complaint_id,
        "createdAt": datetime.utcnow().isoformat()
    })

    return {
        "status": "simulated_and_escalated",
        "complaintId": complaint_id,
        "complaint": complaint
    }
