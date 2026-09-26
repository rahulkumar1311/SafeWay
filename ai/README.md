# SafeWay-AI - Computer Vision & AI Inference Microservice

High-performance, modular Python microservice built with **FastAPI** to power SafeWay-AI real-time driver safety features:
1. **Drowsiness & Facial Fatigue Detection**: MediaPipe 468-point facial landmark perception with OpenCV Haar cascade fallback calculating Eye Aspect Ratio (EAR) and continuous eye-closure alarms.
2. **Traffic Sign Recognition**: Image processing and feature template matching with voice advisories.

---

## 🚀 Key Endpoints

- `GET /health`: Health probe returning model loading status and service environment.
- `POST /predict/drowsiness`: Analyzes driver face frames, computes EAR and 3.0s fatigue alert states.
- `POST /predict/traffic-sign`: Classifies road signs and returns advisory warnings.

---

## 🏃 Getting Started

```bash
cd ai
pip install -r requirements.txt
python app.py
# Microservice will start on http://localhost:8000
```
Interactive documentation is available at `http://localhost:8000/docs`.
