# PROJECT_STATE.md — FitVision living status file

> Every AI agent: read this first. Update it at the end of every session (see AGENTS.md section 9).
> Progress percentages are rough estimates, not measurements. Update honestly.

**Last updated:** 2026-11-12 | **Session #:** 21
**Updated by:** Antigravity (Gemini 3.8 Flash) — feat/motion-lab-prototype branch
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
  - `routers/`: health (no prefix), auth (`/v1`), exercises (`/v1`), sessions (`/v1`), predict (`/v1`), profile (`/v1`), routines (`/v1`), workouts (`/v1`), stats (`/v1`)
  - `services/`: prediction_service, rep_counter, model_registry, session_manager, profile_service, routine_service, workout_service
  - `routines_data.py`: static rules-based routine workout plans keyed by `(body_goal, focus_area)` using exclusively configured exercises from `EXERCISES`
  - `auth/`: bcrypt hashing + JWT (python-jose), `get_current_user` dependency (tokenUrl="/v1/auth/login")
  - `db/`: SQLModel; tables `User`, `UserProfile`, `WorkoutSession`; dual SQLite (dev/test) & Neon Postgres support via Alembic migrations
  - `models/schemas.py`: request/response models with email format validation/normalization, full exercise config schema, EndSessionRequest JSON schema, [0, 360] angle validation, ProfileResponse/UpdateProfileRequest, RoutineResponse, WorkoutResponse/WorkoutListResponse, StatsResponse
  - `exercises_config.py`: pure-data config without mediapipe or opencv dependencies (landmarks as strings, rotate_frame as string/null)
  - cross-cutting: config (pydantic-settings), middleware (request ID), exceptions (uniform error JSON with RequestValidationError handling avoiding NaN/inf crash), rate_limit (slowapi), logging
- **Sessions:** in-memory per process (thread-safe, TTL sweep). Keyed by `user_id:session_id`.
- **Frontend:** IN PROGRESS (Next.js 14 App Router, TypeScript, Tailwind, @mediapipe/tasks-vision, pure-data config, TS RF classifier, RepCounter port, /m0 prototype, /workout screen).
- **Deployment:** NOT STARTED (planned Railway / Render / Fly.io; DB: Neon Postgres). Dockerfile packages app + alembic.

### API endpoints (current)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /health, /health/ready | no | liveness / readiness |
| GET | /v1/exercises | no | full exercise config (signals with landmark strings, thresholds, extra_signals with torso) |
| POST | /v1/auth/signup, /v1/auth/login | no | returns bearer token (email validated & lowercased) |
| GET | /v1/auth/me | yes | current user |
| GET | /v1/profile | yes | get onboarding profile (`body_goal`, `focus_area`, `onboarding_completed`), defaults without row creation |
| PUT | /v1/profile | yes | upsert profile (`body_goal`: slim/muscular/bulk, `focus_area`: legs/upper_body/core/null) |
| GET | /v1/routines?goal=&focus= | no | rules-based routine plan recommendation (public, 422 on invalid goal/focus) |
| POST | /v1/session/start | yes | start live rep-counting session |
| POST | /v1/predict | yes | send angle signals -> state, rep_count, feedback (session-bound exercise, validates [0, 360]) |
| POST | /v1/session/end | yes | end live session via JSON body `{"session_id": "..."}`, saves `WorkoutSession` row |
| POST | /v1/workouts | yes | manually record completed workout (server UUID `session_id`, 0-1000 reps, <= 3h duration) |
| GET | /v1/workouts?limit=&offset= | yes | paginated workout history for current user (newest first, default limit 20, max 100) |
| GET | /v1/stats | yes | personal stats: total workouts & reps, reps per exercise, UTC calendar streak, 7-day breakdown |

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
- Routine exercises in `routines_data.py` must strictly map to existing configured exercises in `EXERCISES`.
- History and stats endpoints strictly isolate user data (`WorkoutSession.user_id == current_user.id`), and stats dates/streaks are aggregated on UTC calendar days.

---

## 3. Progress (rough estimates)

