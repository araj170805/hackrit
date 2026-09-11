from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.agent.graph import process_civic_complaint_agent

router = APIRouter(prefix="/api/agent", tags=["agent"])

@router.post("/process")
async def run_agent_process(payload: Dict[str, Any]):
    """
    Explicit endpoint for triggering agentic resolution workflow.
    """
    result = await process_civic_complaint_agent(payload)
    return result
