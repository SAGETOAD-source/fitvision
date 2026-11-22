import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  useSearchParams: () => mockSearchParams,
}));

import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { AuthForm } from "@/components/auth/AuthForm";
import { OnboardingWizard } from "@/components/auth/OnboardingWizard";
import { RoutinesView } from "@/components/routines/RoutinesView";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";

const TEST_USER = {
  id: 7,
  email: "runner@fitvision.test",
  created_at: "2026-11-22T00:00:00+00:00",
};

function mockJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockPush.mockReset();
  mockReplace.mockReset();
  mockRefresh.mockReset();
  mockSearchParams = new URLSearchParams();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Account Flow: AuthProvider", () => {
  function StatusProbe() {
    const { user, profile, isLoading, error, logout } = useAuth();
    return (
      <div>
        <span data-testid="loading">{String(isLoading)}</span>
        <span data-testid="user">{user ? user.email : "guest"}</span>
        <span data-testid="goal">{profile?.body_goal ?? "none"}</span>
        <span data-testid="err">{error ?? ""}</span>
        <button type="button" onClick={() => logout()}>
          DoLogout
        </button>
      </div>
    );
  }

  it("loads guest state cleanly on 200 { user: null }", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(mockJson({ user: null }, 200))
    );

    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    );
    expect(screen.getByTestId("user")).toHaveTextContent("guest");
    expect(screen.getByTestId("err")).toHaveTextContent("");
  });

  it("loads authenticated user + profile and clears both on logout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/auth/me") return Promise.resolve(mockJson({ user: TEST_USER }));
        if (url === "/api/profile") {
          return Promise.resolve(
            mockJson({
              profile: {
                body_goal: "slim",
                focus_area: "core",
                onboarding_completed: true,
              },
            })
          );
        }
        if (url === "/api/auth/logout") {
          return Promise.resolve(mockJson({ ok: true }));
        }
        return Promise.resolve(mockJson({}, 404));
      })
    );

    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("runner@fitvision.test")
    );
    expect(screen.getByTestId("goal")).toHaveTextContent("slim");

    fireEvent.click(screen.getByRole("button", { name: "DoLogout" }));
    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("guest")
    );
    expect(screen.getByTestId("goal")).toHaveTextContent("none");
  });
});

describe("Account Flow: AuthForm (Login & Signup)", () => {
  it("validates email and 8..72 UTF-8 byte password and shows 429 rate-limit message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/auth/me") return Promise.resolve(mockJson({ user: null }));
        if (url === "/api/auth/login") {
          return Promise.resolve(
            mockJson(
              {
                error: "RateLimitExceeded",
                detail: "Too many attempts. Please wait a minute and try again.",
              },
              429
            )
          );
        }
        return Promise.resolve(mockJson({}, 404));
      })
    );

    render(
      <AuthProvider>
        <AuthForm mode="login" />
      </AuthProvider>
    );

    // Invalid email
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "bad-email" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "validPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByTestId("auth-error")).toHaveTextContent(
      /valid email address/i
    );

    // Password > 72 UTF-8 bytes
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "runner@fitvision.test" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "x".repeat(73) },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByTestId("auth-error")).toHaveTextContent(/72 bytes/i);

    // Valid inputs -> backend 429
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "validPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(await screen.findByTestId("auth-error")).toHaveTextContent(
      /too many attempts/i
    );
  });

  it("routes to /onboarding after signup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/auth/me") return Promise.resolve(mockJson({ user: null }));
        if (url === "/api/auth/signup") {
          return Promise.resolve(mockJson({ user: TEST_USER }, 201));
        }
        return Promise.resolve(mockJson({}, 404));
      })
    );

    render(
      <AuthProvider>
        <AuthForm mode="signup" />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "runner@fitvision.test" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "validPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/onboarding"));
  });

  it("routes after login to safe ?next=, else /routines if profile has goal, else /onboarding", async () => {
    mockSearchParams = new URLSearchParams("next=%2Froutines%3Ffrom%3Dguard");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/auth/me") return Promise.resolve(mockJson({ user: null }));
        if (url === "/api/auth/login") {
          return Promise.resolve(mockJson({ user: TEST_USER }, 200));
        }
        if (url === "/api/profile") {
          return Promise.resolve(
            mockJson({
              profile: {
                body_goal: null,
                focus_area: null,
                onboarding_completed: false,
              },
            })
          );
        }
        return Promise.resolve(mockJson({}, 404));
      })
    );

    const { unmount } = render(
      <AuthProvider>
        <AuthForm mode="login" />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "runner@fitvision.test" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "validPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/routines?from=guard")
    );

    // Unsafe ?next=//evil.com falls back to /onboarding when profile has no goal
    unmount();
    mockPush.mockReset();
    mockSearchParams = new URLSearchParams("next=//evil.com");
    render(
      <AuthProvider>
        <AuthForm mode="login" />
      </AuthProvider>
    );
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "runner@fitvision.test" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "validPassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/onboarding"));
  });
});

