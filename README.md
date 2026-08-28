# 🏋️ FitVision

**AI-powered fitness coaching in your browser — no wearables, no gym equipment, just your camera.**

FitVision uses computer vision and machine learning to count your exercise reps in real time and give you live form feedback, right from a webcam. Pick a body goal, get a workout routine, and let the model watch your form while you train.

---

## ✨ What it does

- 🎯 **Onboarding** — choose a body goal (Slim / Muscular / Bulk) and get a predefined, customizable workout routine
- 📹 **Live rep counting** — real-time pose detection counts reps as you perform them
- 💬 **Form feedback** — instant cues like *"Good depth!"* or *"Go lower next time"*
- 🏃 **5 supported exercises** — Squat, Push-up, Sit-up, Pull-up, Jumping Jack
- 🔒 **Privacy-first design** — video is analyzed client-side and never uploaded to a server

---

## 🧠 How it works

```
Camera Feed → MediaPipe Pose Estimation → Joint Angle Calculation → Random Forest Classifier → Rep Counter + Feedback
```

1. **Pose estimation** — [MediaPipe](https://developers.google.com/mediapipe) detects 33 body landmarks per frame
2. **Feature engineering** — joint angles (e.g. knee, elbow, torso) are computed using `numpy.arctan2`
3. **Classification** — a per-exercise **Random Forest model** predicts the current pose state (e.g. `squat_up` / `squat_down`)
4. **Rep counting** — a debounced state machine confirms genuine reps and filters out noise
5. **Feedback** — depth/range checks generate real-time coaching cues

All exercise-specific logic (landmarks, thresholds, model paths) lives in a single config file, so adding a new exercise doesn't require writing a new script.

---

## 🏗️ Architecture

FitVision is built in three layers:

| Layer | Status | Details |
|---|---|---|
| **ML Pipeline** | ✅ Complete | MediaPipe + Random Forest, trained on Kaggle data, unified config-driven live prediction |
| **Backend API** | ✅ Complete | FastAPI, JWT auth, session management, SQLModel ORM, Dockerized |
| **Frontend** | 🔜 Planned | React/Next.js + MediaPipe.js (client-side pose estimation) |
| **Cloud Deployment** | 🔜 Planned | Railway / Render / Fly.io |

> **Important design decision:** video never leaves the browser. Pose estimation runs client-side via MediaPipe.js; only landmark/angle data is sent to the backend for validation and session tracking.

---

## ⚙️ Tech Stack

**ML / Computer Vision**
- Python, MediaPipe `0.10.14`, OpenCV, NumPy
- scikit-learn `1.9.0` (Random Forest classifiers)
- Training data: Kaggle multi-exercise dataset + self-recorded video (squat)

**Backend**
- FastAPI (layered: routers / services / schemas)
- SQLModel ORM — SQLite locally, Postgres in production
- JWT auth with bcrypt password hashing
- Rate limiting (`slowapi`), structured request-ID logging
- Thread-safe TTL-based session management
- Dockerized, with liveness/readiness health checks

**Frontend** *(planned)*
- React / Next.js
- MediaPipe.js for in-browser pose estimation

---

## 📁 Project Structure

```
fitvision/
├── src/
│   ├── live_predict.py         # Unified live prediction driver (all exercises)
│   ├── exercises_config.py     # Single source of truth: landmarks, thresholds, paths
│   ├── pose_utils.py           # Shared angle/landmark math
│   └── train_*.py              # Per-exercise model training scripts
├── data/                       # Prepared training datasets (CSV)
├── models/                     # Trained .pkl Random Forest models
├── backend/                    # FastAPI backend (routers/services/schemas)
├── logs/                       # Session CSV logs (auto-generated)
├── raw_videos/                 # Source videos for testing/training
├── ARCHITECTURE.md             # System design + diagrams
├── TECHSTACK.md
└── WORKFLOW.md                 # Phased roadmap + "add a new exercise" guide
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- A webcam (for live testing) or recorded video files

### Setup

```bash
# Clone and enter the project
git clone <repo-url>
cd fitvision

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### Run live prediction

```bash
cd src
python live_predict.py squat
python live_predict.py pushup ../raw_videos/pushup.mp4
```

Supported exercises: `squat`, `pushup`, `situp`, `pullup`, `jumpingjack`

If no video path is given, it defaults to your webcam.

### Run the backend

```bash
cd backend
uvicorn main:app --reload
```

---

## 🧪 Testing

- **Automated tests:** 31 passing — unit tests for rep-counting logic, plus auth tests against an isolated in-memory SQLite DB
- **Manual validation:** end-to-end tested via PowerShell (session start → live prediction with debounced state transitions → correct rep counting with depth feedback → session end)

---

## 🔑 Key Engineering Notes

- **Rep-count direction differs by exercise** — squat/push-up count on reaching *"up"*; sit-up/pull-up/jumping-jack count on reaching *"down"*. This is centralized in `exercises_config.py` rather than hardcoded per script.
- **Jumping jack needs dual-signal validation** — both arm range *and* leg range must swing far enough before a rep counts, preventing false positives from partial movement.
- **Self-occlusion during push-up down-phase** is a known limitation of monocular 2D pose estimation — not a bug, a physical constraint of single-camera tracking.
- **Debouncing (N=4 stable frames)** and **minimum valid range checks** prevent noise near threshold boundaries from being counted as real reps.
- **Model version pinning matters** — MediaPipe `1.0.0` broke functionality that worked fine on `0.10.14`.

---

## 🗺️ Roadmap

- [ ] Client-side React/Next.js frontend with MediaPipe.js
- [ ] Onboarding flow UI (connects to existing `UserProfile` backend table)
- [ ] Routine recommendation engine (rules-based, matches goals → workout plans)
- [ ] Cloud deployment (Railway / Render / Fly.io)

---

## 📄 Documentation

- `ARCHITECTURE.md` — system design with diagrams
- `TECHSTACK.md` — full technology breakdown
- `WORKFLOW.md` — phased roadmap and SOP for adding a new exercise

---

## 📜 License

*Add your license here (e.g. MIT).*