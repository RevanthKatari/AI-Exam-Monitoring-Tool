# AI — Exam Monitoring Dashboard

COMP8567 Internship Project · University of Windsor · Team 04

## Team

| Name | Student ID | Email |
|------|-----------|-------|
| Revanth Katari | 110195067 | katarir@uwindsor.ca |
| Kishore Katari | 110195066 | katarik@uwindsor.ca |
| Harshitha Venkata Konduru | 110103039 | konduruh@uwindsor.ca |
| Kavya Pagaria | 110211374 | pagaria@uwindsor.ca |

---

## What this is

A functional prototype of the instructor-facing **Exam Monitoring Dashboard** for the AI Exam Monitoring Tool. This frontend prototype is fully self-contained — no build step, no npm install. Open `index.html` in a browser and it works.

---

## Project structure

```
exam-monitor/
├── index.html                  ← Main dashboard (open this)
├── src/
│   ├── data/
│   │   └── students.js         ← Mock student data + audit logs
│   └── styles/
│       └── main.css            ← Design tokens + all component styles
└── README.md
```

---

## How to run

### Option 1 — Direct open
Just open `index.html` in Chrome, Edge, or Firefox.

### Option 2 — Local server (recommended)

**Python:**
```bash
cd exam-monitor
python -m http.server 8080
# open http://localhost:8080
```

**Node (npx):**
```bash
cd exam-monitor
npx serve .
# open the URL it prints
```

**VS Code:**
Install the **Live Server** extension, right-click `index.html` → "Open with Live Server".

---

## Features in this prototype

- Live countdown timer (90-minute exam)
- Metric strip: active students, total flags, high-risk count, avg integrity score
- Sidebar student list with colour-coded integrity scores
- Filter by: All / High risk / Flagged / Clean
- Click any student → full detail panel:
  - Integrity score ring
  - Risk badge (Low / Moderate / High)
  - Activity timeline with flag markers
  - Gaze stability chart (Chart.js line)
  - Audio activity chart (Chart.js bar — red spikes = anomaly)
  - Full flag log with timestamp, confidence %, duration, and description
  - Escalate / Print actions
- Dark mode (auto, via `prefers-color-scheme`)
- Responsive layout

---

## Connecting to the real backend (soon)

Replace the static import in `index.html`:

```js
// Current (mock):
import { STUDENTS, EXAM_META } from './src/data/students.js';

// Replace with a fetch call to your FastAPI backend:
const res = await fetch('http://localhost:8000/api/sessions/comp3430-a');
const { students, exam } = await res.json();
```

The FastAPI endpoint should return the same shape as `src/data/students.js`.

---

## Tech stack (full system)

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS + Chart.js (this prototype) → React 18 + TailwindCSS (full build) |
| Backend | FastAPI (Python 3.11) |
| AI — face/gaze | MediaPipe Face Mesh |
| AI — objects | YOLOv8 Nano via OpenCV |
| Audio | Web Audio API |
| Database | MongoDB Atlas (M0 free tier) |
| Stream | WebRTC + WebSockets |
| Project mgmt | Jira Cloud + GitHub |

---

## Roadmap (9-week sprint)

| Week | Milestone |
|------|-----------|
| 1 | Infrastructure, GitHub, scaffolding |
| 2 | Auth portals, JWT role-based access |
| 3 | WebRTC stream acquisition |
| 4 | AI Module I — MediaPipe gaze tracking |
| 5 | AI Module II — YOLOv8 object detection |
| 6 | Audio analysis + temporal state logic |
| 7 | Reporting engine (this dashboard, full version) |
| 8 | Stress testing, multi-user simulation |
| 9 | Deployment, demo, academic defence |

---
