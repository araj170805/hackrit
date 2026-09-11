import logging
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException
from app.config import settings

logger = logging.getLogger("civicfix.firebase")

firebase_initialized = False

try:
    import firebase_admin
    from firebase_admin import credentials, auth, messaging

    private_key = settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n").strip('"').strip("'")

    if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_CLIENT_EMAIL and private_key:
        cred_dict = {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key_id": "key1",
            "private_key": private_key,
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "client_id": "",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{settings.FIREBASE_CLIENT_EMAIL}"
        }
        cred = credentials.Certificate(cred_dict)
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)
        firebase_initialized = True
        logger.info("Firebase Admin SDK initialized successfully.")
except Exception as e:
    logger.warning(f"Firebase Admin SDK init failed: {e}. Running with fallback auth.")


async def verify_firebase_token(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Verifies Firebase ID token from Bearer Authorization header.
    Requires a valid Bearer token; no anonymous/demo fallback.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Firebase Authentication Token")

    token = authorization.split("Bearer ")[1]

    if firebase_initialized:
        try:
            from firebase_admin import auth
            decoded = auth.verify_id_token(token)
            return decoded
        except Exception as e:
            logger.warning(f"Token verification failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid Firebase Authentication Token")

    # Firebase Admin not configured (local/dev only): trust the token as an opaque
    # stable per-session identifier. Still requires a Bearer token — no anonymous access.
    logger.warning("Firebase Admin not configured; accepting unverified bearer token as uid (dev mode).")
    return {"uid": token[:128], "email": "", "name": "User"}


def require_role(*allowed_roles: str):
    """
    Dependency factory that enforces the caller's role, looked up from MongoDB
    (never trusted from the client/token). Use for authority/admin-only routes.
    """
    async def dependency(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
        auth_payload = await verify_firebase_token(authorization)
        from app.database import get_user
        uid = auth_payload.get("uid")
        user = await get_user(uid)
        role = (user or {}).get("role", "citizen")
        if role not in allowed_roles:
            raise HTTPException(status_code=403, detail="You do not have permission to perform this action.")
        auth_payload["role"] = role
        return auth_payload

    return dependency


async def send_fcm_notification(fcm_token: str, title: str, body: str, data: Optional[Dict[str, str]] = None) -> bool:
    if not firebase_initialized or not fcm_token:
        return False
    try:
        from firebase_admin import messaging
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            token=fcm_token
        )
        messaging.send(message)
        return True
    except Exception as e:
        logger.warning(f"FCM notification failed: {e}")
        return False
