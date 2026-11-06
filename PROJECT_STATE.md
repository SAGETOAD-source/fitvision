# PROJECT_STATE.md — FitVision living status file

> Every AI agent: read this first. Update it at the end of every session (see AGENTS.md section 9).
> Progress percentages are rough estimates, not measurements. Update honestly.

**Last updated:** 2026-11-07 | **Session #:** 8
**Updated by:** Antigravity (Gemini 3.8 Flash) — feat/frontend-ready-backend branch
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
  - `routers/`: health (no prefix), auth (`/v1`), exercises (`/v1`), sessions (`/v1`), predict (`/v1`)
  - `services/`: prediction_service, rep_counter, model_registry, session_manager
  - `auth/`: bcrypt hashing + JWT (python-jose), `get_current_user` dependency (tokenUrl="/v1/auth/login")
  - `db/`: SQLModel; tables `User`, `UserProfile`, `WorkoutSession`; dual SQLite (dev/test) & Neon Postgres support via Alembic migrations
  - `models/schemas.py`: request/response models with email format validation/normalization, full exercise config schema, EndSessionRequest JSON schema, and [0, 360] angle validation
  - `exercises_config.py`: pure-data config without mediapipe or opencv dependencies (landmarks as strings, rotate_frame as string/null)
  - cross-cutting: config (pydantic-settings), middleware (request ID), exceptions (uniform error JSON with RequestValidationError handling avoiding NaN/inf crash), rate_limit (slowapi), logging
- **Sessions:** in-memory per process (thread-safe, TTL sweep). Keyed by `user_id:session_id`.
- **Frontend:** NOT STARTED (planned Next.js + MediaPipe.js).
- **Deployment:** NOT STARTED (planned Railway / Render / Fly.io; DB: Neon Postgres). Dockerfile packages app + alembic.

### API endpoints (current)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /health, /health/ready | no | liveness / readiness |
| GET | /v1/exercises | no | full exercise config (signals with landmark strings, thresholds, extra_signals with torso) |
| POST | /v1/auth/signup, /v1/auth/login | no | returns bearer token (email validated & lowercased) |
| GET | /v1/auth/me | yes | current user |
| POST | /v1/session/start | yes | start rep-counting session |
| POST | /v1/predict | yes | send angle signals -> state, rep_count, feedback (session-bound exercise, validates [0, 360]) |
| POST | /v1/session/end | yes | end session via JSON body `{"session_id": "..."}`, saves `WorkoutSession` row |

### Key contracts (do not break silently)
- Classifier features = values of `config["signals"]` in insertion order.
- Count on "up": squat, pushup. Count on "down": situp, pullup, jumpingjack, latpulldown.
- `STABLE_FRAMES_REQUIRED = 4` in both RepCounter copies.
- Latpulldown extra signal `torso` (lean) is NOT a classifier feature; it drives the "Avoid leaning back" warning (ceiling 18.0) and is exposed in `/v1/exercises` under `extra_signals`.
- Models trained with scikit-learn 1.9.0. Backend requirements match (1.9.0).
- Incoming `postgresql://` and `postgres://` URLs are normalized to `postgresql+psycopg://` in `database.py`.
- Postgres schema is managed strictly via Alembic (`alembic upgrade head`); startup DDL is gated to SQLite only.
- Emails on `SignupRequest` and `LoginRequest` are automatically trimmed, validated, and normalized to lowercase.
- All database timestamps are configured as timezone-aware (`sa.DateTime(timezone=True)` / `TIMESTAMPTZ`).
- `/v1/predict` strictly binds to the session's stored exercise. If request body specifies a different exercise, returns 400 `ExerciseMismatchError`.
- All angles sent to `/v1/predict` must be finite numbers in `[0.0, 360.0]`; `NaN`, `inf`, or out-of-range values return 422 `RequestValidationError`.

---

## 3. Progress (rough estimates)

