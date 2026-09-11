from datetime import datetime, timedelta
from typing import Dict, Any, List
from app.database import get_all_complaints, save_complaint, save_notification, save_agent_log, get_agent_log

SLA_HOURS_MAPPING = {
    "pothole": 72,
    "garbage": 24,
    "broken_streetlight": 48,
    "water_leakage": 12
}

DEFAULT_SLA_HOURS = 48

DEFAULT_IMPACT_RADIUS = {
    "pothole": 100,
    "garbage": 150,
    "broken_streetlight": 50,
    "water_leakage": 100
}
def calculate_sla_and_deadline(category: str, created_at_iso: str) -> tuple[int, str, int]:
    cat_lower = category.lower().replace(" ", "_")
    sla_hours = SLA_HOURS_MAPPING.get(cat_lower, DEFAULT_SLA_HOURS)
    impact_radius = DEFAULT_IMPACT_RADIUS.get(cat_lower, 100)
    
    created_dt = datetime.fromisoformat(created_at_iso)
    deadline_dt = created_dt + timedelta(hours=sla_hours)
    
    return sla_hours, deadline_dt.isoformat(), impact_radius

async def monitor_and_escalate_slas() -> List[Dict[str, Any]]:
    """
    Scans for unresolved complaints whose deadline has passed.
    Escalates breached complaints, elevates priority to CRITICAL, logs event, and sends notification.
    Safe to run repeatedly (idempotent).
    """
    now_iso = datetime.utcnow().isoformat()
    complaints = await get_all_complaints()
    escalated_cases = []

    for c in complaints:
        # Only check unresolved complaints that have not been escalated yet
        if c.get("status") != "resolved" and not c.get("escalated", False):
            deadline_str = c.get("deadline")
            if deadline_str and deadline_str < now_iso:
                # SLA breach detected!
                c["escalated"] = True
                c["status"] = "escalated"
                c["priority"] = "CRITICAL"
                
                await save_complaint(c)
                escalated_cases.append(c)

                # Log SLA breach in Agent activity log
                log = await get_agent_log(c["complaintId"]) or {"complaintId": c["complaintId"], "events": []}
                log["events"].append({
                    "type": "escalation",
                    "message": f"🚨 SLA BREACHED: Case {c['complaintId']} exceeded its resolution window. CivicFix automatically escalated the case to CRITICAL priority.",
                    "timestamp": now_iso
                })
                await save_agent_log(log)

                # Send Notification
                await save_notification({
                    "userId": c["userId"],
                    "title": f"🚨 Case Escalated: {c['complaintId']}",
                    "body": f"Your complaint {c['complaintId']} exceeded its SLA window and was automatically escalated to department leadership.",
                    "type": "escalation",
                    "complaintId": c["complaintId"],
                    "createdAt": now_iso
                })

    return escalated_cases
