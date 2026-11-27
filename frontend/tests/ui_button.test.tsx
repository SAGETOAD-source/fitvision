import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, Card, LoadingSpinner } from "@/components/ui";

describe("UI Primitives: Button", () => {
  it("renders primary variant with two cells (burgundy text cell + black double-chevron square cell)", () => {
    render(<Button variant="primary">Start Training</Button>);

    const btn = screen.getByRole("button", { name: /start training/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain("border-brand");

    const textCell = screen.getByTestId("button-text-cell");
    const chevronCell = screen.getByTestId("button-chevron-cell");
    const doubleChevron = screen.getByTestId("button-double-chevron");

    expect(textCell.className).toContain("bg-brand");
    expect(chevronCell.className).toContain("bg-bg-base");
    expect(doubleChevron.querySelectorAll("svg").length).toBe(2);
  });

  it("renders secondary (outlined white) and ghost (underline sweep) variants", () => {
    const { rerender } = render(<Button variant="secondary">Explore</Button>);

    const secBtn = screen.getByRole("button", { name: /explore/i });
    expect(secBtn.className).toContain("border-white");
    expect(screen.getByTestId("button-text-cell").className).toContain("bg-bg-base");

    rerender(<Button variant="ghost">Learn More</Button>);
    const ghostBtn = screen.getByRole("button", { name: /learn more/i });
    expect(ghostBtn).toBeInTheDocument();
    expect(screen.getByTestId("button-underline-sweep")).toBeInTheDocument();
  });

  it("supports sm, md, and lg sizes", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByTestId("button-text-cell").className).toContain("min-h-[38px]");

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByTestId("button-text-cell").className).toContain("min-h-[46px]");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByTestId("button-text-cell").className).toContain("min-h-[54px]");
  });

  it("calls onClick when active and blocks click when disabled or loading", () => {
    const handleClick = vi.fn();
    const { rerender } = render(<Button onClick={handleClick}>Submit</Button>);

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button disabled onClick={handleClick}>
        Submit
      </Button>
    );
    const disabledBtn = screen.getByRole("button", { name: /submit/i });
    expect(disabledBtn).toBeDisabled();
    fireEvent.click(disabledBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button loading loadingText="Saving..." onClick={handleClick}>
        Submit
      </Button>
    );
    const loadingBtn = screen.getByRole("button", { name: /saving/i });
    expect(loadingBtn).toBeDisabled();
    expect(loadingBtn).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("button-loading-spinner")).toBeInTheDocument();
    fireEvent.click(loadingBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders as a Next.js Link (anchor element) when href is provided", () => {
    render(<Button href="/workout?exercise=squat">Launch Squat</Button>);

    const link = screen.getByRole("link", { name: /launch squat/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/workout?exercise=squat");
    expect(screen.getByTestId("button-double-chevron")).toBeInTheDocument();
  });

  it("includes shared interactive press scale/fill, touch tap sweep, and prefers-reduced-motion fallback classes", () => {
    render(<Button variant="primary">Motion Check</Button>);

    const btn = screen.getByRole("button", { name: /motion check/i });
    expect(btn.className).toContain("fv-btn-interactive");
    expect(btn.className).toContain("active:scale-[0.95]");
    expect(btn.className).toContain("motion-reduce:active:scale-100");
    expect(btn.className).toContain("motion-reduce:active:translate-y-0");

    const sweep = screen.getByTestId("button-fill-sweep");
    expect(sweep.className).toContain("motion-reduce:hidden");
    expect(sweep.className).toContain("group-data-[tap-active=true]:translate-x-0");
    expect(sweep.className).toContain("group-active:translate-x-0");

    const textCell = screen.getByTestId("button-text-cell");
    expect(textCell.className).toContain("motion-reduce:group-hover:bg-brand-hover");

    const chevronPaths = screen
      .getByTestId("button-double-chevron")
      .querySelectorAll("svg");
    expect(chevronPaths[0].getAttribute("class")).toContain(
      "group-data-[tap-active=true]:translate-x-1"
    );
  });

  it("activates visible tap feedback on mobile touch tap for href links prior to transition", () => {
    render(<Button href="/routines">Start Training</Button>);

    const link = screen.getByRole("link", { name: /start training/i });
    expect(link).not.toHaveAttribute("data-tap-active", "true");

    fireEvent.touchStart(link);
    expect(link).toHaveAttribute("data-tap-active", "true");
    expect((link as HTMLAnchorElement).dataset.fvTouchTap).toBe("true");
  });
});

describe("UI Primitives: Card", () => {
  it("renders children with default, elevated, and interactive variants using palette tokens", () => {
    const { rerender } = render(
      <Card data-testid="fv-card">
        <p>Card Body</p>
      </Card>
    );

    const card = screen.getByTestId("fv-card");
    expect(card).toHaveTextContent("Card Body");
    expect(card.className).toContain("bg-surface");
    expect(card.className).toContain("border-border-subtle");

    rerender(
      <Card data-testid="fv-card" variant="elevated" padding="lg">
        <p>Elevated</p>
      </Card>
    );
    expect(screen.getByTestId("fv-card").className).toContain("bg-surface-elevated");

    rerender(
      <Card data-testid="fv-card" variant="interactive">
        <p>Interactive</p>
      </Card>
    );
    expect(screen.getByTestId("fv-card").className).toContain("hover:border-accent");
  });
});

describe("UI Primitives: LoadingSpinner", () => {
  it("renders accessible role='status' spinner in burgundy/accent tokens with zero emerald classes", () => {
    render(<LoadingSpinner label="Loading workout engine..." showLabel />);

    const status = screen.getByRole("status", { name: /loading workout engine/i });
    expect(status).toBeInTheDocument();
    expect(screen.getByText("Loading workout engine...")).toBeInTheDocument();

    const ring = screen.getByTestId("loading-spinner-ring");
    expect(ring.className).toContain("border-brand");
    expect(ring.className).toContain("border-t-accent");
    expect(ring.className).not.toContain("emerald");
  });
});
