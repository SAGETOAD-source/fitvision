# PROJECT_STATE.md — FitVision living status file

> Every AI agent: read this first. Update it at the end of every session (see AGENTS.md section 9).
> Progress percentages are rough estimates, not measurements. Update honestly.

**Last updated:** 2026-11-04 | **Session #:** 6
**Updated by:** Antigravity (Gemini 3.8 Flash) — feat/database-correctness branch
**Repo:** https://github.com/SAGETOAD-source/fitvision (branch `main`)
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
  - `db/`: SQLModel; tables `User`, `UserProfile`, `WorkoutSession`; dual SQLite (dev/test) & Neon Postgres support via Alembic migrations
  - `models/schemas.py`: all request/response models with email format validation and normalization
  - cross-cutting: config (pydantic-settings), middleware (request ID), exceptions (uniform error JSON), rate_limit (slowapi), logging
- **Sessions:** in-memory per process (thread-safe, TTL sweep). Keyed by `user_id:session_id`.
- **Frontend:** NOT STARTED (planned Next.js + MediaPipe.js).
- **Deployment:** NOT STARTED (planned Railway / Render / Fly.io; DB: Neon Postgres). Dockerfile packages app + alembic.

### API endpoints (current)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /health, /health/ready | no | liveness / readiness |
| GET | /exercises | no | list exercises (display_name only) |
| POST | /auth/signup, /auth/login | no | returns bearer token (email validated & lowercased) |
| GET | /auth/me | yes | current user |
| POST | /session/start | yes | start rep-counting session |
| POST | /predict | yes | send angle signals -> state, rep_count, feedback (rate-limited 120/min) |
| POST | /session/end?session_id= | yes | end session, saves `WorkoutSession` row |

### Key contracts (do not break silently)
- Classifier features = values of `config["signals"]` in insertion order.
- Count on "up": squat, pushup. Count on "down": situp, pullup, jumpingjack, latpulldown.
- `STABLE_FRAMES_REQUIRED = 4` in both RepCounter copies.
- Latpulldown extra signal `torso` (lean) is NOT a classifier feature; it drives the "Avoid leaning back" warning (ceiling 18.0).
- Models trained with scikit-learn 1.9.0. Backend requirements match (1.9.0).
- Incoming `postgresql://` and `postgres://` URLs are normalized to `postgresql+psycopg://` in `database.py`.
- Postgres schema is managed strictly via Alembic (`alembic upgrade head`); startup DDL is gated to SQLite only.
- Emails on `SignupRequest` and `LoginRequest` are automatically trimmed, validated, and normalized to lowercase.
- All database timestamps are configured as timezone-aware (`sa.DateTime(timezone=True)` / `TIMESTAMPTZ`).

---

## 3. Progress (rough estimates)

| Area | Est. done | Notes |
|---|---|---|
| ML pipeline (6 exercises) | ~85% | Trained and running locally. Validation gaps (see Known issues). |
| Backend core (auth, sessions, predict) | ~80% | Works with 68 test cases (39 backend API/unit + 26 real-model integration tests + 3 Postgres smoke tests); missing endpoints below. |
| Backend production hardening | ~40% | Single worker aligned to in-memory sessions. Email format validation + normalization; DB secrets masked in logs. |
| Database | ~80% | Dual SQLite & Neon PostgreSQL supported; psycopg[binary]==3.3.7, Alembic migrations (0001 initial, 0002 TIMESTAMPTZ), connection pooling with pre-ping/recycle. |
| Auth | ~75% | Core works; email validation, lowercasing, and case-insensitive duplicate prevention done; rate limits & token strategy pending. |
| Frontend | 0% | Not started. |
| Deployment / CI | ~20% | Dockerfile packages app, alembic.ini, and migrations; Neon Postgres connected. |
| **Overall** | **~48%** | Rough guess. |

---

## 4. Done

