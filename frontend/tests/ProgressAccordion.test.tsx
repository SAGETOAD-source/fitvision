import { describe, it, expect } from "vitest";
import { accordionReducer, initialAccordionState } from "../src/components/ui/ProgressAccordion";

describe("ProgressAccordion Reducer", () => {
  const config = {
    itemCount: 3,
    progressDuration: 6000,
    autoAdvance: true,
  };

  describe("SELECT action", () => {
    it("sets openIndex to selected index and resets progress", () => {
      const state = { ...initialAccordionState, openIndex: 0, progress: 50 };
      const result = accordionReducer(state, { type: "SELECT", index: 2 }, config);
      expect(result.openIndex).toBe(2);
      expect(result.progress).toBe(0);
      expect(result.paused).toBe(false);
    });

    it("wraps negative index to last item", () => {
      const state = initialAccordionState;
      const result = accordionReducer(state, { type: "SELECT", index: -1 }, config);
      expect(result.openIndex).toBe(2);
    });

    it("wraps index beyond count to first item", () => {
      const state = initialAccordionState;
      const result = accordionReducer(state, { type: "SELECT", index: 5 }, config);
      expect(result.openIndex).toBe(2); // 5 % 3 = 2
    });

    it("wraps index 3 (equals count) to first item", () => {
      const state = initialAccordionState;
      const result = accordionReducer(state, { type: "SELECT", index: 3 }, config);
      expect(result.openIndex).toBe(0); // 3 % 3 = 0
    });
  });

  describe("NEXT action", () => {
    it("advances to next item and resets progress", () => {
      const state = { ...initialAccordionState, openIndex: 0, progress: 100 };
      const result = accordionReducer(state, { type: "NEXT", count: 1 }, config);
      expect(result.openIndex).toBe(1);
      expect(result.progress).toBe(0);
      expect(result.paused).toBe(false);
    });

    it("wraps from last item to first", () => {
      const state = { ...initialAccordionState, openIndex: 2, progress: 100 };
      const result = accordionReducer(state, { type: "NEXT", count: 1 }, config);
      expect(result.openIndex).toBe(0);
      expect(result.progress).toBe(0);
    });

    it("handles negative count (previous)", () => {
      const state = { ...initialAccordionState, openIndex: 1, progress: 100 };
      const result = accordionReducer(state, { type: "NEXT", count: -1 }, config);
      expect(result.openIndex).toBe(0);
      expect(result.progress).toBe(0);
    });

    it("wraps negative from first to last", () => {
      const state = { ...initialAccordionState, openIndex: 0, progress: 100 };
      const result = accordionReducer(state, { type: "NEXT", count: -1 }, config);
      expect(result.openIndex).toBe(2);
    });

    it("handles multiple steps", () => {
      const state = { ...initialAccordionState, openIndex: 0, progress: 100 };
      const result = accordionReducer(state, { type: "NEXT", count: 2 }, config);
      expect(result.openIndex).toBe(2);
    });
  });

  describe("PAUSE/RESUME actions", () => {
    it("PAUSE sets paused to true", () => {
      const state = { ...initialAccordionState, paused: false };
      const result = accordionReducer(state, { type: "PAUSE" }, config);
      expect(result.paused).toBe(true);
    });

    it("RESUME sets paused to false", () => {
      const state = { ...initialAccordionState, paused: true };
      const result = accordionReducer(state, { type: "RESUME" }, config);
      expect(result.paused).toBe(false);
    });

    it("PAUSE preserves openIndex and progress", () => {
      const state = { ...initialAccordionState, openIndex: 1, progress: 50, paused: false };
      const result = accordionReducer(state, { type: "PAUSE" }, config);
      expect(result.openIndex).toBe(1);
      expect(result.progress).toBe(50);
      expect(result.paused).toBe(true);
    });
  });

  describe("TICK action", () => {
    it("increments progress based on delta", () => {
      const state = { ...initialAccordionState, progress: 0, paused: false };
      // 1000ms delta at 6000ms duration = 100/6000 * 1000 = 16.67% progress
      const result = accordionReducer(state, { type: "TICK", delta: 1000 }, config);
      expect(result.progress).toBeCloseTo(16.67, 1);
    });

    it("does not increment progress when paused", () => {
      const state = { ...initialAccordionState, progress: 50, paused: true };
      const result = accordionReducer(state, { type: "TICK", delta: 1000 }, config);
      expect(result.progress).toBe(50);
    });

    it("stops at 100% (does not exceed)", () => {
      const state = { ...initialAccordionState, progress: 90, paused: false };
      const result = accordionReducer(state, { type: "TICK", delta: 1000 }, config);
      expect(result.progress).toBeLessThanOrEqual(100);
    });

    it("reaches exactly 100% with exact delta", () => {
      const state = { ...initialAccordionState, progress: 0, paused: false };
      // 6000ms delta = full duration
      const result = accordionReducer(state, { type: "TICK", delta: 6000 }, config);
      expect(result.progress).toBe(100);
    });

    it("does not auto-advance in reducer (handled by effect)", () => {
      const state = { ...initialAccordionState, progress: 100, paused: false };
      const result = accordionReducer(state, { type: "TICK", delta: 1 }, config);
      // Reducer caps at 100, doesn't change openIndex
      expect(result.progress).toBe(100);
      expect(result.openIndex).toBe(0);
    });
  });

  describe("RESET action", () => {
    it("resets progress to 0", () => {
      const state = { ...initialAccordionState, progress: 75 };
      const result = accordionReducer(state, { type: "RESET" }, config);
      expect(result.progress).toBe(0);
      expect(result.openIndex).toBe(0);
      expect(result.paused).toBe(false);
    });
  });

  describe("initial state", () => {
    it("has correct initial values", () => {
      expect(initialAccordionState.openIndex).toBe(0);
      expect(initialAccordionState.paused).toBe(false);
      expect(initialAccordionState.progress).toBe(0);
    });
  });
});