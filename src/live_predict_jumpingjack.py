"""
live_predict_jumpingjack.py

Live jumping-jack detection: rep counting, using a combined
arm-angle + leg-spread-angle model trained on Kaggle data.

Requires BOTH arm and leg signals to agree before confirming a
state - mirrors the training data's labeling logic exactly.
"""

import cv2
import mediapipe as mp
import numpy as np
import joblib
import csv
from pathlib import Path
from datetime import datetime

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

pose = mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# --- Config ---
MODEL_PATH = "../models/rf_jumpingjack_model.pkl"
VIDEO_FILES = [
        "../raw_videos/jumping_jack.mp4", # webcam; replace with a file path to test recorded video
]
DISPLAY_SIZE = (480, 854)
VISIBILITY_THRESHOLD = 0.5  # lesson learned from push-up: 0.3 was too permissive
STABLE_FRAMES_REQUIRED = 4

IN_STATE = "jack_in"
OUT_STATE = "jack_out"

# A rep must swing far enough to count as real (not just noise near the boundary)
MIN_ARM_RANGE_FOR_VALID_REP = 90   # arm angle must swing at least this much across the rep
MIN_LEG_RANGE_FOR_VALID_REP = 30   # leg angle must swing at least this much across the rep

ROTATE_FRAME = None  # set to cv2.ROTATE_90_CLOCKWISE etc. if source video needs it

