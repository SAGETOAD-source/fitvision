import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

import { ScrollReveal } from "@/components/ui/ScrollReveal";
import TaglineReveal from "@/components/landing/TaglineReveal";
import ReturnLoopSection from "@/components/landing/ReturnLoopSection";
import WorkflowSection from "@/components/landing/WorkflowSection";
import ExercisesSection from "@/components/landing/ExercisesSection";
import CtaSection from "@/components/landing/CtaSection";
import NotFound from "@/app/not-found";

afterEach(() => {
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
});
