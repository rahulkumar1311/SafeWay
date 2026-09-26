# SafeWay-AI - Computer Vision & AI Inference Microservice

High-performance, modular Python microservice built with **FastAPI** to power SafeWay-AI real-time driver safety features:
1. **Drowsiness Detection** (Camera frame → Face Detection → Eye Aspect Ratio (EAR) & Mouth Aspect Ratio (MAR) → Temporal State Machine → Driver Alert)
2. **Traffic Sign Recognition** (Camera/Image → HSV Color & Contour Geometry Detection → Model Classifier → Sign Meaning & Recommended Action → Voice Alert)

---

## 🏗️ Architecture

```
Camera Frame (Base64)                   Traffic Sign Image (Base64)
          │                                         │
          ▼                                         ▼
   Image Decoder                             Image Decoder
          │                                         │
          ▼                                         ▼
Face Detector & Enhancement             Preprocessor & Contour Detector
 (CLAHE + Primary Face)                     (CLAHE + HSV Masks + Geometry)
          │                                         │
     ┌────┴────┐                                    ▼
     ▼         ▼                         GTSRB Classifier Model
Eye Analyzer Yawn Analyzer            (Pre-loaded Startup Singleton)
   (EAR)     (MAR)                                  │
     └────┬────┘                                    ▼
          │                            Sign Metadata & Guidance
          ▼                            (Meaning + Recommended Action)
  Temporal Tracker                                  │
(Exponential Moving Average)                        ▼
          │                             Async Voice Alert Engine
          ▼                            (PyTTSx3 Offline TTS + Cooldown)
   State Machine                                    │
(NORMAL->WARNING->DROWSY->ALERT)                    ▼
          │                             Output: { signType, meaning,
          ▼                               confidence, recommendedAction,
Output: { drowsinessScore,                voiceAlertText }
  isDrowsy, confidence, alertState }
```

---

## 📁 Folder Structure

```
ai/
├── app.py                      # FastAPI Application Entrypoint (Startup Lifespan Loader)
├── requirements.txt            # Python dependencies
├── README.md                   # Integration & API documentation
├── .env.example                    # Environment variable template
├── drowsiness/                 # Real-time Drowsiness Detection module
│   ├── routes.py               # POST /predict/drowsiness API route handler
│   ├── schemas.py              # Pydantic validation schemas
│   ├── face_detector.py        # Primary face selection & CLAHE contrast enhancement
│   ├── eye_analyzer.py             # Eye Aspect Ratio (EAR) calculation module
│   ├── yawn_analyzer.py        # Mouth Aspect Ratio (MAR) calculation module
│   ├── temporal_tracker.py     # Session state & sliding window frame tracker
│   ├── scoring.py              # Drowsiness score & confidence calculation engine
│   └── state_machine.py        # Driver alert state machine & cooldown manager
├── traffic_sign/               # Traffic Sign Recognition & Voice Alert module
│   ├── model_loader.py          # Singleton Model Registry (loads AI model ONCE at startup)
│   ├── voice_alert.py          # Decoupled Voice Alert & Speech Synthesis Engine (pyttsx3)
│   ├── routes.py               # POST /predict/traffic-sign API route handler
│   ├── schemas.py              # Pydantic validation schemas
│   ├── preprocessing.py        # Contrast enhancement (CLAHE), blur, HSV color masks
│   ├── detection.py            # Contour & geometry detector (Octagon, Circle, Triangle, Square)
│   ├── classification.py       # Classifier engine consuming pre-loaded model instance
│   ├── metadata.py             # Enriched metadata (meaning & recommended driver action)
│   └── service.py              # Pipeline coordinator
└── common/                     # Shared utilities and configuration
    ├── config.py               # Application settings & environment variables
    ├── image_decoder.py        # In-memory base64 decoder
    └── logger.py               # Structured application logger
```

---

## 🐍 Python Version

- **Recommended**: Python `3.10+` (Tested and verified on Python `3.14.3`).

---

## 🚀 Installation & Virtual Environment Setup

### 1. Initialize Virtual Environment
- **Windows (PowerShell)**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
- **Linux / macOS**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

---

## ⚙️ Environment Variables

Create a `.env` file inside `ai/` or configure environment variables:

