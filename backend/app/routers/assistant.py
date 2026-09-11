import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.config import settings
from app.firebase import verify_firebase_token
from app.services.assistant_tools import TOOL_DECLARATIONS, execute_tool

logger = logging.getLogger("civicfix.assistant")

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={key}"
MAX_TOOL_ROUNDS = 3

SYSTEM_PREAMBLE = (
    "You are the CivicFix Assistant, helping citizens and civic authorities. You handle two kinds of questions:\n"
    "1. Questions about REAL data (issue status, counts, nearby problems, recurring issues, someone's own complaints) — "
    "always use the provided tools to look this up, never invent complaint IDs, counts, statuses, or numbers. If the "
    "question needs a location and none was given, ask for one or use the user's provided context location.\n"
    "2. General civic knowledge questions (e.g. \"what is a pothole\", \"how does garbage overflow affect people\", "
    "\"why does standing water cause dengue\", \"what does a broken streetlight have to do with safety\") — answer these "
    "directly and simply from your own knowledge, no tool needed. Keep it practical and relevant to everyday civic life.\n"
    "Keep every answer concise (2-4 sentences)."
)


class AssistantQuery(BaseModel):
    message: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


def _fallback_answer(message: str) -> str:
    return (
        "The AI assistant is temporarily unavailable. Try the \"Problems Around You\" page for nearby issues, "
        "or \"My Complaints\" on your dashboard to check a report's status."
    )


@router.post("/ask")
async def ask_assistant(payload: AssistantQuery, auth_payload: Dict[str, Any] = Depends(verify_firebase_token)):
    if not settings.GEMINI_API_KEY or len(settings.GEMINI_API_KEY) <= 5:
        return {"answer": _fallback_answer(payload.message), "toolsUsed": []}

    uid = auth_payload.get("uid")
    context_note = ""
    if payload.latitude is not None and payload.longitude is not None:
        context_note = f"\n(User's current location: latitude={payload.latitude}, longitude={payload.longitude})"

    contents: List[Dict[str, Any]] = [
        {"role": "user", "parts": [{"text": SYSTEM_PREAMBLE + "\n\nUser question: " + payload.message + context_note}]}
    ]
    tools_used: List[str] = []

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            for _ in range(MAX_TOOL_ROUNDS):
                res = await client.post(
                    GEMINI_URL.format(key=settings.GEMINI_API_KEY),
                    json={"contents": contents, "tools": [{"functionDeclarations": TOOL_DECLARATIONS}]}
                )
                if res.status_code != 200:
                    logger.warning(f"Gemini assistant call failed: {res.status_code} {res.text[:200]}")
                    return {"answer": _fallback_answer(payload.message), "toolsUsed": tools_used}

                candidate = res.json()["candidates"][0]["content"]
                parts = candidate.get("parts", [])
                function_call = next((p["functionCall"] for p in parts if "functionCall" in p), None)

                if not function_call:
                    text = next((p.get("text", "") for p in parts if "text" in p), "")
                    return {"answer": text.strip() or _fallback_answer(payload.message), "toolsUsed": tools_used}

                tool_name = function_call.get("name", "")
                tool_args = function_call.get("args", {}) or {}
                tools_used.append(tool_name)
                result = await execute_tool(tool_name, tool_args, uid)

                contents.append({"role": "model", "parts": parts})
                contents.append({
                    "role": "user",
                    "parts": [{"functionResponse": {"name": tool_name, "response": {"result": result}}}]
                })

        return {"answer": "I looked into that but couldn't finish forming an answer — please try rephrasing.", "toolsUsed": tools_used}
    except Exception as e:
        logger.warning(f"Assistant tool-calling loop failed: {e}")
        return {"answer": _fallback_answer(payload.message), "toolsUsed": tools_used}
