import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Marquee } from "../src/components/ui/Marquee";

describe("Marquee Component", () => {
  const items = ["ITEM ONE", "ITEM TWO", "ITEM THREE"];

  beforeEach(() => {
    cleanup();
  });

  it("renders without crashing", () => {
    const { container } = render(<Marquee items={items} />);
    expect(container).toBeInTheDocument();
  });

  it("renders marquee container with correct role and aria-label", () => {
    render(<Marquee items={items} ariaLabel="Test label" />);
    const container = screen.getByRole("region", { name: "Test label" });
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("aria-live", "off");
  });

  it("renders first set of items (accessible to screen readers)", () => {
    render(<Marquee items={items} />);
    // First set should be accessible (not aria-hidden)
    const primaryContent = document.querySelector('[class="marquee-content"]:not([aria-hidden])');
    expect(primaryContent).toBeInTheDocument();
    const primaryItems = primaryContent?.querySelectorAll('[role="listitem"]');
    expect(primaryItems).toHaveLength(items.length * 2 - 1); // items + separators
    // Check first set items are present
    expect(primaryContent?.querySelector("span")).toHaveTextContent("ITEM ONE");
    expect(primaryContent?.querySelector("span:nth-child(3)")).toHaveTextContent("ITEM TWO");
    expect(primaryContent?.querySelector("span:nth-child(5)")).toHaveTextContent("ITEM THREE");
  });

  it("renders duplicate set with aria-hidden=true", () => {
    render(<Marquee items={items} />);
    // Find the duplicate content div (second marquee-content with aria-hidden=true)
    const duplicateContent = document.querySelector('[class="marquee-content"][aria-hidden="true"]');
    expect(duplicateContent).toBeInTheDocument();
  });

  it("first marquee-content does NOT have aria-hidden", () => {
    render(<Marquee items={items} />);
    const primaryContent = document.querySelector('[class="marquee-content"]:not([aria-hidden])');
    expect(primaryContent).toBeInTheDocument();
    expect(primaryContent).toHaveAttribute("role", "list");
  });

  it("duplicate marquee-content has aria-hidden=true", () => {
    render(<Marquee items={items} />);
    const duplicateContent = document.querySelector('[class="marquee-content"][aria-hidden="true"]');
    expect(duplicateContent).toBeInTheDocument();
    expect(duplicateContent).toHaveAttribute("role", "list");
  });

  it("does NOT have role=list or aria-label on marquee-track", () => {
    render(<Marquee items={items} />);
    const track = document.querySelector(".marquee-track");
    expect(track).not.toHaveAttribute("role");
    expect(track).not.toHaveAttribute("aria-label");
    expect(track).not.toHaveAttribute("aria-hidden");
  });

  it("applies custom duration as animation-duration style", () => {
    const customDuration = 15000;
    render(<Marquee items={items} duration={customDuration} />);
    const track = document.querySelector(".marquee-track");
    expect(track).toHaveAttribute("style", expect.stringContaining(`${customDuration}ms`));
  });

  it("applies custom className", () => {
    render(<Marquee items={items} className="custom-class" />);
    const container = document.querySelector(".marquee-container");
    expect(container).toHaveClass("custom-class");
  });

  it("renders separator between items", () => {
    render(<Marquee items={items} separator=" | " />);
    // Separators should appear between items in the primary content
    const primaryContent = document.querySelector('[class="marquee-content"]:not([aria-hidden])');
    expect(primaryContent).toHaveTextContent(" | ");
  });

  it("handles empty items array", () => {
    const { container } = render(<Marquee items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("applies data-pause-on-hover attribute", () => {
    const { container: container1 } = render(<Marquee items={items} pauseOnHover={true} />);
    const marqueeContainer1 = container1.querySelector(".marquee-container");
    expect(marqueeContainer1).toHaveAttribute("data-pause-on-hover", "true");
    cleanup();

    const { container: container2 } = render(<Marquee items={items} pauseOnHover={false} />);
    const marqueeContainer2 = container2.querySelector(".marquee-container");
    expect(marqueeContainer2).toHaveAttribute("data-pause-on-hover", "false");
  });
});