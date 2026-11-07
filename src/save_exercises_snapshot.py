"""
save_exercises_snapshot.py

Queries the FastAPI app's GET /v1/exercises endpoint and writes the real
response payload snapshot to frontend/tests/fixtures/exercises_snapshot.json.
This ensures frontend tests validate against the authentic API contract,
never hand-typed mock data.
"""

import os
import sys
import json

backend_dir = os.path.join(os.path.dirname(__file__), "..", "Backend")
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app

def main():
    client = TestClient(app)
    response = client.get("/v1/exercises")
    if response.status_code != 200:
        raise RuntimeError(f"GET /v1/exercises failed with {response.status_code}: {response.text}")

    data = response.json()
    fixtures_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "tests", "fixtures")
    os.makedirs(fixtures_dir, exist_ok=True)
    out_path = os.path.join(fixtures_dir, "exercises_snapshot.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    public_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")
    os.makedirs(public_dir, exist_ok=True)
    public_out_path = os.path.join(public_dir, "exercises_snapshot.json")
    with open(public_out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Saved /v1/exercises snapshot ({len(data['exercises'])} exercises) to {out_path} and {public_out_path}")

if __name__ == "__main__":
    main()
