# SafeWay-AI Backend API Gateway

Modular Node.js, Express.js, MongoDB, and WebSocket backend service for the SafeWay-AI platform.

---

## 🚀 Key Modules & Endpoints

- **Health & AI Probe** (`/api/health`, `/api`):
  - Probes Node Express API, MongoDB cluster connectivity, and Python AI microservice uptime.
- **Traffic Rules & MVA Directory** (`/api/traffic-rules`):
  - Central & State-wise Motor Vehicles Act regulations with state queries and categories.
- **Emergency Collision SOS** (`/api/emergency`):
  - Emergency contact dispatch with GPS geocoded location links.
- **V2V Safety Mesh Network** (`/v2v` WebSocket):
  - Real-time peer broadcast for proximity vehicle telemetry.
- **Road Hazards & Risk Index** (`/api/hazards`, `/api/safety`):
  - Geospatial hazard radius queries and safety risk score computing.

---

## 🏃 Getting Started

```bash
cd backend
npm install
npm run dev
# Server will listen on port 5000
```