- [x] Data prep + training scripts for 6 exercises; models saved in `models/` (63-150 KB each)
- [x] Unified config-driven live prediction (`src/live_predict.py`)
- [x] Debounced RepCounter with range checks, depth feedback, form-warning ceiling, dual-signal jumping jack
- [x] FastAPI backend: layered structure, uniform errors, request IDs, rate limit on /predict
- [x] JWT auth (signup/login/me), per-user session isolation
- [x] `WorkoutSession` saved on /session/end
- [x] Thread-safe TTL session manager
- [x] Dockerfile, .env.example, pytest suite (68 tests passing)
- [x] Project docs: README, BACKEND_README
- [x] Review of auth/backend/DB readiness (session 1)
- [x] AGENTS.md + PROJECT_STATE.md created (session 1)
- [x] Fix sklearn version mismatch: bumped Backend/requirements.txt from 1.5.2 → 1.9.0 (session 2)
- [x] Added `test_real_models.py`: loads all 6 models, checks type, runs dummy predict, asserts no version warnings (session 2)
- [x] Repaired `test_real_models.py` (session 3): replaced vacuous version warning check with real `issubclass(w.category, InconsistentVersionWarning)` check; resolved `models_dir` via `Path(__file__).resolve().parents[2] / "models"`; loaded models once via module-scoped fixture (62 tests pass under pinned 1.9.0).
- [x] Dockerfile single worker fix (session 4): set uvicorn `--workers 1` in Dockerfile and updated main.py docstring.
- [x] Neon PostgreSQL & Alembic migration support (session 5): added `psycopg[binary]==3.3.7` and `alembic==1.20.1`; implemented URL normalization (`postgresql://` -> `postgresql+psycopg://`) and Neon pool settings (`pool_pre_ping=True`, `pool_recycle=300`); created initial migration `0001_initial_schema.py`; verified 6-minute idle connection revival.
- [x] Database correctness & Docker packaging (session 6): updated datetime fields in `Backend/app/db/models.py` with `sa_type=sa.DateTime(timezone=True)`; added migration `0002_timezone_aware_datetimes` with explicit `USING <column> AT TIME ZONE 'UTC'` on upgrade and downgrade (verified reversible on TEST DB); added RFC-compliant email validation and whitespace-stripping/lowercasing in `Backend/app/models/schemas.py`; updated `Backend/Dockerfile` to copy `alembic/` and `alembic.ini`; added 3 new auth unit tests (case-insensitivity, invalid email rejection) and 2 new Postgres smoke assertions (TIMESTAMPTZ type check, mixed-case email on Postgres); total 68 tests passing.

## 5. In progress

- [ ] Nothing actively being built. Waiting for user guidance on the next priority task.

## 6. Next (recommended order)

