import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.services.geocoding import reverse_geocode, get_area_label
from app.services.priority import calculate_priority_score
from app.services.sla import calculate_sla_and_deadline
from app.services.duplicate import find_nearby_complaints, detect_duplicate_complaint, consolidate_duplicate
from app.services.community_impact import calculate_community_impact_score
from app.services.gemini_client import call_gemini_json, fetch_image_as_inline_part
from app.services.recurrence import detect_recurrence, register_recurrence
from app.agent.tools import generate_complaint_id, find_department_tool
from app.database import save_complaint, save_agent_log, save_notification

logger = logging.getLogger("civicfix.agent")

class AgentState(BaseModel):
    description: str
    latitude: float
    longitude: float
    accuracy: float = 0.0
    imageUrl: Optional[str] = None
    userId: str = "anonymous"
    userEmail: Optional[str] = None

    # Step outputs
    category: str = "pothole"
    severity: str = "medium"
    summary: str = ""
    address: str = ""
    area: str = ""
    priorityScore: int = 1
    priority: str = "MEDIUM"
    priorityReason: List[str] = []
    department: str = ""
    isDuplicate: bool = False
    duplicateOf: Optional[str] = None
    nearbyCount: int = 0
    communityImpactScore: int = 25
    complaintId: str = ""
    slaHours: int = 48
    deadline: str = ""
    impactRadius: int = 100
    events: List[Dict[str, Any]] = []
    isRecurrence: bool = False
    recurrenceOf: Optional[str] = None
    recurrenceConfidence: Optional[str] = None

