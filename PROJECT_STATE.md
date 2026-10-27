# PROJECT_STATE.md — FitVision living status file

> Every AI agent: read this first. Update it at the end of every session (see AGENTS.md section 9).
> Progress percentages are rough estimates, not measurements. Update honestly.

**Last updated:** 2026-10-27 | **Session #:** 2
**Updated by:** Antigravity (Claude Opus 4.6) — fix/sklearn-version branch
**Repo:** https://github.com/SAGETOAD-source/fitvision (branch `fix/sklearn-version`)
**Owner:** Krishnendu | **Dev environment:** Windows, Antigravity IDE

---

## 1. What FitVision is

Browser-based AI fitness coach: counts exercise reps live and gives form feedback using only a camera.
Planned flow: sign up -> onboarding (body goal: slim / muscular / bulk) -> routine -> live workout -> history/progress.
Privacy design: video is processed in the browser; only angles/results go to the backend.

Exercises with a trained model (6): squat, pushup, situp, pullup, jumpingjack, latpulldown.
(`raw_videos/Biceps_curl.mp4` exists but there is no biceps curl config or model yet.)

---

## 2. Architecture (current)

```
Camera -> MediaPipe Pose -> joint angles -> Random Forest (state) -> debounced RepCounter -> reps + feedback
```

- **ML pipeline (Python, local CLI):** `src/` — data prep, training, `live_predict.py` (webcam/video driver),
  `pose_utils.py` (angles), `exercises_config.py` (single place for landmarks/thresholds/model paths).
- **Backend (FastAPI):** `Backend/app/`
  - `routers/`: health, auth, exercises, sessions, predict (HTTP only, no business logic)
  - `services/`: prediction_service, rep_counter, model_registry, session_manager
  - `auth/`: bcrypt hashing + JWT (python-jose), `get_current_user` dependency
  - `db/`: SQLModel; tables `User`, `UserProfile`, `WorkoutSession`; SQLite dev, Postgres planned
  - `models/schemas.py`: all request/response models
  - cross-cutting: config (pydantic-settings), middleware (request ID), exceptions (uniform error JSON), rate_limit (slowapi), logging
- **Sessions:** in-memory per process (thread-safe, TTL sweep). Keyed by `user_id:session_id`.
- **Frontend:** NOT STARTED (planned Next.js + MediaPipe.js).
- **Deployment:** NOT STARTED (planned Railway / Render / Fly.io; DB planned: Neon Postgres). Dockerfile exists.

### API endpoints (current)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /health, /health/ready | no | liveness / readiness |
| GET | /exercises | no | list exercises (display_name only) |
| POST | /auth/signup, /auth/login | no | returns bearer token |
| GET | /auth/me | yes | current user |
| POST | /session/start | yes | start rep-counting session |
| POST | /predict | yes | send angle signals -> state, rep_count, feedback (rate-limited 120/min) |
| POST | /session/end?session_id= | yes | end session, saves `WorkoutSession` row |

### Key contracts (do not break silently)
- Classifier features = values of `config["signals"]` in insertion order.
- Count on "up": squat, pushup. Count on "down": situp, pullup, jumpingjack, latpulldown.
- `STABLE_FRAMES_REQUIRED = 4` in both RepCounter copies.
- Latpulldown extra signal `torso` (lean) is NOT a classifier feature; it drives the "Avoid leaning back" warning (ceiling 18.0).
- Models trained with scikit-learn 1.9.0. Backend requirements now match (1.9.0).

---

## 3. Progress (rough estimates)

| Area | Est. done | Notes |
|---|---|---|
| ML pipeline (6 exercises) | ~85% | Trained and running locally. Validation gaps (see Known issues). |
| Backend core (auth, sessions, predict) | ~70% | Works with 36 test functions; missing endpoints below. |
| Backend production hardening | ~25% | Secrets, rate limits on auth, logging, workers, CORS pending. |
| Database | ~30% | SQLite only. No migrations, no Postgres driver. |
| Auth | ~65% | Core works; hardening + token strategy pending. |
| Frontend | 0% | Not started. |
| Deployment / CI | ~5% | Dockerfile only. |
| **Overall** | **~35-40%** | Rough guess. |

