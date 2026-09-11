from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from app.models import UserCreate, UserSchema
from app.database import save_user, get_user
from app.firebase import verify_firebase_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/sync", response_model=UserSchema)
async def sync_user(user_data: UserCreate, auth_payload: Dict[str, Any] = Depends(verify_firebase_token)):
    """
    Syncs Firebase authenticated user profile into MongoDB user collection.
    Never stores passwords.
    """
    existing = await get_user(user_data.firebaseUid)
    role = user_data.role or "citizen"
    
    # Preserve admin role if already set
    if existing and existing.get("role") == "admin":
        role = "admin"

    user_dict = {
        "firebaseUid": user_data.firebaseUid,
        "name": user_data.name or "Citizen User",
        "email": user_data.email,
        "role": role,
        "fcmTokens": existing.get("fcmTokens", []) if existing else [],
        "createdAt": existing.get("createdAt") if existing else user_data.dict().get("createdAt")
    }

    await save_user(user_dict)
    return UserSchema(**user_dict)

@router.get("/me")
async def get_current_user_profile(auth_payload: Dict[str, Any] = Depends(verify_firebase_token)):
    uid = auth_payload.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    user = await get_user(uid)
    if not user:
        # Create default profile
        user = {
            "firebaseUid": uid,
            "name": auth_payload.get("name") or auth_payload.get("email", "Citizen User").split("@")[0],
            "email": auth_payload.get("email", ""),
            "role": "citizen",
            "fcmTokens": [],
            "createdAt": ""
        }
        await save_user(user)

    return user
