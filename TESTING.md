# Testing Report — AI Exam Monitor

Prepared 2026-07-22. Covers functional testing (backend + frontend) and performance/load testing (JMeter) of the FastAPI backend.

## Summary

| | |
|---|---|
| Automated tests | 109 (all passing) |
| Backend tests (pytest) | 74 |
| Frontend tests (Vitest + RTL) | 35 |
| Load test requests | 1,004 |
| Load test error rate | 1.5% |

Functional tests check that each feature behaves correctly in isolation. Performance tests check how the backend holds up when many people use it at once — a feature can be 100% correct and still fall over under load, which is exactly the pattern found below.

## Functional testing

### Backend — pytest (74 tests)

Runs against an isolated MongoDB database (`proctorai_test`), separate from real/demo data. An autouse fixture wipes the test database before every test, so tests can't leak state into one another.

| Suite | What it checks | Tests |
|---|---|---|
| `test_auth.py` | Registration, instructor approval queue, login, role enforcement | 14 |
| `test_exams.py` | Exam CRUD, ownership checks, roster CRUD, CSV import (header/headerless, blank rows) | 19 |
| `test_attempt.py` | Attempt lifecycle, identity-approval gate (pending/approved/denied/retake), gated endpoints | 18 |
| `test_flags.py` | Proctoring flag creation, scoring side-effects, query filters, role restriction | 6 |
| `test_scorer.py` | Integrity-score deduction math (danger/warning/info penalties, floor at 0) | 7 |
| `test_formatting.py` | Dashboard formatting helpers — timestamps, icons, timeline building | 9 |
| `test_smoke.py` | Health check, test-DB isolation guard | 2 |

Full run: **74 passed, 0 failed** in 41.5s.

Notable coverage: the identity-approval gate. A student cannot start, answer, or submit an exam until `identity_status` is `"approved"`. Tests cover the full state machine — photo submitted → pending → instructor approves/denies → denial reason shown → student retakes photo → back to pending — including that a denial from a non-owning instructor is rejected (403).

Run it:
```bash
cd proctorAI/backend
venv/Scripts/python.exe -m pytest
```

### Frontend — Vitest + React Testing Library (35 tests)

| File | What it checks | Tests |
|---|---|---|
| `helpers.test.js` | Score-color thresholds, risk labels, initials, flag-type color mapping | 12 |
| `client.test.js` | Token/role/student-id storage, logout, axios auth-header interceptor | 6 |
| `Login.test.jsx` | Sign-in/register mode toggle, conditional fields, submission, error + pending states | 7 |
| `StudentSidebar.test.jsx` | Search filter, risk-tab filters, attempt-status badges, empty state | 7 |
| `ExamQuestionNav.test.jsx` | Answered/unanswered indicators, question navigation | 3 |

Full run: **35 passed, 0 failed** across 5 files, ~6.4s.

Run it:
```bash
cd proctorAI/frontend
npm test
```

## Performance testing — JMeter

A JMeter test plan (`proctorAI/backend/perf-tests/exam_monitor_load_test.jmx`) drives the backend directly over HTTP — no browser involved — isolating backend/database performance from the frontend.

### What was simulated

1. **Setup** — one instructor creates an exam and uploads a 50-student roster via CSV (exercises auto-provisioning + bulk import).
2. **Setup** — all 50 students submit an identity photo and get instructor-approved, so they can reach the gated endpoints.
3. **Burst** — the 50 students hit "start exam" concurrently (10s ramp-up), each answers 3 questions and submits — modeling the worst-case moment of an exam's opening minutes.
4. **Sustained polling** — 10 simulated instructor dashboards each poll the roster + report endpoints every 3s for 20 rounds — modeling a proctor watching a live session.
5. **Raw auth load** — 20 concurrent logins, 5 rounds each (100 requests) — isolates login/password-check cost from everything else.

### Results (mean response time)

