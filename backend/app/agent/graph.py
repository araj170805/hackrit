import os
import json
import logging
import httpx
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.config import settings
from app.services.geocoding import reverse_geocode
from app.services.priority import calculate_priority_score
from app.services.sla import calculate_sla_and_deadline
from app.services.duplicate import find_nearby_complaints, detect_duplicate_complaint, consolidate_duplicate
from app.services.community_impact import calculate_community_impact_score
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

async def run_gemini_analysis(description: str, image_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Invokes Gemini API to perform natural language/vision understanding and structured extraction.
    Falls back gracefully to intelligent keyword parsing if API key is not configured.
    """
    if settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 5:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            
            image_note = f"\nImage attached URL: {image_url}" if image_url else ""
            prompt = f"""
            You are CivicFix, an autonomous civic issue resolution agent.
            Analyze the following citizen complaint (text and image context) and return ONLY a JSON object with:
            - category: one of ["pothole", "garbage", "broken_streetlight", "water_leakage", "general_civic"]
            - severity: one of ["low", "medium", "high", "critical"]
            - summary: a concise 1-sentence summary of the issue.

            Note: If the image or text represents a document, paper, receipt, homework, or general note rather than road damage, classify category as "general_civic".

            Complaint text: "{description}"{image_note}
            """
            
            parts = [{"text": prompt}]
            payload = {
                "contents": [{"parts": parts}],
                "generationConfig": {"response_mime_type": "application/json"}
            }
            
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text)
                    return parsed
        except Exception as e:
            logger.warning(f"Gemini API call failed: {e}. Utilizing local NLU fallback.")

    # Resilient local NLU fallback
    desc_lower = (description + " " + (image_url or "")).lower()
    cat = "general_civic"
    
    if any(k in desc_lower for k in ["pothole", "road", "asphalt", "crater", "tarmac", "pit", "hole in road"]):
        cat = "pothole"
    elif any(k in desc_lower for k in ["garbage", "trash", "waste", "dump", "bin", "litter", "rubbish"]):
        cat = "garbage"
    elif any(k in desc_lower for k in ["light", "lamp", "dark", "street light", "bulb"]):
        cat = "broken_streetlight"
    elif any(k in desc_lower for k in ["water", "leak", "pipe", "drain", "burst", "sewage", "overflow"]):
        cat = "water_leakage"
    elif any(k in desc_lower for k in ["paper", "document", "sheet", "note", "receipt", "letter"]):
        cat = "general_civic"

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
            "accuracy": state.accuracy
        },
        "address": state.address,
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
        "resolvedAt": None
    }

    if state.isDuplicate and master_duplicate:
        await consolidate_duplicate(complaint_document, master_duplicate)
    else:
        await save_complaint(complaint_document)

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
