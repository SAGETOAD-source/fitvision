import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { renderToString } from "react-dom/server";

const mockPush = vi.fn();
const mockRouter = { push: mockPush, replace: vi.fn(), refresh: vi.fn() };

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => mockRouter,
}));

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import TaglineReveal from "@/components/landing/TaglineReveal";
import ReturnLoopSection from "@/components/landing/ReturnLoopSection";
import WorkflowSection from "@/components/landing/WorkflowSection";
import ExercisesSection from "@/components/landing/ExercisesSection";
import CtaSection from "@/components/landing/CtaSection";
import {
  PageTransition,
  PageTransitionProvider,
  usePageTransition,
  TRANSITION_COVER_IN_MS,
  TRANSITION_REVEAL_OUT_MS,
  TRANSITION_REDUCED_FADE_MS,
  TRANSITION_MOBILE_TAP_LEAD_MS,
  TRANSITION_SAFETY_TIMEOUT_MS,
} from "@/components/layout/PageTransition";
import LandingNavbar from "@/components/landing/LandingNavbar";
import NotFound from "@/app/not-found";

afterEach(() => {
  vi.useRealTimers();
  mockPush.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Storytelling UX & Visual Polish", () => {
  it("ScrollReveal reveals immediately under prefers-reduced-motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((q: string) => ({
        matches: q === "(prefers-reduced-motion: reduce)",
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    render(
      <ScrollReveal>
        <p>Chapter Content</p>
      </ScrollReveal>
    );

    const el = screen.getByTestId("scroll-reveal");
    expect(el).toHaveAttribute("data-visible", "true");
    expect(el).toHaveTextContent("Chapter Content");
  });

  it("TaglineReveal renders all manifesto words at full visibility under prefers-reduced-motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((q: string) => ({
        matches: q === "(prefers-reduced-motion: reduce)",
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    render(<TaglineReveal />);
    const section = screen.getByTestId("tagline-reveal-section");
    expect(section).toHaveTextContent(/Every rep measured in your browser/i);
    expect(section).toHaveTextContent(/Zero video ever leaves the room/i);

    const words = section.querySelectorAll("[data-lit]");
    expect(words.length).toBeGreaterThan(10);
    for (const w of Array.from(words)) {
      expect(w.getAttribute("data-lit")).toBe("true");
    }
  });

  it("ReturnLoopSection connects visitors to /routines, routine /workout, and /dashboard", () => {
    const html = renderToString(<ReturnLoopSection />);
    expect(html).toContain("/routines");
    expect(html).toContain("/workout?routine=1&amp;goal=muscular");
    expect(html).toContain("/dashboard");
    expect(html).toContain("One Rhythm. Every Day.");
  });

  it("Landing sections contain zero visible TODO placeholder strings", () => {
    const workflowHtml = renderToString(<WorkflowSection />);
    const exercisesHtml = renderToString(<ExercisesSection />);
    const ctaHtml = renderToString(<CtaSection />);

    for (const html of [workflowHtml, exercisesHtml, ctaHtml]) {
      expect(html).not.toContain("TODO:");
      expect(html).not.toContain("TODO: PHOTO");
      expect(html).not.toContain("WOMEN-ONLY ASSET SLOT");
    }

    expect(workflowHtml).toContain("workflow-setup.png");
    expect(exercisesHtml).toContain("exercise-squat.png");
    expect(ctaHtml).toContain("cta-athlete.png");
  });

  it("NotFound renders branded 404 recovery links back to /routines and /", () => {
    render(<NotFound />);
    const page = screen.getByTestId("not-found-page");
    expect(page).toHaveTextContent("404");
    expect(page.querySelector('a[href="/routines"]')).toBeInTheDocument();
    expect(page.querySelector('a[href="/"]')).toBeInTheDocument();
  });

  it("PageTransition intercepts /routines and /workout links, shows 3 rounded layers + dot-matrix title until reveal, guards double clicks, popstate, #, external, Ctrl+click, mobile tap lead, reduced fade, and failure recovery", async () => {
    vi.useFakeTimers();

    function LogoutFailHarness() {
      const { transitionPush } = usePageTransition();
      return (
        <button
          type="button"
          onClick={() =>
            void transitionPush("/", {
              hardReload: true,
              onBeforeSwap: async () => {
                throw new Error("Logout failed");
              },
            })
          }
        >
          Trigger Failing Logout
        </button>
      );
    }

    render(
      <PageTransitionProvider>
        <PageTransition />
        <a href="/routines">Start Training</a>
        <a href="/workout?exercise=squat">Direct Squat</a>
        <a href="#workflow">Same Page Anchor</a>
        <a href="https://example.com" target="_blank" rel="noreferrer">
          External
        </a>
        <a href="/dashboard" data-fv-touch-tap="true" data-fv-button="true">
          Touch Dashboard
        </a>
        <LogoutFailHarness />
      </PageTransitionProvider>
    );

    // 1. Same-page # anchor, external link, and Ctrl+click are NOT intercepted
    fireEvent.click(screen.getByText("Same Page Anchor"));
    expect(screen.queryByTestId("page-transition-overlay")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("External"));
    expect(screen.queryByTestId("page-transition-overlay")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Start Training"), { ctrlKey: true });
    expect(screen.queryByTestId("page-transition-overlay")).not.toBeInTheDocument();

    // 2. Non-/workout click sweeps 3 layers (dark, white, burgundy) + dot-matrix destination headline
    fireEvent.click(screen.getByText("Start Training"));
    expect(screen.getByTestId("page-transition-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("page-transition-layer-dark")).toBeInTheDocument();
    expect(screen.getByTestId("page-transition-layer-white")).toBeInTheDocument();
    expect(screen.getByTestId("page-transition-layer-burgundy")).toBeInTheDocument();
    expect(screen.getByTestId("page-transition-headline")).toHaveTextContent("ROUTINES");
    expect(mockPush).not.toHaveBeenCalled();

    // Double-clicking another route mid-transition is locked out cleanly
    fireEvent.click(screen.getByText("Direct Squat"));
    expect(screen.getByTestId("page-transition-headline")).toHaveTextContent("ROUTINES");

    // Advance 450ms -> cover reaches full coverage, router.push runs, enters reveal-out while headline stays readable
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TRANSITION_COVER_IN_MS);
    });
    expect(screen.getByTestId("page-transition-overlay")).toHaveAttribute(
      "data-transition-phase",
      "reveal-out"
    );
    expect(screen.getByTestId("page-transition-headline")).toHaveTextContent("ROUTINES");
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/routines");

    // Advance 450ms -> sweep-out finishes and overlay clears
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TRANSITION_REVEAL_OUT_MS);
    });
    expect(screen.queryByTestId("page-transition-overlay")).not.toBeInTheDocument();

    // 3. Entering /workout plays transition with WORKOUT headline
    mockPush.mockClear();
    fireEvent.click(screen.getByText("Direct Squat"));
    expect(screen.getByTestId("page-transition-headline")).toHaveTextContent("WORKOUT");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TRANSITION_COVER_IN_MS);
    });
    expect(mockPush).toHaveBeenCalledWith("/workout?exercise=squat");

    // Browser Back/Forward (popstate) immediately clears active cover so screen is never stuck
    fireEvent(window, new PopStateEvent("popstate"));
    expect(screen.queryByTestId("page-transition-overlay")).not.toBeInTheDocument();

    // 4. Touch tap overlap waits <= 150ms (95ms) before mounting cover
    mockPush.mockClear();
    fireEvent.click(screen.getByText("Touch Dashboard"));
    expect(screen.queryByTestId("page-transition-overlay")).not.toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TRANSITION_MOBILE_TAP_LEAD_MS);
    });
    expect(screen.getByTestId("page-transition-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("page-transition-headline")).toHaveTextContent("DASHBOARD");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TRANSITION_SAFETY_TIMEOUT_MS);
    });
    expect(screen.queryByTestId("page-transition-overlay")).not.toBeInTheDocument();

    // 5. Rejected onBeforeSwap (logout failure) clears cover immediately and does not navigate
    mockPush.mockClear();
    fireEvent.click(screen.getByText("Trigger Failing Logout"));
    expect(screen.getByTestId("page-transition-overlay")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TRANSITION_COVER_IN_MS);
    });
    expect(screen.queryByTestId("page-transition-overlay")).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    // 6. Reduced motion plays short 150ms opacity fade in + 150ms fade out
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((q: string) => ({
        matches: q === "(prefers-reduced-motion: reduce)",
        media: q,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    mockPush.mockClear();
    fireEvent.click(screen.getByText("Start Training"));
    expect(screen.getByTestId("page-transition-overlay")).toHaveAttribute(
      "data-transition-mode",
      "fade"
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TRANSITION_REDUCED_FADE_MS);
    });
    expect(mockPush).toHaveBeenCalledWith("/routines");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TRANSITION_REDUCED_FADE_MS);
    });
    expect(screen.queryByTestId("page-transition-overlay")).not.toBeInTheDocument();
  });

  it("MenuOverlay remains visible underneath the incoming curtain and closes silently at full cover", async () => {
    vi.useFakeTimers();

    render(
      <PageTransitionProvider>
        <PageTransition />
        <LandingNavbar />
      </PageTransitionProvider>
    );

    fireEvent.click(screen.getByTestId("navbar-menu-button-desktop"));
    const dialog = screen.getByRole("dialog", { name: /site navigation menu/i });
    const routinesLink = dialog.querySelector('a[href="/routines"]') as HTMLAnchorElement;

    fireEvent.click(routinesLink);
    expect(screen.getByTestId("page-transition-overlay")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: /site navigation menu/i })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TRANSITION_COVER_IN_MS);
    });

    expect(screen.queryByRole("dialog", { name: /site navigation menu/i })).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith("/routines");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(TRANSITION_REVEAL_OUT_MS);
    });
    expect(screen.queryByTestId("page-transition-overlay")).not.toBeInTheDocument();
  });
});
