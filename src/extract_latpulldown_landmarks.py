"""
extract_latpulldown_landmarks.py

Lat pulldown has no Kaggle data (unlike pushup/situp/pullup/jumpingjack),
so landmarks are extracted directly from raw video here, same as squat.

Computes TWO signals per frame:
  - elbow angle (shoulder-elbow-wrist)     -> pull progress (up/down state)
  - torso lean angle (hip -> shoulder vs.
    hip -> straight-up vertical)           -> leaning-back / cheating check

NOTE: earlier version used a shoulder-hip-knee angle for torso lean
(borrowed from sit-up), which requires both knees visible. On a seated
cable-machine shot the knees are often tucked under a pad / out of
frame, so that version skipped 100% of frames. This version only
needs shoulder + hip - it measures deviation from vertical directly
using a synthetic reference point straight above the hip, instead of
using the knee as a proxy.
"""

import sys
from pathlib import Path

import cv2
import numpy as np
import pandas as pd
import mediapipe as mp

sys.path.insert(0, str(Path(__file__).parent))
from pose_utils import calculate_angle, get_point

mp_pose = mp.solutions.pose

pose = mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# --- Config ---
VIDEO_FILES = [
    "../raw_videos/lat_pulldown.mp4",
    "../raw_videos/lat_pulldown_2.mp4",
]

VISIBILITY_THRESHOLD = 0.5
ROTATE_FRAME = None  # set to cv2.ROTATE_90_CLOCKWISE etc. if a clip plays sideways

OUTPUT_PATH = Path("../data/latpulldown_raw_angles.csv")

# Only joints actually needed now - no knees.
JOINT_IDS = [
    mp_pose.PoseLandmark.LEFT_SHOULDER, mp_pose.PoseLandmark.LEFT_ELBOW, mp_pose.PoseLandmark.LEFT_WRIST,
    mp_pose.PoseLandmark.LEFT_HIP,
    mp_pose.PoseLandmark.RIGHT_SHOULDER, mp_pose.PoseLandmark.RIGHT_ELBOW, mp_pose.PoseLandmark.RIGHT_WRIST,
    mp_pose.PoseLandmark.RIGHT_HIP,
]

DEBUG_SAMPLE_LIMIT = 5  # print this many low-visibility diagnostics per video, then stop spamming


def torso_lean_angle(shoulder, hip):
    """
    Angle at the hip between (hip->shoulder) and (hip->straight up).
    ~0 when sitting upright (shoulder directly above hip), increases
    as the torso leans back. No knee landmark needed.
    """
    vertical_reference = [hip[0], hip[1] - 0.1]  # a point "above" hip in image space (y decreases upward)
    return calculate_angle(shoulder, hip, vertical_reference)


def extract_frame_signals(landmarks, debug_state, source_name):
    """
    Returns a dict of angles for one frame, or None if any required
    joint isn't confidently visible. Prints a one-time-per-joint debug
    line (up to DEBUG_SAMPLE_LIMIT) so you can see exactly what's failing.
    """
    points = {}
    for joint_id in JOINT_IDS:
        point, visibility = get_point(landmarks, joint_id)
        if visibility < VISIBILITY_THRESHOLD:
            key = f"{source_name}:{joint_id.name}"
            if debug_state[key] < DEBUG_SAMPLE_LIMIT:
                print(f"  [low visibility] {source_name}: {joint_id.name} = {visibility:.2f}")
                debug_state[key] += 1
            return None
        points[joint_id] = point

    left_elbow = calculate_angle(
        points[mp_pose.PoseLandmark.LEFT_SHOULDER],
        points[mp_pose.PoseLandmark.LEFT_ELBOW],
        points[mp_pose.PoseLandmark.LEFT_WRIST],
    )
    right_elbow = calculate_angle(
        points[mp_pose.PoseLandmark.RIGHT_SHOULDER],
        points[mp_pose.PoseLandmark.RIGHT_ELBOW],
        points[mp_pose.PoseLandmark.RIGHT_WRIST],
    )
    left_torso = torso_lean_angle(
        points[mp_pose.PoseLandmark.LEFT_SHOULDER],
        points[mp_pose.PoseLandmark.LEFT_HIP],
    )
    right_torso = torso_lean_angle(
        points[mp_pose.PoseLandmark.RIGHT_SHOULDER],
        points[mp_pose.PoseLandmark.RIGHT_HIP],
    )

    return {
        "left_elbow_angle": left_elbow,
        "right_elbow_angle": right_elbow,
        "avg_elbow_angle": (left_elbow + right_elbow) / 2,
        "left_torso_angle": left_torso,
        "right_torso_angle": right_torso,
        "avg_torso_angle": (left_torso + right_torso) / 2,
    }


def process_video(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Could not open video source: {video_path}")
        return []

    source_name = Path(video_path).stem
    rows = []
    frame_order = 0
    no_pose_count = 0
    low_visibility_count = 0
    debug_state = {}
    from collections import defaultdict
    debug_state = defaultdict(int)

    while True:
        success, frame = cap.read()
        if not success:
            break

        if ROTATE_FRAME is not None:
            frame = cv2.rotate(frame, ROTATE_FRAME)

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)

        if results.pose_landmarks:
            signals = extract_frame_signals(results.pose_landmarks.landmark, debug_state, source_name)
            if signals is not None:
                signals["source"] = source_name
                signals["frame_order"] = frame_order
                rows.append(signals)
            else:
                low_visibility_count += 1
        else:
            no_pose_count += 1

        frame_order += 1

    cap.release()
    print(
        f"{source_name}: {frame_order} frames read, {len(rows)} kept, "
        f"{no_pose_count} no-pose-detected, {low_visibility_count} low-visibility"
    )
    return rows


def main():
    all_rows = []
    for video_path in VIDEO_FILES:
        all_rows.extend(process_video(video_path))

    if not all_rows:
        raise RuntimeError(
            "No usable frames extracted from any video. "
            "Check the [low visibility] debug lines above to see which joint is failing - "
            "if it's SHOULDER/HIP/ELBOW/WRIST consistently, try ROTATE_FRAME or check the camera framing."
        )

    df = pd.DataFrame(all_rows)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)

    print(f"\nTotal frames kept: {len(df)}")
    print(f"Videos: {df['source'].nunique()} -> {sorted(df['source'].unique())}")
    print(f"Saved raw angles to: {OUTPUT_PATH}")
    print("\nNext: run inspect_latpulldown_angles.py to pick thresholds from this data.")


if __name__ == "__main__":
    main()