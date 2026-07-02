# AI Exam Monitor

COMP8567 Internship Project, University of Windsor, Team 04

## Team

| Name | Student ID | Email |
|------|-----------|-------|
| Revanth Katari | 110195067 | katarir@uwindsor.ca |
| Kishore Katari | 110195066 | katarik@uwindsor.ca |
| Harshitha Venkata Konduru | 110103039 | konduruh@uwindsor.ca |
| Kavya Pagaria | 110211374 | pagaria@uwindsor.ca |

---

## What this is

An AI-powered online exam monitoring tool. An instructor dashboard tracks students during an exam using webcam gaze tracking, object detection, and audio analysis, and flags anything that looks like academic dishonesty.

The repo has two parts:

- **`proctorAI/`** is the actual application: FastAPI backend, MongoDB, and a React + Tailwind frontend. See [proctorAI/README.md](proctorAI/README.md) for setup and API docs.
- **`index.html` / `src/`** at the repo root is the original vanilla JS dashboard prototype we built first to lock down the UI before writing any backend code. It's kept here for reference and still runs standalone with no build step.

## Project structure

```
.
├── index.html                  ← original prototype dashboard
├── src/
│   ├── data/students.js        ← mock student data used by the prototype
│   └── styles/main.css
├── proctorAI/                  ← the real app
│   ├── frontend/                React 18 + Tailwind + Vite
│   ├── backend/                 FastAPI + MediaPipe + YOLOv8 + MongoDB
│   └── docker-compose.yml
└── Team04_Interim_Report.docx
```

## Running the full app

```bash
cd proctorAI
docker compose up --build
```

Frontend on `http://localhost:5173`, backend on `http://localhost:8000`. Full instructions, API endpoints, and demo flow are in [proctorAI/README.md](proctorAI/README.md).

## Running the original prototype

The prototype at the repo root is just static files, useful if you want to see the design without spinning up the backend.

### Option 1: open it directly
Open `index.html` in Chrome, Edge, or Firefox.

> Since the page uses ES modules (`import`), Chrome sometimes blocks local file imports over CORS. If that happens, use Option 2 instead.

### Option 2: local server (recommended)

**Python:**
```bash
python -m http.server 8080
# open http://localhost:8080
```

**Node (npx):**
```bash
npx serve .
# open the URL it prints
```

**VS Code:**
Install the **Live Server** extension, right-click `index.html` → "Open with Live Server".

---

## Features in the prototype

- Live countdown timer (90 minute exam)
- Metric strip: active students, total flags, high-risk count, average integrity score
- Sidebar student list with colour-coded integrity scores
- Filter by All / High risk / Flagged / Clean
- Click a student to open the detail panel: integrity score ring, risk badge, activity timeline, gaze stability chart, audio activity chart, full flag log with timestamp/confidence/duration, escalate and print actions
- Dark mode via `prefers-color-scheme`
- Responsive layout

The mock data shape in `src/data/students.js` was frozen early and used as the target API contract, so when we wired up the real backend the frontend didn't need to change to consume live data.

## Tech stack (full system)

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TailwindCSS, Vite, Chart.js (prototype was vanilla JS) |
| Backend | FastAPI (Python 3.11) |
| AI, gaze | MediaPipe FaceLandmarker (Tasks API) |
| AI, objects | YOLOv8 Nano |
| Audio | Web Audio API |
| Database | MongoDB (local for dev, Atlas M0 for deployment) |
| Stream | WebRTC + WebSockets |
| Project mgmt | Jira Cloud + GitHub |

## Roadmap (9 week sprint, June 1 to July 31)

| Week | Milestone |
|------|-----------|
| 1 | Infrastructure, GitHub, scaffolding |
| 2 | Auth portals, JWT role-based access |
| 3 | WebRTC stream acquisition |
| 4 | AI Module I, MediaPipe gaze tracking |
| 5 | AI Module II, YOLOv8 object detection |
| 6 | Audio analysis and temporal state logic |
| 7 | Reporting engine (full dashboard version) |
| 8 | Stress testing, multi-user simulation |
| 9 | Deployment, demo, academic defence |

Weeks 1 to 4 are done. We're in week 5 now, tuning YOLOv8 detection thresholds.

## Jira epic mapping

| Epic | Covers |
|------|--------|
| Epic 1: UI/UX & Frontend Core | Prototype, React migration |
| Epic 2: Backend & Database | FastAPI routes, MongoDB schemas |
| Epic 3: AI Engine | MediaPipe, YOLOv8, Audio API |
| Epic 4: QA & Reporting | Dashboard, automated testing |

See [Team04_Interim_Report.docx](Team04_Interim_Report.docx) for the full progress writeup, including scope changes and challenges we ran into.
