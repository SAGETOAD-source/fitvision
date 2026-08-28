"""
test_rep_counter.py

Direct tests of the RepCounter state machine, bypassing HTTP entirely.
This is where the real risk lives - the flipped counting direction
between squat/pushup (count on reaching "up") and situp/pullup/
jumpingjack (count on reaching "down"), plus the noise-rejection
range checks. A regression here is a silently wrong rep count in
production, not a crash - so it needs direct test coverage, not just
"the endpoint returns 200."
"""

from app.services.rep_counter import RepCounter

SQUAT_CONFIG = {
    "down_state": "squat_down",
    "up_states": {"squat_up", "standing"},
    "min_valid_range": 40,
    "good_depth_threshold": 100,
    "signals": {"left_knee_angle": None, "right_knee_angle": None},
}

SITUP_CONFIG = {
    "down_state": "situp_down",
    "up_states": {"situp_up"},
    "min_valid_range": 40,
    "good_depth_threshold": None,
    "signals": {"left_torso_angle": None, "right_torso_angle": None},
}

JUMPINGJACK_CONFIG = {
    "down_state": "jack_in",
    "up_states": {"jack_out"},
    "min_valid_range": 30,
    "good_depth_threshold": None,
    "signals": {"left_arm": None, "right_arm": None, "leg_spread": None},
}


def _feed(counter, state, signals, times=4):
    """Feed the same (state, signals) repeatedly to clear the debounce window."""
    result = None
    for _ in range(times):
        result = counter.update(state, signals)
    return result


def test_squat_counts_on_reaching_up_not_down():
    counter = RepCounter("squat", SQUAT_CONFIG)

    _feed(counter, "squat_down", {"left_knee_angle": 80, "right_knee_angle": 80})
    assert counter.rep_count == 0  # reaching "down" alone must not count a rep

    rep_completed, _ = _feed(counter, "squat_up", {"left_knee_angle": 170, "right_knee_angle": 170})
    assert counter.rep_count == 1
    assert rep_completed is True


def test_situp_counts_on_reaching_down_not_up():
    """The opposite direction from squat - this is the logic that's easy to get backwards."""
    counter = RepCounter("situp", SITUP_CONFIG)

    _feed(counter, "situp_up", {"left_torso_angle": 60, "right_torso_angle": 60})
    assert counter.rep_count == 0  # reaching "up" alone must not count a rep

    rep_completed, _ = _feed(counter, "situp_down", {"left_torso_angle": 170, "right_torso_angle": 170})
    assert counter.rep_count == 1
    assert rep_completed is True


def test_rep_rejected_if_range_too_small_noise():
    """A brief flicker near the boundary, without a real range swing, must not count."""
    counter = RepCounter("squat", SQUAT_CONFIG)

    _feed(counter, "squat_down", {"left_knee_angle": 150, "right_knee_angle": 150})
    # Only a 10-degree swing - below min_valid_range of 40. Should NOT count.
    rep_completed, _ = _feed(counter, "squat_up", {"left_knee_angle": 160, "right_knee_angle": 160})

    assert rep_completed is False
    assert counter.rep_count == 0


def test_jumpingjack_requires_both_arm_and_leg_range():
    """Arms swing enough but legs barely move across the full in->out->in cycle - must NOT count."""
    counter = RepCounter("jumpingjack", JUMPINGJACK_CONFIG)

    _feed(counter, "jack_in", {"left_arm": 10, "right_arm": 10, "leg_spread": 10})   # rest, no-op
    _feed(counter, "jack_out", {"left_arm": 110, "right_arm": 110, "leg_spread": 40})  # cycle starts
    # Return to "in": arm swings 100 (>= 90, passes); leg only swings 5 (< 30, fails).
    rep_completed, _ = _feed(counter, "jack_in", {"left_arm": 10, "right_arm": 10, "leg_spread": 35})

    assert rep_completed is False
    assert counter.rep_count == 0


def test_jumpingjack_counts_when_both_signals_swing_enough():
    counter = RepCounter("jumpingjack", JUMPINGJACK_CONFIG)

    _feed(counter, "jack_in", {"left_arm": 10, "right_arm": 10, "leg_spread": 10})    # rest, no-op
    _feed(counter, "jack_out", {"left_arm": 110, "right_arm": 110, "leg_spread": 60})  # cycle starts
    # Return to "in": arm swings 100, leg swings 50 - both pass their thresholds.
    rep_completed, _ = _feed(counter, "jack_in", {"left_arm": 10, "right_arm": 10, "leg_spread": 10})

    assert rep_completed is True
    assert counter.rep_count == 1


def test_good_depth_feedback():
    counter = RepCounter("squat", SQUAT_CONFIG)

    _feed(counter, "squat_down", {"left_knee_angle": 80, "right_knee_angle": 80})  # below threshold of 100
    rep_completed, feedback = _feed(counter, "squat_up", {"left_knee_angle": 170, "right_knee_angle": 170})

    assert rep_completed is True
    assert feedback == "Good depth!"


def test_shallow_squat_gets_go_lower_feedback():
    counter = RepCounter("squat", SQUAT_CONFIG)

    _feed(counter, "squat_down", {"left_knee_angle": 120, "right_knee_angle": 120})  # above threshold of 100
    rep_completed, feedback = _feed(counter, "squat_up", {"left_knee_angle": 170, "right_knee_angle": 170})

    assert rep_completed is True
    assert feedback == "Go lower next time"


def test_debounce_ignores_brief_flicker():
    """A single-frame flicker to a different state should not change confirmed_state."""
    counter = RepCounter("squat", SQUAT_CONFIG)

    _feed(counter, "squat_down", {"left_knee_angle": 80, "right_knee_angle": 80})
    assert counter.confirmed_state == "squat_down"

    # One single flickered frame of "squat_up" - not enough to confirm (needs 4 consecutive).
    counter.update("squat_up", {"left_knee_angle": 170, "right_knee_angle": 170})
    assert counter.confirmed_state == "squat_down"  # unchanged
    assert counter.rep_count == 0
