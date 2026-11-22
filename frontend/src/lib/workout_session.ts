import { type BodyGoal, type FocusArea } from "@/lib/auth_contracts";
import {
  isValidExerciseKey,
  type ValidExerciseKey,
} from "@/lib/workout_reducer";

export type SessionMode = "free" | "routine";
export type SessionStatus = "active" | "summary";
export type SegmentSaveStatus = "idle" | "saving" | "saved" | "failed";

export interface RoutineQueueItem {
  exercise: ValidExerciseKey;
  targetSets: number;
  targetReps: number;
}

export interface WorkoutSegment {
  id: string;
  exercise: ValidExerciseKey;
  reps: number;
  startedAt: string;
  endedAt: string | null;
  saveStatus: SegmentSaveStatus;
  saveError: string | null;
  savedWorkoutId: number | null;
}

export interface WorkoutSessionState {
  mode: SessionMode;
  status: SessionStatus;
  routineQueue: RoutineQueueItem[];
  routineIndex: number;
  routineGoal: BodyGoal | null;
  routineFocus: FocusArea | null;
  activeExercise: ValidExerciseKey;
  activeSegmentId: string;
  segments: WorkoutSegment[];
  nextSegmentSeq: number;
}

export type WorkoutSessionAction =
  | {
      type: "SWITCH";
      exercise: ValidExerciseKey;
      finalReps?: number;
      now?: string;
    }
  | { type: "NEXT"; finalReps?: number; now?: string }
  | { type: "PREVIOUS"; finalReps?: number; now?: string }
  | { type: "SKIP"; finalReps?: number; now?: string }
  | { type: "REPS_UPDATE"; reps: number }
  | { type: "SAVE_START"; segmentId: string }
  | { type: "SAVE_OK"; segmentId: string; workoutId?: number }
  | { type: "SAVE_FAIL"; segmentId: string; error: string }
  | { type: "END"; finalReps?: number; now?: string };

export interface InitialWorkoutSessionOptions {
  mode?: SessionMode;
  initialExercise?: string;
  routineQueue?: RoutineQueueItem[];
  routineGoal?: BodyGoal | null;
  routineFocus?: FocusArea | null;
  now?: string;
}

function resolveTimestamp(now?: string): string {
  return now ?? new Date().toISOString();
}

function sanitizeReps(reps: number): number {
  if (!Number.isFinite(reps) || reps < 0) return 0;
  return Math.min(1000, Math.floor(reps));
}

function closeActiveSegment(
  segments: WorkoutSegment[],
  activeSegmentId: string,
  endedAt: string,
  finalReps?: number
): WorkoutSegment[] {
  return segments.map((seg) => {
    if (seg.id !== activeSegmentId) return seg;
    if (seg.endedAt !== null) return seg;
    return {
      ...seg,
      reps:
        finalReps !== undefined ? sanitizeReps(finalReps) : sanitizeReps(seg.reps),
      endedAt,
    };
  });
}

function makeSegment(
  seq: number,
  exercise: ValidExerciseKey,
  startedAt: string
): WorkoutSegment {
  return {
    id: `seg-${seq}`,
    exercise,
    reps: 0,
    startedAt,
    endedAt: null,
    saveStatus: "idle",
    saveError: null,
    savedWorkoutId: null,
  };
}

export function createInitialWorkoutSession(
  options: InitialWorkoutSessionOptions = {}
): WorkoutSessionState {
  const startedAt = resolveTimestamp(options.now);
  const queue = options.routineQueue ?? [];
  const mode: SessionMode =
    options.mode === "routine" && queue.length > 0 ? "routine" : "free";

  let initialIndex = 0;
  let activeExercise: ValidExerciseKey = "squat";

  if (mode === "routine") {
    if (
      options.initialExercise &&
      isValidExerciseKey(options.initialExercise)
    ) {
      const idx = queue.findIndex((q) => q.exercise === options.initialExercise);
      if (idx >= 0) {
        initialIndex = idx;
      }
    }
    activeExercise = queue[initialIndex].exercise;
  } else {
    activeExercise =
      options.initialExercise && isValidExerciseKey(options.initialExercise)
        ? options.initialExercise
        : "squat";
  }

  const firstSegment = makeSegment(1, activeExercise, startedAt);

  return {
    mode,
    status: "active",
    routineQueue: queue,
    routineIndex: initialIndex,
    routineGoal: options.routineGoal ?? null,
    routineFocus: options.routineFocus ?? null,
    activeExercise,
    activeSegmentId: firstSegment.id,
    segments: [firstSegment],
    nextSegmentSeq: 2,
  };
}

