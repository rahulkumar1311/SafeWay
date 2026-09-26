# SafeWay.AI System Architecture

This document provides a technical overview of the **SafeWay.AI** intelligent driver assistance and road safety ecosystem.

---

## 1. System Topology

```
+-----------------------------------------------------------------------------------------------+
|                                       NEXT.JS FRONTEND                                        |
|                                    (Port 3000 / Port 3001)                                    |
|                                                                                               |
|  +---------------------------+  +---------------------------+  +---------------------------+  |
|  |   Top Navigation Bar      |  |   Smart Safety Demo Map   |  |   AI Driver Monitor       |  |
|  |   (Horizontal Navigation) |  |   (200m Warning Zones)    |  |   (EAR & Fatigue Score)   |  |
|  +---------------------------+  +---------------------------+  +---------------------------+  |
+-----------------------------------------------+-----------------------------------------------+
                                                │ REST / WebSockets
                                                ▼
+-----------------------------------------------------------------------------------------------+
|                                     NODE.JS EXPRESS BACKEND                                   |
|                                           (Port 5000)                                         |
|                                                                                               |
|  • Traffic Rules API (`/api/traffic-rules`)        • Health & AI Probe (`/api/health`)        |
|  • Road Hazards Directory (`/api/hazards`)        • Emergency SOS Dispatch (`/api/emergency`)|
|  • V2V Peer-to-Peer Mesh Server (`/v2v`)          • MongoDB Cluster Connection                |
+-----------------------------------------------+-----------------------------------------------+
                                                │ REST Proxies (Base64 Frames)
                                                ▼
+-----------------------------------------------------------------------------------------------+
|                                  PYTHON FASTAPI AI MICROSERVICE                               |
|                                           (Port 8000)                                         |
|                                                                                               |
|  • MediaPipe 468-point Face Landmark Perception   • Eye Aspect Ratio (EAR) Thresholding       |
|  • 3.0s Continuous Closure Detection               • GTS RB Traffic Sign Model Classifier     |
+-----------------------------------------------------------------------------------------------+
```

---

## 2. Smart Safety Demo Map — 200-Meter Warning Zone

- **Geospatial Model**: Calculates Haversine distance and ahead-of-vehicle cone bearing ($\pm 60^\circ$).
- **Outside 200m**: Displays landmarks as upcoming safety points (`🏫 School: 359m`, `🚸 Crosswalk: 601m`).
- **At or inside 200m**: Triggers dynamic amber warning banner with advisory speed limits and audio alerts.
- **Debounced Audio Engine**: Web Audio synthesizer with speech synthesis plays alerts once per zone entry.

---

## 3. Computer Vision & Drowsiness Perception

- **Sensor Input**: Built-in Webcams, USB DroidCam, or WiFi IP streams (`http://IP:4747/video`).
- **EAR Metric**:
  $$EAR = \frac{||p_2 - p_6|| + ||p_3 - p_5||}{2 \times ||p_1 - p_4||}$$
- **Threshold**: $EAR < 0.22$ indicates eye closure. Sustained closure $\ge 3.0\text{s}$ triggers an audible buzzer alarm.

---

## 4. Collision Impact & Emergency SOS

- **Obstruction Detection**: Sustained camera blockage combined with deceleration triggers a 15-second countdown.
- **Dispatch**: Sends live GPS coordinates via SMS/Notification with direct Google Maps navigation links.
