import logging
from typing import Any, Dict, Optional

from app.services.gemini_client import call_gemini_json, fetch_image_as_inline_part

logger = logging.getLogger("civicfix.resolution_vision")


async def run_resolution_vision_check(category: str, original_summary: str, evidence_image_url: Optional[str]) -> Dict[str, Any]:
    """
    Resolution Verification Agent's vision step: does the submitted evidence
    photo look like the original civic issue has actually been fixed?
    Runs once per evidence submission (caller is responsible for not
    re-invoking this on every page load) and is only ever an AI assessment —
    the authority makes the final call, never this function.
    """
    fallback = {
        "visualMatch": 0.0,
        "resolutionEvidence": "UNAVAILABLE",
        "explanation": "AI vision analysis unavailable — please review the evidence photo manually.",
    }

    image_part = await fetch_image_as_inline_part(evidence_image_url)
    if not image_part:
        return fallback

    prompt = f"""
    You are the CivicFix Resolution Verification Agent.
    A citizen reported this civic issue: category="{category}", summary="{original_summary}".
    The attached image is evidence submitted after the authority claims the issue is resolved.

    Return ONLY a JSON object with:
    - visualMatch: a number from 0.0 to 1.0, how consistent the image is with the ORIGINAL issue location/subject (not whether it's fixed)
    - resolutionEvidence: one of ["LIKELY_RESOLVED", "LIKELY_NOT_RESOLVED", "UNCLEAR"]
    - explanation: one short sentence explaining your assessment.
    """

    parsed = await call_gemini_json(prompt, image_part)
    if not parsed:
        return fallback

    try:
        parsed["visualMatch"] = max(0.0, min(1.0, float(parsed.get("visualMatch", 0.0))))
    except (TypeError, ValueError):
        parsed["visualMatch"] = 0.0

    if parsed.get("resolutionEvidence") not in ("LIKELY_RESOLVED", "LIKELY_NOT_RESOLVED", "UNCLEAR"):
        parsed["resolutionEvidence"] = "UNCLEAR"

    return parsed
