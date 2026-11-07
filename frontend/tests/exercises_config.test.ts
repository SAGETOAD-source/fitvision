/**
 * exercises_config.test.ts
 *
 * Verifies that the real /v1/exercises response snapshot matches the
 * TypeScript ExerciseConfig interface, containing all 6 exercises and
 * all required signal/threshold contracts.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ExercisesApiResponse, ExerciseConfig } from "../src/lib/types";

describe("/v1/exercises API Response Snapshot Contract", () => {
  const snapshotPath = path.resolve(
    __dirname,
    "./fixtures/exercises_snapshot.json"
  );
  const data: ExercisesApiResponse = JSON.parse(
    fs.readFileSync(snapshotPath, "utf-8")
  );

  const EXPECTED_EXERCISES = [
    "squat",
    "pushup",
    "situp",
    "pullup",
    "jumpingjack",
    "latpulldown",
  ];

  it("contains all 6 configured exercises", () => {
    expect(data.exercises).toBeDefined();
    for (const name of EXPECTED_EXERCISES) {
      expect(data.exercises[name]).toBeDefined();
    }
  });

  for (const name of EXPECTED_EXERCISES) {
    it(`exercise '${name}' adheres to ExerciseConfig contract`, () => {
      const cfg: ExerciseConfig = data.exercises[name];
      expect(cfg.display_name).toBeTruthy();
      expect(Object.keys(cfg.signals).length).toBeGreaterThan(0);
      expect(cfg.down_state).toBeTruthy();
      expect(cfg.up_states.length).toBeGreaterThan(0);
      expect(["up", "down"]).toContain(cfg.count_on);
      expect(cfg.primary_signal).toBeTruthy();
      expect(cfg.signals[cfg.primary_signal]).toBeDefined();
      expect(typeof cfg.min_valid_range).toBe("number");
      expect(cfg.min_valid_range).toBeGreaterThan(0);
      expect(typeof cfg.visibility_threshold).toBe("number");

      for (const [sigName, sig] of Object.entries(cfg.signals)) {
        expect(Array.isArray(sig.points)).toBe(true);
        expect(sig.points.length).toBeGreaterThanOrEqual(2);
        expect(sig.feature_name).toBeTruthy();
      }
    });
  }

  it("latpulldown exposes torso in extra_signals for leaning back check", () => {
    const latCfg = data.exercises["latpulldown"];
    expect(latCfg.extra_signals).toBeDefined();
    expect(latCfg.extra_signals!["torso"]).toBeDefined();
    expect(latCfg.form_warnings).toBeDefined();
    expect(latCfg.form_warnings!["torso"]).toBeDefined();
    expect(latCfg.form_warnings!["torso"].ceiling).toBe(18.0);
  });
});

