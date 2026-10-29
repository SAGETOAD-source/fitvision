# --- Build stage: install dependencies into a virtualenv ---
FROM python:3.11-slim AS builder

WORKDIR /app

# System deps required by opencv-python-headless / mediapipe at build time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt


# --- Runtime stage: copy only what's needed to run ---
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r fitvision && useradd -r -g fitvision fitvision

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY app/ ./app/
# Trained models are expected to live at ../models relative to this
# working directory, matching exercises_config.py's model_path
# entries - mount or COPY them in depending on your deploy target.
# Example if baking models into the image:
#   COPY models/ ../models/

RUN chown -R fitvision:fitvision /app
USER fitvision

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Must stay 1 worker: sessions are held in-memory per process (SessionManager)
# and the /predict rate limiter is per-process. Scaling to multiple workers
# requires migrating session state and rate limiting to a shared store (Redis / DB).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
