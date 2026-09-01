"""
live_predict.py

Unified rep-counting driver for every exercise in exercises_config.py.
Run with:

    python live_predict.py squat
    python live_predict.py pushup
    python live_predict.py situp
    python live_predict.py pullup
    python live_predict.py jumpingjack
    python live_predict.py latpulldown

Optionally pass a video path as a second argument, e.g.:

    python live_predict.py pushup ../raw_videos/pushup.mp4

If no second argument is given, it uses the webcam (source 0).

This file replaces live_predict_pushup.py, live_predict_situp.py,
live_predict_pullup.py, live_predict_jumpingjack.py, and the old
squat-only live_predict.py. All exercise-specific numbers (thresholds,
landmarks, model paths) live in exercises_config.py - this script only
contains the shared logic.
"""

import sys
import csv
import os
from datetime import datetime

import cv2
import mediapipe as mp
import joblib

from exercises_config import EXERCISES
from pose_utils import extract_signals

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

pose = mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

DISPLAY_SIZE = (480, 854)
STABLE_FRAMES_REQUIRED = 4

# --------------------------------------------------------------------
# Things every exercise needs that exercises_config.py does not
# currently store. Kept here (not in the config) so this file is a
# self-contained drop-in - move these into exercises_config.py later
# if you want a single source of truth.
# --------------------------------------------------------------------

# Which transition completes a rep.
#   "up"   -> rep counts the moment confirmed_state enters up_states
#             (squat, pushup: you start up, go down, rep completes on return to up)
#   "down" -> rep counts the moment confirmed_state enters down_state
#             (situp, pullup, jumpingjack, latpulldown: you start down/in,
#              go up/out, rep completes on return to down/in)
COUNT_ON_STATE = {
    "squat": "up",
    "pushup": "up",
    "situp": "down",
    "pullup": "down",
    "jumpingjack": "down",
    "latpulldown": "down",
}

# Extra per-signal MINIMUM range checks beyond exercises_config's single
# "min_valid_range". Currently only jumpingjack needs this, because it
# has two independent signals (arm + leg) that must BOTH swing through
# a real range before a rep is trusted.
#   key: exercise name
#   value: dict of {signal_name: minimum_range_required}
EXTRA_RANGE_CHECKS = {
    "jumpingjack": {
        "left_arm": 90,
        "right_arm": 90,
    },
}

# Ceiling checks: a tracked signal must NEVER exceed this value during
# a rep, opposite of EXTRA_RANGE_CHECKS (which requires a minimum
# swing). Currently only lat pulldown's torso lean uses this - catches
# leaning back to cheat the pull. Deliberately does NOT invalidate the
# rep (a real pull did happen) - it attaches a warning via feedback
# instead, same spirit as squat's "Go lower next time".
#   key: exercise name
#   value: dict of {signal_name: {"ceiling": float, "message": str}}
FORM_WARNINGS = {
    "latpulldown": {
        "torso": {"ceiling": 18.0, "message": "Avoid leaning back"},
    },
}


class RepCounter:
    """
    Generic debounced state machine.

    - Debounces raw model predictions: a state only becomes "confirmed"
      after STABLE_FRAMES_REQUIRED consecutive identical predictions.
    - Tracks the min/max of every signal across the current rep attempt
      (including "extra_signals" from exercises_config.py, which are
      never fed to the classifier - see pose_utils.extract_signals).
    - Only counts a rep if the exercise's primary signal swings through
      at least min_valid_range, AND any EXTRA_RANGE_CHECKS also pass.
    - FORM_WARNINGS checks a tracked signal against a ceiling on rep
      completion and attaches a feedback message if exceeded - this
      does NOT block the rep from counting, unlike the range checks.
    - Direction (count on reaching "up" vs "down") comes from
      COUNT_ON_STATE, since squat/pushup and situp/pullup/jumpingjack/
      latpulldown complete a rep at opposite ends of their cycle.
    """

    def __init__(self, exercise_name, config):
        self.exercise_name = exercise_name
        self.config = config
        self.down_state = config["down_state"]
        self.up_states = config["up_states"]
        self.min_valid_range = config["min_valid_range"]
        self.good_depth_threshold = config.get("good_depth_threshold")
        self.count_on = COUNT_ON_STATE[exercise_name]
        self.extra_checks = EXTRA_RANGE_CHECKS.get(exercise_name, {})
        self.form_warnings = FORM_WARNINGS.get(exercise_name, {})

        # Use the first defined signal as the "primary" one for depth
        # feedback / min_valid_range (e.g. left_knee_angle for squat,
        # leg_spread for jumpingjack).
        self.primary_signal = next(iter(config["signals"].keys()))

        self.rep_count = 0
        self.in_cycle = False  # True once we've left the "count_on" state

        self.pending_state = None
        self.pending_count = 0
        self.confirmed_state = None

        self.min_seen = {}  # per-signal min value across this rep attempt
        self.max_seen = {}  # per-signal max value across this rep attempt

    def _reset_rep_tracking(self):
        self.min_seen = {}
        self.max_seen = {}

    def _update_ranges(self, signals):
        for name, value in signals.items():
            if name not in self.min_seen or value < self.min_seen[name]:
                self.min_seen[name] = value
            if name not in self.max_seen or value > self.max_seen[name]:
                self.max_seen[name] = value

    def _range_of(self, name):
        if name not in self.min_seen or name not in self.max_seen:
            return 0.0
        return self.max_seen[name] - self.min_seen[name]

    def _rep_is_valid(self):
        if self._range_of(self.primary_signal) < self.min_valid_range:
            return False
        for signal_name, required_range in self.extra_checks.items():
            if self._range_of(signal_name) < required_range:
                return False
        return True

    def _check_form_warnings(self):
        """
        Checks tracked signals (including extra_signals like lat
        pulldown's torso lean) against FORM_WARNINGS ceilings. Returns
        a warning message if any ceiling was exceeded during the rep,
        else None. Does NOT affect whether the rep counts.
        """
        for signal_name, check in self.form_warnings.items():
            value = self.max_seen.get(signal_name)
            if value is not None and value > check["ceiling"]:
                return check["message"]
        return None

    def update(self, raw_prediction, signals):
        """
        raw_prediction: the model's predicted label for this frame
        signals: dict {signal_name: angle_value} from pose_utils.extract_signals()

        Returns (rep_completed: bool, feedback: str or None)
        """
        if raw_prediction == self.pending_state:
            self.pending_count += 1
        else:
            self.pending_state = raw_prediction
            self.pending_count = 1

        if self.pending_count >= STABLE_FRAMES_REQUIRED:
            self.confirmed_state = self.pending_state

        rep_completed = False
        feedback = None

        is_up = self.confirmed_state in self.up_states
        is_down = self.confirmed_state == self.down_state

        # "Away" from the counting state = the cycle has started.
        if self.count_on == "up":
            if is_down:
                self.in_cycle = True
                self._update_ranges(signals)
            elif is_up and self.in_cycle:
                self._update_ranges(signals)
                if self._rep_is_valid():
                    self.rep_count += 1
                    rep_completed = True
                    if self.good_depth_threshold is not None:
                        min_primary = self.min_seen.get(self.primary_signal, 999)
                        feedback = "Good depth!" if min_primary < self.good_depth_threshold else "Go lower next time"
                    else:
                        feedback = self._check_form_warnings()
                self.in_cycle = False
                self._reset_rep_tracking()

        else:  # count_on == "down"
            if is_up:
                self.in_cycle = True
                self._update_ranges(signals)
            elif is_down and self.in_cycle:
                self._update_ranges(signals)
                if self._rep_is_valid():
                    self.rep_count += 1
                    rep_completed = True
                    feedback = self._check_form_warnings()
                self.in_cycle = False
                self._reset_rep_tracking()

        return rep_completed, feedback


