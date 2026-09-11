import sys
import os

# Add the backend directory to Python path so all app imports resolve correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.main import app  # noqa: F401
