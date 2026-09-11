# Root-level entry point so Render can find the app with `uvicorn main:app`
# This re-exports the app from app/main.py
from app.main import app  # noqa: F401