def build_feature_vector(signals, config):
    """
    The trained models expect features in a fixed column order that
    matches how each training CSV was built. exercises_config.py's
    "signals" dict preserves insertion order (Python 3.7+), which
    matches the order features were engineered in for every exercise
    here. Only "signals" keys are used - "extra_signals" (e.g. lat
    pulldown's torso lean) are deliberately excluded, since the
    trained model was never fed them.
    """
    return [signals[name] for name in config["signals"].keys()]


def run_on_video(model, video_source, exercise_name, config, csv_writer):
    cap = cv2.VideoCapture(video_source)
    if not cap.isOpened():
        print(f"Could not open video source: {video_source}")
        return

    counter = RepCounter(exercise_name, config)
    feedback_display = ""

    csv_writer.writerow([datetime.now().strftime("%H:%M:%S"), video_source, "", "", "session_start"])

    while True:
        success, frame = cap.read()
        if not success:
            break

        if config["rotate_frame"] is not None:
            frame = cv2.rotate(frame, config["rotate_frame"])

        frame = cv2.resize(frame, DISPLAY_SIZE)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)

        if results.pose_landmarks:
            mp_drawing.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

            signals = extract_signals(results.pose_landmarks.landmark, config)

            if signals is not None:
                features = build_feature_vector(signals, config)
                raw_prediction = model.predict([features])[0]

                rep_completed, feedback = counter.update(raw_prediction, signals)

                if rep_completed:
                    feedback_display = feedback or "Rep counted"
                    csv_writer.writerow([
                        datetime.now().strftime("%H:%M:%S"),
                        video_source,
                        counter.rep_count,
                        feedback or "",
                        "rep_completed"
                    ])

                cv2.putText(frame, f"State: {counter.confirmed_state}",
                            (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        cv2.putText(frame, f"Reps: {counter.rep_count}",
                    (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 0), 2)

        if feedback_display:
            color = (0, 255, 0) if "Good" in feedback_display else (0, 0, 255)
            cv2.putText(frame, feedback_display,
                        (20, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

        cv2.imshow(f"{config['display_name']} - Live Prediction", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    csv_writer.writerow([
        datetime.now().strftime("%H:%M:%S"), video_source, counter.rep_count, "", "session_end"
    ])
    print(f"Finished {video_source} - Final rep count: {counter.rep_count}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python live_predict.py <exercise> [video_path]")
        print(f"Available exercises: {', '.join(EXERCISES.keys())}")
        sys.exit(1)

    exercise_name = sys.argv[1].lower()
    if exercise_name not in EXERCISES:
        print(f"Unknown exercise '{exercise_name}'.")
        print(f"Available exercises: {', '.join(EXERCISES.keys())}")
        sys.exit(1)

    config = EXERCISES[exercise_name]

    # Default to webcam (0) if no video path was given.
    video_source = sys.argv[2] if len(sys.argv) > 2 else 0

    model_path = config["model_path"]
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model not found at {model_path}. Train it first for '{exercise_name}'."
        )
    model = joblib.load(model_path)

    os.makedirs("../logs", exist_ok=True)
    log_filename = f"../logs/{exercise_name}_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    with open(log_filename, mode="w", newline="") as f:
        csv_writer = csv.writer(f)
        csv_writer.writerow(["time", "source", "rep_number", "feedback", "note"])
        run_on_video(model, video_source, exercise_name, config, csv_writer)

    cv2.destroyAllWindows()
    print(f"\nSession complete. Log file saved to: {log_filename}")


if __name__ == "__main__":
    main()