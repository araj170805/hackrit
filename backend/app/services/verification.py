import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple

from app.services.haversine import haversine_distance

TOKEN_TTL_HOURS = 24

# Per-category location tolerance for resolution evidence (meters). A
# streetlight fix should be captured almost exactly on-spot; a drainage/road
# issue can reasonably be photographed from a bit further back.
LOCATION_TOLERANCE_METERS = {
    "pothole": 60,
    "garbage": 80,
    "broken_streetlight": 30,
    "water_leakage": 80,
    "general_civic": 60,
}
DEFAULT_LOCATION_TOLERANCE_METERS = 60

# How far apart the device-reported capture time and the server receipt time
# may drift before the timestamp check is flagged (clock skew, slow uploads).
TIMESTAMP_TOLERANCE_MINUTES = 30


def generate_verification_token(complaint_id: str) -> Dict[str, Any]:
    """
    Cryptographically secure one-time token (not a predictable ID) binding a
    verification session to a specific complaint.
    """
    token = f"CFV-{secrets.token_urlsafe(12)}"
    now = datetime.utcnow()
    return {
        "token": token,
        "complaintId": complaint_id,
        "createdAt": now.isoformat(),
        "expiresAt": (now + timedelta(hours=TOKEN_TTL_HOURS)).isoformat(),
        "used": False,
    }


def check_token(token_record: Dict[str, Any], submitted_token: str, complaint_id: str) -> Tuple[bool, str]:
    if not token_record:
        return False, "No verification has been requested for this issue."
    if token_record.get("used"):
        return False, "This verification token has already been used."
    if token_record.get("complaintId") != complaint_id:
        return False, "Token does not belong to this issue."
    if token_record.get("token") != submitted_token:
        return False, "Invalid verification token."
    if token_record.get("expiresAt", "") < datetime.utcnow().isoformat():
        return False, "Verification token has expired. Ask the authority to request a new one."
    return True, "PASS"


def check_location(category: str, original_location: Dict[str, Any], evidence_lat: float, evidence_lon: float) -> Dict[str, Any]:
    orig_lat = original_location.get("latitude")
    orig_lon = original_location.get("longitude")
    tolerance = LOCATION_TOLERANCE_METERS.get(
        (category or "").lower().replace(" ", "_"), DEFAULT_LOCATION_TOLERANCE_METERS
    )

    if orig_lat is None or orig_lon is None:
        return {"result": "REVIEW", "distanceMeters": None, "toleranceMeters": tolerance, "reason": "Original issue has no recorded location."}

    distance = haversine_distance(orig_lat, orig_lon, evidence_lat, evidence_lon)
    result = "PASS" if distance <= tolerance else "FAIL"
    return {"result": result, "distanceMeters": distance, "toleranceMeters": tolerance}


def check_timestamp(device_captured_at: str, server_received_at: str) -> Dict[str, Any]:
    try:
        device_dt = datetime.fromisoformat(device_captured_at)
        server_dt = datetime.fromisoformat(server_received_at)
    except (ValueError, TypeError):
        return {"result": "REVIEW", "driftMinutes": None, "reason": "Could not parse capture timestamp."}

    drift_minutes = abs((server_dt - device_dt).total_seconds()) / 60.0
    result = "PASS" if drift_minutes <= TIMESTAMP_TOLERANCE_MINUTES else "REVIEW"
    return {"result": result, "driftMinutes": round(drift_minutes, 1), "toleranceMinutes": TIMESTAMP_TOLERANCE_MINUTES}


def combine_verification_result(location_check: Dict[str, Any], timestamp_check: Dict[str, Any], token_valid: bool, vision_check: Dict[str, Any]) -> Dict[str, Any]:
    """
    Combines GPS + timestamp + token + AI vision signals into a single
    recommendation. This is deterministic arithmetic, not an AI call — the
    only AI involved is the vision_check input itself, computed once upstream.
    """
    checks_passed = 0
    checks_total = 3  # location, timestamp, token — vision is advisory, not counted as pass/fail gate

    if location_check.get("result") == "PASS":
        checks_passed += 1
    if timestamp_check.get("result") == "PASS":
        checks_passed += 1
    if token_valid:
        checks_passed += 1

    vision_supportive = vision_check.get("visualMatch", 0) >= 0.6

    if checks_passed == checks_total and vision_supportive:
        recommendation = "VERIFICATION_RECOMMENDED"
    else:
        recommendation = "NEEDS_REVIEW"

    return {
        "recommendation": recommendation,
        "locationCheck": location_check.get("result"),
        "timestampCheck": timestamp_check.get("result"),
        "tokenCheck": "PASS" if token_valid else "FAIL",
        "visionCheck": vision_check.get("resolutionEvidence", "UNKNOWN"),
        "checksPassed": checks_passed,
        "checksTotal": checks_total,
    }
