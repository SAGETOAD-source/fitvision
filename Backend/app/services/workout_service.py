"""
workout_service.py

Business logic for workout history recording, paginated list retrieval,
and personal statistics calculations.

All date aggregations (streak and 7-day breakdown) are evaluated using
UTC calendar days to avoid timezone variance across server/client.
"""

from datetime import date, datetime, timedelta, timezone
import uuid
from typing import Dict

from sqlalchemy import func
from sqlmodel import Session, select

from app.db.models import WorkoutSession
from app.exercises_config import EXERCISES
from app.models.schemas import (
    CreateWorkoutRequest,
    DailyReps,
    StatsResponse,
    WorkoutListResponse,
    WorkoutResponse,
)


def create_workout(
    db: Session,
    user_id: int,
    request: CreateWorkoutRequest,
) -> WorkoutResponse:
    """
    Saves a completed workout session with a server-generated UUID session_id.
    """
    session_id = f"manual_{uuid.uuid4().hex}"
    workout = WorkoutSession(
        user_id=user_id,
        session_id=session_id,
        exercise=request.exercise,
        rep_count=request.rep_count,
        started_at=request.started_at,
        ended_at=request.ended_at,
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)

    return WorkoutResponse(
        id=workout.id,
        session_id=workout.session_id,
        exercise=workout.exercise,
        rep_count=workout.rep_count,
        started_at=workout.started_at,
        ended_at=workout.ended_at,
    )


def list_workouts(
    db: Session,
    user_id: int,
    limit: int = 20,
    offset: int = 0,
) -> WorkoutListResponse:
    """
    Returns the current user's workouts only, ordered newest first with pagination.
    """
    total = db.exec(
        select(func.count(WorkoutSession.id)).where(WorkoutSession.user_id == user_id)
    ).one()

    workouts = db.exec(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user_id)
        .order_by(WorkoutSession.started_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    items = [
        WorkoutResponse(
            id=w.id,
            session_id=w.session_id,
            exercise=w.exercise,
            rep_count=w.rep_count,
            started_at=w.started_at,
            ended_at=w.ended_at,
        )
        for w in workouts
    ]

    return WorkoutListResponse(
        workouts=items,
        total=total,
        limit=limit,
        offset=offset,
    )


def get_stats(db: Session, user_id: int) -> StatsResponse:
    """
    Computes overall stats for the current user:
    - total_workouts: count of sessions
    - total_reps: cumulative reps
    - reps_per_exercise: reps breakdown per exercise (defaults to 0 for all configured exercises)
    - current_streak_days: consecutive days with at least 1 workout up to today (UTC calendar days)
    - reps_last_7_days: list of 7 (date, reps) pairs for the last 7 calendar days in UTC
    """
    workouts = db.exec(
        select(WorkoutSession).where(WorkoutSession.user_id == user_id)
    ).all()

    total_workouts = len(workouts)
    total_reps = sum(w.rep_count for w in workouts)

    # Initialize reps per exercise for all known exercises in EXERCISES
    reps_per_exercise: Dict[str, int] = {name: 0 for name in EXERCISES.keys()}
    for w in workouts:
        reps_per_exercise[w.exercise] = reps_per_exercise.get(w.exercise, 0) + w.rep_count

    # --- Date Aggregations (UTC days strictly) ---
    # Convert all workout start datetimes to UTC date objects for daily aggregation
    today_utc = datetime.now(timezone.utc).date()

    workout_dates = set()
    daily_reps_map: Dict[date, int] = {
        today_utc - timedelta(days=i): 0 for i in range(6, -1, -1)
    }

    for w in workouts:
        dt = w.started_at
        if dt.tzinfo is None:
            # Handle naive datetimes (e.g. SQLite storage) by assuming UTC
            dt = dt.replace(tzinfo=timezone.utc)
        w_date = dt.astimezone(timezone.utc).date()

        workout_dates.add(w_date)
        if w_date in daily_reps_map:
            daily_reps_map[w_date] += w.rep_count

    # Calculate consecutive workout day streak in UTC:
    # A streak is alive if the user worked out today or yesterday.
    current_streak = 0
    check_date = today_utc
    if check_date not in workout_dates:
        # User has not worked out today yet, check if yesterday was active
        check_date = today_utc - timedelta(days=1)

    while check_date in workout_dates:
        current_streak += 1
        check_date -= timedelta(days=1)

    # 7-day chronological sequence (oldest to newest)
    reps_last_7_days = [
        DailyReps(date=d.isoformat(), reps=reps)
        for d, reps in sorted(daily_reps_map.items())
    ]

    return StatsResponse(
        total_workouts=total_workouts,
        total_reps=total_reps,
        reps_per_exercise=reps_per_exercise,
        current_streak_days=current_streak,
        reps_last_7_days=reps_last_7_days,
    )