| Area | Est. done | Notes |
|---|---|---|
| ML pipeline (6 exercises) | ~85% | Trained and running locally. Validation gaps (see Known issues). |
| Backend core (auth, sessions, predict) | ~85% | Full /v1 prefix, pure-data config, full /v1/exercises, session-bound predict, body-based session end; 76 tests passing. |
| Backend production hardening | ~55% | Uniform RequestValidationError handling without NaN/inf crash; email normalization; DB secrets masked; single worker Dockerfile. |
| Database | ~80% | Dual SQLite & Neon PostgreSQL supported; psycopg[binary]==3.3.7, Alembic migrations (0001 initial, 0002 TIMESTAMPTZ), connection pooling with pre-ping/recycle. |
| Auth | ~75% | Core works; email validation, lowercasing, and case-insensitive duplicate prevention done; rate limits & token strategy pending. |
| Frontend | 0% | Not started. |
| Deployment / CI | ~20% | Dockerfile packages app, alembic.ini, and migrations; Neon Postgres connected. |
| **Overall** | **~52%** | Rough guess. |

---

## 4. Done

- [x] Data prep + training scripts for 6 exercises; models saved in `models/` (63-150 KB each)
- [x] Unified config-driven live prediction (`src/live_predict.py`)
- [x] Debounced RepCounter with range checks, depth feedback, form-warning ceiling, dual-signal jumping jack
- [x] FastAPI backend: layered structure, uniform errors, request IDs, rate limit on /predict
- [x] JWT auth (signup/login/me), per-user session isolation
- [x] `WorkoutSession` saved on /session/end
- [x] Thread-safe TTL session manager
- [x] Dockerfile, .env.example, pytest suite
- [x] Project docs: README, BACKEND_README
- [x] Review of auth/backend/DB readiness (session 1)
- [x] AGENTS.md + PROJECT_STATE.md created (session 1)
- [x] Fix sklearn version mismatch: bumped Backend/requirements.txt from 1.5.2 → 1.9.0 (session 2)
- [x] Added `test_real_models.py`: loads all 6 models, checks type, runs dummy predict, asserts no version warnings (session 2)
- [x] Repaired `test_real_models.py` (session 3): replaced vacuous version warning check with real `issubclass(w.category, InconsistentVersionWarning)` check; resolved `models_dir` via `Path(__file__).resolve().parents[2] / "models"`; loaded models once via module-scoped fixture (62 tests pass under pinned 1.9.0).
- [x] Dockerfile single worker fix (session 4): set uvicorn `--workers 1` in Dockerfile and updated main.py docstring.
- [x] Neon PostgreSQL & Alembic migration support (session 5): added `psycopg[binary]==3.3.7` and `alembic==1.20.1`; implemented URL normalization (`postgresql://` -> `postgresql+psycopg://`) and Neon pool settings (`pool_pre_ping=True`, `pool_recycle=300`); created initial migration `0001_initial_schema.py`; verified 6-minute idle connection revival.
- [x] Database correctness & Docker packaging (session 6): updated datetime fields in `Backend/app/db/models.py` with `sa_type=sa.DateTime(timezone=True)`; added migration `0002_timezone_aware_datetimes` with explicit `USING <column> AT TIME ZONE 'UTC'` on upgrade and downgrade (verified reversible on TEST DB); added RFC-compliant email validation and whitespace-stripping/lowercasing in `Backend/app/models/schemas.py`; updated `Backend/Dockerfile` to copy `alembic/` and `alembic.ini`; added 3 new auth unit tests and 2 new Postgres smoke assertions (68 tests passing).
- [x] Review findings added to Known issues & roadmap structured (session 7).
- [x] Frontend-ready backend & contract fixes (session 8):
  - Pure-data `Backend/app/exercises_config.py` with string landmarks and string/null `rotate_frame`; removed `mediapipe` and `opencv-python-headless` from `Backend/requirements.txt`.
  - Full `GET /v1/exercises` response returning signals, landmarks, thresholds, and `latpulldown` extra_signals ("torso").
  - `/v1` prefix added to all application routers; `tokenUrl` updated to `/v1/auth/login`.
  - `POST /v1/session/end` accepts `{"session_id": "..."}` in the JSON body.
  - `/v1/predict` bound to session's exercise (returns 400 `ExerciseMismatchError` on body mismatch) and validates signals for `NaN`, `inf`, and `[0.0, 360.0]` range.
  - Registered `RequestValidationError` handler in `Backend/app/exceptions.py` returning uniform 422 `{error, detail, request_id}` and omitting `input`/`ctx` to prevent `json.dumps()` crash on `NaN`/`inf`.
  - Updated `README.md` with correct run commands, 6 exercises, 76 test count, Neon/Alembic setup, endpoints table, and known limitations.
  - Full pytest suite passing (76 passed: 47 unit/API + 26 real-model + 3 Postgres smoke).