1. [x] ~~Fix sklearn version mismatch and real-model tests~~ — DONE (sessions 2 & 3)
2. [x] ~~Dockerfile: run 1 worker (sessions are in-memory per process)~~ — DONE (session 4)
3. [x] ~~DB: add psycopg, Alembic, engine pool settings (pool_pre_ping), smoke tests~~ — DONE (session 5)
4. [x] ~~DB correctness: TIMESTAMPTZ datetimes, email lowercasing/validation, Dockerfile alembic packaging~~ — DONE (session 6)
5. [ ] DECIDE: where the model + rep counter run (browser vs server) — see Open decisions
6. [ ] Make exercise config pure data (no mediapipe/cv2 imports) and expose it via API for the frontend
7. [ ] Auth hardening: prod secret check, rate limit on login/signup, replace/upgrade python-jose, token strategy (short access + refresh)
8. [ ] New endpoints: workout history, stats, profile/onboarding (UserProfile), routines
9. [ ] Save sessions that time out (TTL sweep currently deletes them without saving)
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
| 1 | Resolved | scikit-learn pinned to 1.9.0. Repaired test_real_models.py in session 3 now rigorously verifies absence of InconsistentVersionWarning. |
| 2 | Resolved | Dockerfile previously used `--workers 2`. Fixed in session 4 by setting workers to 1 in Backend/Dockerfile. Multi-worker scaling deferred until sessions migrate to Redis/DB. |
| 3 | High | Per-frame HTTP to /predict (~30 fps) vs rate limit 120/min; debounce needs 4 frames. Design mismatch. |
| 4 | High | `/exercises` only returns display_name; frontend needs landmark indices, signal order, thresholds. Config uses mediapipe enums (not JSON). |
| 5 | Med | No history, stats, profile, or routine endpoints. `UserProfile` table unused. |
| 6 | Med | Timed-out sessions are deleted, not saved (docstring in models.py claims otherwise). |
| 7 | Med | No rate limit on /auth/login and /auth/signup. |
| 8 | Med | Default JWT secret is the dev value; no startup guard for production. |
| 9 | Med | `python-jose` 3.3.0 has known CVEs. |
| 10 | Resolved | Email normalized to lowercase and validated on SignupRequest & LoginRequest in session 6; rejects invalid formats with 422; duplicate signup with differing case rejected with 409. |
| 11 | Resolved | Added psycopg[binary]==3.3.7, Alembic migrations with reversible initial schema, and connection pooling settings (pool_pre_ping=True, pool_recycle=300) for Neon idle compute suspension. |
| 12 | Med | CORS `*` with credentials (TODO already in main.py). |
| 13 | Low | Logging formatter requires `request_id` but filter is per-logger, not on the handler; 500 responses probably show request_id "-". |
| 14 | Low | `RATE_LIMIT_DEFAULT` defined but unused. |
| 15 | Low | Duplicated `exercises_config.py` and `RepCounter` (src vs Backend) — drift risk. |
| 16 | Low | mediapipe + opencv in backend image only because config imports them. |
| 17 | Low | README outdated: `uvicorn main:app` should be `app.main:app`; says 31 tests; lists 5 exercises, not 6; `.gitignore` has `logs/` but log CSVs are tracked. |
| 18 | ML | latpulldown trained/tested on only 2 videos (same ones) -> accuracy not reliable. Session logs show 0 reps for jumping jack and 1 for push-up; verify vs the real videos. "Avoid leaning back" fired on 5 of 7 early reps (ceiling 18 may be too strict). |
| 19 | ML | Models trained on Python MediaPipe 0.10.14; MediaPipe.js may give slightly different angles. |
| 20 | Low | UserWarning on prediction: "X does not have valid feature names, but RandomForestClassifier was fitted with feature names". Backend calls model.predict with a plain 2D feature list without column names; decision on pandas/DataFrame named columns vs warning filtering deferred. |
| 21 | High | Docker image contains no models: lines `COPY models/ ../models/` are commented out in `Backend/Dockerfile` and build context is `Backend/` while `models/` is at repo root. Decision needed: build from repo root with `-f Backend/Dockerfile` (moving `.dockerignore`), mount `models/` as a volume, or download at container startup. |
| 22 | Low | Squat model classes in `models/rf_squat_model.pkl` are `squat_down` and `squat_up` only; config in `exercises_config.py` lists "standing" as an extra up state that the model never predicts. |
| 23 | Resolved | Dockerfile copies `alembic/` and `alembic.ini` into runtime image (resolved in session 6). |
| 24 | Resolved | All datetime columns converted to TIMESTAMPTZ (`timestamp with time zone`) via migration 0002 with explicit `USING <col> AT TIME ZONE 'UTC'` on upgrade and downgrade (resolved in session 6). |
| 25 | Resolved | Case-sensitive email comparison on Postgres eliminated through Pydantic email validation and normalization on both signup and login (resolved in session 6). |

---

## 8. Decisions

### Made
- Auth = own email+password JWT (not third-party).
- Video never leaves the browser.
- One config file drives all exercises; adding an exercise = add a config entry + model.
- DB: PostgreSQL via Neon (frontend must NOT talk to DB directly; all through FastAPI).
- Tables on Postgres are not auto-created on startup (managed via Alembic); SQLite keeps auto-create for local dev / test suite.
- Engine uses psycopg 3 (psycopg[binary]) with transparent URL normalization (`postgresql://` -> `postgresql+psycopg://`) and pool_pre_ping=True / pool_recycle=300 for Neon idle compute suspension.
- Datetime columns in PostgreSQL use `TIMESTAMPTZ` (`timestamp with time zone`) with explicit UTC conversion during migrations.
- Emails are validated and normalized to lowercase on both signup and login.
- Dev in Antigravity; AI agents follow `AGENTS.md`.

### Open (user must decide)
1. Where does the model + RepCounter run: **browser** (recommended, fits privacy) or **server** over WebSocket?
2. Token strategy: short access token + httpOnly refresh cookie, or keep a long bearer token?
3. Keep Random Forest, or replace with simple thresholds + hysteresis (easier to port to the browser)?
4. Add biceps curl as a 7th exercise now or later?

