/**
 * rep_counter.test.ts
 *
 * Direct port of Backend/tests/test_rep_counter.py to TypeScript.
 * Tests debounced state transitions, count directions, noise rejection,
 * multi-signal range checks, and depth feedback.
 */

import { describe, it, expect } from "vitest";
import { RepCounter } from "../src/lib/rep_counter";

const SQUAT_CONFIG = {
  down_state: "squat_down",
  up_states: ["squat_up", "standing"],
  min_valid_range: 40,
  good_depth_threshold: 100,
  signals: { left_knee_angle: {}, right_knee_angle: {} },
  count_on: "up" as const,
  primary_signal: "left_knee_angle",
};

const SITUP_CONFIG = {
  down_state: "situp_down",
  up_states: ["situp_up"],
  min_valid_range: 40,
  good_depth_threshold: null,
  signals: { left_torso_angle: {}, right_torso_angle: {} },
  count_on: "down" as const,
  primary_signal: "left_torso_angle",
};

const JUMPINGJACK_CONFIG = {
  down_state: "jack_in",
  up_states: ["jack_out"],
  min_valid_range: 30,
  good_depth_threshold: null,
  signals: { left_arm: {}, right_arm: {}, leg_spread: {} },
  count_on: "down" as const,
  primary_signal: "leg_spread",
  extra_range_checks: {
    left_arm: 90,
    right_arm: 90,
  },
};

function feed(
  counter: RepCounter,
  state: string,
  signals: Record<string, number>,
  times: number = 4
) {
  let result: any = null;
  for (let i = 0; i < times; i++) {
    result = counter.update(state, signals);
  }
  return result;
}

describe("RepCounter TypeScript Port", () => {
  it("squat counts on reaching up, not down", () => {
    const counter = new RepCounter("squat", SQUAT_CONFIG);

    feed(counter, "squat_down", { left_knee_angle: 80, right_knee_angle: 80 });
    expect(counter.repCount).toBe(0); // reaching down alone must not count

    const result = feed(counter, "squat_up", {
      left_knee_angle: 170,
      right_knee_angle: 170,
    });
    expect(counter.repCount).toBe(1);
    expect(result.repCompleted).toBe(true);
  });

  it("situp counts on reaching down, not up", () => {
    const counter = new RepCounter("situp", SITUP_CONFIG);

    feed(counter, "situp_up", { left_torso_angle: 60, right_torso_angle: 60 });
    expect(counter.repCount).toBe(0); // reaching up alone must not count

    const result = feed(counter, "situp_down", {
      left_torso_angle: 170,
      right_torso_angle: 170,
    });
    expect(counter.repCount).toBe(1);
    expect(result.repCompleted).toBe(true);
  });

  it("rep rejected if range too small (noise rejection)", () => {
    const counter = new RepCounter("squat", SQUAT_CONFIG);

    feed(counter, "squat_down", { left_knee_angle: 150, right_knee_angle: 150 });
    // Only 10 degrees swing, below min_valid_range 40
    const result = feed(counter, "squat_up", {
      left_knee_angle: 160,
      right_knee_angle: 160,
    });

    expect(result.repCompleted).toBe(false);
    expect(counter.repCount).toBe(0);
  });

  it("jumping jack requires both arm and leg range", () => {
    const counter = new RepCounter("jumpingjack", JUMPINGJACK_CONFIG);

    feed(counter, "jack_in", { left_arm: 10, right_arm: 10, leg_spread: 10 });
    feed(counter, "jack_out", { left_arm: 110, right_arm: 110, leg_spread: 40 });
    // Return to in: arm swings 100 (>= 90), leg only swings 5 (< 30) -> fail
    const result = feed(counter, "jack_in", {
      left_arm: 10,
      right_arm: 10,
      leg_spread: 35,
    });

    expect(result.repCompleted).toBe(false);
    expect(counter.repCount).toBe(0);
  });

  it("jumping jack counts when both signals swing enough", () => {
    const counter = new RepCounter("jumpingjack", JUMPINGJACK_CONFIG);

    feed(counter, "jack_in", { left_arm: 10, right_arm: 10, leg_spread: 10 });
    feed(counter, "jack_out", { left_arm: 110, right_arm: 110, leg_spread: 60 });
    const result = feed(counter, "jack_in", {
      left_arm: 10,
      right_arm: 10,
      leg_spread: 10,
    });

    expect(result.repCompleted).toBe(true);
    expect(counter.repCount).toBe(1);
  });

  it("gives 'Good depth!' feedback for deep squat", () => {
    const counter = new RepCounter("squat", SQUAT_CONFIG);

    feed(counter, "squat_down", { left_knee_angle: 80, right_knee_angle: 80 });
    const result = feed(counter, "squat_up", {
      left_knee_angle: 170,
      right_knee_angle: 170,
    });

    expect(result.repCompleted).toBe(true);
    expect(result.feedback).toBe("Good depth!");
  });

  it("gives 'Go lower next time' feedback for shallow squat", () => {
    const counter = new RepCounter("squat", SQUAT_CONFIG);

    feed(counter, "squat_down", { left_knee_angle: 120, right_knee_angle: 120 });
    const result = feed(counter, "squat_up", {
      left_knee_angle: 170,
      right_knee_angle: 170,
    });

    expect(result.repCompleted).toBe(true);
    expect(result.feedback).toBe("Go lower next time");
  });

  it("debounce ignores single frame flicker", () => {
    const counter = new RepCounter("squat", SQUAT_CONFIG);

    feed(counter, "squat_down", { left_knee_angle: 80, right_knee_angle: 80 });
    expect(counter.confirmedState).toBe("squat_down");

    // 1 frame flicker
    counter.update("squat_up", { left_knee_angle: 170, right_knee_angle: 170 });
    expect(counter.confirmedState).toBe("squat_down"); // unchanged
    expect(counter.repCount).toBe(0);
  });
});

