# FitVision Backend

A layered FastAPI service wrapping the trained rep-counting models. Never processes video — only receives `{signal_name: angle}` values computed client-side (see root `ARCHITECTURE.md`).

## Structure

```
backend/
├── app/
│   ├── main.py                 # app wiring: lifespan, middleware, routers
│   ├── config.py               # env-driven settings (pydantic-settings)
│   ├── logging_config.py       # structured logging
│   ├── middleware.py           # request ID + access logging
│   ├── exceptions.py           # consistent error responses
│   ├── rate_limit.py           # slowapi setup
│   ├── dependencies.py         # FastAPI dependency providers (enables test overrides)
│   ├── exercises_config.py     # copy of src/exercises_config.py - keep in sync
│   ├── db/
│   │   ├── database.py             # engine/session setup (SQLite dev, Postgres prod)
│   │   └── models.py               # User, UserProfile tables
│   ├── auth/
│   │   ├── security.py             # password hashing, JWT create/decode
│   │   └── dependencies.py         # get_current_user (used by every protected route)
│   ├── models/schemas.py       # all request/response Pydantic models
│   ├── services/
│   │   ├── rep_counter.py          # the debounced state machine (ported from live_predict.py)
│   │   ├── model_registry.py       # loads + holds trained .pkl models
│   │   ├── session_manager.py      # thread-safe, TTL-based session store
│   │   └── prediction_service.py   # business logic, no HTTP awareness
│   └── routers/
│       ├── health.py            # liveness + readiness
│       ├── auth.py              # POST /auth/signup, /auth/login, GET /auth/me
│       ├── exercises.py         # GET /exercises
│       ├── sessions.py          # POST /session/start, /session/end
│       └── predict.py           # POST /predict (rate-limited)
├── tests/                   # 31 tests: unit (RepCounter) + auth + API (TestClient)
├── requirements.txt         # pinned production deps
├── requirements-dev.txt     # + pytest, httpx
├── .env.example
├── Dockerfile
└── pytest.ini
```

## Why it's structured this way

