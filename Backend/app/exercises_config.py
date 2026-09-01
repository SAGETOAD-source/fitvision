"""
exercises_config.py

Single source of truth for every exercise's landmarks, thresholds,
and file paths. Adding a new exercise means adding one entry here -
no new script files needed.

NOTE (backend copy): model_path values below are relative paths
(e.g. "../models/rf_squat_model.pkl"), resolved relative to wherever
the process's working directory is when uvicorn starts - normally
the backend/ folder, mirroring the ../models/ layout used by
src/live_predict.py. If you containerize this (see Dockerfile), make
sure the models/ directory is copied into the image at that same
relative location, or override the paths via an environment-based
MODELS_DIR at startup - see app/services/model_registry.py.

This file also imports mediapipe + cv2 just to reference
PL.<LANDMARK> and cv2.ROTATE_* constants, even though the backend's
/predict endpoint never processes video - it only needs down_state,
up_states, min_valid_range, signals.keys(), model_path, and
good_depth_threshold. Kept as one shared file (rather than a slimmer
backend-only version) so there's a single source of truth; worth
trimming down once you're optimizing container image size.

NOTE (latpulldown's extra_signals): the backend doesn't compute
signals from video, it receives them as JSON from the client. The
"extra_signals" key below (torso lean) is not read by
prediction_service.py's feature-building step (which only reads
"signals"), but rep_counter.py's FORM_WARNINGS check does look for a
"torso" key in the incoming signals payload. For that check to fire
server-side, the future frontend needs to include "torso" alongside
the elbow angles when it POSTs to /predict for a latpulldown session.
"""

import mediapipe as mp
import cv2

mp_pose = mp.solutions.pose
PL = mp_pose.PoseLandmark


