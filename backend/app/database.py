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
    memory_votes: Dict[str, Dict[str, Any]] = {}  # key: "issueId:userId"
    memory_reports: Dict[str, Dict[str, Any]] = {} # key: "issueId:userId"

db_wrapper = Database()

async def connect_to_mongo():
    try:
        if settings.MONGODB_URI and "localhost" not in settings.MONGODB_URI or os.getenv("FORCE_MONGO"):
            db_wrapper.client = AsyncIOMotorClient(settings.MONGODB_URI, tlsAllowInvalidCertificates=True)
            # Ping database to verify connection
            await db_wrapper.client.admin.command('ping')
            db_wrapper.db = db_wrapper.client.get_database()
            db_wrapper.is_mock = False
            
            # Ensure indexes
            try:
                await db_wrapper.db.complaints.create_index([("location", "2dsphere")])
                await db_wrapper.db.community_votes.create_index([("issueId", 1), ("userId", 1)], unique=True)
                await db_wrapper.db.community_issue_reports.create_index([("issueId", 1), ("reporterUserId", 1)], unique=True)
            except Exception as ie:
                logger.warning(f"Failed to create MongoDB indexes: {ie}")
                
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

# Community Issue Network helper functions
from app.services.haversine import haversine_distance

async def get_nearby_complaints_geo(lat: float, lon: float, radius_meters: float = 50000.0) -> List[Dict[str, Any]]:
    """
    Finds complaints within specified radius (max 50KM) using MongoDB 2dsphere geoquery or Haversine fallback.
    """
    effective_radius = min(radius_meters, 50000.0)
    
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        try:
            query = {
                "location": {
                    "$near": {
                        "$geometry": {
                            "type": "Point",
                            "coordinates": [lon, lat]
                        },
                        "$maxDistance": effective_radius
                    }
                },
                "moderationStatus": {"$ne": "REJECTED"}
            }
            cursor = db_wrapper.db.complaints.find(query, {"_id": 0})
            return await cursor.to_list(length=200)
        except Exception as ge:
            logger.warning(f"MongoDB 2dsphere query failed: {ge}. Using Haversine spatial filter.")

    all_cases = await get_all_complaints()
    nearby = []
    for c in all_cases:
        if c.get("moderationStatus") == "REJECTED":
            continue
        loc = c.get("location", {})
        c_lat = loc.get("latitude")
        c_lon = loc.get("longitude")
        if c_lat is not None and c_lon is not None:
            dist_m = haversine_distance(lat, lon, c_lat, c_lon)
            if dist_m <= effective_radius:
                c_copy = dict(c)
                c_copy["distanceMeters"] = round(dist_m, 1)
                nearby.append(c_copy)
    nearby.sort(key=lambda x: x.get("finalPriorityScore", 0), reverse=True)
    return nearby

async def get_user_vote(issue_id: str, user_id: str) -> bool:
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        vote = await db_wrapper.db.community_votes.find_one({"issueId": issue_id, "userId": user_id})
        return vote is not None
    key = f"{issue_id}:{user_id}"
    return key in db_wrapper.memory_votes

async def add_user_vote(issue_id: str, user_id: str) -> bool:
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        try:
            from datetime import datetime
            await db_wrapper.db.community_votes.insert_one({
                "issueId": issue_id,
                "userId": user_id,
                "createdAt": datetime.utcnow().isoformat()
            })
            return True
        except Exception:
            return False  # Already voted
    key = f"{issue_id}:{user_id}"
    if key in db_wrapper.memory_votes:
        return False
    from datetime import datetime
    db_wrapper.memory_votes[key] = {"issueId": issue_id, "userId": user_id, "createdAt": datetime.utcnow().isoformat()}
    return True

async def remove_user_vote(issue_id: str, user_id: str) -> bool:
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        res = await db_wrapper.db.community_votes.delete_one({"issueId": issue_id, "userId": user_id})
        return res.deleted_count > 0
    key = f"{issue_id}:{user_id}"
    if key in db_wrapper.memory_votes:
        del db_wrapper.memory_votes[key]
        return True
    return False

async def get_user_report(issue_id: str, user_id: str) -> bool:
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        rep = await db_wrapper.db.community_issue_reports.find_one({"issueId": issue_id, "reporterUserId": user_id})
        return rep is not None
    key = f"{issue_id}:{user_id}"
    return key in db_wrapper.memory_reports

async def add_user_report(issue_id: str, user_id: str, reason: str, description: str = "") -> bool:
    from datetime import datetime
    rec = {
        "issueId": issue_id,
        "reporterUserId": user_id,
        "reason": reason,
        "description": description,
        "status": "pending",
        "createdAt": datetime.utcnow().isoformat()
    }
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        try:
            await db_wrapper.db.community_issue_reports.insert_one(rec)
            return True
        except Exception:
            return False
    key = f"{issue_id}:{user_id}"
    if key in db_wrapper.memory_reports:
        return False
    db_wrapper.memory_reports[key] = rec
    return True

async def get_all_community_reports() -> List[Dict[str, Any]]:
    if not db_wrapper.is_mock and db_wrapper.db is not None:
        cursor = db_wrapper.db.community_issue_reports.find({}, {"_id": 0}).sort("createdAt", -1)
        return await cursor.to_list(length=500)
    return list(db_wrapper.memory_reports.values())

