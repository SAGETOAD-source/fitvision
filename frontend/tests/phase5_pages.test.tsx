import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextRequest } from "next/server";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: mockReplace,
  refresh: mockRefresh,
};
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
}));

import { SESSION_COOKIE } from "@/lib/server/backend_api";
import { GET as statsGET } from "@/app/api/stats/route";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { RoutinesView } from "@/components/routines/RoutinesView";
import { DashboardView } from "@/components/account/DashboardView";
import { HistoryView } from "@/components/account/HistoryView";
import { ProfileView } from "@/components/account/ProfileView";
import {
  PageTransition,
  shouldPlayPageTransition,
} from "@/components/layout/PageTransition";

const SAMPLE_USER = {
  id: 11,
  email: "athlete@fitvision.test",
  created_at: "2026-11-20T08:00:00+00:00",
};

const SAMPLE_STATS = {
  total_workouts: 3,
  total_reps: 85,
  reps_per_exercise: {
    squat: 40,
    pushup: 20,
    situp: 0,
    pullup: 0,
    jumpingjack: 25,
    latpulldown: 0,
  },
  current_streak_days: 2,
  reps_last_7_days: [
    { date: "2026-11-16", reps: 0 },
    { date: "2026-11-17", reps: 0 },
    { date: "2026-11-18", reps: 0 },
    { date: "2026-11-19", reps: 0 },
    { date: "2026-11-20", reps: 0 },
    { date: "2026-11-21", reps: 40 },
    { date: "2026-11-22", reps: 45 },
  ],
};

const SAMPLE_WORKOUTS = {
  workouts: [
    {
      id: 102,
      session_id: "manual_b",
      exercise: "jumpingjack",
      rep_count: 25,
      started_at: "2026-11-22T10:10:00Z",
      ended_at: "2026-11-22T10:12:00Z",
    },
    {
      id: 101,
      session_id: "manual_a",
      exercise: "squat",
      rep_count: 40,
      started_at: "2026-11-21T09:00:00Z",
      ended_at: "2026-11-21T09:04:00Z",
    },
  ],
  total: 2,
  limit: 15,
  offset: 0,
};

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockPush.mockReset();
  mockReplace.mockReset();
  mockRefresh.mockReset();
  mockPathname = "/";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BFF /api/stats route handler", () => {
  it("returns 200 { stats } for authenticated requests and clears cookie on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonRes(SAMPLE_STATS, 200))
        .mockResolvedValueOnce(jsonRes({ detail: "Expired" }, 401))
    );

    const okReq = new NextRequest("http://localhost:3000/api/stats", {
      headers: { Cookie: `${SESSION_COOKIE}=valid-jwt` },
    });
    const okRes = await statsGET(okReq);
    expect(okRes.status).toBe(200);
    expect(await okRes.json()).toEqual({ stats: SAMPLE_STATS });

    const expiredReq = new NextRequest("http://localhost:3000/api/stats", {
      headers: { Cookie: `${SESSION_COOKIE}=stale-jwt` },
    });
    const expiredRes = await statsGET(expiredReq);
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
  });

  it("returns 401 when no cookie exists and 503 when backend is unreachable", async () => {
    const noCookieReq = new NextRequest("http://localhost:3000/api/stats");
    expect((await statsGET(noCookieReq)).status).toBe(401);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("offline"))
    );
    const offlineReq = new NextRequest("http://localhost:3000/api/stats", {
      headers: { Cookie: `${SESSION_COOKIE}=tok` },
    });
    expect((await statsGET(offlineReq)).status).toBe(503);
  });
});

describe("Public Guest /routines Hub", () => {
  it("renders full recommended routine list for unauthenticated guests with START FULL ROUTINE and guest banner", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/auth/me") return Promise.resolve(jsonRes({ user: null }));
        if (url.startsWith("/api/routines")) {
          return Promise.resolve(
            jsonRes({
              routine: {
                goal: "muscular",
                focus: null,
                exercises: [
                  { exercise: "pullup", sets: 4, reps: 8 },
                  { exercise: "squat", sets: 4, reps: 15 },
                ],
              },
            })
          );
        }
        return Promise.resolve(jsonRes({}, 404));
      })
    );

    render(
      <AuthProvider>
        <RoutinesView />
      </AuthProvider>
    );

    expect(await screen.findByTestId("routines-guest-banner")).toBeInTheDocument();
    expect(await screen.findByTestId("routine-card-pullup")).toHaveTextContent("4 x 8");
    expect(await screen.findByTestId("routine-card-squat")).toHaveTextContent("4 x 15");
    const slot = screen.getByTestId("routine-mode-slot");
    expect(
      slot.querySelector('a[href="/workout?routine=1&goal=muscular"]')
    ).toBeInTheDocument();
  });
});