---

## 9. How to run / test

```bash
# Backend (from Backend/)
python -m venv venv
venv\Scripts\activate
pip install -r requirements-dev.txt
copy .env.example .env
uvicorn app.main:app --reload       # docs at http://localhost:8000/docs
pytest                              # runs SQLite regression suite (68 tests)
pytest tests/test_postgres_smoke.py # runs Postgres smoke test (requires TEST_DATABASE_URL)

# Alembic migrations (from Backend/)
alembic upgrade head                # applies migrations to DATABASE_URL
alembic downgrade base              # reverts all migrations

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
| 3 | 2026-10-29 | Antigravity (Gemini 3.8 Flash) | Repaired Backend/tests/test_real_models.py (fixed vacuous version warning check, resolved models_dir from test file location, scoped get_settings patch, contract assertions for feature order and classes, valid-state predict check, module-scoped fixture). Verified failure under scikit-learn 1.5.2 and passing suite (62 tests) under 1.9.0. | Backend/tests/test_real_models.py, PROJECT_STATE.md |
| 4 | 2026-10-29 | Antigravity (Gemini 3.8 Flash) | Set uvicorn workers to 1 in Backend/Dockerfile with explanatory comment; updated Backend/app/main.py docstring guidance; reproduced and verified fix for multi-worker 404 session bug locally; verified /health/ready 503 behavior on missing models; 62 tests pass. | Backend/Dockerfile, Backend/app/main.py, PROJECT_STATE.md |
| 5 | 2026-11-04 | Antigravity (Gemini 3.8 Flash) | Added PostgreSQL (Neon) support, psycopg[binary]==3.3.7, Alembic migrations (reversible initial schema), pool pre-ping/recycle for Neon 5-min idle suspension, masked DB URL logging, Backend/tests/test_postgres_smoke.py, verified live Neon test and real DB | Backend/requirements.txt, Backend/app/db/database.py, Backend/app/main.py, Backend/alembic.ini, Backend/alembic/*, Backend/tests/test_postgres_smoke.py, Backend/.env.example, Backend/BACKEND_README.md, PROJECT_STATE.md |
| 6 | 2026-11-04 | Antigravity (Gemini 3.8 Flash) | Database correctness: TIMESTAMPTZ datetimes (migration 0002 with explicit UTC USING clauses), email lowercasing & validation, Dockerfile Alembic packaging, added 3 auth unit tests and 2 Postgres smoke assertions (68 tests pass) | Backend/app/db/models.py, Backend/alembic/versions/0002_timezone_aware_datetimes.py, Backend/app/models/schemas.py, Backend/Dockerfile, Backend/tests/test_auth.py, Backend/tests/test_postgres_smoke.py, PROJECT_STATE.md |

---

## 11. Handoff prompt (rewrite at end of each session; paste into the next AI)

```
You are continuing work on FitVision (repo: SAGETOAD-source/fitvision).
1. Read AGENTS.md and PROJECT_STATE.md in the repo root before anything else.
2. Follow AGENTS.md strictly: send a Change Plan (files to modify/create, nothing else touched) and wait for approval before editing.
3. Current state: ML pipeline done for 6 exercises; FastAPI backend with JWT auth + sessions works; sklearn version fixed (1.9.0); full test suite passes (68 tests: 39 unit/API + 26 real-model + 3 Postgres smoke); Dockerfile configured for 1 worker and packages Alembic; PostgreSQL (Neon) support fully operational with TIMESTAMPTZ datetimes, connection resilience (pool_pre_ping=True, pool_recycle=300), email validation + lowercasing, and automated smoke tests; frontend/deploy not started. Note: Migration 0002 is verified on TEST_DATABASE_URL and ready to be applied to DATABASE_URL whenever decided.
4. Next recommended task: "DECIDE: where the model + rep counter run (browser vs server)" (item 5 in section 6) or "Make exercise config pure data (no mediapipe/cv2 imports) and expose it via API for the frontend" (item 6 in section 6), or "Auth hardening: prod secret check, rate limit on login/signup, token strategy" (item 7 in section 6).
5. At the end, update PROJECT_STATE.md fully and show me the complete file.
```
