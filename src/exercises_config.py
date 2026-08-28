"""
exercises_config.py

Single source of truth for every exercise's landmarks, thresholds,
and file paths. Adding a new exercise means adding one entry here -
no new script files needed.
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
}