| Area | Est. done | Notes |
|---|---|---|
| ML pipeline (6 exercises) | ~90% | Trained, exported to JSON (`models_json/` & `frontend/public/models/`), golden test passes 100%. |
| Backend core (auth, sessions, predict, profile, routines, history, stats) | ~92% | Full /v1 API suite, pure-data config, layered architecture (routers -> services -> schemas), user-isolated history & stats; 114 tests passing (1 Postgres smoke skipped without `TEST_DATABASE_URL`). |
| Backend production hardening | ~70% | Uniform RequestValidationError handling without NaN/inf crash; email normalization; DB secrets masked; single worker Dockerfile; production startup guard (default JWT secret / CORS `*`); handler-level request_id log filter. |
| Database | ~80% | Dual SQLite & Neon PostgreSQL supported; psycopg[binary]==3.3.7, Alembic migrations (0001 initial, 0002 TIMESTAMPTZ), connection pooling with pre-ping/recycle. |
| Auth | ~85% | Core works; email normalization, duplicate-signup race -> 409, 72-byte password limit, 5/min rate limit on signup/login done; token strategy, login timing leak, proxy-aware rate-limit key pending. |
| Frontend | ~25% | M0 Parity Prototype + Mobile-first live workout screen (/workout) with pure reducer, useWorkoutEngine hook, pose overlay, 2m HUD, and error/loading states (46 Vitest tests passing). |
| Deployment / CI | ~20% | Dockerfile packages app, alembic.ini, and migrations; Neon Postgres connected. |
| **Overall** | **~62%** | Rough guess. |

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
  - Merged `feat/frontend-ready-backend` into `main` (`bcc358e`).
- [x] Profile, onboarding, routines, workout history, and personal stats (session 9):
  - Task E: `GET /v1/profile` (auth; returns defaults without writing a row) and `PUT /v1/profile` (auth; upsert with body_goal `slim`/`muscular`/`bulk`, focus_area `legs`/`upper_body`/`core`/`null`, sets `onboarding_completed=true` and updates `updated_at`).
  - Task F: Static rules-based workout routines in `Backend/app/routines_data.py`, `GET /v1/routines?goal=&focus=` (public, returns 422 on invalid goal/focus), and contract test verifying all routine exercises exist in `EXERCISES`.
  - Task G: `POST /v1/workouts` (auth; validates exercise existence, 0-1000 reps, ended_at >= started_at, duration <= 3h, server UUID `session_id`, saves `WorkoutSession`) and `GET /v1/workouts?limit=&offset=` (auth; paginated history, newest first, user-isolated).
  - Task H: `GET /v1/stats` (auth; total workouts & reps, reps per exercise breakdown, consecutive day streak in UTC, and 7-day rolling UTC breakdown).
  - Added 29 new tests across `test_profile.py`, `test_routines.py`, `test_workouts.py`, `test_stats.py`; 105 tests passing (100% pass rate).
- [x] Milestone 0 (M0) Frontend Parity Prototype (session 10):
  - Exported all 6 trained Random Forest models to JSON format (`src/export_models_json.py`) into `models_json/` and `frontend/public/models/`.
  - Generated golden test dataset (250 feature vectors per exercise, 1500 total).
  - Built TypeScript tree walker and argmax classifier (`frontend/src/lib/classifier.ts`) using `Math.fround` float32 comparisons; passed golden test with 100% identical predictions to scikit-learn.
  - Ported `RepCounter` state machine to TypeScript (`frontend/src/lib/rep_counter.ts`); ported all unit tests from `Backend/tests/test_rep_counter.py`.
  - Generated API snapshot from `/v1/exercises` (`src/save_exercises_snapshot.py`); added snapshot contract test verifying TypeScript types against real backend response.
  - Ported angle and signal extraction utilities (`frontend/src/lib/pose_utils.ts`).
  - Implemented Next.js `/m0` squat parity prototype with webcam feed, skeleton rendering, rep counter, real-time feedback, and video parity benchmark.
  - Verified `raw_videos/squat.mp4` parity between Python baseline (6 reps, 126.33° avg angle) and MediaPipe Tasks-Vision `pose_landmarker_lite.task` (6 reps, 126.81° avg angle): rep count matches 100% on the exact same frames, mean angle delta is 0.48° (well below the < 5.0° exit threshold).
  - Vitest: 29 passed (100% pass rate); Pytest: 105 passed; Next.js `npm run build`: successful.
