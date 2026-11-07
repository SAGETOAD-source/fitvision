/**
 * rep_counter.ts
 *
 * Direct TypeScript port of Backend/app/services/rep_counter.py.
 * Debounced state machine that tracks reps, confirms states,
 * and validates ranges and form warnings.
 */

import { ExerciseConfig } from "./types";

export const STABLE_FRAMES_REQUIRED = 4;

export interface RepCounterUpdateResult {
  repCompleted: boolean;
  feedback: string | null;
  confirmedState: string | null;
  repCount: number;
}

export class RepCounter {
  readonly exerciseName: string;
  readonly downState: string;
  readonly upStates: Set<string>;
  readonly minValidRange: number;
  readonly goodDepthThreshold: number | null;
  readonly countOn: "up" | "down";
  readonly extraChecks: Record<string, number>;
  readonly formWarnings: Record<string, { ceiling: number; message: string }>;
  readonly primarySignal: string;

  repCount: number = 0;
  inCycle: boolean = false;

  pendingState: string | null = null;
  pendingCount: number = 0;
  confirmedState: string | null = null;

  minSeen: Record<string, number> = {};
  maxSeen: Record<string, number> = {};

  constructor(exerciseName: string, config: ExerciseConfig | any) {
    this.exerciseName = exerciseName;
    this.downState = config.down_state;
    this.upStates = new Set<string>(
      Array.isArray(config.up_states) ? config.up_states : Array.from(config.up_states || [])
    );
    this.minValidRange = config.min_valid_range;
    this.goodDepthThreshold =
      config.good_depth_threshold !== undefined ? config.good_depth_threshold : null;
    this.countOn = config.count_on;
    this.extraChecks = config.extra_range_checks || {};
    this.formWarnings = config.form_warnings || {};
    this.primarySignal = config.primary_signal;
  }

  reset(): void {
    this.repCount = 0;
    this.inCycle = false;
    this.pendingState = null;
    this.pendingCount = 0;
    this.confirmedState = null;
    this._resetRepTracking();
  }

  private _resetRepTracking(): void {
    this.minSeen = {};
    this.maxSeen = {};
  }

  private _updateRanges(signals: Record<string, number>): void {
    for (const [name, value] of Object.entries(signals)) {
      if (this.minSeen[name] === undefined || value < this.minSeen[name]) {
        this.minSeen[name] = value;
      }
      if (this.maxSeen[name] === undefined || value > this.maxSeen[name]) {
        this.maxSeen[name] = value;
      }
    }
  }

  private _rangeOf(name: string): number {
    if (this.minSeen[name] === undefined || this.maxSeen[name] === undefined) {
      return 0.0;
    }
    return this.maxSeen[name] - this.minSeen[name];
  }

  private _repIsValid(): boolean {
    if (this._rangeOf(this.primarySignal) < this.minValidRange) {
      return false;
    }
    for (const [signalName, requiredRange] of Object.entries(this.extraChecks)) {
      if (this._rangeOf(signalName) < requiredRange) {
        return false;
      }
    }
    return true;
  }

  private _checkFormWarnings(): string | null {
    for (const [signalName, check] of Object.entries(this.formWarnings)) {
      const value = this.maxSeen[signalName];
      if (value !== undefined && value > check.ceiling) {
        return check.message;
      }
    }
    return null;
  }

  update(rawPrediction: string, signals: Record<string, number>): RepCounterUpdateResult {
    if (rawPrediction === this.pendingState) {
      this.pendingCount += 1;
    } else {
      this.pendingState = rawPrediction;
      this.pendingCount = 1;
    }

    if (this.pendingCount >= STABLE_FRAMES_REQUIRED) {
      this.confirmedState = this.pendingState;
    }

    let repCompleted = false;
    let feedback: string | null = null;

    const isUp = this.confirmedState !== null && this.upStates.has(this.confirmedState);
    const isDown = this.confirmedState === this.downState;

    if (this.countOn === "up") {
      if (isDown) {
        this.inCycle = true;
        this._updateRanges(signals);
      } else if (isUp && this.inCycle) {
        this._updateRanges(signals);
        if (this._repIsValid()) {
          this.repCount += 1;
          repCompleted = true;
          if (this.goodDepthThreshold !== null) {
            const minPrimary = this.minSeen[this.primarySignal] ?? 999;
            feedback =
              minPrimary < this.goodDepthThreshold ? "Good depth!" : "Go lower next time";
          } else {
            feedback = this._checkFormWarnings();
          }
        }
        this.inCycle = false;
        this._resetRepTracking();
      }
    } else {
      // countOn === "down"
      if (isUp) {
        this.inCycle = true;
        this._updateRanges(signals);
      } else if (isDown && this.inCycle) {
        this._updateRanges(signals);
        if (this._repIsValid()) {
          this.repCount += 1;
          repCompleted = true;
          feedback = this._checkFormWarnings();
        }
        this.inCycle = false;
        this._resetRepTracking();
      }
    }

    return {
      repCompleted,
      feedback,
      confirmedState: this.confirmedState,
      repCount: this.repCount,
    };
  }
}

