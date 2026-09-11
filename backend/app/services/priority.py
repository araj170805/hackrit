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


COMMUNITY_VOTE_WEIGHT = 2
COMMUNITY_MAX_SCORE = 30

def calculate_community_signal(support_count: int) -> Tuple[str, int]:
    """
    Calculates community signal level and score.
    Returns: (signal_label, community_score)
    Thresholds:
    0-4 -> LOW
    5-14 -> MEDIUM
    15-29 -> HIGH
    30+ -> VERY_HIGH
    """
    community_score = min(support_count * COMMUNITY_VOTE_WEIGHT, COMMUNITY_MAX_SCORE)
    
    if support_count >= 30:
        signal = "VERY_HIGH"
    elif support_count >= 15:
        signal = "HIGH"
    elif support_count >= 5:
        signal = "MEDIUM"
    else:
        signal = "LOW"
        
    return signal, community_score


def calculate_final_priority(complaint: Dict[str, Any]) -> Tuple[int, str, str, int]:
    """
    Hybrid Priority Calculation:
    Combines base priority score, community support score, and SLA/age duration.
    CRITICAL SAFETY OVERRIDE: Critical hazard complaints retain CRITICAL priority level regardless of community vote count.
    Returns: (final_score, priority_level, community_signal, community_score)
    """
    base_score = complaint.get("priorityScore", 1)
    severity = str(complaint.get("severity", "medium")).lower()
    base_priority = str(complaint.get("priority", "MEDIUM")).upper()
    
    support_count = complaint.get("communitySupportCount", 0)
    community_signal, community_score = calculate_community_signal(support_count)
    
    # Calculate final hybrid score
    final_score = base_score * 10 + community_score
    
    # Escalated SLA or Critical base severity safety override
    if severity == "critical" or base_priority == "CRITICAL" or complaint.get("escalated"):
        priority_level = "CRITICAL"
    elif final_score >= 50:
        priority_level = "CRITICAL"
    elif final_score >= 35:
        priority_level = "HIGH"
    elif final_score >= 20:
        priority_level = "MEDIUM"
    else:
        priority_level = "LOW"
        
    return final_score, priority_level, community_signal, community_score