---

## 4. Done

- [x] Data prep + training scripts for 6 exercises; models saved in `models/` (63-150 KB each)
- [x] Unified config-driven live prediction (`src/live_predict.py`)
- [x] Debounced RepCounter with range checks, depth feedback, form-warning ceiling, dual-signal jumping jack
- [x] FastAPI backend: layered structure, uniform errors, request IDs, rate limit on /predict
- [x] JWT auth (signup/login/me), per-user session isolation
- [x] `WorkoutSession` saved on /session/end
- [x] Thread-safe TTL session manager
- [x] Dockerfile, .env.example, pytest suite (50 test functions: 36 original + 14 real-model tests)
- [x] Project docs: README, BACKEND_README
- [x] Review of auth/backend/DB readiness (session 1)
- [x] AGENTS.md + PROJECT_STATE.md created (session 1)
- [x] Fix sklearn version mismatch: bumped Backend/requirements.txt from 1.5.2 → 1.9.0 (session 2)
- [x] Added `test_real_models.py`: loads all 6 models, checks type, runs dummy predict, asserts no version warnings (session 2)

## 5. In progress

- [ ] Nothing actively being built. Waiting for the user's decisions on the open decisions below.

## 6. Next (recommended order)

1. [x] ~~Fix sklearn version mismatch~~ — DONE (session 2)
2. [ ] Dockerfile: run 1 worker (sessions are in-memory per process)
3. [ ] DECIDE: where the model + rep counter run (browser vs server) — see Open decisions
4. [ ] Make exercise config pure data (no mediapipe/cv2 imports) and expose it via API for the frontend
5. [ ] Auth hardening: prod secret check, rate limit on login/signup, email validation + lowercase, handle duplicate-signup race, replace/upgrade python-jose, token strategy (short access + refresh)
6. [ ] DB: add `psycopg`, Alembic, engine pool settings (`pool_pre_ping`), timezone-aware datetimes, richer `WorkoutSession`, indexes
7. [ ] New endpoints: workout history, stats, profile/onboarding (UserProfile), routines
8. [ ] Save sessions that time out (TTL sweep currently deletes them without saving)
9. [ ] Provision Postgres (Neon) and set `DATABASE_URL` via env
10. [ ] CORS: lock to real frontend origin
11. [ ] Browser-vs-Python MediaPipe angle parity check
12. [ ] Ground-truth rep-count regression test per raw video
13. [ ] Rename `Backend/` -> `backend/` (case issue on Linux) — only with explicit approval
14. [ ] Frontend (Next.js + MediaPipe.js) with TypeScript client generated from OpenAPI
15. [ ] Deploy + CI

---

## 7. Known issues