## 5. In progress

- [ ] Nothing actively being built. Waiting for user guidance on the next priority task.

## 6. Next (recommended order)

### Done
1. [x] ~~Fix sklearn version mismatch and real-model tests~~ — DONE (sessions 2 & 3)
2. [x] ~~Dockerfile: run 1 worker (sessions are in-memory per process)~~ — DONE (session 4)
3. [x] ~~DB: add psycopg, Alembic, engine pool settings (pool_pre_ping), smoke tests~~ — DONE (session 5)
4. [x] ~~DB correctness: TIMESTAMPTZ datetimes, email lowercasing/validation, Dockerfile alembic packaging~~ — DONE (session 6)
5. [x] ~~Exercise config as pure data + API~~ — DONE (session 8)
6. [x] ~~Contract and session fixes: items 1, 10, 11, 12~~ — DONE (session 8)

### Roadmap
1. [ ] Auth hardening: items 7, 8, 9, 14, plus token strategy, CORS and a login/signup rate limit, and replacing python-jose
2. [ ] Deployment readiness: items 2, 3, 4, 13, 15
3. [ ] Session TTL sweep saves workout on timeout (item 5 / Known issue 6)
4. [ ] Profile, onboarding, history, stats, routines endpoints (item 6)
5. [ ] Frontend foundation, then the live workout

### Before launch
- [ ] Rotate the Neon `neondb_owner` password and create a limited app DB role.

---

## 7. Known issues