- [x] Mobile-first live workout screen (session 11):
  - Created `frontend/src/lib/workout_reducer.ts` pure state reducer (states: loading, active, permission_denied, body_not_visible, error, stopped) and `frontend/src/hooks/useWorkoutEngine.ts` custom hook encapsulating camera stream, MediaPipe pose detection, RF classifier, RepCounter loop, Wake Lock API, and pure `cleanupWorkoutEngine` teardown function taking resources as arguments.
  - Render-only `WorkoutScreen.tsx` full-screen mobile camera view (`100dvh`) with mirrored video and aligned skeleton canvas overlay.
  - Giant top HUD: 2-meter readable rep counter (font-black text-8xl/9xl) with minimal exercise name and confirmed state badge ("SQUAT • DOWN").
  - Dynamic feedback pill below counter: green for good reps ("Good depth!"), amber for corrective warnings ("Go lower", "Avoid leaning back").
  - Touch-friendly bottom Stop Workout button displaying final rep count and Back button when stopped (transition to `stopped` state).
  - Dedicated states: camera loading with pulsing spinner, camera permission denied with recovery instructions & retry button, non-blocking amber body visibility warning, and stopped state with summary & back navigation.
  - Exposing route `/workout?exercise=squat` (with Suspense wrapper).
  - 17 unit tests in `workout_screen.test.ts` for reducer transitions, query validation, and real `cleanupWorkoutEngine` resource teardown (46 Vitest tests pass).
- [x] Hygiene + auth hardening batch (session 12): minimal root requirements.txt, .gitignore (.pytest_cache/, .venv/), untracked 19 log CSVs, 5/min rate limit on auth endpoints via settings, signup race IntegrityError -> 409 with rollback, 72-byte UTF-8 password limit, production startup guard, request_id filter on root log handler, 12 new tests in `test_auth_hardening.py` (merged to `main`).
- [x] Rate limiter test isolation fix (session 13): converted `limiter.reset()` in `Backend/tests/conftest.py` into an `autouse=True` fixture `_reset_rate_limiter` so independent TestClient instances (e.g. in `test_postgres_smoke.py`) do not inherit rate limit counters from earlier tests; 117 tests pass.
- [x] Proxy-aware rate limiter key (session 14): added `TRUSTED_PROXY_COUNT` setting in `Backend/app/config.py` and `get_client_ip` key_func in `Backend/app/rate_limit.py` to safely extract `parts[-n]` from `X-Forwarded-For` when `n > 0` (falls back to socket IP if missing/too short); prevents IP spoofing and avoids shared limits behind Render/Railway; 6 new tests in `test_rate_limit_proxy.py`; 123 tests pass.

## 5. In progress

- [ ] Nothing actively being built. Waiting for user guidance on next milestone (M1: Auth + Onboarding).

## 6. Next (recommended order)

### Done
1. [x] ~~Fix sklearn version mismatch and real-model tests~~ — DONE (sessions 2 & 3)
2. [x] ~~Dockerfile: run 1 worker (sessions are in-memory per process)~~ — DONE (session 4)
3. [x] ~~DB: add psycopg, Alembic, engine pool settings (pool_pre_ping), smoke tests~~ — DONE (session 5)
4. [x] ~~DB correctness: TIMESTAMPTZ datetimes, email lowercasing/validation, Dockerfile alembic packaging~~ — DONE (session 6)
5. [x] ~~Exercise config as pure data + API~~ — DONE (session 8)
6. [x] ~~Contract and session fixes: items 1, 10, 11, 12~~ — DONE (session 8)
7. [x] ~~Profile, onboarding, history, stats, routines endpoints (item 6)~~ — DONE (session 9)
8. [x] ~~M0 Parity Prototype: TS classifier, RepCounter port, golden test, /m0 squat page, squat.mp4 parity verification~~ — DONE (session 10)