EXERCISES = {

    "squat": {
        "display_name": "Squat",
        "model_path": "../models/rf_squat_model.pkl",
        "training_data_path": "../data/landmarks_dataset.csv",

        # Each "signal" is one angle computed from three landmarks.
        # feature_name must match a column in the training CSV.
        "signals": {
            "left":  {"points": (PL.LEFT_HIP, PL.LEFT_KNEE, PL.LEFT_ANKLE),
                       "feature_name": "left_knee_angle"},
            "right": {"points": (PL.RIGHT_HIP, PL.RIGHT_KNEE, PL.RIGHT_ANKLE),
                       "feature_name": "right_knee_angle"},
        },

        "down_state": "squat_down",
        "up_states": {"squat_up", "standing"},   # any of these counts as "up"

        "min_valid_range": 40,       # angle must swing at least this much for a real rep
        "good_depth_threshold": 100, # optional: below this = "Good depth!"

        "visibility_threshold": 0.3,
        "rotate_frame": None,
    },

    "pushup": {
        "display_name": "Push-up",
        "model_path": "../models/rf_pushup_model.pkl",
        "training_data_path": "../data/pushup_training_dataset.csv",

        "signals": {
            "left":  {"points": (PL.LEFT_SHOULDER, PL.LEFT_ELBOW, PL.LEFT_WRIST),
                       "feature_name": "left_elbow_angle"},
            "right": {"points": (PL.RIGHT_SHOULDER, PL.RIGHT_ELBOW, PL.RIGHT_WRIST),
                       "feature_name": "right_elbow_angle"},
        },

        "down_state": "pushup_down",
        "up_states": {"pushup_up"},

        "min_valid_range": 40,
        "good_depth_threshold": 90,

        "visibility_threshold": 0.5,
        "rotate_frame": cv2.ROTATE_90_CLOCKWISE,
    },

    "situp": {
        "display_name": "Sit-up",
        "model_path": "../models/rf_situp_model.pkl",
        "training_data_path": "../data/situp_training_dataset.csv",

        "signals": {
            "left":  {"points": (PL.LEFT_SHOULDER, PL.LEFT_HIP, PL.LEFT_KNEE),
                       "feature_name": "left_torso_angle"},
            "right": {"points": (PL.RIGHT_SHOULDER, PL.RIGHT_HIP, PL.RIGHT_KNEE),
                       "feature_name": "right_torso_angle"},
        },

        "down_state": "situp_down",
        "up_states": {"situp_up"},

        "min_valid_range": 40,
        "good_depth_threshold": None,  # no depth feedback for this one

        "visibility_threshold": 0.5,
        "rotate_frame": None,
    },

    "pullup": {
        "display_name": "Pull-up",
        "model_path": "../models/rf_pullup_model.pkl",
        "training_data_path": "../data/pullup_training_dataset.csv",

        "signals": {
            "left":  {"points": (PL.LEFT_SHOULDER, PL.LEFT_ELBOW, PL.LEFT_WRIST),
                       "feature_name": "left_elbow_angle"},
            "right": {"points": (PL.RIGHT_SHOULDER, PL.RIGHT_ELBOW, PL.RIGHT_WRIST),
                       "feature_name": "right_elbow_angle"},
        },

        "down_state": "pullup_down",
        "up_states": {"pullup_up"},

        "min_valid_range": 40,
        "good_depth_threshold": None,

        "visibility_threshold": 0.5,
        "rotate_frame": None,
    },

    "jumpingjack": {
        "display_name": "Jumping Jack",
        "model_path": "../models/rf_jumpingjack_model.pkl",
        "training_data_path": "../data/jumpingjack_training_dataset.csv",

        # Jumping jack needs THREE signals, not two - arms (both sides)
        # plus one leg-spread signal using a computed hip midpoint.
        "signals": {
            "left_arm":  {"points": (PL.LEFT_ELBOW, PL.LEFT_SHOULDER, PL.LEFT_HIP),
                           "feature_name": "left_arm_angle"},
            "right_arm": {"points": (PL.RIGHT_ELBOW, PL.RIGHT_SHOULDER, PL.RIGHT_HIP),
                           "feature_name": "right_arm_angle"},
            "leg_spread": {"points": (PL.RIGHT_KNEE, "MID_HIP", PL.LEFT_KNEE),
                            "feature_name": "leg_spread_angle"},
        },

        "down_state": "jack_in",
        "up_states": {"jack_out"},

        "min_valid_range": 30,   # applied to the leg_spread signal
        "good_depth_threshold": None,

        "visibility_threshold": 0.5,
        "rotate_frame": None,
    },

    "latpulldown": {
        "display_name": "Lat Pulldown",
        "model_path": "../models/rf_latpulldown_model.pkl",
        "training_data_path": "../data/latpulldown_training_dataset.csv",

        # Naming mirrors pull-up: arms extended overhead = "down",
        # pulled down to chest = "up". Classifier trained on elbow
        # angles ONLY (left_elbow_angle, right_elbow_angle).
        "signals": {
            "left":  {"points": (PL.LEFT_SHOULDER, PL.LEFT_ELBOW, PL.LEFT_WRIST),
                       "feature_name": "left_elbow_angle"},
            "right": {"points": (PL.RIGHT_SHOULDER, PL.RIGHT_ELBOW, PL.RIGHT_WRIST),
                       "feature_name": "right_elbow_angle"},
        },

        # Torso lean - tracked by rep_counter.py's FORM_WARNINGS
        # ceiling check, NOT fed to the classifier. See the module
        # docstring above for the note on the frontend needing to
        # send "torso" in the /predict payload for this to fire here.
        "extra_signals": {
            "torso": {
                "points": (PL.LEFT_SHOULDER, PL.LEFT_HIP, PL.RIGHT_SHOULDER, PL.RIGHT_HIP),
                "type": "lean_avg",
            },
        },

        "down_state": "latpulldown_down",
        "up_states": {"latpulldown_up"},

        "min_valid_range": 60,
        "good_depth_threshold": None,

        "visibility_threshold": 0.5,
        "rotate_frame": None,
    },
}