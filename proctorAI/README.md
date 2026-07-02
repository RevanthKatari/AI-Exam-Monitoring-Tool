# AI Exam Monitor — AI-Powered Online Exam Monitoring

COMP8567 Internship Project · University of Windsor · Team 04

## Team

| Name | Student ID | Role |
|------|-----------|------|
| Revanth Katari | 110195067 | Frontend, WebRTC |
| Kishore Katari | 110195066 | Backend API, MongoDB, YOLOv8 |
| Harshitha Venkata Konduru | 110103039 | Auth, AI thresholds, Integrity scoring |
| Kavya Pagaria | 110211374 | FastAPI, WebSockets, MediaPipe |

## Architecture

```
proctorAI/
├── frontend/     React 18 + TailwindCSS + Vite
├── backend/      FastAPI + MediaPipe + YOLOv8 + MongoDB
└── docker-compose.yml
```

Student exam page captures webcam/audio, sends frames via WebSocket → AI pipeline flags violations → instructor dashboard polls REST API every 5s.

## Quick start

### Docker (recommended)

```bash
cd proctorAI
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:8000
- API docs: http://localhost:8000/docs

### Seed demo data

```bash
docker compose exec backend python seed.py
```

### Local development (without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Requires MongoDB running at `mongodb://localhost:27017` (or set `MONGO_URI` in `.env`).

## Instructor approval

New instructor registrations are `pending` until approved by an existing instructor — except the very first instructor account ever created, which is auto-approved (bootstrap admin). Approved instructors see a "N pending approvals" badge in the dashboard topbar and can approve/reject from there, or via `GET /auth/pending` and `POST /auth/approve/{id}` / `POST /auth/reject/{id}`. Students are always auto-approved (no dashboard access to gate).

## Demo flow

1. **Register instructor** at http://localhost:5173/login → role: instructor
2. **Create exam** via API:
   ```bash
   curl -X POST http://localhost:8000/api/exams \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"session_id":"comp3430-a-2026","title":"COMP3430 Final","section":"Section A","duration_minutes":90,"enrolled_students":["110195067"]}'
   ```
   Or run `python seed.py` for pre-built demo data.
3. **Register student** → opens `/exam?session=comp3430-a-2026&student=110195067`
4. Student grants camera/mic → WebSocket streams frames + audio
5. **Instructor dashboard** at `/dashboard` polls student data every 5s

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/auth/register` | Register user (instructors may land as `pending`) |
| POST | `/auth/login` | Login, get JWT (blocked if instructor is `pending`) |
| GET | `/auth/pending` | List pending instructor accounts (instructor-only) |
| POST | `/auth/approve/{id}` | Approve a pending instructor (instructor-only) |
| POST | `/auth/reject/{id}` | Reject/delete a pending instructor (instructor-only) |
| POST | `/api/exams` | Create exam session |
| GET | `/api/exams/{id}` | Get exam |
| GET | `/api/sessions/{id}/students` | Dashboard data |
| POST | `/api/flags` | Manual flag |
| WS | `/ws/{session_id}/{student_id}?token=<jwt>` | Student stream (requires student JWT) |

## Testing

```bash
# Health
curl http://localhost:8000/health

# Register + login
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Prof Test","email":"prof@test.com","password":"test123","role":"instructor"}'

curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"prof@test.com","password":"test123"}'

# Dashboard (with token)
curl http://localhost:8000/api/sessions/comp3430-a-2026/students \
  -H "Authorization: Bearer <token>"
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TailwindCSS, Chart.js, Vite |
| Backend | FastAPI, python-jose JWT, motor |
| AI | MediaPipe Face Mesh, YOLOv8 Nano |
| Database | MongoDB |
| Transport | WebRTC (browser) + WebSockets |

## Original prototype

The vanilla JS prototype lives in the parent directory (`index.html`, `src/data/students.js`, `src/styles/main.css`). The React frontend preserves its visual design.