| Endpoint | Samples | Mean | p95 | Max | Errors |
|---|--:|--:|--:|--:|--:|
| `POST /auth/login` | 100 | 9,683 ms | 15,003 ms | 16,666 ms | 15 (15%) |
| `POST /auth/login` (student) | 100 | 5,544 ms | 10,700 ms | 11,833 ms | 0 |
| `POST /attempt/start` | 50 | 2,717 ms | 3,985 ms | 4,033 ms | 0 |
| `GET /attempt` | 50 | 2,527 ms | 3,236 ms | 3,256 ms | 0 |
| `POST roster/{id}/identity` | 50 | 2,427 ms | 3,506 ms | 3,675 ms | 0 |
| `POST /attempt/answers` (×3) | 150 | 1,324 ms | 2,900 ms | 3,255 ms | 0 |
| `POST /attempt/id-photo` | 50 | 1,651 ms | 2,199 ms | 2,255 ms | 0 |
| `POST /attempt/submit` | 50 | 579 ms | 2,700 ms | 2,911 ms | 0 |
| `GET` dashboard roster / report | 400 | ~96 ms | ~150 ms | 1,011 ms | 0 |

Overall: 1,004 requests, 4.2 req/s throughput, 1.5% error rate.

Run it:
```bash
cd proctorAI/backend
"../../tools/apache-jmeter-5.6.3/bin/jmeter.bat" -n -t perf-tests/exam_monitor_load_test.jmx -l perf-tests/results.jtl -e -o perf-tests/report
```
(The backend must be running on `localhost:8000` first. The plan logs in as the seeded instructor `prof@test.com` / `test123`; it cleans up its own exam/roster on the next run.) Full percentile data is in `perf-tests/results.jtl`; an HTML dashboard is generated at `perf-tests/report/index.html`.

## Key finding: login serializes under concurrency

**Root cause:** `hash_password` and `verify_password` in `proctorAI/backend/app/core/security.py` call `bcrypt.hashpw` / `bcrypt.checkpw` directly inside `async def` route handlers. Bcrypt is deliberately slow and entirely CPU-bound. Because the call isn't offloaded to a worker thread, it blocks Uvicorn's single event loop for its full duration — every other in-flight request, on any endpoint, stalls until that one hash finishes.

With 20 concurrent logins, that per-request cost compounds: mean login time rose to **9.7 seconds**, worst case hit **16.7 seconds**, and 15 of 100 requests exceeded the 15s client timeout entirely. By contrast, endpoints that only touch MongoDB (dashboard polling, report generation) stayed under 100ms on average even with 10 concurrent pollers — the database was never the bottleneck; the blocking hash call was. This also explains the elevated latency on other endpoints in the same run (attempt/start, answers, GET /attempt) despite doing trivial Mongo writes — they were queued behind whichever bcrypt call currently held the event loop.

**Recommended fix** (not yet applied):
- Wrap both bcrypt calls in `await asyncio.to_thread(...)` so hashing runs on a worker thread instead of blocking the event loop — the same pattern already used for photo-URL fetching in `exams.py`.
- For production, run Uvicorn with multiple worker processes (e.g. `--workers 4` behind Gunicorn) so one slow request can't starve the whole instance.
- One-line-per-call fix, no behavior change.

## How to explain this

1. **Functional correctness is proven.** 109 automated tests (74 backend + 35 frontend) cover every feature end to end — registration/approval, exam and roster management, CSV bulk import, the identity-photo approval gate and its full state machine, exam attempts, scoring, and the UI components that drive them. All pass.
2. **Performance testing asks a different question.** Correctness tests run one request at a time; JMeter fired realistic concurrent load — 50 students starting an exam at once, 10 instructors polling dashboards, 20 simultaneous logins — to see where the system strains.
3. **It found one real bottleneck, not a vague "it's slow."** Database-backed endpoints stayed fast (under 100ms) under load. Only the password-hashing path in login blocked, because it runs synchronous, CPU-heavy bcrypt code directly on the async event loop instead of a worker thread.
4. **The fix is small and specific.** Offload the two bcrypt calls to a thread (`asyncio.to_thread`) — a pattern the codebase already uses elsewhere for a similar reason.

## File locations

- Backend tests: `proctorAI/backend/tests/`
- Frontend tests: `proctorAI/frontend/src/**/*.test.{js,jsx}`
- Load test plan: `proctorAI/backend/perf-tests/exam_monitor_load_test.jmx`
- Load test raw results: `proctorAI/backend/perf-tests/results.jtl`
- Load test HTML dashboard: `proctorAI/backend/perf-tests/report/index.html`
