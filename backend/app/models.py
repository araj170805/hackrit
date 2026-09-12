from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class LocationModel(BaseModel):
    latitude: float
    longitude: float
    accuracy: float = 0.0

class UserSchema(BaseModel):
    firebaseUid: str
    name: str
    email: str
    role: str = "citizen"
    fcmTokens: List[str] = []
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class UserCreate(BaseModel):
    firebaseUid: str
    name: str
    email: str
    role: Optional[str] = "citizen"

class ComplaintSubmitRequest(BaseModel):
    description: str
    location: LocationModel
    imageUrl: Optional[str] = None
    userId: Optional[str] = "anonymous"
    userEmail: Optional[str] = None

class ComplaintSchema(BaseModel):
    complaintId: str
    userId: str
    description: str
    category: str  # pothole, garbage, broken_streetlight, water_leakage
    severity: str  # low, medium, high, critical
    priority: str  # low, medium, high, critical
    priorityScore: int = 1
    priorityReason: List[str] = []
    status: str = "submitted"  # submitted, in_progress, escalated, resolved
    location: LocationModel
    address: str = ""
    imageUrl: Optional[str] = None
    department: str = ""
    duplicateOf: Optional[str] = None
    duplicateCount: int = 0
    affectedCitizens: int = 1
    impactRadius: int = 100
    slaHours: int = 72
    communitySupportCount: int = 0
    communityReportCount: int = 0
    communitySignal: str = "LOW"  # LOW, MEDIUM, HIGH, VERY_HIGH
    communitySignalScore: int = 0
    finalPriorityScore: int = 1
    moderationStatus: str = "NORMAL"  # NORMAL, UNDER_REVIEW, CONFIRMED, REJECTED
    communityThresholdsTriggered: List[int] = []
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    deadline: str = ""
    escalated: bool = False
    resolvedAt: Optional[str] = None

class AgentEvent(BaseModel):
    type: str
    message: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class AgentLogSchema(BaseModel):
    complaintId: str
    events: List[AgentEvent] = []

class NotificationSchema(BaseModel):
    userId: str
    title: str
    body: str
    type: str
    complaintId: Optional[str] = None
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class StatusUpdateRequest(BaseModel):
    status: str
    department: Optional[str] = None
    resolutionImageUrl: Optional[str] = None

class ResolutionEvidenceSubmitRequest(BaseModel):
    token: str
    imageUrl: str
    latitude: float
    longitude: float
    accuracy: float = 0.0
    capturedAt: str  # device-reported ISO timestamp; server also records its own receipt time

class ConfirmResolutionRequest(BaseModel):
    action: str  # "confirm" | "reject" | "request_new"
    note: Optional[str] = None

class CitizenFeedbackRequest(BaseModel):
    fixed: bool
