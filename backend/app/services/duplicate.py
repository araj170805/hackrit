from typing import Dict, Any, List, Optional
from app.services.haversine import haversine_distance
from app.database import get_all_complaints, get_complaint, save_complaint

async def find_nearby_complaints(lat: float, lon: float, radius_meters: float = 200.0) -> List[Dict[str, Any]]:
    """
    Finds all active complaints within radius_meters from target GPS coordinates.
    """
    all_complaints = await get_all_complaints()
    nearby = []
    
    for c in all_complaints:
        loc = c.get("location", {})
        c_lat = loc.get("latitude")
        c_lon = loc.get("longitude")
        if c_lat is not None and c_lon is not None:
            dist = haversine_distance(lat, lon, c_lat, c_lon)
            if dist <= radius_meters:
                c_copy = dict(c)
                c_copy["distanceMeters"] = dist
                nearby.append(c_copy)
                
    nearby.sort(key=lambda x: x["distanceMeters"])
    return nearby

async def detect_duplicate_complaint(category: str, lat: float, lon: float, description: str, radius_meters: float = 100.0) -> Optional[Dict[str, Any]]:
    """
    Detects existing master complaint within radius_meters with matching category and high spatial proximity.
    """
    nearby = await find_nearby_complaints(lat, lon, radius_meters=radius_meters)
    cat_lower = category.lower().replace(" ", "_")
    
    for c in nearby:
        # Check if master complaint (not itself a duplicate of another)
        if c.get("duplicateOf") is None:
            c_cat = c.get("category", "").lower().replace(" ", "_")
            if c_cat == cat_lower or (cat_lower in c_cat or c_cat in cat_lower):
                return c
                
    return None

from app.services.community_impact import calculate_community_impact_score

async def consolidate_duplicate(new_complaint: Dict[str, Any], master_complaint: Dict[str, Any]) -> Dict[str, Any]:
    """
    Links new_complaint to master_complaint, increments duplicateCount and affectedCitizens on master case,
    and updates master complaint's Community Impact Score.
    """
    master_id = master_complaint["complaintId"]
    new_complaint["duplicateOf"] = master_id
    
    # Update master complaint counts
    master_complaint["duplicateCount"] = master_complaint.get("duplicateCount", 0) + 1
    master_complaint["affectedCitizens"] = master_complaint.get("affectedCitizens", 1) + 1
    
    # Recalculate master community impact score
    master_complaint["communityImpactScore"] = calculate_community_impact_score(
        severity=master_complaint.get("severity", "medium"),
        duplicate_count=master_complaint.get("duplicateCount", 0),
        affected_citizens=master_complaint.get("affectedCitizens", 1),
        priority_reasons=master_complaint.get("priorityReason", [])
    )
    
    await save_complaint(master_complaint)
    await save_complaint(new_complaint)
    return new_complaint
