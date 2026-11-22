import React, { useEffect } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const hookEvents: Array<{ type: "mount" | "unmount"; exercise: string }> = [];
const mockStopWorkout = vi.fn();
const mockRetry = vi.fn();
let mockHookStatus: "loading" | "active" | "permission_denied" | "error" = "active";
let mockHookReps = 0;

vi.mock("@/hooks/useWorkoutEngine", () => ({
  useWorkoutEngine: ({ exerciseKey }: { exerciseKey: string }) => {
    useEffect(() => {
      hookEvents.push({ type: "mount", exercise: exerciseKey });
      return () => {
        hookEvents.push({ type: "unmount", exercise: exerciseKey });
      };
    }, [exerciseKey]);

    return {
      state: {
        status: mockHookStatus,
        exerciseKey,
        config: null,
        model: null,
        repCount: mockHookReps,
        confirmedState: mockHookStatus === "active" ? "SQUAT_UP" : "READY",
        feedback: mockHookStatus === "active" ? "Good depth!" : null,
        errorMessage: "",
      },
      stopWorkout: mockStopWorkout,
      resetReps: vi.fn(),
      retry: mockRetry,
    };
  },
}));

import { AuthProvider } from "@/components/auth/AuthProvider";
import WorkoutScreen from "@/components/WorkoutScreen";

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  hookEvents.length = 0;
  mockStopWorkout.mockReset();
  mockRetry.mockReset();
  mockHookStatus = "active";
  mockHookReps = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("WorkoutScreen remount-on-switch & URL sync", () => {
  it("unmounts old runner and mounts new runner exactly once per switch, captures reps, and updates URL via replaceState", async () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");
    mockHookReps = 7;

    render(<WorkoutScreen mode="free" exerciseKey="squat" />);

    expect(hookEvents).toEqual([{ type: "mount", exercise: "squat" }]);
    expect(screen.getByTestId("live-rep-count")).toHaveTextContent("7");

    // Switch to pushup via desktop tab
    mockHookReps = 5;
    fireEvent.click(screen.getByTestId("exercise-tab-pushup"));

    expect(hookEvents).toEqual([
      { type: "mount", exercise: "squat" },
      { type: "unmount", exercise: "squat" },
      { type: "mount", exercise: "pushup" },
    ]);
    expect(replaceStateSpy).toHaveBeenCalledWith(
      null,
      "",
      "/workout?exercise=pushup"
    );

    // Finish -> unmounts pushup runner and shows summary with captured reps (7 squat + 5 pushup)
    fireEvent.click(screen.getByRole("button", { name: /stop workout/i }));

    expect(hookEvents).toEqual([
      { type: "mount", exercise: "squat" },
      { type: "unmount", exercise: "squat" },
      { type: "mount", exercise: "pushup" },
      { type: "unmount", exercise: "pushup" },
    ]);
    expect(screen.getByTestId("workout-summary")).toBeInTheDocument();
    expect(screen.getByTestId("summary-total-reps")).toHaveTextContent("12");
  });

  it("shows 10-second slow-loading hint with Retry calling hook retry()", () => {
    vi.useFakeTimers();
    mockHookStatus = "loading";

    render(<WorkoutScreen mode="free" exerciseKey="squat" />);

    expect(screen.getByTestId("workout-loading-overlay")).toBeInTheDocument();
    expect(screen.queryByTestId("slow-loading-hint")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByTestId("slow-loading-hint")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});

describe("WorkoutScreen Routine Mode & Guest vs Logged-in Saving", () => {
  it("runs routine progress header, saves segments with reps > 0 when logged in, and supports Retry on failed save", async () => {
    let workoutPostAttempts = 0;
    const postedPayloads: Array<Record<string, unknown>> = [];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/api/auth/me") {
          return Promise.resolve(
            jsonRes({
              user: {
                id: 9,
                email: "athlete@fitvision.test",
                created_at: "2026-11-22T00:00:00+00:00",
              },
            })
          );
        }
        if (url === "/api/profile") {
          return Promise.resolve(
            jsonRes({
              profile: {
                body_goal: "muscular",
                focus_area: "legs",
                onboarding_completed: true,
              },
            })
          );
        }
        if (url === "/api/workouts" && init?.method === "POST") {
          workoutPostAttempts += 1;
          postedPayloads.push(JSON.parse(String(init.body)));
          // First POST fails to test Retry; subsequent POSTs succeed
          if (workoutPostAttempts === 1) {
            return Promise.resolve(
              jsonRes({ detail: "Temporary DB error" }, 503)
            );
          }
          return Promise.resolve(
            jsonRes({
              workout: {
                id: 500 + workoutPostAttempts,
                session_id: "manual_test",
                exercise: "squat",
                rep_count: 10,
                started_at: "2026-11-22T10:00:00Z",
                ended_at: "2026-11-22T10:01:00Z",
              },
            })
          );
        }
        return Promise.resolve(jsonRes({}, 404));
      })
    );

    mockHookReps = 10;

    render(
      <AuthProvider>
        <WorkoutScreen
          mode="routine"
          exerciseKey="squat"
          routineGoal="muscular"
          routineFocus="legs"
          routineQueue={[
            { exercise: "squat", targetSets: 5, targetReps: 15 },
            { exercise: "jumpingjack", targetSets: 3, targetReps: 25 },
          ]}
        />
      </AuthProvider>
    );

    // Wait for AuthProvider to recognize logged-in user
    await waitFor(() =>
      expect(screen.getByTestId("routine-progress-header")).toHaveTextContent(
        "Exercise 1 of 2, Set 1 of 5"
      )
    );

    // Advance to next exercise -> triggers POST /api/workouts for squat (10 reps), which fails first
    mockHookReps = 0;
    fireEvent.click(screen.getByRole("button", { name: /next exercise/i }));

    expect(screen.getByTestId("routine-progress-header")).toHaveTextContent(
      "Exercise 2 of 2, Set 1 of 3"
    );

    // Complete routine with 0 reps on jumpingjack -> summary shows failed save on squat + 0 reps skipped on jumpingjack
    fireEvent.click(screen.getByRole("button", { name: /complete routine/i }));

    expect(await screen.findByTestId("workout-summary")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("segment-save-status-seg-1")).toHaveTextContent(
        /save failed/i
      )
    );
    expect(screen.getByTestId("segment-save-status-seg-2")).toHaveTextContent(
      /0 reps/i
    );

    // Retry save on seg-1 -> succeeds!
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() =>
      expect(screen.getByTestId("segment-save-status-seg-1")).toHaveTextContent(
        /saved/i
      )
    );

    // Only squat (10 reps) was ever sent (attempt 1 failed + attempt 2 retry); jumpingjack (0 reps) never sent
    expect(postedPayloads.every((p) => p.exercise === "squat")).toBe(true);
    expect(postedPayloads).toHaveLength(2);
  });

  it("guest session sends nothing to /api/workouts and shows Log In / Sign Up links returning to /workout", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") return Promise.resolve(jsonRes({ user: null }));
      return Promise.resolve(jsonRes({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);

    mockHookReps = 9;

    render(
      <AuthProvider>
        <WorkoutScreen mode="free" exerciseKey="squat" />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("live-rep-count")).toHaveTextContent("9")
    );

    fireEvent.click(screen.getByRole("button", { name: /stop workout/i }));

    const guestNotice = await screen.findByTestId("summary-guest-notice");
    expect(guestNotice).toHaveTextContent(/not saved/i);
    expect(
      guestNotice.querySelector('a[href^="/login?next=%2Fworkout"]')
    ).toBeInTheDocument();
    expect(
      guestNotice.querySelector('a[href^="/signup?next=%2Fworkout"]')
    ).toBeInTheDocument();

    // Confirm zero calls to /api/workouts
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes("/api/workouts"))
    ).toBe(false);
  });
});
