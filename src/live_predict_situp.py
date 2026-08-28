"""
live_predict_situp.py

Live sit-up detection: rep counting using the torso-angle model
trained on Kaggle's sit-up data (shoulder-hip-knee angle).
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
MODEL_PATH = "../models/rf_situp_model.pkl"
VIDEO_FILES = [
    "../raw_videos/situp.mp4",
]
DISPLAY_SIZE = (480, 854)
VISIBILITY_THRESHOLD = 0.5
STABLE_FRAMES_REQUIRED = 4

DOWN_STATE = "situp_down"  # lying flat
UP_STATE = "situp_up"      # sat up

MIN_VALID_UP_RANGE = 40  # torso angle must swing at least this much to count as a real rep

ROTATE_FRAME = None  # set if the video needs it

LOG_DIR = Path("../logs")
LOG_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILENAME = LOG_DIR / f"situp_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"


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


def extract_torso_angles(landmarks):
    joint_ids = [
        mp_pose.PoseLandmark.LEFT_SHOULDER, mp_pose.PoseLandmark.LEFT_HIP, mp_pose.PoseLandmark.LEFT_KNEE,
        mp_pose.PoseLandmark.RIGHT_SHOULDER, mp_pose.PoseLandmark.RIGHT_HIP, mp_pose.PoseLandmark.RIGHT_KNEE,
    ]
    points = {}
    for joint_id in joint_ids:
        point, visibility = get_point(landmarks, joint_id)
        if visibility < VISIBILITY_THRESHOLD:
            return None
        points[joint_id] = point

    left_angle = calculate_angle(
        points[mp_pose.PoseLandmark.LEFT_SHOULDER],
        points[mp_pose.PoseLandmark.LEFT_HIP],
        points[mp_pose.PoseLandmark.LEFT_KNEE],
    )
    right_angle = calculate_angle(
        points[mp_pose.PoseLandmark.RIGHT_SHOULDER],
        points[mp_pose.PoseLandmark.RIGHT_HIP],
        points[mp_pose.PoseLandmark.RIGHT_KNEE],
    )
    return left_angle, right_angle


class RepCounter:
    def __init__(self, down_state, up_state, stable_frames_required, min_valid_range):
        self.down_state = down_state
        self.up_state = up_state
        self.stable_frames_required = stable_frames_required
        self.min_valid_range = min_valid_range

        self.rep_count = 0
        self.in_up_phase = False
        self.max_angle_seen = -999.0   # tracks "down" extreme (lying flat, high angle)
        self.min_angle_this_rep = 999.0  # tracks "up" extreme (sat up, low angle)

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

        rep_completed = False

        if self.confirmed_state == self.down_state:
            self.max_angle_seen = max(self.max_angle_seen, avg_angle)

        elif self.confirmed_state == self.up_state:
            self.in_up_phase = True
            self.min_angle_this_rep = min(self.min_angle_this_rep, avg_angle)

        # Detect completion: was up, now back down, with a real range covered
        if self.confirmed_state == self.down_state and self.in_up_phase:
            angle_range = self.max_angle_seen - self.min_angle_this_rep
            if angle_range >= self.min_valid_range:
                self.rep_count += 1
                rep_completed = True

            self.in_up_phase = False
            self.min_angle_this_rep = 999.0

        return rep_completed


def run_on_video(model, video_path, csv_writer):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Could not open video source: {video_path}")
        return

    counter = RepCounter(DOWN_STATE, UP_STATE, STABLE_FRAMES_REQUIRED, MIN_VALID_UP_RANGE)

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

            angles = extract_torso_angles(results.pose_landmarks.landmark)

            if angles is not None:
                left_angle, right_angle = angles
                avg_angle = (left_angle + right_angle) / 2
                raw_prediction = model.predict([[left_angle, right_angle]])[0]

                rep_completed = counter.update(raw_prediction, avg_angle)

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

        cv2.imshow("Sit-up Live Prediction", frame)
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
        raise FileNotFoundError(f"Model not found at {model_path}. Train it first with train_situp_model.py")

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