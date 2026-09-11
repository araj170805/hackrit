import uuid
import random
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from app.services.geocoding import reverse_geocode
from app.services.priority import calculate_priority_score
from app.services.sla import calculate_sla_and_deadline
from app.services.duplicate import find_nearby_complaints, detect_duplicate_complaint, consolidate_duplicate
from app.database import save_complaint, save_agent_log, save_notification

DEPARTMENT_MAPPING = {
    "pothole": "Road Maintenance",
    "garbage": "Sanitation & Waste Management",
    "broken_streetlight": "Electrical Maintenance",
    "water_leakage": "Water Department & Utility",
    "general_civic": "General Civic Services"
}

def generate_complaint_id() -> str:
    num = random.randint(10000, 99999)
    return f"CF-{num}"

async def classify_issue_tool(category: str, summary: str) -> Dict[str, Any]:
    cat_clean = category.lower().replace(" ", "_")
    valid_categories = ["pothole", "garbage", "broken_streetlight", "water_leakage", "general_civic"]
    if cat_clean not in valid_categories:
        cat_clean = "general_civic"
    return {
        "category": cat_clean,
        "summary": summary
    }

async def get_location_details_tool(lat: float, lon: float) -> str:
    address = await reverse_geocode(lat, lon)
    return address

async def calculate_priority_tool(description: str, severity: str, address: str) -> Tuple[int, str, List[str]]:
    return calculate_priority_score(description, severity, address)

async def find_department_tool(category: str) -> str:
    cat_clean = category.lower().replace(" ", "_")
    return DEPARTMENT_MAPPING.get(cat_clean, "General Civic Services")

async def create_complaint_tool(complaint_data: Dict[str, Any]) -> Dict[str, Any]:
    await save_complaint(complaint_data)
    return complaint_data

async def send_notification_tool(user_id: str, title: str, body: str, complaint_id: str) -> Dict[str, Any]:
    notif = {
        "userId": user_id,
        "title": title,
        "body": body,
        "type": "complaint_status",
        "complaintId": complaint_id,
        "createdAt": datetime.utcnow().isoformat()
    }
    await save_notification(notif)
    return notif