| # | Severity | Issue |
|---|---|---|
| 1 | ~~High~~ Fixed | ~~scikit-learn mismatch~~ Fixed in session 2. `Backend/requirements.txt` now pins 1.9.0. numpy 1.26.4 is compatible with sklearn 1.9.0. |
| 2 | High | Dockerfile uses `--workers 2` but sessions are in-memory per worker -> random 404 "session not found". Rate limiter is per-worker too. |
| 3 | High | Per-frame HTTP to /predict (~30 fps) vs rate limit 120/min; debounce needs 4 frames. Design mismatch. |
| 4 | High | `/exercises` only returns display_name; frontend needs landmark indices, signal order, thresholds. Config uses mediapipe enums (not JSON). |
| 5 | Med | No history, stats, profile, or routine endpoints. `UserProfile` table unused. |
| 6 | Med | Timed-out sessions are deleted, not saved (docstring in models.py claims otherwise). |
| 7 | Med | No rate limit on /auth/login and /auth/signup. |
| 8 | Med | Default JWT secret is the dev value; no startup guard for production. |
| 9 | Med | `python-jose` 3.3.0 has known CVEs. |
| 10 | Med | Email not validated or lowercased; duplicate-signup race returns 500. |
| 11 | Med | No Postgres driver in `Backend/requirements.txt`; no Alembic; datetimes naive. |
| 12 | Med | CORS `*` with credentials (TODO already in main.py). |
| 13 | Low | Logging formatter requires `request_id` but filter is per-logger, not on the handler; 500 responses probably show request_id "-". |
| 14 | Low | `RATE_LIMIT_DEFAULT` defined but unused. |
| 15 | Low | Duplicated `exercises_config.py` and `RepCounter` (src vs Backend) — drift risk. |
| 16 | Low | mediapipe + opencv in backend image only because config imports them. |
| 17 | Low | README outdated: `uvicorn main:app` should be `app.main:app`; says 31 tests; lists 5 exercises, not 6; `.gitignore` has `logs/` but log CSVs are tracked. |
| 18 | ML | latpulldown trained/tested on only 2 videos (same ones) -> accuracy not reliable. Session logs show 0 reps for jumping jack and 1 for push-up; verify vs the real videos. "Avoid leaning back" fired on 5 of 7 early reps (ceiling 18 may be too strict). |
| 19 | ML | Models trained on Python MediaPipe 0.10.14; MediaPipe.js may give slightly different angles. |

---

## 8. Decisions

### Made
- Auth = own email+password JWT (not third-party).
- Video never leaves the browser.
- One config file drives all exercises; adding an exercise = add a config entry + model.
- DB planned: Postgres via Neon (frontend must NOT talk to DB directly; all through FastAPI).
- Dev in Antigravity; AI agents follow `AGENTS.md`.

### Open (user must decide)
1. Where does the model + RepCounter run: **browser** (recommended, fits privacy) or **server** over WebSocket?
2. Token strategy: short access token + httpOnly refresh cookie, or keep a long bearer token?
3. Keep Random Forest, or replace with simple thresholds + hysteresis (easier to port to the browser)?
4. Add biceps curl as a 7th exercise now or later?

---

## 9. How to run / test

```
# Backend (from Backend/)
python -m venv venv
venv\Scripts\activate
pip install -r requirements-dev.txt
copy .env.example .env
uvicorn app.main:app --reload       # docs at http://localhost:8000/docs
pytest

# ML live demo (from src/)
python live_predict.py squat
python live_predict.py pushup ../raw_videos/pushup.mp4
```
Models are expected at `../models/` relative to the working directory (`MODELS_DIR` env var overrides for the backend).

---

## 10. Session log (append one row per session; newest at bottom)

| # | Date | Tool / model | What was done | Files changed |
|---|---|---|---|---|
| 1 | 2026-10-27 | Claude (Sonnet 5.5) | Read-only review of repo (auth, backend, DB, Neon advice); created AGENTS.md and PROJECT_STATE.md | none in repo yet (the two new files are to be added by the user) |
| 2 | 2026-10-27 | Antigravity (Claude Opus 4.6) | Bumped scikit-learn 1.5.2→1.9.0 in Backend/requirements.txt; created Backend/tests/test_real_models.py (14 new tests); all 50 tests pass, 0 version warnings | Backend/requirements.txt, Backend/tests/test_real_models.py, PROJECT_STATE.md |

---

## 11. Handoff prompt (rewrite at end of each session; paste into the next AI)

```
You are continuing work on FitVision (repo: SAGETOAD-source/fitvision).
1. Read AGENTS.md and PROJECT_STATE.md in the repo root before anything else.
2. Follow AGENTS.md strictly: send a Change Plan (files to modify/create, nothing else touched) and wait for approval before editing.
3. Current state: ML pipeline done for 6 exercises; FastAPI backend with JWT auth + sessions works; sklearn version fixed (1.9.0); 50 tests pass; frontend/deploy not started; DB is SQLite only.
4. Next recommended task: "Dockerfile: run 1 worker (sessions are in-memory per process)" (item 2 in section 6).
5. At the end, update PROJECT_STATE.md fully and show me the complete file.
```
