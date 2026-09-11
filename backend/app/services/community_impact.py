from typing import Dict, Any, List

def calculate_community_impact_score(
    severity: str,
    duplicate_count: int = 0,
    affected_citizens: int = 1,
    priority_reasons: List[str] = None,
    hours_unresolved: float = 0.0
) -> int:
    """
    Calculates a deterministic Estimated Community Impact Score (0-100).
    Factors:
    - Base severity (Low: 15, Medium: 30, High: 50, Critical: 70)
    - Affected citizens & spatial duplicate count (+8 points per report, max +35)
    - Location importance modifiers (Main road, hospital, school context: +10 each, max +20)
    - Time unresolved modifier (+0.5 point per hour, max +15)
    """
    reasons = priority_reasons or []
    sev_lower = (severity or "medium").lower()

    # 1. Base severity score
    severity_map = {
        "low": 15,
        "medium": 30,
        "high": 50,
        "critical": 70
    }
    score = severity_map.get(sev_lower, 30)

    # 2. Duplicate & Affected Citizens signal
    total_citizens = max(affected_citizens, duplicate_count + 1)
    citizen_bonus = min((total_citizens - 1) * 8, 35)
    score += citizen_bonus

    # 3. Location context importance
    location_bonus = 0
    for reason in reasons:
        r_lower = reason.lower()
        if "school" in r_lower or "hospital" in r_lower or "main road" in r_lower or "hazard" in r_lower:
            location_bonus += 10
    score += min(location_bonus, 20)

    # 4. Unresolved duration factor
    if hours_unresolved > 0:
        age_bonus = min(int(hours_unresolved * 0.5), 15)
        score += age_bonus

    # Bound result between 10 and 100
    return max(10, min(100, int(score)))
