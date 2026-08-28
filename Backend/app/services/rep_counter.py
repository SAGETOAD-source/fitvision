"""
rep_counter.py

The debounced state machine that turns a sequence of raw model
predictions into a validated rep count. This is a direct port of the
RepCounter class from src/live_predict.py - same debounce window,
same direction-of-count logic, same range-validity checks. Behavior
must stay identical to the local CLI version; if you change
thresholds here, change them there too (or better: finish the
TODO in exercises_config.py to move COUNT_ON_STATE and
EXTRA_RANGE_CHECKS into that single config file so there's only one
place to edit).
"""

from typing import Dict, Optional, Tuple

STABLE_FRAMES_REQUIRED = 4

# Which transition completes a rep - see src/live_predict.py for the
# full explanation of why squat/pushup and situp/pullup/jumpingjack
# differ here.
COUNT_ON_STATE = {
    "squat": "up",
    "pushup": "up",
    "situp": "down",
    "pullup": "down",
    "jumpingjack": "down",
}

# Extra per-signal range checks beyond exercises_config's single
# min_valid_range. Only jumpingjack needs this today (arm range,
# on top of the configured leg-spread range check).
EXTRA_RANGE_CHECKS = {
    "jumpingjack": {
        "left_arm": 90,
        "right_arm": 90,
    },
}

# Which signal min_valid_range applies to. Defaults to the first key
# in config["signals"] (matches every exercise except jumpingjack).
# jumpingjack's config comment says min_valid_range=30 is meant for
# leg_spread specifically - but leg_spread is the THIRD key in that
# exercise's signals dict, not the first, so the default "first key"
# rule silently applied the 30-degree check to left_arm instead and
# left leg_spread with no range check at all. Caught by
# tests/test_rep_counter.py - a jumping jack with full arm swing but
# barely-moving legs would have still counted as a valid rep.
PRIMARY_SIGNAL_OVERRIDE = {
    "jumpingjack": "leg_spread",
}


class RepCounter:
    """One instance per active session - never shared across sessions."""

    def __init__(self, exercise_name: str, config: dict):
        self.exercise_name = exercise_name
        self.down_state = config["down_state"]
        self.up_states = config["up_states"]
        self.min_valid_range = config["min_valid_range"]
        self.good_depth_threshold = config.get("good_depth_threshold")
        self.count_on = COUNT_ON_STATE[exercise_name]
        self.extra_checks = EXTRA_RANGE_CHECKS.get(exercise_name, {})
        self.primary_signal = PRIMARY_SIGNAL_OVERRIDE.get(
            exercise_name, next(iter(config["signals"].keys()))
        )

        self.rep_count = 0
        self.in_cycle = False

        self.pending_state: Optional[str] = None
        self.pending_count = 0
        self.confirmed_state: Optional[str] = None

        self.min_seen: Dict[str, float] = {}
        self.max_seen: Dict[str, float] = {}

    def _reset_rep_tracking(self) -> None:
        self.min_seen = {}
        self.max_seen = {}

    def _update_ranges(self, signals: Dict[str, float]) -> None:
        for name, value in signals.items():
            if name not in self.min_seen or value < self.min_seen[name]:
                self.min_seen[name] = value
            if name not in self.max_seen or value > self.max_seen[name]:
                self.max_seen[name] = value

    def _range_of(self, name: str) -> float:
        if name not in self.min_seen or name not in self.max_seen:
            return 0.0
        return self.max_seen[name] - self.min_seen[name]

    def _rep_is_valid(self) -> bool:
        if self._range_of(self.primary_signal) < self.min_valid_range:
            return False
        for signal_name, required_range in self.extra_checks.items():
            if self._range_of(signal_name) < required_range:
                return False
        return True

    def update(self, raw_prediction: str, signals: Dict[str, float]) -> Tuple[bool, Optional[str]]:
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
                self.in_cycle = False
                self._reset_rep_tracking()

        return rep_completed, feedback
