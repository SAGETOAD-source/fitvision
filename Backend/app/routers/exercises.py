"""
exercises.py

Single source the frontend uses to build its exercise picker. Reads
directly from exercises_config.EXERCISES, so a newly added exercise
appears here automatically the moment its config entry + model are
deployed - no frontend code change, no new endpoint.
"""

from fastapi import APIRouter

from app.exercises_config import EXERCISES
from app.models.schemas import ExerciseInfo, ExercisesResponse

router = APIRouter(tags=["exercises"])


@router.get("/exercises", response_model=ExercisesResponse)
def list_exercises():
    return ExercisesResponse(
        exercises={
            name: ExerciseInfo(display_name=cfg["display_name"])
            for name, cfg in EXERCISES.items()
        }
    )
