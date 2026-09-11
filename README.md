# CivicFix — Geo-Aware Autonomous AI Civic Issue Resolution Platform

> **Tagline:** From civic complaint to civic action.

CivicFix is a geo-aware autonomous AI platform that converts citizen complaints into actionable civic cases through an agentic workflow using Gemini, LangGraph, Python FastAPI, MongoDB Atlas, Firebase Authentication & FCM, OpenStreetMap Leaflet, Nominatim reverse geocoding, and Cloudinary image storage.

---

## 1. Product Overview

CivicFix is not merely an AI chatbot that outputs text. It is an **agentic workflow engine** that takes actions using deterministic backend tools:
1. **Understand Complaint**: Gemini natural language understanding (NLU) extracts category and severity.
2. **Reverse-Geocode Location**: Nominatim OpenStreetMap API converts GPS coordinates to human-readable addresses.
3. **Deterministic Priority Engine**: Scores priority based on base severity + proximity modifiers (schools, hospitals, main roads, safety hazards).
4. **Spatial Duplicate Detection**: Haversine distance algorithm searches nearby reports within 100 meters and consolidates multiple citizen reports into single master civic cases.
5. **Department Routing & SLA Tracking**: Assigns responsible municipal department and monitors resolution deadlines.
6. **Autonomous SLA Escalation**: Background cron monitors deadlines and automatically elevates breached cases to `CRITICAL` priority with instant authority notifications.

---

## 2. System Architecture

```
User (Citizen / Admin)
  │
  ├──► Next.js 14 Frontend (TypeScript, Tailwind CSS, Leaflet Maps)
  │      │
  │      └──► Firebase Auth (Email/Password & Google Sign-In)
  │
  └──► FastAPI Python Backend
         │
         ├──► LangGraph Agentic Workflow
         │      ├── Gemini API (NLU & Structured Classification)
         │      ├── Reverse Geocoding Tool (Nominatim OSM)
         │      ├── Priority Scoring Engine (Deterministic Rules)
         │      ├── Haversine Distance Tool (100m Radius Duplicate Search)
         │      └── Department Routing Tool
         │
         ├──► MongoDB Atlas / Resilient In-Memory DB Engine
         ├──► Cloudinary (Photo Evidence Storage)
         └──► Autonomous SLA Escalation Monitor (/api/monitor/sla)
```

---

## 3. Key Features

- **Citizen Issue Reporting**: Description, photo evidence preview/upload, high-accuracy GPS capture, and Leaflet location picker.
- **Live Agent Execution Visualizer**: Step-by-step progress visualizer showing Gemini classification, priority scoring, duplicate checking, and department routing.
- **Duplicate Report Consolidation**: Automatically links duplicate complaints within 100 meters to a master case and increments affected citizen counts.
- **Impact Radius Overlay**: Visualizes 50m–150m impact zones on Leaflet maps.
- **Civic Command Center (Admin Dashboard)**: Live KPI statistics, filterable GIS map with priority-colored pins, status management, department reassignment, and **"Simulate SLA Breach"** demo trigger.
- **Autonomous SLA Escalation**: Idempotent `/api/monitor/sla` endpoint suitable for Vercel Cron or standard crontab.

---

## 4. Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, React, Leaflet & React-Leaflet, Lucide Icons.
- **Backend**: Python 3.13, FastAPI, Uvicorn, Pydantic, Motor/PyMongo async MongoDB client.
- **AI Agent**: Gemini 1.5 Flash API, LangGraph, LangChain Core.
- **Authentication**: Firebase Authentication SDK (Email/Password & Google OAuth).
- **Storage**: Cloudinary API for photo evidence.
- **Geocoding & Maps**: OpenStreetMap Leaflet, Nominatim reverse geocoding.

---

## 5. Directory Structure