async def run_gemini_analysis(description: str, image_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Invokes Gemini API to perform natural language/vision understanding and structured extraction.
    Falls back gracefully to intelligent keyword parsing if API key is not configured or fails.
    """
    prompt = f"""
    You are CivicFix, an autonomous civic issue resolution agent.
    Analyze the following citizen complaint (text and, if attached, image) and return ONLY a JSON object with:
    - category: one of ["pothole", "garbage", "broken_streetlight", "water_leakage", "general_civic"]
    - severity: one of ["low", "medium", "high", "critical"]
    - summary: a concise 1-sentence summary of the issue.

    Note: If the image or text represents a document, paper, receipt, homework, or general note rather than road damage, classify category as "general_civic".

    Complaint text: "{description}"
    """

    image_part = await fetch_image_as_inline_part(image_url)
    parsed = await call_gemini_json(prompt, image_part)
    if parsed is not None:
        return parsed

    # Resilient local NLU fallback. Checks the most specific categories first;
    # "road"/"pit" were dropped from the pothole trigger list because they're
    # generic words that show up in almost any location description ("near
    # the road", "garbage pit"), which was causing every complaint to get
    # misclassified as a pothole regardless of what was actually reported.
    desc_lower = (description + " " + (image_url or "")).lower()
    cat = "general_civic"

    if any(k in desc_lower for k in ["garbage", "trash", "waste", "dump", "bin", "litter", "rubbish"]):
        cat = "garbage"
    elif any(k in desc_lower for k in ["light", "lamp", "dark", "street light", "bulb"]):
        cat = "broken_streetlight"
    elif any(k in desc_lower for k in ["water", "leak", "pipe", "drain", "burst", "sewage", "overflow"]):
        cat = "water_leakage"
    elif any(k in desc_lower for k in ["paper", "document", "sheet", "note", "receipt", "letter"]):
        cat = "general_civic"
    elif any(k in desc_lower for k in ["pothole", "asphalt", "crater", "tarmac", "hole in road", "hole in the road"]):
        cat = "pothole"

    sev = "medium"
    if any(word in desc_lower for word in ["danger", "accident", "crash", "huge", "severe", "urgent", "burst", "emergency", "gate", "hazardous"]):
        sev = "high"

    return {
        "category": cat,
        "severity": sev,
        "summary": description[:100] if description else f"{cat.replace('_', ' ').capitalize()} reported"
    }

async def process_civic_complaint_agent(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph Agentic Orchestration Graph
    User -> Agent -> Tools -> Database -> Actions -> Escalation
    """
    now_iso = datetime.utcnow().isoformat()
    state = AgentState(
        description=request_data.get("description", ""),
        latitude=request_data.get("location", {}).get("latitude", 0.0),
        longitude=request_data.get("location", {}).get("longitude", 0.0),
        accuracy=request_data.get("location", {}).get("accuracy", 0.0),
        imageUrl=request_data.get("imageUrl"),
        userId=request_data.get("userId", "anonymous"),
        userEmail=request_data.get("userEmail")
    )
    
    complaint_id = generate_complaint_id()
    state.complaintId = complaint_id
    events = []

    # 1. Step: Location analysis & Reverse Geocoding tool
    state.address = await reverse_geocode(state.latitude, state.longitude)
    state.area = await get_area_label(state.latitude, state.longitude, state.address)
    events.append({
        "type": "location",
        "message": f"Location reverse-geocoded: {state.address} ({state.latitude:.4f}, {state.longitude:.4f})",
        "timestamp": datetime.utcnow().isoformat()
    })

    # 2. Step: Gemini NLU & Vision Classification
    analysis = await run_gemini_analysis(state.description, state.imageUrl)
    state.category = analysis.get("category", "pothole")
    state.severity = analysis.get("severity", "medium")
    state.summary = analysis.get("summary", state.description[:100])

    events.append({
        "type": "classification",
        "message": f"Issue classified as {state.category.upper().replace('_', ' ')} with interpreted severity {state.severity.upper()}",
        "timestamp": datetime.utcnow().isoformat()
    })

    # 3. Step: Priority Calculation Tool (Deterministic)
    score, priority_level, reasons = calculate_priority_score(state.description, state.severity, state.address)
    state.priorityScore = score
    state.priority = priority_level
    state.priorityReason = reasons

    events.append({
        "type": "priority",
        "message": f"Priority calculated as {state.priority} (Score: {score}). Factors: {', '.join(reasons)}",
        "timestamp": datetime.utcnow().isoformat()
    })

    # 4. Step: SLA & Impact Radius Calculation Tool
    state.slaHours, state.deadline, state.impactRadius = calculate_sla_and_deadline(state.category, now_iso)
    events.append({
        "type": "sla",
        "message": f"SLA assigned: {state.slaHours} hours. Resolution deadline: {state.deadline}",
        "timestamp": datetime.utcnow().isoformat()
    })

    # 5. Step: Duplicate Detection & Spatial Search Tool (Haversine)
    nearby_reports = await find_nearby_complaints(state.latitude, state.longitude, radius_meters=200.0)
    state.nearbyCount = len(nearby_reports)

    master_duplicate = await detect_duplicate_complaint(state.category, state.latitude, state.longitude, state.description, radius_meters=100.0)
    
    if master_duplicate:
        state.isDuplicate = True
        state.duplicateOf = master_duplicate["complaintId"]
        events.append({
            "type": "duplicate",
            "message": f"⚠️ Found {len(nearby_reports)} nearby report(s). Consolidated into existing master case {master_duplicate['complaintId']}",
            "timestamp": datetime.utcnow().isoformat()
        })
    else:
        events.append({
            "type": "duplicate",
            "message": f"Searched 100m radius: {len(nearby_reports)} nearby report(s) found. No exact master duplicate match.",
            "timestamp": datetime.utcnow().isoformat()
        })

    # 5b. Step: Recurrence Detection Tool (Deterministic — only when not a live duplicate)
    if not state.isDuplicate:
        recurrence_match = await detect_recurrence(state.category, state.latitude, state.longitude)
        if recurrence_match:
            state.isRecurrence = True
            state.recurrenceOf = recurrence_match["complaintId"]
            state.recurrenceConfidence = recurrence_match["confidence"]
            events.append({
                "type": "recurrence",
                "message": f"♻️ Possible recurring civic problem: similar issue was closed at case {recurrence_match['complaintId']} "
                           f"({recurrence_match['distanceMeters']:.0f}m away, confidence: {recurrence_match['confidence']}).",
                "timestamp": datetime.utcnow().isoformat()
            })

    # 6. Step: Community Impact Calculation Tool (Deterministic)
    state.communityImpactScore = calculate_community_impact_score(
        severity=state.severity,
        duplicate_count=state.nearbyCount if state.isDuplicate else 0,
        affected_citizens=1 + (state.nearbyCount if state.isDuplicate else 0),
        priority_reasons=state.priorityReason
    )

    events.append({
        "type": "impact",
        "message": f"Estimated Community Impact Score calculated: {state.communityImpactScore}/100 based on spatial signals and priority factors.",
        "timestamp": datetime.utcnow().isoformat()
    })

    # 7. Step: Department Routing Tool
    state.department = await find_department_tool(state.category)
    events.append({
        "type": "routing",
        "message": f"Automated department routing: Assigned to {state.department}",
        "timestamp": datetime.utcnow().isoformat()
    })

    # 8. Step: Create / Update MongoDB Case
    complaint_document = {
        "complaintId": state.complaintId,
        "userId": state.userId,
        "description": state.description,
        "summary": state.summary,
        "category": state.category,
        "severity": state.severity,
        "priority": state.priority,
        "priorityScore": state.priorityScore,
        "priorityReason": state.priorityReason,
        "communityImpactScore": state.communityImpactScore,
        "status": "submitted",
        "location": {
            "latitude": state.latitude,
            "longitude": state.longitude,
            "accuracy": state.accuracy,
            # GeoJSON Point mirror of latitude/longitude, required for the
            # MongoDB 2dsphere index (see database.py get_nearby_complaints_geo).
            # Coordinate order is [longitude, latitude] per the GeoJSON spec.
            "geo": {
                "type": "Point",
                "coordinates": [state.longitude, state.latitude]
            }
        },
        "address": state.address,
        "area": state.area,
        "imageUrl": state.imageUrl,
        "department": state.department,
        "duplicateOf": state.duplicateOf,
        "duplicateCount": 0 if not state.isDuplicate else 1,
        "affectedCitizens": 1 + (1 if state.isDuplicate else 0),
        "impactRadius": state.impactRadius,
        "slaHours": state.slaHours,
        "createdAt": now_iso,
        "deadline": state.deadline,
        "escalated": False,
        "resolvedAt": None,
        "isRecurrence": state.isRecurrence,
        "recurrenceOf": state.recurrenceOf,
        "recurrenceConfidence": state.recurrenceConfidence,
        "recurrenceCount": 0
    }

    if state.isDuplicate and master_duplicate:
        await consolidate_duplicate(complaint_document, master_duplicate)
    else:
        await save_complaint(complaint_document)

    if state.isRecurrence and state.recurrenceOf:
        await register_recurrence(state.recurrenceOf)
        await save_notification({
            "userId": "authority_admin",
            "title": f"♻️ Possible Recurring Issue: {state.complaintId}",
            "body": f"New {state.category.replace('_', ' ')} report near previously closed case {state.recurrenceOf}. Confidence: {state.recurrenceConfidence}.",
            "type": "recurrence_detected",
            "complaintId": state.complaintId,
            "createdAt": now_iso
        })

    events.append({
        "type": "creation",
        "message": f"Case {state.complaintId} created and registered in CivicFix database.",
        "timestamp": datetime.utcnow().isoformat()
    })

    # 8. Step: Save Agent Activity Log
    agent_log = {
        "complaintId": state.complaintId,
        "events": events
    }
    await save_agent_log(agent_log)

    # 9. Step: Notification Tool
    await save_notification({
        "userId": state.userId,
        "title": f"Complaint Submitted: {state.complaintId}",
        "body": f"Your report of {state.category.replace('_', ' ')} has been assigned to {state.department} with {state.priority} priority.",
        "type": "complaint_created",
        "complaintId": state.complaintId,
        "createdAt": datetime.utcnow().isoformat()
    })

    return {
        "complaint": complaint_document,
        "events": events,
        "summary": state.summary
    }
