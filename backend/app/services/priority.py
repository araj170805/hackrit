from typing import Dict, Any, List, Tuple

def calculate_priority_score(description: str, severity: str, address: str = "") -> Tuple[int, str, List[str]]:
    """
    Calculates deterministic priority score based on base severity and location/context modifiers.
    Returns: (score, priority_level, priority_reasons)
    """
    text_lower = (description + " " + address).lower()
    
    # 1. Base severity scoring
    severity_map = {
        "low": 1,
        "medium": 2,
        "high": 3,
        "critical": 4
    }
    score = severity_map.get(severity.lower(), 2)
    reasons = [f"Base severity: {severity.upper()} (+{score})"]
    
    # 2. Location & Context Modifiers
    if any(k in text_lower for k in ["school", "college", "university", "campus", "gate"]):
        score += 2
        reasons.append("Near educational institution (+2)")
        
    if any(k in text_lower for k in ["hospital", "clinic", "medical", "ambulance", "emergency"]):
        score += 2
        reasons.append("Near hospital or medical facility (+2)")

    if any(k in text_lower for k in ["main road", "highway", "junction", "intersection", "crossroad", "avenue", "boulevard"]):
        score += 2
        reasons.append("Main road / high-traffic transit zone (+2)")

    if any(k in text_lower for k in ["residential", "neighborhood", "apartment", "colony", "society"]):
        score += 1
        reasons.append("Residential area (+1)")

    if any(k in text_lower for k in ["crash", "accident", "danger", "hazard", "overflow", "flooding", "risk", "injury", "injured", "falling"]):
        score += 2
        reasons.append("Active safety hazard reported (+2)")

    # 3. Determine Priority Level
    if score >= 7:
        priority_level = "CRITICAL"
    elif score >= 5:
        priority_level = "HIGH"
    elif score >= 3:
        priority_level = "MEDIUM"
    else:
        priority_level = "LOW"
        
    return score, priority_level, reasons
