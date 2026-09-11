import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.middleware.rate_limit import RateLimitMiddleware
from app.database import connect_to_mongo, close_mongo_connection
from app.services.sla import monitor_and_escalate_slas
from app.routers import auth, complaints, agent, dashboard, monitor, notifications, community, verification, recurrence, assistant, analytics, resource_recommendation

logger = logging.getLogger("civicfix.main")


async def _sla_monitor_loop():
    """
    Lightweight in-process maintenance loop: periodically sweeps for SLA
    breaches. Replaces the need for an external cron service — good enough
    for a single-instance deployment; monitor_and_escalate_slas() is
    idempotent so overlapping/duplicate runs are harmless.
    """
    while True:
        try:
            escalated = await monitor_and_escalate_slas()
            if escalated:
                logger.info(f"SLA monitor: escalated {len(escalated)} case(s).")
        except Exception as e:
            logger.warning(f"SLA monitor loop iteration failed: {e}")
        await asyncio.sleep(settings.SLA_MONITOR_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    monitor_task = asyncio.create_task(_sla_monitor_loop())
    yield
    # Shutdown
    monitor_task.cancel()
    await close_mongo_connection()

app = FastAPI(
    title="CivicFix Backend API",
    description="Geo-aware autonomous AI civic issue resolution platform powered by Gemini & LangGraph",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware)

# Include Routers
app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(agent.router)
app.include_router(dashboard.router)
app.include_router(monitor.router)
app.include_router(notifications.router)
app.include_router(community.router)
app.include_router(verification.router)
app.include_router(recurrence.router)
app.include_router(assistant.router)
app.include_router(analytics.router)
app.include_router(resource_recommendation.router)

@app.get("/")
async def root():
    return {
        "name": "CivicFix API",
        "status": "online",
        "tagline": "From civic complaint to civic action."
    }

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "civicfix-backend"}

