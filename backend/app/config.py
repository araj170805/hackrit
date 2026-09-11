import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    GEMINI_API_KEY: Optional[str] = ""
    MONGODB_URI: Optional[str] = "mongodb://localhost:27017/civicfix"
    
    FIREBASE_PROJECT_ID: Optional[str] = ""
    FIREBASE_CLIENT_EMAIL: Optional[str] = ""
    FIREBASE_PRIVATE_KEY: Optional[str] = ""
    
    CLOUDINARY_CLOUD_NAME: Optional[str] = ""
    CLOUDINARY_API_KEY: Optional[str] = ""
    CLOUDINARY_API_SECRET: Optional[str] = ""
    
    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"

    # Shared secret required to self-register an authority account. Role is
    # never trusted from the client otherwise (see app/routers/auth.py).
    AUTHORITY_INVITE_CODE: Optional[str] = ""

    # Interval for the in-process SLA monitoring loop (see app/main.py lifespan).
    SLA_MONITOR_INTERVAL_SECONDS: int = 900

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
