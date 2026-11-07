/**
 * classifier.test.ts
 *
 * Golden parity test: loads the 6 exported JSON models and runs predictions
 * on 250 test vectors per exercise against ground-truth predictions produced
 * by scikit-learn in Python.
 * Contract: 100% match on all classes.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { predict } from "../src/lib/classifier";
import { ModelData } from "../src/lib/types";

const EXERCISES = [
  "squat",
  "pushup",
  "situp",
  "pullup",
  "jumpingjack",
  "latpulldown",
];

describe("Random Forest Golden Parity Test (TS vs Python scikit-learn)", () => {
  const goldenPath = path.resolve(__dirname, "../../models_json/golden_test.json");
  const goldenData: Record<
    string,
    Array<{ features: number[]; prediction: string }>
  > = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));

  for (const exercise of EXERCISES) {
    it(`predicts 100% identical labels to Python for ${exercise}`, () => {
      const modelPath = path.resolve(
        __dirname,
        `../../models_json/${exercise}.json`
      );
      const model: ModelData = JSON.parse(fs.readFileSync(modelPath, "utf-8"));
      const samples = goldenData[exercise];

      expect(samples).toBeDefined();
      expect(samples.length).toBeGreaterThanOrEqual(200);

      let mismatches = 0;
      for (let i = 0; i < samples.length; i++) {
        const sample = samples[i];
        const tsPred = predict(model, sample.features);
        if (tsPred !== sample.prediction) {
          mismatches++;
        }
      }

      expect(mismatches).toBe(0);
    });
  }
});

