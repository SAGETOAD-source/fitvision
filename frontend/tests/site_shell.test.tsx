import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SectionLabel,
  Marquee,
  ProgressAccordion,
  accordionReducer,
  initialAccordionState,
  BigScrollText,
  type ProgressAccordionItem,
} from "@/components/ui";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";

const SAMPLE_STEPS: ProgressAccordionItem[] = [
  {
    num: "01",
    title: "Set Up Your Camera",
    description: "Position your camera so your full body stays in view.",
    tag: "Webcam or Phone",
    placeholderLabel: "TODO: Female athlete setup photo",
  },
  {
    num: "02",
    title: "Move Naturally",
    description: "FitVision tracks 33 skeletal keypoints locally.",
    tag: "On-Device Pose Tracking",
    placeholderLabel: "TODO: Female athlete movement photo",
  },
  {
    num: "03",
    title: "Get Instant Feedback",
    description: "Reps and form cues appear live in your browser.",
    tag: "Debounced Rep Counter",
    placeholderLabel: "TODO: Female athlete HUD photo",
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Site Shell: SectionLabel", () => {
  it("renders bracketed uppercase label in accent and white variants", () => {
    const { rerender } = render(<SectionLabel>How It Works</SectionLabel>);
    expect(screen.getByText("How It Works")).toBeInTheDocument();
    expect(screen.getByText("[")).toBeInTheDocument();
    expect(screen.getByText("]")).toBeInTheDocument();

    rerender(<SectionLabel variant="white">On-Device</SectionLabel>);
    const label = screen.getByText("On-Device").parentElement;
    expect(label?.className).toContain("text-white");
  });
});

describe("Site Shell: Marquee", () => {
  it("renders all items and hides the duplicate loop track from assistive tech", () => {
    const items = ["On-Device Pose Tracking", "33 Keypoints", "Zero Video Uploads"];
    const { container } = render(<Marquee items={items} />);

    const lists = container.querySelectorAll("ul");
    expect(lists.length).toBe(2);
    expect(lists[0].getAttribute("aria-hidden")).toBeNull();
    expect(lists[1].getAttribute("aria-hidden")).toBe("true");

    for (const item of items) {
      expect(screen.getAllByText(item).length).toBe(2);
    }
    expect(screen.getAllByText("/").length).toBe(items.length * 2);
  });
});

describe("Site Shell: ProgressAccordion reducer", () => {
  const cfg = { itemCount: 3, progressDuration: 6000, autoAdvance: true };

  it("advances progress on TICK, clamps at 100, and respects PAUSE/RESUME", () => {
    const s1 = accordionReducer(initialAccordionState, { type: "TICK", delta: 3000 }, cfg);
    expect(s1.progress).toBeCloseTo(50, 4);

    const paused = accordionReducer(s1, { type: "PAUSE" }, cfg);
    expect(paused.paused).toBe(true);

    const stillPaused = accordionReducer(paused, { type: "TICK", delta: 2000 }, cfg);
    expect(stillPaused.progress).toBeCloseTo(50, 4);

    const resumed = accordionReducer(stillPaused, { type: "RESUME" }, cfg);
    expect(resumed.paused).toBe(false);

    const capped = accordionReducer(resumed, { type: "TICK", delta: 5000 }, cfg);
    expect(capped.progress).toBe(100);
  });

  it("handles SELECT, NEXT, and RESET cleanly with modulo wrapping", () => {
    const s1 = accordionReducer(
      { openIndex: 0, paused: true, progress: 80 },
      { type: "SELECT", index: 2 },
      cfg
    );
    expect(s1).toEqual({ openIndex: 2, paused: false, progress: 0 });

    const wrappedNext = accordionReducer(s1, { type: "NEXT", count: 1 }, cfg);
    expect(wrappedNext).toEqual({ openIndex: 0, paused: false, progress: 0 });

    const reset = accordionReducer(
      { openIndex: 1, paused: false, progress: 45 },
      { type: "RESET" },
      cfg
    );
    expect(reset).toEqual({ openIndex: 1, paused: false, progress: 0 });
  });
});

describe("Site Shell: ProgressAccordion interaction & a11y", () => {
  it("switches active item on click and keyboard ArrowDown / ArrowUp / Home / End", () => {
    render(<ProgressAccordion items={SAMPLE_STEPS} autoAdvance={false} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");

    // Click second item
    fireEvent.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");

    // ArrowDown -> index 2
    const tablist = screen.getByRole("tablist");
    fireEvent.keyDown(tablist, { key: "ArrowDown" });
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(tabs[2]);

    // ArrowUp -> index 1
    fireEvent.keyDown(tablist, { key: "ArrowUp" });
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(tabs[1]);

    // End -> index 2
    fireEvent.keyDown(tablist, { key: "End" });
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");

    // Home -> index 0
    fireEvent.keyDown(tablist, { key: "Home" });
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    // Placeholder visual is rendered
    expect(screen.getByTestId("accordion-angled-visual")).toBeInTheDocument();
  });

  it("sets open progress bar statically to 100% under prefers-reduced-motion", () => {
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal("matchMedia", matchMediaMock);

    render(<ProgressAccordion items={SAMPLE_STEPS} autoAdvance={true} />);
    const activeBar = screen.getByTestId("accordion-progress-0");
    expect(activeBar).toHaveStyle({ width: "100%" });
  });
});

describe("Site Shell: BigScrollText", () => {
  it("renders decorative aria-hidden scrolling text clipped inside overflow-hidden", () => {
    render(<BigScrollText text="TRAIN SMARTER" />);
    const el = screen.getByTestId("big-scroll-text");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el.className).toContain("overflow-hidden");
    expect(el).toHaveTextContent("TRAIN SMARTER");
  });
});

describe("Site Shell: LandingNavbar & MenuOverlay", () => {
  it("opens full-screen MenuOverlay from circular MENU button and closes on Escape returning focus", () => {
    render(<LandingNavbar />);

    const trigger = screen.getByTestId("navbar-menu-button-desktop");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: /site navigation menu/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByTestId("menu-account-slot")).toBeInTheDocument();

    // Pressing Escape closes the overlay and restores focus to trigger
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);
  });

  it("closes MenuOverlay when the close button is clicked", () => {
    render(<LandingNavbar />);

    const mobileTrigger = screen.getByTestId("navbar-menu-button-mobile");
    fireEvent.click(mobileTrigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /close navigation menu/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(mobileTrigger);
  });

  it("renders footer with My account slot, Back to top link, and zero ® or social links", () => {
    render(<LandingFooter />);

    expect(screen.getByTestId("footer-account-slot")).toHaveTextContent(/my account/i);
    expect(screen.getByRole("link", { name: /back to top/i })).toHaveAttribute("href", "#top");
    expect(document.body.textContent).not.toContain("®");
  });
});
