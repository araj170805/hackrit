import os
import logging
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("civicfix.database")

class Database:
    client: Optional[AsyncIOMotorClient] = None
    db: Any = None
    is_mock: bool = False
    
    # In-memory fallback stores if MongoDB connection is unavailable
    memory_users: Dict[str, Dict[str, Any]] = {}
    memory_complaints: Dict[str, Dict[str, Any]] = {}
    memory_agent_logs: Dict[str, Dict[str, Any]] = {}
    memory_notifications: List[Dict[str, Any]] = []
    memory_geocode_cache: Dict[str, str] = {}

db_wrapper = Database()

async def connect_to_mongo():
    try:
        if settings.MONGODB_URI and "localhost" not in settings.MONGODB_URI or os.getenv("FORCE_MONGO"):
            db_wrapper.client = AsyncIOMotorClient(settings.MONGODB_URI, tlsAllowInvalidCertificates=True)
            # Ping database to verify connection
            await db_wrapper.client.admin.command('ping')
            db_wrapper.db = db_wrapper.client.get_database()
            db_wrapper.is_mock = False
            logger.info("Successfully connected to MongoDB Atlas!")
            return
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}. Falling back to high-performance in-memory database storage.")
    
    db_wrapper.is_mock = True
    db_wrapper.db = None
    logger.info("CivicFix running with resilient in-memory database engine.")

async def close_mongo_connection():
    if db_wrapper.client:
        db_wrapper.client.close()
        logger.info("MongoDB connection closed.")

# Database helper functions supporting both MongoDB and In-Memory fallback seamlessly
async def get_user(firebase_uid: str) -> Optional[Dict[str, Any]]:
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        user = await db_wrapper.db.users.find_one({"firebaseUid": firebase_uid}, {"_id": 0})
        return user
    return db_wrapper.memory_users.get(firebase_uid)

async def save_user(user_data: Dict[str, Any]):
    firebase_uid = user_data["firebaseUid"]
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        await db_wrapper.db.users.update_one(
            {"firebaseUid": firebase_uid},
            {"$set": user_data},
            upsert=True
        )
    else:
        db_wrapper.memory_users[firebase_uid] = user_data

async def get_complaint(complaint_id: str) -> Optional[Dict[str, Any]]:
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        complaint = await db_wrapper.db.complaints.find_one({"complaintId": complaint_id}, {"_id": 0})
        return complaint
    return db_wrapper.memory_complaints.get(complaint_id)

async def save_complaint(complaint_data: Dict[str, Any]):
    cid = complaint_data["complaintId"]
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        await db_wrapper.db.complaints.update_one(
            {"complaintId": cid},
            {"$set": complaint_data},
            upsert=True
        )
    else:
        db_wrapper.memory_complaints[cid] = complaint_data

async def get_all_complaints(filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        query = filters or {}
        cursor = db_wrapper.db.complaints.find(query, {"_id": 0}).sort("createdAt", -1)
        return await cursor.to_list(length=1000)
    
    results = list(db_wrapper.memory_complaints.values())
    if filters:
        for key, val in filters.items():
            if val is not None:
                results = [c for c in results if c.get(key) == val]
    results.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return results

async def save_agent_log(log_data: Dict[str, Any]):
    cid = log_data["complaintId"]
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        await db_wrapper.db.agent_logs.update_one(
            {"complaintId": cid},
            {"$set": log_data},
            upsert=True
        )
    else:
        db_wrapper.memory_agent_logs[cid] = log_data

async def get_agent_log(complaint_id: str) -> Optional[Dict[str, Any]]:
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        log = await db_wrapper.db.agent_logs.find_one({"complaintId": complaint_id}, {"_id": 0})
        return log
    return db_wrapper.memory_agent_logs.get(complaint_id)

async def save_notification(notif_data: Dict[str, Any]):
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        await db_wrapper.db.notifications.insert_one(notif_data)
    else:
        db_wrapper.memory_notifications.append(notif_data)

async def get_notifications(user_id: str) -> List[Dict[str, Any]]:
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        cursor = db_wrapper.db.notifications.find({"userId": user_id}, {"_id": 0}).sort("createdAt", -1)
        return await cursor.to_list(length=100)
    return [n for n in db_wrapper.memory_notifications if n.get("userId") == user_id]