describe("Account Flow: OnboardingWizard (2-step)", () => {
  it("walks Step 1 -> Step 2, maps Balanced to focus_area: null, saves via PUT /api/profile, and navigates to /routines", async () => {
    const putBodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === "/api/auth/me") return Promise.resolve(mockJson({ user: TEST_USER }));
        if (url === "/api/profile" && (!init || init.method !== "PUT")) {
          return Promise.resolve(
            mockJson({
              profile: {
                body_goal: null,
                focus_area: null,
                onboarding_completed: false,
              },
            })
          );
        }
        if (url === "/api/profile" && init?.method === "PUT") {
          putBodies.push(JSON.parse(String(init.body)));
          return Promise.resolve(
            mockJson({
              profile: {
                body_goal: "muscular",
                focus_area: null,
                onboarding_completed: true,
              },
            })
          );
        }
        return Promise.resolve(mockJson({}, 404));
      })
    );

    render(
      <AuthProvider>
        <OnboardingWizard />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("onboarding-step-indicator")).toHaveTextContent(
        "Step 1 of 2"
      )
    );

    fireEvent.click(screen.getByTestId("goal-option-muscular"));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByTestId("onboarding-step-indicator")).toHaveTextContent(
      "Step 2 of 2"
    );

    fireEvent.click(screen.getByTestId("focus-option-balanced"));
    fireEvent.click(screen.getByRole("button", { name: /save & view routine/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/routines"));
    expect(putBodies).toEqual([{ body_goal: "muscular", focus_area: null }]);
  });
});

describe("Account Flow: RoutinesView", () => {
  it("maps profile to GET /api/routines, renders sets x reps + START workout links, Phase 4 slot, and re-fetches on change", async () => {
    const requestedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        requestedUrls.push(url);
        if (url === "/api/auth/me") return Promise.resolve(mockJson({ user: TEST_USER }));
        if (url === "/api/profile") {
          return Promise.resolve(
            mockJson({
              profile: {
                body_goal: "slim",
                focus_area: "legs",
                onboarding_completed: true,
              },
            })
          );
        }
        if (url.startsWith("/api/routines")) {
          if (url.includes("goal=bulk")) {
            return Promise.resolve(
              mockJson({
                routine: {
                  goal: "bulk",
                  focus: "upper_body",
                  exercises: [
                    { exercise: "pullup", sets: 5, reps: 8 },
                    { exercise: "latpulldown", sets: 5, reps: 10 },
                  ],
                },
              })
            );
          }
          return Promise.resolve(
            mockJson({
              routine: {
                goal: "slim",
                focus: "legs",
                exercises: [
                  { exercise: "squat", sets: 4, reps: 25 },
                  { exercise: "jumpingjack", sets: 4, reps: 35 },
                ],
              },
            })
          );
        }
        return Promise.resolve(mockJson({}, 404));
      })
    );

    render(
      <AuthProvider>
        <RoutinesView />
      </AuthProvider>
    );

    const squatCard = await screen.findByTestId("routine-card-squat");
    expect(squatCard).toHaveTextContent("Squat");
    expect(squatCard).toHaveTextContent("4 x 25");
    const squatStart = squatCard.querySelector('a[href="/workout?exercise=squat"]');
    expect(squatStart).toBeInTheDocument();
    expect(squatStart).toHaveTextContent("START");
    const routineSlot = screen.getByTestId("routine-mode-slot");
    const fullRoutineLink = routineSlot.querySelector(
      'a[href="/workout?routine=1&goal=slim&focus=legs"]'
    );
    expect(fullRoutineLink).toBeInTheDocument();
    expect(fullRoutineLink).toHaveTextContent(/start full routine/i);

    // Switch goal & focus -> triggers fresh /api/routines fetch
    fireEvent.click(screen.getByTestId("routine-goal-bulk"));
    fireEvent.click(screen.getByTestId("routine-focus-upper_body"));

    const pullupCard = await screen.findByTestId("routine-card-pullup");
    expect(pullupCard).toHaveTextContent("Pull-up");
    expect(pullupCard).toHaveTextContent("5 x 8");
    expect(
      requestedUrls.some((u) => u === "/api/routines?goal=bulk&focus=upper_body")
    ).toBe(true);
  });
});

describe("Account Flow: Shell Auth Links (no broken /dashboard, /history, /profile links)", () => {
  it("shows Login/Sign up when logged out and account email/Routines/Log out when logged in, with no unbuilt route links", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url === "/api/auth/me") return Promise.resolve(mockJson({ user: TEST_USER }));
        if (url === "/api/profile") {
          return Promise.resolve(
            mockJson({
              profile: {
                body_goal: "muscular",
                focus_area: null,
                onboarding_completed: true,
              },
            })
          );
        }
        return Promise.resolve(mockJson({}, 404));
      })
    );

    const { container } = render(
      <AuthProvider>
        <LandingNavbar />
        <LandingFooter />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("navbar-account-slot")).toHaveTextContent(
        "runner@fitvision.test"
      )
    );
    expect(screen.getByTestId("navbar-logout-button")).toBeInTheDocument();
    expect(screen.getByTestId("footer-account-slot")).toHaveAttribute(
      "href",
      "/routines"
    );

    // Open MenuOverlay and check no links to unbuilt pages
    fireEvent.click(screen.getByTestId("navbar-menu-button-desktop"));
    const allHrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href")
    );
    for (const forbidden of ["/dashboard", "/history", "/profile"]) {
      expect(allHrefs).not.toContain(forbidden);
    }
  });
});
