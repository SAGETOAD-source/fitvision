"""
rep_counter.py

The debounced state machine that turns a sequence of raw model
predictions into a validated rep count. This is a direct port of the
RepCounter class from src/live_predict.py - same debounce window,
same direction-of-count logic, same range-validity checks, same
form-warning ceiling checks. Behavior must stay identical to the
local CLI version; if you change thresholds here, change them there
too (or better: finish the TODO in exercises_config.py to move
COUNT_ON_STATE, EXTRA_RANGE_CHECKS, and FORM_WARNINGS into that
single config file so there's only one place to edit).
"""

from typing import Dict, Optional, Tuple

STABLE_FRAMES_REQUIRED = 4




class RepCounter:
    """One instance per active session - never shared across sessions."""

    def __init__(self, exercise_name: str, config: dict):
        self.exercise_name = exercise_name
        self.down_state = config["down_state"]
        self.up_states = config["up_states"]
        self.min_valid_range = config["min_valid_range"]
        self.good_depth_threshold = config.get("good_depth_threshold")
        self.count_on = config["count_on"]
        self.extra_checks = config.get("extra_range_checks", {})
        self.form_warnings = config.get("form_warnings", {})
        self.primary_signal = config["primary_signal"]

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

    def _check_form_warnings(self) -> Optional[str]:
        """
        Checks tracked signals against FORM_WARNINGS ceilings. Returns
        a warning message if any ceiling was exceeded during the rep,
        else None. Does NOT affect whether the rep counts.
        """
        for signal_name, check in self.form_warnings.items():
            value = self.max_seen.get(signal_name)
            if value is not None and value > check["ceiling"]:
                return check["message"]
        return None

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