# SafeWay.AI — Intelligent Road Safety & Driver Assistance Platform

SafeWay.AI is an end-to-end intelligent driver assistance and road safety ecosystem built for hackathons and real-world safety operations. It combines real-time computer vision, driver fatigue monitoring, Motor Vehicles Act rules compliance, geospatial hazard mapping, and V2V emergency collision response.

---

## 🌟 Key Platform Modules

1. **Smart Safety Demo Map**
   - Interactive route simulation on Leaflet with 200m circular safety warning zones around upcoming school and pedestrian crosswalks.
   - Manual stepping controls, route slider, and dynamic distance calculations.
   - Web Audio synthesizer and SpeechSynthesis voice alerts.

2. **Traffic Rule Directory**
   - Government-verified Motor Vehicles Act (MVA 2019) regulations and state penalty schedules.
   - State-wise filtering (Bihar, Delhi, Maharashtra, Karnataka, Central) and category tabs.

3. **Driver Drowsiness & Fatigue Monitor**
   - MediaPipe 468-point facial landmark perception tracking Eye Aspect Ratio (EAR).
   - Continuous 3.0-second eye-closure alert with buzzer synthesizer.
   - Support for Laptop Webcams, DroidCam USB, and WiFi IP streams.

4. **Road Safety & Emergency Collision Monitor**
   - Front-camera collision and camera obstruction detection.
   - Automated 15-second SOS countdown with manual cancel / send triggers.
   - High-accuracy GPS location dispatch with Google Maps navigation links.

5. **Operations Cockpit**
   - 3D WebGL vehicle telemetry canvas, speed advisories, and V2V peer mesh.

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Leaflet, Lucide Icons, Web Audio API, Web Speech API.
- **Backend Gateway**: Node.js, Express, MongoDB (Mongoose), WebSocket (V2V mesh).
- **AI Microservice**: Python, FastAPI, MediaPipe, OpenCV, Uvicorn.

---

## 🚀 Quick Start

### 1. Python AI Service
```bash
cd ai
pip install -r requirements.txt
python app.py
# Running on http://localhost:8000
```

### 2. Node.js Backend Gateway
```bash
cd backend
npm install
npm run dev
# Running on http://localhost:5000
```

### 3. Next.js Frontend
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:3000
```

---

## 📄 License
MIT License. Developed for Tejas India Hackathon 2026 by Team Legacy Coderz.