| # | Severity | Issue |
|---|---|---|
| 1 | Resolved | scikit-learn pinned to 1.9.0. Repaired test_real_models.py in session 3 now rigorously verifies absence of InconsistentVersionWarning. |
| 2 | Resolved | Dockerfile previously used `--workers 2`. Fixed in session 4 by setting workers to 1 in Backend/Dockerfile. Multi-worker scaling deferred until sessions migrate to Redis/DB. |
| 3 | High | Per-frame HTTP to /predict (~30 fps) vs rate limit 120/min; debounce needs 4 frames. Design mismatch. |
| 4 | Resolved | `/v1/exercises` returns full config with landmark strings, signal ordering, thresholds, and extra_signals (resolved in session 8). |
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
| 16 | Resolved | Backend config uses string landmarks; `mediapipe` and `opencv-python-headless` removed from Backend/requirements.txt (resolved in session 8). |
| 17 | Resolved | README updated with `app.main:app`, 6 exercises, 76 tests, Neon/Alembic setup, endpoints table (resolved in session 8). |
| 18 | ML | latpulldown trained/tested on only 2 videos (same ones) -> accuracy not reliable. Session logs show 0 reps for jumping jack and 1 for push-up; verify vs the real videos. "Avoid leaning back" fired on 5 of 7 early reps (ceiling 18 may be too strict). |
| 19 | ML | Models trained on Python MediaPipe 0.10.14; MediaPipe.js may give slightly different angles. |
| 20 | Low | UserWarning on prediction: "X does not have valid feature names, but RandomForestClassifier was fitted with feature names". Backend calls model.predict with a plain 2D feature list without column names; decision on pandas/DataFrame named columns vs warning filtering deferred. |
| 21 | High | Docker image contains no models: lines `COPY models/ ../models/` are commented out in `Backend/Dockerfile` and build context is `Backend/` while `models/` is at repo root. Decision needed: build from repo root with `-f Backend/Dockerfile` (moving `.dockerignore`), mount `models/` as a volume, or download at container startup. |
| 22 | Low | Squat model classes in `models/rf_squat_model.pkl` are `squat_down` and `squat_up` only; config in `exercises_config.py` lists "standing" as an extra up state that the model never predicts. |
| 23 | Resolved | Dockerfile copies `alembic/` and `alembic.ini` into runtime image (resolved in session 6). |
| 24 | Resolved | All datetime columns converted to TIMESTAMPTZ (`timestamp with time zone`) via migration 0002 with explicit `USING <col> AT TIME ZONE 'UTC'` on upgrade and downgrade (resolved in session 6). |
| 25 | Resolved | Case-sensitive email comparison on Postgres eliminated through Pydantic email validation and normalization on both signup and login (resolved in session 6). |
| 26 (Review #1) | Resolved | /v1/predict strictly uses the exercise from the session. Body exercise is optional; mismatch returns 400 ExerciseMismatchError (resolved in session 8). |
| 27 (Review #2) | High | The rate limiter keys on client IP. Behind a proxy (Render/Railway) all users share one limit. Needs proxy headers or a per-user key. (found in review, not yet verified by running) |
| 28 (Review #3) | High | The Dockerfile build context is Backend/, but models live in ../models, which Docker can't COPY. A deployed container would have no models and /health/ready would return 503. (found in review, not yet verified by running) |
| 29 (Review #4) | High | /health/ready doesn't check the database. (found in review, not yet verified by running) |
| 30 (Review #5) | High | The session TTL sweep deletes timed-out sessions without saving the workout (the models.py docstring says otherwise). (found in review, not yet verified by running) |
| 31 (Review #6) | High | No history, stats, profile, onboarding or routine endpoints. The UserProfile table is unused. (found in review, not yet verified by running) |
| 32 (Review #7) | Med | Duplicate signup race: two simultaneous signups hit the unique constraint and return 500 instead of 409. (found in review, not yet verified by running) |
| 33 (Review #8) | Med | Signup allows 128-char passwords, but bcrypt only uses the first 72 bytes. (found in review, not yet verified by running) |
| 34 (Review #9) | Med | Login timing leak: an unknown email returns faster than a wrong password. (found in review, not yet verified by running) |
| 35 (Review #10) | Resolved | NaN, inf and angles outside [0.0, 360.0] rejected with 422 RequestValidationError; exceptions handler prevents json.dumps crash (resolved in session 8). |
| 36 (Review #11) | Resolved | POST /v1/session/end accepts session_id in JSON body via EndSessionRequest (resolved in session 8). |
| 37 (Review #12) | Resolved | Added /v1 prefix to auth, exercises, sessions, predict routes (resolved in session 8). |
| 38 (Review #13) | Med | /docs and /health are public in production. (found in review, not yet verified by running) |
| 39 (Review #14) | Med | No guard against the default JWT secret when ENVIRONMENT=production. (found in review, not yet verified by running) |
| 40 (Review #15) | Low | The logging formatter needs request_id, so third-party log records without it can fail. Crash responses probably show request_id "-" (unverified). (found in review, not yet verified by running) |
| 41 (Review #16) | Low | 19 log CSVs are still tracked in git even though logs/ is in .gitignore. (found in review, not yet verified by running) |
| 42 (Review #17) | Low | There is no CI. (found in review, not yet verified by running) |
| 43 (Review #18) | Low | python-jose is stale and passlib is unmaintained. (found in review, not yet verified by running) |
| 44 (Review #19) | Resolved | README updated with `app.main:app`, 6 exercises, 76 test count, endpoints table (resolved in session 8). |

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
- Application routes use `/v1` prefix (`/v1/auth`, `/v1/exercises`, `/v1/session`, `/v1/predict`); health routes remain un-prefixed (`/health`, `/health/ready`).
- Exercise config in backend is pure data: string landmarks, string/null rotate_frame, zero mediapipe/cv2 imports.
- Validation errors return uniform `{error, detail, request_id}` 422 JSON shape without including input/ctx, preventing JSON serialization crashes on NaN/inf.
- Dev in Antigravity; AI agents follow `AGENTS.md`.

### Open (user must decide)
1. Where does the model + RepCounter run: **browser** (recommended, fits privacy) or **server** over WebSocket? (This decides the per-frame rate-limit problem).
2. Token strategy: short access token + httpOnly refresh cookie, or keep a long bearer token?
3. Keep Random Forest, or replace with simple thresholds + hysteresis (easier to port to the browser)?
4. Add biceps curl as a 7th exercise now or later?

---

## 9. How to run / test

```bash
# Backend (from Backend/)
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head                # applies migrations to DATABASE_URL
uvicorn app.main:app --reload       # docs at http://localhost:8000/docs
pytest                              # runs SQLite regression suite (76 tests)
pytest tests/test_postgres_smoke.py # runs Postgres smoke test (requires TEST_DATABASE_URL)

# Alembic migrations (from Backend/)
alembic upgrade head                # applies migrations to DATABASE_URL
alembic downgrade base              # reverts all migrations

# ML live demo (from src/)
python live_predict.py squat
python live_predict.py pushup ../raw_videos/pushup.mp4
python live_predict.py latpulldown
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
| 7 | 2026-11-04 | Antigravity (Gemini 3.8 Flash) | Added 19 code review findings (items 1–19) to Known issues, restructured Next list into 7-phase roadmap, added Before launch section (Neon password rotation/app role), and refined browser-vs-server open decision | PROJECT_STATE.md |
| 8 | 2026-11-07 | Antigravity (Gemini 3.8 Flash) | Pure-data exercise config (string landmarks, rotate_frame string/null, mediapipe/cv2 removed from Backend), full GET /v1/exercises response with torso extra_signal, /v1 API route prefix, session-bound /predict with 400 mismatch error, JSON body /session/end, [0, 360] angle validation, RequestValidationError handler preventing json.dumps crash on NaN/inf, updated README and test suite (76 tests pass) | Backend/app/exercises_config.py, Backend/requirements.txt, Backend/app/models/schemas.py, Backend/app/routers/exercises.py, Backend/app/routers/sessions.py, Backend/app/services/prediction_service.py, Backend/app/exceptions.py, Backend/app/auth/dependencies.py, Backend/app/main.py, Backend/tests/conftest.py, Backend/tests/test_auth.py, Backend/tests/test_sessions.py, Backend/tests/test_predict.py, Backend/tests/test_postgres_smoke.py, README.md, PROJECT_STATE.md |

---

## 11. Handoff prompt (rewrite at end of each session; paste into the next AI)

```
You are continuing work on FitVision (repo: SAGETOAD-source/fitvision).
1. Read AGENTS.md and PROJECT_STATE.md in the repo root before anything else.
2. Follow AGENTS.md strictly: send a Change Plan (files to modify/create, nothing else touched) and wait for approval before editing.
3. Current state: ML pipeline done for 6 exercises; FastAPI backend is frontend-ready on branch feat/frontend-ready-backend: all application routes prefixed /v1, full GET /v1/exercises response (signals, string landmarks, thresholds, extra_signals with torso), Backend/app/exercises_config.py is pure data (mediapipe/cv2 removed from requirements.txt), /v1/predict strictly bound to session exercise (400 on mismatch) with finite [0.0, 360.0] angle validation, /v1/session/end takes {"session_id": "..."} in JSON body, RequestValidationError handler ensures uniform 422 JSON without NaN/inf serialization crashes, README.md updated with 6 exercises and /v1 endpoints. Full test suite passing (76 tests: 47 unit/API + 26 real-model + 3 Postgres smoke tests). Do NOT push without explicit user instruction.
4. Next recommended task: "Auth hardening: items 7, 8, 9, 14, plus token strategy, CORS and a login/signup rate limit, and replacing python-jose" (item 1 in section 6 roadmap).
5. At the end, update PROJECT_STATE.md fully and show me the complete file.
```
