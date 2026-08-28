"""
live_predict_pushup.py

Live push-up detection: rep counting + basic depth feedback,
using the elbow-angle model trained on Kaggle's push-up data.

Includes:
- Frame rotation fix (phone videos often have rotation metadata
  that OpenCV ignores, causing sideways playback)
- Visibility filtering (skip unreliable frames)
- Debug logging for suspiciously low angles (diagnose tracking issues)
- Debounced state machine (avoid flicker-based false reps)
- Minimum-depth validity check (avoid counting reps that never
  actually reached a real "down" position)
- CSV session logging
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
MODEL_PATH = "../models/rf_pushup_model.pkl"
VIDEO_FILES = [
    "../raw_videos/pushup.mp4",
]
DISPLAY_SIZE = (480, 854)
VISIBILITY_THRESHOLD = 0.5
STABLE_FRAMES_REQUIRED = 4

UP_STATE = "pushup_up"
DOWN_STATE = "pushup_down"
GOOD_DEPTH_THRESHOLD = 90
MIN_VALID_DOWN_ANGLE = 130
LOW_ANGLE_DEBUG_THRESHOLD = 60  # print diagnostics if avg angle drops below this

ROTATE_FRAME = cv2.ROTATE_90_CLOCKWISE  # set to None to disable

LOG_DIR = Path("../logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILENAME = LOG_DIR / f"pushup_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"


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


def extract_elbow_angles(landmarks, debug_threshold=LOW_ANGLE_DEBUG_THRESHOLD):
    joint_ids = [
        mp_pose.PoseLandmark.LEFT_SHOULDER, mp_pose.PoseLandmark.LEFT_ELBOW, mp_pose.PoseLandmark.LEFT_WRIST,
        mp_pose.PoseLandmark.RIGHT_SHOULDER, mp_pose.PoseLandmark.RIGHT_ELBOW, mp_pose.PoseLandmark.RIGHT_WRIST,
    ]

    points = {}
    visibilities = {}
    for joint_id in joint_ids:
        point, visibility = get_point(landmarks, joint_id)
        visibilities[joint_id.name] = visibility
        if visibility < VISIBILITY_THRESHOLD:
            return None
        points[joint_id] = point

    left_angle = calculate_angle(
        points[mp_pose.PoseLandmark.LEFT_SHOULDER],
        points[mp_pose.PoseLandmark.LEFT_ELBOW],
        points[mp_pose.PoseLandmark.LEFT_WRIST],
    )
    right_angle = calculate_angle(
        points[mp_pose.PoseLandmark.RIGHT_SHOULDER],
        points[mp_pose.PoseLandmark.RIGHT_ELBOW],
        points[mp_pose.PoseLandmark.RIGHT_WRIST],
    )

    avg_angle = (left_angle + right_angle) / 2
    if avg_angle < debug_threshold:
        print(f"\n[LOW ANGLE DEBUG] avg={avg_angle:.1f}, left={left_angle:.1f}, right={right_angle:.1f}")
        for name, vis in visibilities.items():
            print(f"  {name}: visibility={vis:.2f}")

    return left_angle, right_angle


class RepCounter:
    def __init__(self, down_state, up_state, stable_frames_required,
                 good_depth_threshold, min_valid_down_angle):
        self.down_state = down_state
        self.up_state = up_state
        self.stable_frames_required = stable_frames_required
        self.good_depth_threshold = good_depth_threshold
        self.min_valid_down_angle = min_valid_down_angle

        self.rep_count = 0
        self.in_rep = False
        self.min_angle_this_rep = 999.0

        self.pending_state = None
        self.pending_count = 0
        self.confirmed_state = None

    def update(self, raw_prediction, avg_angle):
        if raw_prediction == self.pending_state:
            self.pending_count += 1
        else:
            self.pending_state = raw_prediction
            self.pending_count = 1

        if self.pending_count >= self.stable_frames_required:
            self.confirmed_state = self.pending_state

        feedback = None
        completed_min_angle = None

        if self.confirmed_state == self.down_state:
            self.in_rep = True
            self.min_angle_this_rep = min(self.min_angle_this_rep, avg_angle)

        elif self.confirmed_state == self.up_state and self.in_rep:
            if self.min_angle_this_rep < self.min_valid_down_angle:
                self.rep_count += 1
                completed_min_angle = self.min_angle_this_rep
                feedback = "Good depth!" if self.min_angle_this_rep < self.good_depth_threshold else "Go lower next time"

            self.in_rep = False
            self.min_angle_this_rep = 999.0

        return feedback, completed_min_angle


def run_on_video(model, video_path, csv_writer):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Could not open video source: {video_path}")
        return

    counter = RepCounter(
        DOWN_STATE, UP_STATE, STABLE_FRAMES_REQUIRED,
        GOOD_DEPTH_THRESHOLD, MIN_VALID_DOWN_ANGLE
    )
    feedback_display = ""

    csv_writer.writerow([datetime.now().strftime("%H:%M:%S"), video_path, "", "", "session_start"])

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

            angles = extract_elbow_angles(results.pose_landmarks.landmark)

            if angles is not None:
                left_angle, right_angle = angles
                avg_angle = (left_angle + right_angle) / 2
                raw_prediction = model.predict([[left_angle, right_angle]])[0]

                rep_feedback, completed_min_angle = counter.update(raw_prediction, avg_angle)

                if rep_feedback is not None:
                    feedback_display = rep_feedback
                    csv_writer.writerow([
                        datetime.now().strftime("%H:%M:%S"),
                        video_path,
                        counter.rep_count,
                        f"{completed_min_angle:.1f}" if completed_min_angle is not None else "",
                        rep_feedback
                    ])

                cv2.putText(frame, f"Prediction: {counter.confirmed_state}",
                            (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        cv2.putText(frame, f"Reps: {counter.rep_count}",
                    (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 0), 2)

        if feedback_display:
            color = (0, 255, 0) if "Good" in feedback_display else (0, 0, 255)
            cv2.putText(frame, feedback_display,
                        (20, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

        cv2.imshow("Push-up Live Prediction", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    csv_writer.writerow([
        datetime.now().strftime("%H:%M:%S"), video_path, counter.rep_count, "", "session_end"
    ])
    print(f"Finished {video_path} - Final rep count: {counter.rep_count}")


def main():
    model_path = Path(MODEL_PATH)
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found at {model_path}. Train it first with train_pushup_model.py")

    model = joblib.load(model_path)

    with open(LOG_FILENAME, mode="w", newline="") as f:
        csv_writer = csv.writer(f)
        csv_writer.writerow(["time", "source", "rep_number", "min_angle", "note"])

        for video_path in VIDEO_FILES:
            run_on_video(model, video_path, csv_writer)

    cv2.destroyAllWindows()
    print(f"\nSession complete. Log file saved to: {LOG_FILENAME}")


if __name__ == "__main__":
    main()