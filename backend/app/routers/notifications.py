from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
from app.database import get_user, save_user, get_notifications
from app.firebase import verify_firebase_token

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.post("/register-token")
async def register_fcm_token(
    payload: Dict[str, str],
    auth_payload: Dict[str, Any] = Depends(verify_firebase_token)
):
    token = payload.get("fcmToken")
    uid = auth_payload.get("uid")
    if not token or not uid:
        raise HTTPException(status_code=400, detail="fcmToken and authenticated user required")

    user = await get_user(uid)
    if user:
        tokens = user.get("fcmTokens", [])
        if token not in tokens:
            tokens.append(token)
            user["fcmTokens"] = tokens
            await save_user(user)

    return {"status": "token_registered"}

@router.get("/{user_id}")
async def get_user_notification_history(user_id: str):
    notifs = await get_notifications(user_id)
    return notifs