```env
# Service Network Config
PORT=8000
HOST=0.0.0.0
ENV=development

# Drowsiness Engine Thresholds
EAR_THRESHOLD=0.21
MAR_THRESHOLD=0.50
DROWSINESS_SCORE_THRESHOLD=70
CONSECUTIVE_CLOSED_FRAMES_ALERT=3
TEMPORAL_ALPHA=0.35
MAX_SESSION_INACTIVE_SECONDS=300

# Driver State Machine Thresholds
STATE_WARNING_THRESHOLD=40
STATE_DROWSY_THRESHOLD=70
STATE_ALERT_THRESHOLD=85
CONSECUTIVE_WARNING_FRAMES=2
CONSECUTIVE_DROWSY_FRAMES=3
CONSECUTIVE_ALERT_FRAMES=4
ALERT_COOLDOWN_SECONDS=5.0

# Traffic Sign Model Config
TRAFFIC_SIGN_MIN_CONFIDENCE=0.60
TRAFFIC_SIGN_MODEL_TYPE=gtsrb_cv_feature_model
TRAFFIC_SIGN_MODEL_PATH=traffic_sign/models/gtsrb_model.pkl

# Voice Alert Config
ENABLE_VOICE_ALERTS=true
VOICE_ALERT_COOLDOWN_SECONDS=10.0
```

---

## 🚦 How to Start the FastAPI Service

Start the service using Python:

```bash
python app.py
```

Or using Uvicorn directly:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

Once running, interactive API documentation is available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## 📡 Drowsiness API Documentation

- **Endpoint**: `POST /predict/drowsiness`
- **Description**: Analyzes camera frames for driver fatigue, computes Eye Aspect Ratio (EAR), Mouth Aspect Ratio (MAR), and updates driver state machine.

### Example Request:
```json
{
  "sessionId": "session_driver_101",
  "frameData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```

### Example Response (HTTP 200 OK):
```json
{
  "drowsinessScore": 75,
  "isDrowsy": true,
  "confidence": 0.92,
  "alertState": "DROWSY"
}
```

---

## 🛑 Traffic Sign API Documentation

- **Endpoint**: `POST /predict/traffic-sign`
- **Description**: Classifies traffic signs from image frames, returns human meaning, recommended driver actions, and triggers asynchronous offline voice alerts.

### Example Request:
```json
{
  "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
}
```

### Example Response (HTTP 200 OK):
```json
{
  "signType": "Speed Limit 50",
  "meaning": "Maximum speed limit is 50 km/h",
  "confidence": 0.94,
  "recommendedAction": "Maintain safe speed at or below 50 km/h",
  "voiceAlertText": "Speed alert: Maximum speed limit is 50 km/h. Maintain safe speed."
}
```

### Example Error Response (HTTP 400 Bad Request):
```json
{
  "detail": "Invalid image payload: Invalid base64 encoding: Only base64 data is allowed"
}
```

---

## 🧠 Model Setup

- **Single Startup Load**: AI model parameters, GTSRB feature descriptors, and geometry templates are pre-loaded **once** at application startup inside the `TrafficSignModelRegistry` via FastAPI `@asynccontextmanager lifespan`.
- **Zero Disk Re-reads**: Inference uses the in-memory singleton instance for fast response times (< 5ms).

---

## 🔊 Voice Alert Setup

- **Local Offline Speech**: Uses `pyttsx3` (Windows SAPI5 / Linux espeak). No cloud API keys or external subscriptions required.
- **Asynchronous & Non-Blocking**: Audio speech synthesis runs on a background worker thread, ensuring main API responses are returned instantly without delay.
- **Cooldown Buffer**: Per-sign cooldown (`10.0s`) prevents duplicate voice warnings.

---

## 🧪 Testing Commands

Execute full unit, contract, state machine, and integration test suite:

```bash
python -m pytest ai/tests -v
```

---

## 🔗 Backend Integration Instructions

The Node.js Express backend proxies AI requests to this microservice. Configure `backend/.env` with:

```env
# Backend proxy endpoints pointing to AI service
AI_DROWSINESS_SERVICE_URL=http://localhost:8000/predict/drowsiness
AI_TRAFFIC_SIGN_SERVICE_URL=http://localhost:8000/predict/traffic-sign
AI_SERVICE_TIMEOUT_MS=5000
```

---

## ⚠️ Known Limitations

1. **Lighting & Contrast Sensitivity**: OpenCV Haar Cascade face detection relies on sufficient facial illumination; extreme dark/night conditions require infrared camera inputs or histogram equalization.
2. **Camera Alignment**: Optimal drowsiness tracking requires a front-facing or dashboard camera view aligned with the driver's eyes.
3. **Synthetic Sign Classifier**: High-precision edge & contour feature template matching is optimized for standard GTSRB sign shapes (octagons, circles, triangles); extremely degraded or obstructed signs default to `"Unknown Sign"`.