export function workoutSessionReducer(
  state: WorkoutSessionState,
  action: WorkoutSessionAction
): WorkoutSessionState {
  switch (action.type) {
    case "REPS_UPDATE": {
      if (state.status !== "active") return state;
      const reps = sanitizeReps(action.reps);
      let changed = false;
      const segments = state.segments.map((seg) => {
        if (seg.id !== state.activeSegmentId) return seg;
        if (seg.reps === reps) return seg;
        changed = true;
        return { ...seg, reps };
      });
      return changed ? { ...state, segments } : state;
    }

    case "SWITCH": {
      if (!isValidExerciseKey(action.exercise)) return state;
      // Ignore switching to the already active exercise while session is running
      if (state.status === "active" && action.exercise === state.activeExercise) {
        return state;
      }

      const ts = resolveTimestamp(action.now);
      const closedSegments =
        state.status === "active"
          ? closeActiveSegment(
              state.segments,
              state.activeSegmentId,
              ts,
              action.finalReps
            )
          : state.segments;

      const newSegment = makeSegment(state.nextSegmentSeq, action.exercise, ts);

      let nextRoutineIndex = state.routineIndex;
      if (state.mode === "routine") {
        const matchedIdx = state.routineQueue.findIndex(
          (item) => item.exercise === action.exercise
        );
        if (matchedIdx >= 0) {
          nextRoutineIndex = matchedIdx;
        }
      }

      return {
        ...state,
        status: "active",
        activeExercise: action.exercise,
        activeSegmentId: newSegment.id,
        routineIndex: nextRoutineIndex,
        segments: [...closedSegments, newSegment],
        nextSegmentSeq: state.nextSegmentSeq + 1,
      };
    }

    case "NEXT":
    case "SKIP": {
      if (state.status !== "active" || state.mode !== "routine") return state;
      const ts = resolveTimestamp(action.now);
      const closedSegments = closeActiveSegment(
        state.segments,
        state.activeSegmentId,
        ts,
        action.finalReps
      );

      // Last routine item -> finish session cleanly into summary
      if (state.routineIndex >= state.routineQueue.length - 1) {
        return {
          ...state,
          status: "summary",
          segments: closedSegments,
        };
      }

      const nextIndex = state.routineIndex + 1;
      const nextExercise = state.routineQueue[nextIndex].exercise;
      const newSegment = makeSegment(state.nextSegmentSeq, nextExercise, ts);

      return {
        ...state,
        routineIndex: nextIndex,
        activeExercise: nextExercise,
        activeSegmentId: newSegment.id,
        segments: [...closedSegments, newSegment],
        nextSegmentSeq: state.nextSegmentSeq + 1,
      };
    }

    case "PREVIOUS": {
      if (state.status !== "active" || state.mode !== "routine") return state;
      if (state.routineIndex <= 0) return state;

      const ts = resolveTimestamp(action.now);
      const closedSegments = closeActiveSegment(
        state.segments,
        state.activeSegmentId,
        ts,
        action.finalReps
      );

      const prevIndex = state.routineIndex - 1;
      const prevExercise = state.routineQueue[prevIndex].exercise;
      const newSegment = makeSegment(state.nextSegmentSeq, prevExercise, ts);

      return {
        ...state,
        routineIndex: prevIndex,
        activeExercise: prevExercise,
        activeSegmentId: newSegment.id,
        segments: [...closedSegments, newSegment],
        nextSegmentSeq: state.nextSegmentSeq + 1,
      };
    }

    case "SAVE_START": {
      let changed = false;
      const segments = state.segments.map((seg) => {
        if (seg.id !== action.segmentId) return seg;
        // Strict at-most-once guard: only closed segments with reps > 0 that are idle or failed
        if (
          seg.endedAt === null ||
          seg.reps <= 0 ||
          seg.saveStatus === "saving" ||
          seg.saveStatus === "saved"
        ) {
          return seg;
        }
        changed = true;
        return {
          ...seg,
          saveStatus: "saving" as const,
          saveError: null,
        };
      });
      return changed ? { ...state, segments } : state;
    }

    case "SAVE_OK": {
      let changed = false;
      const segments = state.segments.map((seg) => {
        if (seg.id !== action.segmentId) return seg;
        if (seg.saveStatus === "saved") return seg;
        changed = true;
        return {
          ...seg,
          saveStatus: "saved" as const,
          saveError: null,
          savedWorkoutId: action.workoutId ?? seg.savedWorkoutId,
        };
      });
      return changed ? { ...state, segments } : state;
    }

    case "SAVE_FAIL": {
      let changed = false;
      const segments = state.segments.map((seg) => {
        if (seg.id !== action.segmentId) return seg;
        if (seg.saveStatus === "saved") return seg;
        changed = true;
        return {
          ...seg,
          saveStatus: "failed" as const,
          saveError: action.error,
        };
      });
      return changed ? { ...state, segments } : state;
    }

    case "END": {
      if (state.status === "summary") return state;
      const ts = resolveTimestamp(action.now);
      const closedSegments = closeActiveSegment(
        state.segments,
        state.activeSegmentId,
        ts,
        action.finalReps
      );
      return {
        ...state,
        status: "summary",
        segments: closedSegments,
      };
    }

    default:
      return state;
  }
}

export function getActiveSegment(
  state: WorkoutSessionState
): WorkoutSegment | undefined {
  return state.segments.find((s) => s.id === state.activeSegmentId);
}

export function getPendingSegmentsToSave(
  state: WorkoutSessionState
): WorkoutSegment[] {
  return state.segments.filter(
    (s) => s.endedAt !== null && s.reps > 0 && s.saveStatus === "idle"
  );
}

export function getCurrentRoutineItem(
  state: WorkoutSessionState
): RoutineQueueItem | null {
  if (state.mode !== "routine") return null;
  return state.routineQueue[state.routineIndex] ?? null;
}

export function getCurrentSetNumber(state: WorkoutSessionState): number {
  const item = getCurrentRoutineItem(state);
  if (!item || item.targetReps <= 0) return 1;
  const activeSeg = getActiveSegment(state);
  const reps = activeSeg?.reps ?? 0;
  return Math.min(item.targetSets, Math.floor(reps / item.targetReps) + 1);
}

export function formatDurationSeconds(
  startedAt: string,
  endedAt: string | null
): string {
  const startMs = Date.parse(startedAt);
  const endMs = endedAt ? Date.parse(endedAt) : Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return "0:00";
  }
  const totalSec = Math.max(0, Math.round((endMs - startMs) / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
