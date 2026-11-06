"""
exercises.py

Single source the frontend uses to build its exercise picker and
configure its pose-estimation pipeline. Returns the full exercise
config (signals with landmark strings, thresholds, states, etc.) so
the frontend knows exactly which landmarks to compute angles for and
what range checks to apply - no hardcoding needed on the client side.

A newly added exercise appears here automatically the moment its
config entry + model are deployed - no frontend code change, no new
endpoint.
"""

from fastapi import APIRouter

from app.exercises_config import EXERCISES
from app.models.schemas import (
    ExerciseConfig,
    ExercisesResponse,
    ExtraSignalInfo,
    SignalInfo,
)

router = APIRouter(tags=["exercises"])


@router.get("/exercises", response_model=ExercisesResponse)
def list_exercises():
    result = {}
    for name, cfg in EXERCISES.items():
        result[name] = ExerciseConfig(
            display_name=cfg["display_name"],
            signals={
                k: SignalInfo(
                    points=list(v["points"]),
                    feature_name=v["feature_name"],
                )
                for k, v in cfg["signals"].items()
            },
            extra_signals={
                k: ExtraSignalInfo(
                    points=list(v["points"]),
                    type=v["type"],
                )
                for k, v in cfg.get("extra_signals", {}).items()
            },
            down_state=cfg["down_state"],
            up_states=sorted(cfg["up_states"]),
            count_on=cfg["count_on"],
            primary_signal=cfg["primary_signal"],
            min_valid_range=cfg["min_valid_range"],
            good_depth_threshold=cfg.get("good_depth_threshold"),
            extra_range_checks=cfg.get("extra_range_checks", {}),
            form_warnings=cfg.get("form_warnings", {}),
            visibility_threshold=cfg["visibility_threshold"],
            rotate_frame=cfg.get("rotate_frame"),
        )
    return ExercisesResponse(exercises=result)
