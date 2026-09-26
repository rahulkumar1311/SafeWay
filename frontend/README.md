# SafeWay-AI Frontend Application

Intelligent Road Safety & Driver Assistance Platform built with Next.js 14 (App Router), TypeScript, and Tailwind CSS.

---

## 🚀 Key Features & Components

- **Smart Safety Demo Map** (`components/navigation/SmartSafetyDemoMap.tsx`):
  - Visual route simulation with 200m circular safety warning zones around upcoming school and pedestrian crosswalks.
  - Interactive slider, step controls (`[← Move Back]` / `[Forward →]`), and real-time distance calculations.
  - Web Audio alert synthesizer and SpeechSynthesis voice advisories.

- **Traffic Rule Directory** (`components/traffic/TrafficRuleQuickDirectory.tsx`):
  - Motor Vehicles Act (MVA 2019) regulations with state filters (Bihar, Delhi, Maharashtra, Central) and fine schedules.

- **AI Driver Monitor** (`app/drowsiness/page.tsx`):
  - Facial landmark tracking computing Eye Aspect Ratio (EAR) and 3.0s continuous eye closure alarm.

- **Horizontal Top Navigation** (`components/layout/TopNavigation.tsx`):
  - Sleek, full-width top navigation bar located directly beneath the main header.

- **Collision & Road Safety** (`app/road-safety/page.tsx`, `app/emergency/page.tsx`):
  - Front camera obstruction detection with automated 15-second SOS countdown dispatch.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14.2 (App Router)
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 3.4
- **Mapping**: Leaflet 1.9 & React-Leaflet
- **Icons**: Lucide React
- **Audio**: Web Audio API & Web Speech Synthesis

---

## 🏃 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```
Application will be available at `http://localhost:3000`.
