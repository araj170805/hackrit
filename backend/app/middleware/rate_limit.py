import time
from collections import defaultdict, deque
from typing import Deque, Dict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

"""
Minimal in-memory sliding-window rate limiter. No new dependency (this is a
single-instance hackathon deployment, consistent with the rest of the app's
in-memory-fallback philosophy) — a per-process dict is enough to blunt naive
abuse/scripted spam without adding infrastructure.
"""

WINDOW_SECONDS = 60
DEFAULT_LIMIT = 120  # generous general ceiling per IP per minute
SENSITIVE_LIMIT = 20  # writes / uploads / AI calls
SENSITIVE_PREFIXES = (
    "/api/complaints/upload-photo",
    "/api/complaints",  # POST create + PATCH status covered by prefix; GET reads are cheap but still capped generously below
    "/api/assistant/ask",
    "/api/community/issues",
)
EXEMPT_PATHS = ("/api/health", "/")


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in EXEMPT_PATHS:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        is_sensitive = request.method != "GET" and path.startswith(SENSITIVE_PREFIXES)
        limit = SENSITIVE_LIMIT if is_sensitive else DEFAULT_LIMIT
        key = f"{client_ip}:{'w' if is_sensitive else 'r'}"

        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > WINDOW_SECONDS:
            hits.popleft()

        if len(hits) >= limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down and try again shortly."}
            )

        hits.append(now)
        return await call_next(request)