```
civicfix/
├── backend/
│   ├── app/
│   │   ├── agent/
│   │   │   ├── graph.py       # LangGraph Agentic workflow & Gemini LLM caller
│   │   │   └── tools.py       # Backend tool functions
│   │   ├── routers/
│   │   │   ├── agent.py       # /api/agent/process
│   │   │   ├── auth.py        # /api/auth/sync & user profile
│   │   │   ├── complaints.py  # /api/complaints CRUD & photo upload
│   │   │   ├── dashboard.py   # /api/dashboard/stats
│   │   │   ├── monitor.py     # /api/monitor/sla & simulate-breach
│   │   │   └── notifications.py
│   │   ├── services/
│   │   │   ├── duplicate.py   # Spatial duplicate detection & consolidation
│   │   │   ├── geocoding.py   # Nominatim reverse geocoding with caching
│   │   │   ├── haversine.py   # Pure Python Haversine distance calculator
│   │   │   ├── priority.py    # Deterministic priority scoring engine
│   │   │   └── sla.py         # SLA deadline calculation & breach escalation
│   │   ├── cloudinary_utils.py
│   │   ├── config.py          # Pydantic Settings env configuration
│   │   ├── database.py        # MongoDB Atlas client with resilient fallback
│   │   ├── firebase.py        # Firebase Admin SDK token verification
│   │   ├── main.py            # FastAPI entrypoint & CORS setup
│   │   └── models.py          # Pydantic data schemas
│   └── requirements.txt
│
├── frontend/
│   ├── app/
│   │   ├── admin/page.tsx     # Civic Command Center (Admin Dashboard)
│   │   ├── complaint/[id]/page.tsx # Detailed case tracking page
│   │   ├── dashboard/page.tsx # Citizen personal dashboard
│   │   ├── login/page.tsx     # Firebase Auth Login
│   │   ├── register/page.tsx  # Firebase Auth Register
│   │   ├── report/page.tsx   # Citizen Report Page with GPS & live agent view
│   │   ├── layout.tsx         # Root layout with Leaflet CSS & Navbar
│   │   └── page.tsx           # Civic tech landing page
│   ├── components/
│   │   ├── AgentVisualizer.tsx # Live agent progress stepper
│   │   ├── Footer.tsx
│   │   ├── LeafletMap.tsx     # Dynamic SSR-friendly Leaflet Map
│   │   ├── LeafletMapInner.tsx
│   │   ├── Navbar.tsx
│   │   └── StatusBadge.tsx
│   ├── lib/
│   │   ├── api.ts            # Backend API client wrapper
│   │   └── firebase.ts       # Firebase Client SDK setup
│   ├── package.json
│   └── tailwind.config.js
│
├── .env.example
├── .env
└── README.md
```

---

## 6. Environment Variables

Copy `.env.example` to `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/civicfix?retryWrites=true&w=majority

FIREBASE_PROJECT_ID=demo-civicfix
FIREBASE_CLIENT_EMAIL=demo@civicfix.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=""

NEXT_PUBLIC_FIREBASE_API_KEY=demo_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-civicfix.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-civicfix
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-civicfix.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:demo

CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=demo
CLOUDINARY_API_SECRET=demo

NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## 7. How to Run Locally

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend API will start at `http://localhost:8000` (Interactive Swagger docs available at `http://localhost:8000/docs`).

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

Frontend application will start at `http://localhost:3000`.

---

## 8. Scheduled SLA Monitoring (Cron Configuration)

Configure a free cron service (such as [cron-job.org](https://cron-job.org) or Vercel Cron) to trigger the SLA monitoring endpoint every 15 minutes:

```http
POST https://your-backend.onrender.com/api/monitor/sla
```

---

## 9. Exact Hackathon Demo Flow

1. **Submit Complaint**:
   - Go to `http://localhost:3000/report`.
   - Enter description: `"There is a dangerous pothole near the college gate. Two bikes almost crashed here."`
   - Click **"Use My Location"** (GPS coordinates are captured).
   - Upload a photo evidence image.
   - Click **"Submit & Start Agentic Workflow"**.
   - Watch live **Agent Visualizer** execute steps (Gemini NLU -> Priority score 5 HIGH -> 100m radius check -> Road Maintenance routing -> Case creation).

2. **Duplicate Consolidation Demonstration**:
   - Submit a second report at similar coordinates.
   - Observe the agent detect proximity < 100m, link report to the master case, and increment citizen count to 2.

3. **Complaint Detail Page**:
   - View complaint metadata, interactive Leaflet map with 100m impact radius circle, agent activity trace log, and status timeline.

4. **Admin Command Center & Instant SLA Breach Simulation**:
   - Navigate to `http://localhost:3000/admin`.
   - View top KPI summary cards and GIS map containing all complaints.
   - Click **"⚡ Simulate SLA Breach"** on any case.
   - Observe deadline set to past, priority elevated to `CRITICAL`, status updated to `Escalated`, and instant notification triggered.
