from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, complaints, agent, dashboard, monitor, notifications

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
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

# Include Routers
app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(agent.router)
app.include_router(dashboard.router)
app.include_router(monitor.router)
app.include_router(notifications.router)

@app.get("/")
async def root():
    return {
        "name": "CivicFix API",
        "status": "online",
        "tagline": "From civic complaint to civic action."
    }