### Frontend Milestones Roadmap
1. [ ] **M1 - Auth + onboarding:** Signup, login, route guard, profile screen (goal & focus selection).
2. [ ] **M2 - Workout:** All 6 exercises, camera permission handling, setup guide, summary screen, save to `/v1/workouts`.
3. [ ] **M3 - Routine, history, stats:** Home screen with routine, history list, stats page.
4. [ ] **M4 - Polish + deploy:** Mobile layout, error and empty states, deploy frontend and backend.

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
| 5 | Resolved | History, stats, profile, onboarding, and routine endpoints implemented under `/v1`; UserProfile table utilized (resolved in session 9). |
| 6 | Med | Timed-out sessions are deleted, not saved (docstring in models.py claims otherwise). |
| 7 | Resolved | `/v1/auth/signup` and `/v1/auth/login` limited to `RATE_LIMIT_AUTH` (default `5/minute`) per client IP via slowapi (resolved in session 12). Caveat: see #27, the key is the client IP. |
| 8 | Resolved | App raises RuntimeError at startup when `ENVIRONMENT=production` and the JWT secret is the dev default (resolved in session 12). |
| 9 | Med | `python-jose` 3.3.0 has known CVEs. |
| 10 | Resolved | Email normalized to lowercase and validated on SignupRequest & LoginRequest in session 6; rejects invalid formats with 422; duplicate signup with differing case rejected with 409. |
| 11 | Resolved | Added psycopg[binary]==3.3.7, Alembic migrations with reversible initial schema, and connection pooling settings (pool_pre_ping=True, pool_recycle=300) for Neon idle compute suspension. |
| 12 | Med | CORS `*` with credentials (TODO already in main.py). Partly resolved in session 12: production now refuses to start with `CORS_ORIGINS=*`; dev still allows it. Set exact frontend origin(s) before deploy. |
| 13 | Resolved | `RequestIdFilter` now attached to the log handler, so uvicorn/third-party records format correctly (resolved in session 12). |
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
| 27 (Review #2) | Resolved | Custom key_func in Backend/app/rate_limit.py reads X-Forwarded-For using TRUSTED_PROXY_COUNT setting (default 0); when n > 0, safely extracts parts[-n] from right to prevent IP spoofing and avoid shared limits behind Render/Railway (resolved in session 14). |
| 28 (Review #3) | High | The Dockerfile build context is Backend/, but models live in ../models, which Docker can't COPY. A deployed container would have no models and /health/ready would return 503. (found in review, not yet verified by running) |
| 29 (Review #4) | High | /health/ready doesn't check the database. (found in review, not yet verified by running) |
| 30 (Review #5) | High | The session TTL sweep deletes timed-out sessions without saving the workout (the models.py docstring says otherwise). (found in review, not yet verified by running) |
| 31 (Review #6) | Resolved | No history, stats, profile, onboarding or routine endpoints resolved in session 9; UserProfile table utilized. |
| 32 (Review #7) | Resolved | Signup catches `IntegrityError`, rolls back the session, returns 409 (resolved in session 12, tested with a simulated race). |
| 33 (Review #8) | Resolved | Signup rejects passwords over 72 UTF-8 bytes with 422; `hash_password` also guards. Login is not limited, so older accounts with truncated long passwords can still log in (resolved in session 12). |
| 34 (Review #9) | Med | Login timing leak: an unknown email returns faster than a wrong password. (found in review, not yet verified by running) |
| 35 (Review #10) | Resolved | NaN, inf and angles outside [0.0, 360.0] rejected with 422 RequestValidationError; exceptions handler prevents json.dumps crash (resolved in session 8). |
| 36 (Review #11) | Resolved | POST /v1/session/end accepts session_id in JSON body via EndSessionRequest (resolved in session 8). |
| 37 (Review #12) | Resolved | Added /v1 prefix to auth, exercises, sessions, predict routes (resolved in session 8). |
| 38 (Review #13) | Med | /docs and /health are public in production. (found in review, not yet verified by running) |
| 39 (Review #14) | Resolved | Same fix as #8 (session 12). |
| 40 (Review #15) | Resolved | Same fix as #13 (session 12). |
| 41 (Review #16) | Resolved | 19 log CSVs untracked with `git rm --cached` (files kept on disk); `logs/` stays in .gitignore (resolved in session 12). |
| 42 (Review #17) | Low | There is no CI. (found in review, not yet verified by running) |
| 43 (Review #18) | Low | python-jose is stale and passlib is unmaintained. (found in review, not yet verified by running) |
| 44 (Review #19) | Resolved | README updated with `app.main:app`, 6 exercises, 105 test count, endpoints table (resolved in sessions 8 & 9). |
| 45 | Resolved | Root `requirements.txt` was a 323-line machine freeze (torch, comfyui, etc.). Replaced with 6 packages for `src/` (mediapipe 0.10.14, opencv-python 4.10.0.84, numpy 1.26.4, pandas, scikit-learn 1.9.0, joblib). `.gitignore` now also ignores `.pytest_cache/` and `.venv/` (resolved in session 12). |
| 46 | Low | `mediapipe==0.10.14` has no wheels for Python 3.13+. Use Python 3.10-3.12 for the root venv (verified: installs cleanly on 3.12; not installable on 3.13). |
| 47 | Low | README still says 105 tests; actual is 114 passing + 1 skipped. Not touched in session 12 (out of plan). |

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
- Application routes use `/v1` prefix (`/v1/auth`, `/v1/exercises`, `/v1/session`, `/v1/predict`, `/v1/profile`, `/v1/routines`, `/v1/workouts`, `/v1/stats`); health routes remain un-prefixed (`/health`, `/health/ready`).
- Exercise config in backend is pure data: string landmarks, string/null rotate_frame, zero mediapipe/cv2 imports.
- Validation errors return uniform `{error, detail, request_id}` 422 JSON shape without including input/ctx, preventing JSON serialization crashes on NaN/inf.
- Profile `GET /v1/profile` returns defaults without inserting an unneeded DB row until onboarding completion.
- Routine plans are static, rules-based, and only reference the 6 verified exercises in `EXERCISES`.
- History and stats calculations are strictly user-isolated and evaluate dates and streaks using UTC calendar days.
- In-browser model execution: Random Forest models exported to JSON (`models_json/`, `frontend/public/models/`), evaluated in TypeScript via `Math.fround` float32 comparisons; RepCounter ported line-by-line to TS. Video never leaves device, and per-frame backend requests are eliminated.
- Frontend stack: Next.js 14 App Router, TypeScript, Tailwind CSS, `@mediapipe/tasks-vision`.
- Dev in Antigravity; AI agents follow `AGENTS.md`.

### Open (user must decide)
1. Token strategy: short access token + httpOnly refresh cookie, or keep a long bearer token?
2. Add biceps curl as a 7th exercise now or later?

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
pytest                              # runs backend test suite (123 tests passing)
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
| 9 | 2026-11-07 | Antigravity (Gemini 3.8 Flash) | Profile & onboarding (GET/PUT /v1/profile), static rules-based routines (GET /v1/routines, routines_data.py, exercise contract validation), workout history (POST/GET /v1/workouts with pagination & server UUID), personal stats (GET /v1/stats with UTC calendar streak and 7-day breakdown), 29 new tests (105 tests pass) | Backend/app/models/schemas.py, Backend/app/routines_data.py, Backend/app/services/profile_service.py, Backend/app/services/routine_service.py, Backend/app/services/workout_service.py, Backend/app/routers/profile.py, Backend/app/routers/routines.py, Backend/app/routers/workouts.py, Backend/app/routers/stats.py, Backend/app/main.py, Backend/tests/test_profile.py, Backend/tests/test_routines.py, Backend/tests/test_workouts.py, Backend/tests/test_stats.py, README.md, PROJECT_STATE.md |
| 10 | 2026-11-07 | Antigravity (Gemini 3.8 Flash) | Milestone 0 (M0) Parity Prototype: exported 6 RF models to JSON (`models_json/`, `frontend/public/models/`), TypeScript classifier with `Math.fround` (100% golden parity on 1500 vectors), TS RepCounter port + tests, /v1/exercises snapshot contract test, pose geometry utils, Next.js /m0 squat prototype with webcam & video benchmark. Verified squat.mp4 parity (6 reps, 0.48° angle delta vs Python baseline). 29 Vitest tests pass, 105 Pytest pass. | src/export_models_json.py, src/save_exercises_snapshot.py, models_json/*, frontend/*, PROJECT_STATE.md |
| 11 | 2026-11-07 | Antigravity (Gemini 3.8 Flash) | Mobile-first live workout screen: decoupled pure workout reducer (loading, active, permission_denied, body_not_visible, error, stopped with final reps display), useWorkoutEngine hook with pure cleanupWorkoutEngine resource teardown, render-only WorkoutScreen (100dvh full-screen camera, pose skeleton overlay, 2m-readable top HUD, dynamic green/amber feedback line, big Stop button), /workout route. 17 unit tests in workout_screen.test.ts (46 Vitest tests pass, 105 Pytest pass, Next.js build succeeds). | frontend/src/lib/workout_reducer.ts, frontend/src/hooks/useWorkoutEngine.ts, frontend/src/components/WorkoutScreen.tsx, frontend/src/app/workout/page.tsx, frontend/src/app/page.tsx, frontend/tests/workout_screen.test.ts, PROJECT_STATE.md |
| 12 | 2026-11-11 | Claude (Sonnet 5.5) | Hygiene + auth hardening on chore/hygiene-auth-hardening (merged to main): minimal root requirements (numpy<2 for mediapipe), .gitignore, untracked 19 log CSVs, 5/min auth rate limit, signup IntegrityError -> 409 with rollback, 72-byte password guard, production startup guard (default JWT secret / CORS `*`), request_id filter on log handler, limiter reset in test fixture, 12 new tests. Pytest 102 passed + 1 skipped before, 114 passed + 1 skipped after; Vitest 46 pass; squat.mp4 CLI run gives 6 reps on a fresh Python 3.12 venv. Skipped from plan: EmailStr/email-validator (email normalization already existed, see #10). | requirements.txt, .gitignore, Backend/app/config.py, Backend/app/models/schemas.py, Backend/app/auth/security.py, Backend/app/routers/auth.py, Backend/app/main.py, Backend/app/logging_config.py, Backend/tests/conftest.py, Backend/tests/test_auth_hardening.py, PROJECT_STATE.md |
| 13 | 2026-11-11 | Antigravity (Gemini 3.8 Flash) | Fixed rate limiter counter leak into independent TestClient instances in Backend/tests/test_postgres_smoke.py by converting limiter.reset() in Backend/tests/conftest.py into an autouse=True fixture (_reset_rate_limiter). Pytest: 117 passed (0 failed). | Backend/tests/conftest.py, PROJECT_STATE.md |
| 14 | 2026-11-11 | Antigravity (Gemini 3.8 Flash) | Fixed Known issue #27: added trusted_proxy_count setting to config.py and .env.example, replaced key_func in rate_limit.py with get_client_ip reading parts[-n] from X-Forwarded-For when n > 0 with fallback to socket IP. Added 6 unit/integration tests in test_rate_limit_proxy.py. Pytest: 123 passed (0 failed). | Backend/app/config.py, Backend/app/rate_limit.py, Backend/.env.example, Backend/tests/test_rate_limit_proxy.py, PROJECT_STATE.md |
| 15 | 2026-11-12 | Antigravity (Gemini 3.8 Flash) | Refined FitVision landing page design system across design/hero-01.html, design/landing-desktop.html, design/landing-mobile.html: exact uppercase headline (YOUR BODY. YOUR DATA. YOUR EVOLUTION.) with Lora Italic, unified brand mark FITVISION® and CTAs (START TRAINING ↗, GET STARTED, LOG IN, EXPLORE THE EXPERIENCE), updated HUD status badge with #FF4D6D rose pip on dark surface, labeled ILLUSTRATIVE WORKOUT PREVIEW, 5-stage horizontal architecture pipeline on desktop verified at 1024px/1280px/1440px with zero overflow, audited marketing copy/claims, switched to local hero-athlete.png asset, and captured review screenshots (hero-01-review.png, landing-desktop-review.png, landing-mobile-review.png). | design/hero-01.html, design/landing-desktop.html, design/landing-mobile.html, design/*-review.png, PROJECT_STATE.md |
| 16 | 2026-11-12 | Antigravity (Gemini 3.8 Flash) | Authored complete Motion Design & Interactive 3D technical specification (design/FITVISION_MOTION_3D_SPEC.md): procedural articulated biomechanical mannequin evaluation, 5-phase kinematic squat cycle with vector-calculated angles, matte carbon & #FF4D6D visual direction, GSAP ScrollTrigger choreography without scroll hijacking, performance & mobile GPU budget, reduced-motion/a11y/teardown protocol, and React 18 / Next.js 14 stack verification (R3F v8). Zero application code modified or dependencies installed. | design/FITVISION_MOTION_3D_SPEC.md, PROJECT_STATE.md |
| 17 | 2026-11-12 | Antigravity (Gemini 3.8 Flash) | Refined FITVISION_MOTION_3D_SPEC.md for technical accuracy: replaced 60 FPS guarantee with desktop/mobile benchmark targets, clarified payload semantics (no external GLTF download, bundle costs noted, gzip marked unverified), stated phase angles describe synthetic keyframe geometry only without form scoring, aligned resource cleanup with R3F standard Canvas ownership, replaced manual looping with declarative frameloop gating, removed global Space/K key interception in favor of focused buttons, and defined empirical acceptance criteria. Updated handoff for isolated /motion-lab procedural squat prototype. | design/FITVISION_MOTION_3D_SPEC.md, PROJECT_STATE.md |
| 18 | 2026-11-12 | Antigravity (Gemini 3.8 Flash) | Built isolated procedural 3D squat demonstrator prototype at /motion-lab: added three (^0.169.0) and @react-three/fiber (^8.18.0) while omitting Drei to prevent MediaPipe peer conflicts; implemented two-segment analytical planar IK mannequin with forward-bending knee branch and planted feet (y=0); pure vector angle math (calculateInteriorKneeAngle with clamping and degenerate handling; 9 Vitest tests); Next.js 14 App Router server page + client coordinator with ssr:false dynamic import, IntersectionObserver frameloop gating, native OrbitControls with pan disabled and clamped zoom/polar angles, accessible camera view buttons (Profile default, 45°, Front), play/pause toggle, throttled 10Hz angle HUD, and static SVG fallback. All 55 frontend tests and 123 backend tests pass; Next.js production build succeeds; verified WebGL 2.0 initialization and kinematic progression in browser. | frontend/package.json, frontend/package-lock.json, frontend/src/app/motion-lab/page.tsx, frontend/src/components/motion-lab/*, frontend/tests/motion_lab_math.test.ts, design/motion-lab-preview.png, PROJECT_STATE.md |
| 19 | 2026-11-12 | Antigravity (Gemini 3.8 Flash) | Reconciled standing hip height from 0.92m to 0.9331m producing near-extended, non-singular 165.5° interior knee angle with 5.4cm forward knee flexion and 6.9mm extension headroom; preserved 68.9° bottom parallel depth; verified C0/C1 continuity, no branch flipping, and absence of NaNs across 100 trajectory steps; verified live HUD dynamic evaluation (165° lockout -> 69° depth); captured fresh standing profile screenshot (design/motion-lab-preview.png). 57 Vitest tests and 123 Pytest tests pass; Next.js production build succeeds. | frontend/src/components/motion-lab/ProceduralMannequin.tsx, frontend/tests/motion_lab_math.test.ts, design/motion-lab-preview.png, PROJECT_STATE.md |
| 20 | 2026-11-12 | Antigravity (Gemini 3.8 Flash) | Milestone 2 Refinements: Refined studio lighting (neutral key + restrained burgundy rim #851630) and matte non-metallic materials (metalness: 0, roughness 0.72–0.82); decoupled OrbitControls pointer drag from camera preset lerp via 'start' interaction listener; removed hardcoded initial angle state in favor of nullable initial placeholder ('—°'); expanded joint_math unit tests to verify C1 velocity continuity across 5 phase boundaries (finite-difference tolerance < 0.005 m/s, < 0.5°/s), exact singular collinear configuration (D = 0.86m, 180°), near-singular reach (D = 0.8599m, 178.25°), and unreachable over/under-extensions; captured multi-angle review screenshots. 61 Vitest tests + 123 Pytest tests pass; Next.js production build succeeds. | frontend/src/components/motion-lab/*, frontend/tests/motion_lab_math.test.ts, design/motion-lab-*.png, PROJECT_STATE.md |
| 21 | 2026-11-12 | Antigravity (Gemini 3.8 Flash) | Milestone 2.1 Refinements: Substantially elevated matte non-metallic mannequin material brightness (#666A78 technical slate, #565A68 torso, #4A4E5C pelvis, metalness: 0, roughness 0.72–0.82) and rebalanced studio lighting (key 2.2, dedicated front-left fill 1.0, contour rim 1.8, hemisphere 0.85); corrected unreachable IK metadata to compute true geometric Euclidean distances from clamped coordinates; updated unit tests verifying both unreachable cases independently; captured fresh high-visibility review screenshots (motion-lab-*.png). All 61 Vitest tests pass; Next.js production build succeeds. | frontend/src/components/motion-lab/*, frontend/tests/motion_lab_math.test.ts, design/motion-lab-*.png, PROJECT_STATE.md |

---

## 11. Handoff prompt (rewrite at end of each session; paste into the next AI)

```
You are continuing work on FitVision (repo: SAGETOAD-source/fitvision).
1. Read AGENTS.md and PROJECT_STATE.md in the repo root before anything else.
2. Follow AGENTS.md strictly: send a Change Plan (files to modify/create, nothing else touched) and wait for approval before editing.
3. Current state:
   - ML pipeline done for 6 exercises; FastAPI backend has complete /v1 API suite (123 tests pass) with hardened auth and proxy-aware rate limiting.
   - Frontend: M0 Parity Prototype and Mobile-First Live Workout screen complete (/workout). 61 Vitest tests + 123 Pytest tests pass. Next.js production build succeeds.
   - Design: Landing page designs refined across hero-01.html, landing-desktop.html, and landing-mobile.html. Review screenshots generated in design/*-review.png.
   - Motion Lab: Isolated procedural 3D squat demonstrator prototype complete and verified on branch feat/motion-lab-prototype at route /motion-lab. Milestone 2.1 completed: substantially elevated matte non-metallic materials (#666A78 technical slate, metalness 0, roughness 0.72-0.82), rebalanced studio lighting (key 2.2, dedicated front-left fill 1.0, contour rim 1.8, hemisphere 0.85), true geometric distance calculation in unreachable IK branches, decoupled OrbitControls with instant manual drag takeover, nullable initial angle ('—°' placeholder), C1 velocity continuity across 5 phase boundaries (< 0.005 m/s tolerance), exact singular collinear 180° handling, and high-visibility multi-angle captures (motion-lab-profile-stand.png, motion-lab-iso-bottom.png, motion-lab-front.png, motion-lab-mobile.png). Three.js/R3F are strictly isolated from /workout.
4. Next recommended task: Conduct real-device mobile performance measurements, or proceed to Milestone 1 (M1) - Auth + Onboarding: Signup, login, route guard, profile screen (goal & focus selection) per FRONTEND_SPEC.md/PROJECT_STATE.md contracts.
5. At the end, update PROJECT_STATE.md fully.
```
