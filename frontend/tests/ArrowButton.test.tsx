import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArrowButton } from "../src/components/ui/ArrowButton";

describe("ArrowButton Component", () => {
  it("renders as <button> by default", () => {
    render(<ArrowButton>CLICK ME</ArrowButton>);
    const button = screen.getByRole("button", { name: /CLICK ME/i });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe("BUTTON");
  });

  it("renders as <a> when href is provided", () => {
    render(<ArrowButton href="/signup">SIGN UP</ArrowButton>);
    const link = screen.getByRole("link", { name: /SIGN UP/i });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/signup");
  });

  it("applies primary variant classes by default", () => {
    render(<ArrowButton>PRIMARY</ArrowButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-[var(--fv-burgundy)]");
    expect(button).toHaveClass("text-white");
  });

  it("applies outline variant classes", () => {
    render(<ArrowButton variant="outline">OUTLINE</ArrowButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-[var(--fv-bg-elevated)]");
    expect(button).toHaveClass("border-[var(--fv-border)]");
  });

  it("applies lg size classes", () => {
    render(<ArrowButton size="lg">LARGE</ArrowButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-sm");
    expect(button).toHaveClass("py-4");
    expect(button).toHaveClass("px-8");
  });

  it("applies md size classes by default", () => {
    render(<ArrowButton size="md">MEDIUM</ArrowButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-xs");
    expect(button).toHaveClass("py-3");
    expect(button).toHaveClass("px-6");
  });

  it("shows chevron at end by default", () => {
    render(<ArrowButton>WITH CHEVRON</ArrowButton>);
    const button = screen.getByRole("button");
    const chevron = button.querySelector("svg");
    expect(chevron).toBeInTheDocument();
    // Chevron should be after text (end position)
    const text = button.querySelector("span:last-child")?.textContent;
    expect(text).toBeTruthy();
  });

  it("shows chevron at start when chevronPosition=start", () => {
    render(<ArrowButton chevronPosition="start">START CHEVRON</ArrowButton>);
    const button = screen.getByRole("button");
    const chevron = button.querySelector("svg");
    expect(chevron).toBeInTheDocument();
  });

  it("applies disabled state", () => {
    render(<ArrowButton disabled>DISABLED</ArrowButton>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("applies disabled state to anchor", () => {
    render(<ArrowButton href="/disabled" disabled>DISABLED LINK</ArrowButton>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("aria-disabled", "true");
  });

  it("applies custom className", () => {
    render(<ArrowButton className="custom-class">CUSTOM</ArrowButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("has focus-visible ring styles", () => {
    render(<ArrowButton>FOCUS</ArrowButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("focus-visible:outline-none");
    expect(button).toHaveClass("focus-visible:ring-2");
    expect(button).toHaveClass("focus-visible:ring-[var(--fv-border-focus)]");
  });

  it("has min-height 48px", () => {
    render(<ArrowButton>MIN HEIGHT</ArrowButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("min-h-[48px]");
  });

  it("renders children correctly", () => {
    render(<ArrowButton>CUSTOM TEXT</ArrowButton>);
    expect(screen.getByText("CUSTOM TEXT")).toBeInTheDocument();
  });

  it("chevron square has correct base classes", () => {
    render(<ArrowButton>SQUARE</ArrowButton>);
    const button = screen.getByRole("button");
    const squares = button.querySelectorAll('[class*="w-8"][class*="h-8"][class*="rounded-[var(--radius-cta)]"]');
    expect(squares.length).toBeGreaterThan(0);
  });

  it("primary variant chevron square is white with burgundy icon", () => {
    render(<ArrowButton variant="primary">PRIMARY</ArrowButton>);
    const button = screen.getByRole("button");
    const square = button.querySelector('[class*="bg-white"][class*="text-[var(--fv-burgundy)]"]');
    expect(square).toBeInTheDocument();
  });

  it("outline variant chevron square has border bg and rose icon", () => {
    render(<ArrowButton variant="outline">OUTLINE</ArrowButton>);
    const button = screen.getByRole("button");
    const square = button.querySelector('[class*="bg-[var(--fv-border)]"][class*="text-[var(--fv-rose)]"]');
    expect(square).toBeInTheDocument();
  });

  it("wipe fill element exists", () => {
    render(<ArrowButton>WIPE</ArrowButton>);
    const button = screen.getByRole("button");
    const wipe = button.querySelector('[class*="absolute"][class*="inset-0"][class*="transform"][class*="-translate-x-full"]');
    expect(wipe).toBeInTheDocument();
  });
});