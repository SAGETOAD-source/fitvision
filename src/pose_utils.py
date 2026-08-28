"""
pose_utils.py

Shared pose-math utilities used across all exercises:
  - angle calculation
  - landmark/visibility lookup
  - generic multi-signal extraction driven by exercises_config.py

Having this in one place means a fix or improvement here
(e.g. a smarter visibility check) automatically applies to every
exercise, instead of needing to be copy-pasted into N files.
"""

import numpy as np
import mediapipe as mp

mp_pose = mp.solutions.pose


def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0:
        angle = 360 - angle
    return angle


def get_point(landmarks, landmark_id):
    lm = landmarks[landmark_id.value]
    return [lm.x, lm.y], lm.visibility


def midpoint(p1, p2):
    return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]


def extract_signals(landmarks, exercise_config):
    """
    Generic version of the extract_*_angles() functions we wrote
    per-exercise before. Reads exercise_config["signals"] and computes
    each defined angle, resolving any "MID_HIP" placeholders to a
    computed midpoint.

    Returns: dict {signal_name: angle_value}, or None if any required
    real landmark's visibility is below threshold.
    """
    signals_cfg = exercise_config["signals"]
    visibility_threshold = exercise_config["visibility_threshold"]

    # Collect every distinct real landmark id needed (skip "MID_HIP" placeholders)
    needed_ids = set()
    for sig in signals_cfg.values():
        for point_ref in sig["points"]:
            if point_ref != "MID_HIP":
                needed_ids.add(point_ref)

    points = {}
    for landmark_id in needed_ids:
        point, visibility = get_point(landmarks, landmark_id)
        if visibility < visibility_threshold:
            return None
        points[landmark_id] = point

    # Resolve MID_HIP now that both hips are confirmed visible
    if any("MID_HIP" in sig["points"] for sig in signals_cfg.values()):
        points["MID_HIP"] = midpoint(
            points[mp_pose.PoseLandmark.LEFT_HIP],
            points[mp_pose.PoseLandmark.RIGHT_HIP],
        )

    results = {}
    for signal_name, sig in signals_cfg.items():
        a_ref, b_ref, c_ref = sig["points"]
        a = points[a_ref]
        b = points[b_ref]
        c = points[c_ref]
        results[signal_name] = calculate_angle(a, b, c)

    return results