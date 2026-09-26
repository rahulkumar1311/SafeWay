# Drive Safe — AI Driver Drowsiness Detection & Emergency System

Drive Safe is an intelligent, real-time driver safety web application featuring real-time AI dashcam drowsiness monitoring, multi-stage emergency escalation (5s audio alert -> safe autonomous pull-over -> emergency GPS SOS -> 200m V2V proximity broadcast), and an intuitive multi-screen modern driver ecosystem.

## Requested Screens Architecture

1. **Login & Driver Profile Screen**:
   - Biometric Face ID scanning simulation & PIN login.
   - Driver profile selection (e.g. Alex Morgan - Fleet Driver ID #4829).
   - Emergency contact verification & dashcam calibration check.

2. **Home Overview Screen**:
   - Driver Safety Score (e.g. 98/100 A+), Trip statistics, Fatigue trend graph.
   - Live system status cards (AI Dashcam Online, SOS Ready, V2V Mesh active).
   - Weather & road hazard alert widget, Quick start detection action.

3. **Safety Dashboard (Core AI Detection Engine)**:
   - Real-time Dashcam feed with MediaPipe/Canvas facial mesh overlay (EAR score, eye open meter, head nod, yawn detector).
   - Works with **Live Webcam** AND **Interactive Simulation Presets** (Awake, Micro-sleep, Unresponsive, Night Drive).
   - **Stage 1**: 5-second countdown with Web Audio siren warning and 4 re-engagement options (Button, Spacebar, Voice command, Eye blink).
   - **Stage 2**: Autonomous deceleration simulator (shoulder pull-over visualization, hazard lights, telemetry 80 -> 0 km/h).
   - **Stage 3**: Emergency GPS dispatch notification (Police station & emergency contacts).
   - **Stage 4**: V2V 200m Proximity Radar broadcast.

4. **Navigation & Safe Spot Finder Screen**:
   - Interactive turn-by-turn map with real-time GPS positioning.
   - Designated "Safe Parking & Rest Areas" mapped automatically along the route.
   - Fatigue-aware routing: Suggests rest stop every 2 hours or when drowsiness index exceeds 40%.

5. **Traffic Rules & Road Regulations Screen**:
   - Interactive repository of Traffic Rules, Speed Limits, Drowsiness & Commercial Driving Regulations.
   - Interactive Traffic Signs visual guide and quick search.
   - Safe Driving Knowledge Quiz & Rule Assistant.

6. **Emergency & SOS Command Screen**:
   - 1-Tap SOS Panic Button with 3-second abort timer.
   - Nearby Police Stations & Hospitals live locator map with distance & directions.
   - Emergency contacts list with instant SMS/Call trigger test.
   - Incident & Unresponsive Event Log history.

7. **Top-Tier UI/UX & Aesthetics**:
   - Dark EV Cockpit layout with high contrast glowing indicators (Cyan `#00f2fe`, Emerald `#00e676`, Amber `#ffab00`, Neon Red `#ff1744`).
   - Glassmorphic card styling, smooth tab switching animations, interactive sound engine (Web Audio API).
   - Mobile and desktop responsive design.

---

## Technical Approach & Setup Plan

- Create Vite + React app in `./` using `npm create vite@latest`.
- Install dependencies: `lucide-react`, `leaflet`, `react-leaflet`, `canvas-confetti` (for positive re-engagement reward!), `howler` / Web Audio API.
- Modular component architecture with centralized state management (`AppStateContext`) for seamless transition between screens and real-time triggers across tabs.
