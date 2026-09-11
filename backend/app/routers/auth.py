from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from datetime import datetime
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
    # The uid is taken from the verified token, never from the request body,
    # otherwise a user could sync (overwrite) another user's profile.
    uid = auth_payload.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    existing = await get_user(uid)

    # Role is never trusted from the client's request body — it's whatever is
    # already stored (defaulting to "citizen" for a new account). Elevating
    # to "authority" only happens via the dedicated /sync-authority endpoint.
    role = existing.get("role", "citizen") if existing else "citizen"

    user_dict = {
        "firebaseUid": uid,
        "name": user_data.name or "Citizen User",
        "email": user_data.email,
        "role": role,
        "fcmTokens": existing.get("fcmTokens", []) if existing else [],
        "createdAt": existing.get("createdAt") or user_data.dict().get("createdAt") or datetime.utcnow().isoformat()
    }

    await save_user(user_dict)
    return UserSchema(**user_dict)

@router.post("/sync-authority", response_model=UserSchema)
async def sync_authority_user(user_data: UserCreate, auth_payload: Dict[str, Any] = Depends(verify_firebase_token)):
    """
    Same as /sync, but for the dedicated authority sign-in flow: the verified
    account is granted the "authority" role. There's no invite code — the
    signal that this is an authority account is simply that the request came
    through the authority login page, not the citizen one. An "admin" role
    already on the account (set out-of-band) is preserved rather than
    downgraded.
    """
    uid = auth_payload.get("uid")
    if not uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    existing = await get_user(uid)
    existing_role = existing.get("role", "citizen") if existing else "citizen"
    role = "admin" if existing_role == "admin" else "authority"

    user_dict = {
        "firebaseUid": uid,
        "name": user_data.name or "Authority User",
        "email": user_data.email,
        "role": role,
        "fcmTokens": existing.get("fcmTokens", []) if existing else [],
        "createdAt": existing.get("createdAt") or user_data.dict().get("createdAt") or datetime.utcnow().isoformat()
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
