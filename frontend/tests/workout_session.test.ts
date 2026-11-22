import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  createInitialWorkoutSession,
  getCurrentSetNumber,
  getPendingSegmentsToSave,
  workoutSessionReducer,
  type RoutineQueueItem,
} from "@/lib/workout_session";
import { SESSION_COOKIE } from "@/lib/server/backend_api";
import {
  GET as workoutsGET,
  POST as workoutsPOST,
} from "@/app/api/workouts/route";

const SAMPLE_QUEUE: RoutineQueueItem[] = [
  { exercise: "squat", targetSets: 4, targetReps: 15 },
  { exercise: "pushup", targetSets: 3, targetReps: 12 },
  { exercise: "situp", targetSets: 3, targetReps: 20 },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("workout_session reducer", () => {
  it("switches exercises cleanly, captures final reps, and ignores switching to the active exercise", () => {
    const s0 = createInitialWorkoutSession({
      mode: "free",
      initialExercise: "squat",
      now: "2026-11-22T10:00:00.000Z",
    });

    const s1 = workoutSessionReducer(s0, { type: "REPS_UPDATE", reps: 10 });
    expect(s1.segments[0].reps).toBe(10);

    // Switching to same exercise while active is a no-op
    expect(
      workoutSessionReducer(s1, { type: "SWITCH", exercise: "squat" })
    ).toBe(s1);

    // Switch to pushup captures reps and closes squat segment
    const s2 = workoutSessionReducer(s1, {
      type: "SWITCH",
      exercise: "pushup",
      finalReps: 12,
      now: "2026-11-22T10:02:00.000Z",
    });
    expect(s2.activeExercise).toBe("pushup");
    expect(s2.segments).toHaveLength(2);
    expect(s2.segments[0].reps).toBe(12);
    expect(s2.segments[0].endedAt).toBe("2026-11-22T10:02:00.000Z");
    expect(s2.segments[1].exercise).toBe("pushup");
    expect(s2.segments[1].endedAt).toBeNull();
  });

  it("enforces NEXT, PREVIOUS, and SKIP bounds and completes routine into summary", () => {
    const s0 = createInitialWorkoutSession({
      mode: "routine",
      routineQueue: SAMPLE_QUEUE,
      routineGoal: "muscular",
      routineFocus: null,
      now: "2026-11-22T10:00:00.000Z",
    });

    // PREVIOUS at index 0 is a no-op
    expect(workoutSessionReducer(s0, { type: "PREVIOUS" })).toBe(s0);

    // Set number progresses as reps accumulate (capped at targetSets)
    const midReps = workoutSessionReducer(s0, { type: "REPS_UPDATE", reps: 16 });
    expect(getCurrentSetNumber(midReps)).toBe(2);

    // NEXT -> index 1 (pushup)
    const s1 = workoutSessionReducer(midReps, {
      type: "NEXT",
      finalReps: 16,
      now: "2026-11-22T10:03:00.000Z",
    });
    expect(s1.routineIndex).toBe(1);
    expect(s1.activeExercise).toBe("pushup");
    expect(s1.segments[0].reps).toBe(16);

    // PREVIOUS -> back to index 0 (squat)
    const sBack = workoutSessionReducer(s1, {
      type: "PREVIOUS",
      finalReps: 0,
      now: "2026-11-22T10:03:30.000Z",
    });
    expect(sBack.routineIndex).toBe(0);
    expect(sBack.activeExercise).toBe("squat");

    // SKIP twice from index 1 -> reaches last item (situp) then completes to summary
    const s2 = workoutSessionReducer(s1, {
      type: "SKIP",
      finalReps: 0,
      now: "2026-11-22T10:04:00.000Z",
    });
    expect(s2.routineIndex).toBe(2);
    expect(s2.activeExercise).toBe("situp");
    expect(s2.status).toBe("active");

    const sDone = workoutSessionReducer(s2, {
      type: "NEXT",
      finalReps: 20,
      now: "2026-11-22T10:06:00.000Z",
    });
    expect(sDone.status).toBe("summary");
    expect(sDone.segments[sDone.segments.length - 1].reps).toBe(20);
    expect(sDone.segments[sDone.segments.length - 1].endedAt).toBe(
      "2026-11-22T10:06:00.000Z"
    );
  });

  it("saves each closed segment with reps > 0 at most once, supports partial save, and allows retry after failure", () => {
    let state = createInitialWorkoutSession({
      mode: "free",
      initialExercise: "squat",
      now: "2026-11-22T10:00:00.000Z",
    });

    // Segment 1: 15 reps, then switch to pushup (0 reps), then switch to situp (8 reps), then END
    state = workoutSessionReducer(state, {
      type: "SWITCH",
      exercise: "pushup",
      finalReps: 15,
      now: "2026-11-22T10:01:00.000Z",
    });
    state = workoutSessionReducer(state, {
      type: "SWITCH",
      exercise: "situp",
      finalReps: 0,
      now: "2026-11-22T10:02:00.000Z",
    });
    state = workoutSessionReducer(state, {
      type: "END",
      finalReps: 8,
      now: "2026-11-22T10:03:00.000Z",
    });

    // Only segments with reps > 0 (seg-1 and seg-3) are pending; seg-2 (0 reps) is excluded
    const pending = getPendingSegmentsToSave(state);
    expect(pending.map((s) => s.id)).toEqual(["seg-1", "seg-3"]);

    // Save seg-1 -> succeeds; second SAVE_START is ignored (at-most-once)
    state = workoutSessionReducer(state, { type: "SAVE_START", segmentId: "seg-1" });
    expect(state.segments[0].saveStatus).toBe("saving");
    expect(
      workoutSessionReducer(state, { type: "SAVE_START", segmentId: "seg-1" })
    ).toBe(state);

    state = workoutSessionReducer(state, {
      type: "SAVE_OK",
      segmentId: "seg-1",
      workoutId: 101,
    });
    expect(state.segments[0].saveStatus).toBe("saved");
    expect(state.segments[0].savedWorkoutId).toBe(101);
    expect(
      workoutSessionReducer(state, { type: "SAVE_START", segmentId: "seg-1" })
    ).toBe(state);

    // Save seg-3 -> fails (keeps reps & timestamps), then retry succeeds
    state = workoutSessionReducer(state, { type: "SAVE_START", segmentId: "seg-3" });
    state = workoutSessionReducer(state, {
      type: "SAVE_FAIL",
      segmentId: "seg-3",
      error: "Server offline",
    });
    expect(state.segments[2].saveStatus).toBe("failed");
    expect(state.segments[2].reps).toBe(8);
    expect(state.segments[2].startedAt).toBe("2026-11-22T10:02:00.000Z");
    expect(state.segments[2].endedAt).toBe("2026-11-22T10:03:00.000Z");

    // Retry SAVE_START allowed from failed state
    state = workoutSessionReducer(state, { type: "SAVE_START", segmentId: "seg-3" });
    expect(state.segments[2].saveStatus).toBe("saving");
    state = workoutSessionReducer(state, {
      type: "SAVE_OK",
      segmentId: "seg-3",
      workoutId: 102,
    });
    expect(state.segments[2].saveStatus).toBe("saved");
  });
});

describe("BFF /api/workouts route handlers", () => {
  it("POST /api/workouts proxies valid payload with Bearer cookie and returns 200", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 55,
          session_id: "manual_abc",
          exercise: "squat",
          rep_count: 14,
          started_at: "2026-11-22T10:00:00Z",
          ended_at: "2026-11-22T10:02:00Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const req = new NextRequest("http://localhost:3000/api/workouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Host: "localhost:3000",
        Cookie: `${SESSION_COOKIE}=jwt-token-1`,
      },
      body: JSON.stringify({
        exercise: "squat",
        rep_count: 14,
        started_at: "2026-11-22T10:00:00.000Z",
        ended_at: "2026-11-22T10:02:00.000Z",
      }),
    });

    const res = await workoutsPOST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json.workout.id).toBe(55);
  });

  it("POST /api/workouts enforces 415 non-JSON, 403 cross-origin, 401 cookie clear, and 422 validation", async () => {
    // 415 non-JSON
    const badCt = new NextRequest("http://localhost:3000/api/workouts", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Origin: "http://localhost:3000",
        Host: "localhost:3000",
        Cookie: `${SESSION_COOKIE}=tok`,
      },
      body: "exercise=squat",
    });
    expect((await workoutsPOST(badCt)).status).toBe(415);

    // 403 mismatched Origin
    const badOrigin = new NextRequest("http://localhost:3000/api/workouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://attacker.example",
        Host: "localhost:3000",
        Cookie: `${SESSION_COOKIE}=tok`,
      },
      body: JSON.stringify({
        exercise: "squat",
        rep_count: 5,
        started_at: "2026-11-22T10:00:00.000Z",
        ended_at: "2026-11-22T10:01:00.000Z",
      }),
    });
    expect((await workoutsPOST(badOrigin)).status).toBe(403);

    // 422 unknown exercise
    const badEx = new NextRequest("http://localhost:3000/api/workouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE}=tok`,
      },
      body: JSON.stringify({
        exercise: "bicep_curl",
        rep_count: 5,
        started_at: "2026-11-22T10:00:00.000Z",
        ended_at: "2026-11-22T10:01:00.000Z",
      }),
    });
    expect((await workoutsPOST(badEx)).status).toBe(422);

    // 401 from backend clears cookie
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Invalid token" }), { status: 401 })
      )
    );
    const expiredReq = new NextRequest("http://localhost:3000/api/workouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE}=expired`,
      },
      body: JSON.stringify({
        exercise: "squat",
        rep_count: 5,
        started_at: "2026-11-22T10:00:00.000Z",
        ended_at: "2026-11-22T10:01:00.000Z",
      }),
    });
    const expiredRes = await workoutsPOST(expiredReq);
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
  });

  it("GET /api/workouts proxies authenticated list and clears cookie on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ workouts: [], total: 0, limit: 10, offset: 0 }),
            { status: 200 }
          )
        )
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
    );

    const okReq = new NextRequest(
      "http://localhost:3000/api/workouts?limit=10&offset=0",
      { headers: { Cookie: `${SESSION_COOKIE}=tok` } }
    );
    const okRes = await workoutsGET(okReq);
    expect(okRes.status).toBe(200);
    expect(await okRes.json()).toEqual({
      workouts: [],
      total: 0,
      limit: 10,
      offset: 0,
    });

    const unauthReq = new NextRequest("http://localhost:3000/api/workouts", {
      headers: { Cookie: `${SESSION_COOKIE}=stale` },
    });
    const unauthRes = await workoutsGET(unauthReq);
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
  });
});