LOG_DIR = Path("../logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILENAME = LOG_DIR / f"jumpingjack_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"


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


def extract_jumpingjack_signals(landmarks):
    """
    Returns (avg_arm_angle, leg_spread_angle), or None if any
    required joint is not confidently visible.
    """
    joint_ids = [
        mp_pose.PoseLandmark.LEFT_ELBOW, mp_pose.PoseLandmark.LEFT_SHOULDER, mp_pose.PoseLandmark.LEFT_HIP,
        mp_pose.PoseLandmark.RIGHT_ELBOW, mp_pose.PoseLandmark.RIGHT_SHOULDER, mp_pose.PoseLandmark.RIGHT_HIP,
        mp_pose.PoseLandmark.RIGHT_KNEE, mp_pose.PoseLandmark.LEFT_KNEE,
    ]

    points = {}
    for joint_id in joint_ids:
        point, visibility = get_point(landmarks, joint_id)
        if visibility < VISIBILITY_THRESHOLD:
            return None
        points[joint_id] = point

    left_arm_angle = calculate_angle(
        points[mp_pose.PoseLandmark.LEFT_ELBOW],
        points[mp_pose.PoseLandmark.LEFT_SHOULDER],
        points[mp_pose.PoseLandmark.LEFT_HIP],
    )
    right_arm_angle = calculate_angle(
        points[mp_pose.PoseLandmark.RIGHT_ELBOW],
        points[mp_pose.PoseLandmark.RIGHT_SHOULDER],
        points[mp_pose.PoseLandmark.RIGHT_HIP],
    )
    avg_arm_angle = (left_arm_angle + right_arm_angle) / 2

    mid_hip = midpoint(points[mp_pose.PoseLandmark.LEFT_HIP], points[mp_pose.PoseLandmark.RIGHT_HIP])
    leg_spread_angle = calculate_angle(
        points[mp_pose.PoseLandmark.RIGHT_KNEE],
        mid_hip,
        points[mp_pose.PoseLandmark.LEFT_KNEE],
    )

    return avg_arm_angle, right_arm_angle, left_arm_angle, leg_spread_angle


class RepCounter:
    """
    Debounced state machine, plus a validity check requiring the
    rep to have actually swung through a meaningful range (not just
    briefly touched the boundary due to noise).
    """

    def __init__(self, in_state, out_state, stable_frames_required):
        self.in_state = in_state
        self.out_state = out_state
        self.stable_frames_required = stable_frames_required

        self.rep_count = 0
        self.in_out_phase = False

        self.max_arm_this_rep = -999.0
        self.max_leg_this_rep = -999.0
        self.min_arm_this_rep = 999.0
        self.min_leg_this_rep = 999.0

        self.pending_state = None
        self.pending_count = 0
        self.confirmed_state = None

    def update(self, raw_prediction, arm_angle, leg_angle):
        if raw_prediction == self.pending_state:
            self.pending_count += 1
        else:
            self.pending_state = raw_prediction
            self.pending_count = 1

        if self.pending_count >= self.stable_frames_required:
            self.confirmed_state = self.pending_state

        rep_completed = False

        if self.confirmed_state == self.out_state:
            self.in_out_phase = True
            self.max_arm_this_rep = max(self.max_arm_this_rep, arm_angle)
            self.max_leg_this_rep = max(self.max_leg_this_rep, leg_angle)

        elif self.confirmed_state == self.in_state and self.in_out_phase:
            self.min_arm_this_rep = min(self.min_arm_this_rep, arm_angle)
            self.min_leg_this_rep = min(self.min_leg_this_rep, leg_angle)

            arm_range = self.max_arm_this_rep - self.min_arm_this_rep
            leg_range = self.max_leg_this_rep - self.min_leg_this_rep

            if arm_range >= MIN_ARM_RANGE_FOR_VALID_REP and leg_range >= MIN_LEG_RANGE_FOR_VALID_REP:
                self.rep_count += 1
                rep_completed = True

            self.in_out_phase = False
            self.max_arm_this_rep = -999.0
            self.max_leg_this_rep = -999.0
            self.min_arm_this_rep = 999.0
            self.min_leg_this_rep = 999.0

        return rep_completed


def run_on_video(model, video_path, csv_writer):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Could not open video source: {video_path}")
        return

    counter = RepCounter(IN_STATE, OUT_STATE, STABLE_FRAMES_REQUIRED)

    csv_writer.writerow([datetime.now().strftime("%H:%M:%S"), video_path, "", "session_start"])

    while True:
        success, frame = cap.read()
        if not success:
            break

        if ROTATE_FRAME is not None:
            frame = cv2.rotate(frame, ROTATE_FRAME)

        frame = cv2.resize(frame, DISPLAY_SIZE)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)

        if results.pose_landmarks:
            mp_drawing.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

            signals = extract_jumpingjack_signals(results.pose_landmarks.landmark)

            if signals is not None:
                avg_arm_angle, right_arm_angle, left_arm_angle, leg_spread_angle = signals
                raw_prediction = model.predict([[left_arm_angle, right_arm_angle, leg_spread_angle]])[0]

                rep_completed = counter.update(raw_prediction, avg_arm_angle, leg_spread_angle)

                if rep_completed:
                    csv_writer.writerow([
                        datetime.now().strftime("%H:%M:%S"),
                        video_path,
                        counter.rep_count,
                        "rep_completed"
                    ])

                cv2.putText(frame, f"State: {counter.confirmed_state}",
                            (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        cv2.putText(frame, f"Reps: {counter.rep_count}",
                    (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 0), 2)

        cv2.imshow("Jumping Jack Live Prediction", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    csv_writer.writerow([
        datetime.now().strftime("%H:%M:%S"), video_path, counter.rep_count, "session_end"
    ])
    print(f"Finished {video_path} - Final rep count: {counter.rep_count}")


def main():
    model_path = Path(MODEL_PATH)
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found at {model_path}. Train it first with train_jumpingjack_model.py")

    model = joblib.load(model_path)

    with open(LOG_FILENAME, mode="w", newline="") as f:
        csv_writer = csv.writer(f)
        csv_writer.writerow(["time", "source", "rep_number", "note"])

        for video_path in VIDEO_FILES:
            run_on_video(model, video_path, csv_writer)

    cv2.destroyAllWindows()
    print(f"\nSession complete. Log file saved to: {LOG_FILENAME}")


if __name__ == "__main__":
    main()