- **Routers never contain business logic.** They translate HTTP ↔ service calls. `prediction_service.py` has zero FastAPI imports - it's plain Python, fully unit-testable, and reusable if you add a WebSocket transport later for lower latency.
- **Dependency injection everywhere** (`app/dependencies.py`). Tests swap in a stub model registry and a fresh session manager without touching route code - see `tests/conftest.py`.
- **Consistent error shape.** Every error - whether raised deliberately (`UnknownExerciseError`) or an unexpected crash - returns `{error, detail, request_id}`. No stack traces ever reach the client.
- **Thread-safe, TTL-bound sessions.** The naive version of this (a plain `dict`) both risks race conditions under concurrent requests and leaks memory forever for abandoned sessions. `SessionManager` locks around every mutation and a background task evicts anything idle past `SESSION_TTL_SECONDS`.
- **Liveness vs readiness are separate.** `/health` says "the process is up." `/health/ready` says "it's safe to route real traffic here" (fails if models aren't loaded) - this distinction matters for zero-downtime rolling deploys.

## Auth

Standard email+password JWT auth (not third-party OAuth — no "Sign in with Google" here, that would be a separate addition).

```bash
# Sign up (returns a token immediately)
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-real-password"}'

# Log in (existing users)
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-real-password"}'

# Use the token on a protected route
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer <token from above>"
```

Tokens are JWTs, valid for `ACCESS_TOKEN_EXPIRE_MINUTES` (default 7 days). **Change `JWT_SECRET_KEY` before any real deployment** — generate one with:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

To protect a new route, add `current_user: User = Depends(get_current_user)` as a parameter — see `app/routers/auth.py`'s `/auth/me` for the pattern.

## Database

SQLite by default (`fitvision.db`, created automatically on first run - zero setup). Swap to Postgres for production by changing one env var:
```
DATABASE_URL=postgresql://user:password@host:5432/fitvision
```
No code changes needed either way - SQLModel/SQLAlchemy handle both identically.

Tables (`User`, `UserProfile`) are auto-created on startup. This is fine while the schema is still settling; once you're in production and need to change columns without losing data, switch to Alembic migrations - `app/db/database.py`'s `engine` is what an Alembic `env.py` would import.

`UserProfile` already exists (mostly empty) so the onboarding flow (body goal, focus area) has somewhere to write once that UI is built - no migration fire drill needed when that day comes.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate      # venv\Scripts\activate on Windows
pip install -r requirements-dev.txt
cp .env.example .env
```

Make sure your trained `.pkl` files exist at the path `exercises_config.py` expects (default: `../models/`, i.e. one level up from `backend/`).

## Run

```bash
uvicorn app.main:app --reload
```

Docs at `http://localhost:8000/docs`.

## Test

```bash
pytest
```

31 tests covering:
- `RepCounter` direction logic directly (squat/pushup count on "up", situp/pullup/jumpingjack count on "down")
- The dual-signal jumpingjack range check (this test caught a real bug during development - see note below)
- Noise rejection (`min_valid_range`)
- Debounce behavior
- Auth: signup, duplicate email rejection, login (success/failure), protected-route access with/without a valid token
- Full API flows: session start/predict/end, error responses, missing-signal validation

Auth tests use a fresh in-memory SQLite DB per test - no real database file touched, no cross-test pollution.

**A note on a bug these tests caught:** the first version of this backend picked `primary_signal` as simply "whichever key comes first in `exercises_config.py`'s signals dict." For every exercise except jumpingjack this happens to be correct. For jumpingjack, the *intended* range-checked signal is `leg_spread` (per the original config comment), but `leg_spread` is the third key, not the first — so the real range check was silently landing on `left_arm` instead, and leg movement was never validated at all. `PRIMARY_SIGNAL_OVERRIDE` in `rep_counter.py` fixes this explicitly. Worth knowing this class of bug (a hardcoded convention silently doing the wrong thing for one exercise) is exactly the kind of thing to test for as more exercises get added.

## Run with a real model (manual smoke test)

```bash
curl -X POST "http://localhost:8000/session/start" \
  -H "Content-Type: application/json" \
  -d '{"exercise":"squat","session_id":"test1"}'

curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"exercise":"squat","session_id":"test1","signals":{"left":95.0,"right":93.0}}'

curl -X POST "http://localhost:8000/session/end?session_id=test1"
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness + which models are loaded |
| GET | `/health/ready` | Readiness (503 if any model failed to load) |
| GET | `/exercises` | List available exercises - frontend builds its picker from this |
| POST | `/session/start` | Body: `{exercise, session_id}` |
| POST | `/predict` | Body: `{exercise, session_id, signals}` → state + rep_count. Rate-limited. |
| POST | `/session/end?session_id=...` | Ends session, returns final count |

## Docker

```bash
docker build -t fitvision-backend .
docker run -p 8000:8000 -v $(pwd)/../models:/models fitvision-backend
```

(Adjust the volume mount / `MODELS_DIR` env var to match wherever your `.pkl` files actually live in your deploy environment.)

## What's intentionally not here yet

These are Phase 1 → Phase 3 items from the root `WORKFLOW.md`, not oversights:

- **Persistent storage.** Sessions live in memory; a restart loses all active sessions (not historical data - there's no DB yet at all). Add Postgres + SQLModel next.
- **Auth.** Every endpoint is currently open. Add before any real deployment.
- **Multi-instance session sharing.** `SessionManager`'s in-memory dict works for one process. Scaling to multiple backend instances behind a load balancer needs this swapped for Redis - the class's interface (`start/get/end/sweep_expired`) is deliberately shaped so that swap doesn't touch any calling code.
- **Model hot-reload endpoint.** Right now, deploying a newly trained exercise requires a process restart to pick up the new `.pkl`. A `/admin/reload-models` endpoint (behind auth) would remove that requirement.

## Adding a new exercise

No backend code changes needed. Once a new entry exists in `exercises_config.py` (kept in sync with `src/exercises_config.py`) and its `.pkl` is placed at the configured path, restart the service and it's live - `/exercises`, `/predict`, and session handling all pick it up automatically.
