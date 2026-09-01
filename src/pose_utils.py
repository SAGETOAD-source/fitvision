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


def vertical_lean_angle(shoulder, hip):
    """
    Angle at the hip between (hip->shoulder) and (hip->straight-up).
    ~0 when upright (shoulder directly above hip), increases as the
    torso leans away from vertical.

    Used for form-quality signals like lat pulldown's leaning-back
    check. Deliberately doesn't need a third real landmark (e.g. a
    knee) the way calculate_angle's 3-point angles do - that matters
    when that landmark can be out of frame (e.g. knees tucked under
    a machine pad on a seated exercise).
    """
    vertical_reference = [hip[0], hip[1] - 0.1]  # a point "above" hip in image space (y decreases upward)
    return calculate_angle(shoulder, hip, vertical_reference)


def extract_signals(landmarks, exercise_config):
    """
    Computes every signal defined in exercise_config["signals"] AND
    exercise_config.get("extra_signals", {}) (if present), returning
    them all together in one dict.

    "signals" are classifier input features - build_feature_vector()
    in live_predict.py (and prediction_service.py on the backend)
    reads exactly these keys, in this dict's insertion order.

    "extra_signals" are tracked by RepCounter (min/max per rep,
    ceiling/range checks) but are NEVER fed to the classifier -
    build_feature_vector() only iterates config["signals"].keys(), so
    it silently ignores any extra keys in the returned dict. This is
    what lets a signal like lat pulldown's torso lean be monitored
    without changing what the trained model expects as input.

    Each signal entry supports an optional "type" (default "angle"):
      "angle"    - points is a 3-tuple (a, b, c); angle at b.
                   "MID_HIP" is resolvable here (see jumpingjack).
      "lean"     - points is a 2-tuple (shoulder_id, hip_id);
                   deviation from vertical at the hip - see
                   vertical_lean_angle().
      "lean_avg" - points is a 4-tuple (left_shoulder_id, left_hip_id,
                   right_shoulder_id, right_hip_id); average of both
                   sides' lean angle as a single signal. Matches how
                   avg_torso_angle was computed during data prep.

    Returns: dict {signal_name: value}, or None if any required real
    landmark's visibility is below threshold.
    """
    combined_cfg = {**exercise_config["signals"], **exercise_config.get("extra_signals", {})}
    visibility_threshold = exercise_config["visibility_threshold"]

    # Collect every distinct real landmark id needed (skip "MID_HIP" placeholders)
    needed_ids = set()
    for sig in combined_cfg.values():
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
    if any("MID_HIP" in sig["points"] for sig in combined_cfg.values()):
        points["MID_HIP"] = midpoint(
            points[mp_pose.PoseLandmark.LEFT_HIP],
            points[mp_pose.PoseLandmark.RIGHT_HIP],
        )

    results = {}
    for signal_name, sig in combined_cfg.items():
        sig_type = sig.get("type", "angle")

        if sig_type == "angle":
            a_ref, b_ref, c_ref = sig["points"]
            results[signal_name] = calculate_angle(points[a_ref], points[b_ref], points[c_ref])

        elif sig_type == "lean":
            shoulder_ref, hip_ref = sig["points"]
            results[signal_name] = vertical_lean_angle(points[shoulder_ref], points[hip_ref])

        elif sig_type == "lean_avg":
            l_shoulder_ref, l_hip_ref, r_shoulder_ref, r_hip_ref = sig["points"]
            left_val = vertical_lean_angle(points[l_shoulder_ref], points[l_hip_ref])
            right_val = vertical_lean_angle(points[r_shoulder_ref], points[r_hip_ref])
            results[signal_name] = (left_val + right_val) / 2

        else:
            raise ValueError(f"Unknown signal type '{sig_type}' for signal '{signal_name}'")

    return results