describe("Phase 5 Pages: Dashboard, History & Profile", () => {
  it("DashboardView renders KPI totals, 7-day chart, exercise breakdown, and recent workouts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/auth/me") return Promise.resolve(jsonRes({ user: SAMPLE_USER }));
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
        if (url === "/api/stats") return Promise.resolve(jsonRes({ stats: SAMPLE_STATS }));
        if (url.startsWith("/api/workouts")) return Promise.resolve(jsonRes(SAMPLE_WORKOUTS));
        if (url.startsWith("/api/routines")) {
          return Promise.resolve(
            jsonRes({
              routine: {
                goal: "muscular",
                focus: "legs",
                exercises: [{ exercise: "squat", sets: 5, reps: 15 }],
              },
            })
          );
        }
        return Promise.resolve(jsonRes({}, 404));
      })
    );

    render(
      <AuthProvider>
        <DashboardView />
      </AuthProvider>
    );

    expect(await screen.findByTestId("dashboard-view")).toBeInTheDocument();
    expect(screen.getByTestId("stat-total-workouts")).toHaveTextContent("3");
    expect(screen.getByTestId("stat-total-reps")).toHaveTextContent("85");
    expect(screen.getByTestId("stat-streak")).toHaveTextContent("2");
    expect(screen.getByTestId("dashboard-7day-chart")).toBeInTheDocument();
  });

  it("HistoryView lists workouts and supports exercise filtering", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/auth/me") return Promise.resolve(jsonRes({ user: SAMPLE_USER }));
        if (url === "/api/profile") {
          return Promise.resolve(
            jsonRes({
              profile: {
                body_goal: "slim",
                focus_area: null,
                onboarding_completed: true,
              },
            })
          );
        }
        if (url.startsWith("/api/workouts")) return Promise.resolve(jsonRes(SAMPLE_WORKOUTS));
        return Promise.resolve(jsonRes({}, 404));
      })
    );

    render(
      <AuthProvider>
        <HistoryView />
      </AuthProvider>
    );

    expect(await screen.findByTestId("history-row-102")).toHaveTextContent("Jumping Jack");
    expect(screen.getByTestId("history-row-101")).toHaveTextContent("Squat");

    // Filter to Squat only
    fireEvent.click(screen.getByRole("button", { name: "Squat" }));
    expect(screen.getByTestId("history-row-101")).toBeInTheDocument();
    expect(screen.queryByTestId("history-row-102")).not.toBeInTheDocument();
  });

  it("ProfileView shows account email and saves updated goal & focus via PUT /api/profile", async () => {
    const putPayloads: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/api/auth/me") return Promise.resolve(jsonRes({ user: SAMPLE_USER }));
        if (url === "/api/profile" && init?.method === "PUT") {
          putPayloads.push(JSON.parse(String(init.body)));
          return Promise.resolve(
            jsonRes({
              profile: {
                body_goal: "bulk",
                focus_area: "upper_body",
                onboarding_completed: true,
              },
            })
          );
        }
        if (url === "/api/profile") {
          return Promise.resolve(
            jsonRes({
              profile: {
                body_goal: "slim",
                focus_area: null,
                onboarding_completed: true,
              },
            })
          );
        }
        return Promise.resolve(jsonRes({}, 404));
      })
    );

    render(
      <AuthProvider>
        <ProfileView />
      </AuthProvider>
    );

    expect(await screen.findByTestId("profile-email")).toHaveTextContent(
      "athlete@fitvision.test"
    );

    fireEvent.click(screen.getByTestId("profile-goal-bulk"));
    fireEvent.click(screen.getByTestId("profile-focus-upper_body"));
    fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));

    expect(await screen.findByTestId("profile-save-success")).toBeInTheDocument();
    expect(putPayloads).toEqual([{ body_goal: "bulk", focus_area: "upper_body" }]);
  });
});

describe("PageTransition safety rules (Spec Section 11)", () => {
  it("skips under prefers-reduced-motion, skips when leaving or entering /workout, and plays on normal route changes", () => {
    expect(
      shouldPlayPageTransition({
        currentPath: "/",
        targetPath: "/routines",
        prefersReducedMotion: false,
      })
    ).toBe(true);

    // Reduced motion -> skipped
    expect(
      shouldPlayPageTransition({
        currentPath: "/",
        targetPath: "/routines",
        prefersReducedMotion: true,
      })
    ).toBe(false);

    // Entering or leaving /workout -> skipped so camera cleanup is never delayed
    expect(
      shouldPlayPageTransition({
        currentPath: "/workout",
        targetPath: "/routines",
        prefersReducedMotion: false,
      })
    ).toBe(false);
    expect(
      shouldPlayPageTransition({
        currentPath: "/routines",
        targetPath: "/workout",
        prefersReducedMotion: false,
      })
    ).toBe(false);

    // Same route -> skipped
    expect(
      shouldPlayPageTransition({
        currentPath: "/",
        targetPath: "/",
        prefersReducedMotion: false,
      })
    ).toBe(false);
  });

  it("mounts non-blocking sweep overlay on click between non-workout pages and stays inert under reduced motion", () => {
    mockPathname = "/";
    const { container } = render(
      <div>
        <PageTransition />
        <a href="/routines" onClick={(e) => e.preventDefault()}>
          Go Routines
        </a>
        <a href="/workout?exercise=squat" onClick={(e) => e.preventDefault()}>
          Go Workout
        </a>
      </div>
    );

    // Clicking /workout link does NOT mount overlay
    fireEvent.click(screen.getByText("Go Workout"));
    expect(screen.queryByTestId("page-transition-overlay")).not.toBeInTheDocument();

    // Even a plain navigation anchor without defaultPrevented triggers overlay
    const link = document.createElement("a");
    link.href = "http://localhost:3000/routines";
    link.textContent = "Nav";
    container.appendChild(link);
    fireEvent.click(link);
    expect(screen.getByTestId("page-transition-overlay")).toHaveClass(
      "pointer-events-none"
    );
  });
});
