"""
routines_data.py

Static rules-based routine workout plans keyed by body_goal and focus_area.
All referenced exercises must exist in EXERCISES (squat, pushup, situp,
pullup, jumpingjack, latpulldown).
"""

from typing import Any, Dict, List, Optional, Tuple

# Each routine is a list of {"exercise": str, "sets": int, "reps": int}
# Keyed by (body_goal, focus_area), where focus_area can be None ("balanced")
ROUTINES: Dict[Tuple[str, Optional[str]], List[Dict[str, Any]]] = {
    # --- SLIM (high volume / endurance cardio focus) ---
    ("slim", None): [
        {"exercise": "jumpingjack", "sets": 3, "reps": 30},
        {"exercise": "squat", "sets": 3, "reps": 20},
        {"exercise": "situp", "sets": 3, "reps": 20},
        {"exercise": "pushup", "sets": 3, "reps": 15},
    ],
    ("slim", "legs"): [
        {"exercise": "squat", "sets": 4, "reps": 25},
        {"exercise": "jumpingjack", "sets": 4, "reps": 35},
    ],
    ("slim", "upper_body"): [
        {"exercise": "pushup", "sets": 4, "reps": 15},
        {"exercise": "latpulldown", "sets": 3, "reps": 15},
        {"exercise": "pullup", "sets": 3, "reps": 8},
    ],
    ("slim", "core"): [
        {"exercise": "situp", "sets": 4, "reps": 25},
        {"exercise": "jumpingjack", "sets": 3, "reps": 30},
        {"exercise": "squat", "sets": 3, "reps": 15},
    ],

    # --- MUSCULAR (hypertrophy / balanced strength) ---
    ("muscular", None): [
        {"exercise": "pullup", "sets": 4, "reps": 8},
        {"exercise": "pushup", "sets": 4, "reps": 15},
        {"exercise": "squat", "sets": 4, "reps": 15},
        {"exercise": "latpulldown", "sets": 3, "reps": 12},
        {"exercise": "situp", "sets": 3, "reps": 15},
    ],
    ("muscular", "legs"): [
        {"exercise": "squat", "sets": 5, "reps": 15},
        {"exercise": "jumpingjack", "sets": 3, "reps": 25},
    ],
    ("muscular", "upper_body"): [
        {"exercise": "pullup", "sets": 4, "reps": 10},
        {"exercise": "pushup", "sets": 4, "reps": 15},
        {"exercise": "latpulldown", "sets": 4, "reps": 12},
    ],
    ("muscular", "core"): [
        {"exercise": "situp", "sets": 4, "reps": 20},
        {"exercise": "squat", "sets": 3, "reps": 15},
        {"exercise": "pushup", "sets": 3, "reps": 12},
    ],

    # --- BULK (strength / heavy compound focus) ---
    ("bulk", None): [
        {"exercise": "squat", "sets": 5, "reps": 10},
        {"exercise": "pullup", "sets": 4, "reps": 6},
        {"exercise": "pushup", "sets": 4, "reps": 12},
        {"exercise": "latpulldown", "sets": 4, "reps": 10},
    ],
    ("bulk", "legs"): [
        {"exercise": "squat", "sets": 5, "reps": 12},
        {"exercise": "jumpingjack", "sets": 3, "reps": 20},
    ],
    ("bulk", "upper_body"): [
        {"exercise": "pullup", "sets": 5, "reps": 8},
        {"exercise": "latpulldown", "sets": 5, "reps": 10},
        {"exercise": "pushup", "sets": 5, "reps": 12},
    ],
    ("bulk", "core"): [
        {"exercise": "situp", "sets": 5, "reps": 15},
        {"exercise": "squat", "sets": 4, "reps": 10},
    ],
}
