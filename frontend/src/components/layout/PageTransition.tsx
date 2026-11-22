"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export interface PageTransitionRuleInput {
  currentPath: string;
  targetPath: string;
  prefersReducedMotion: boolean;
}

/**
 * Pure transition eligibility check (FITVISION_DESIGN_SPEC.md section 11):
 * - Skipped entirely under prefers-reduced-motion: reduce.
 * - NEVER played when leaving OR entering /workout so camera setup/teardown is never delayed.
 * - Skipped for same-pathname or hash-only navigations.
 */
export function shouldPlayPageTransition({
  currentPath,
  targetPath,
  prefersReducedMotion,
}: PageTransitionRuleInput): boolean {
  if (prefersReducedMotion) return false;
  if (!targetPath || !targetPath.startsWith("/")) return false;
  if (currentPath.startsWith("/workout") || targetPath.startsWith("/workout")) {
    return false;
  }
  if (currentPath === targetPath) return false;
  return true;
}

/**
 * Non-blocking layered burgundy + black rounded-shape sweep transition (~0.7s).
 * Always pointer-events-none so clicks and route transitions are never blocked.
 */
export function PageTransition() {
  const pathname = usePathname() || "/";
  const [sweeping, setSweeping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPathRef = useRef(pathname);

  useEffect(() => {
    currentPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const triggerSweep = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setSweeping(true);
      timerRef.current = setTimeout(() => {
        setSweeping(false);
        timerRef.current = null;
      }, 720);
    };

    const handleClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let parsed: URL;
      try {
        parsed = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }
      if (parsed.origin !== window.location.origin) return;

      const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (
        shouldPlayPageTransition({
          currentPath: currentPathRef.current,
          targetPath: parsed.pathname,
          prefersReducedMotion,
        })
      ) {
        triggerSweep();
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!sweeping) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="page-transition-overlay"
      className="fixed inset-0 z-[60] pointer-events-none overflow-hidden motion-reduce:hidden"
    >
      {/* Leading burgundy rounded shape */}
      <div className="fv-page-sweep-primary absolute inset-y-[-10%] -left-[15%] w-[130%] rounded-[48px] bg-brand shadow-2xl" />
      {/* Trailing black rounded shape */}
      <div className="fv-page-sweep-secondary absolute inset-y-[-10%] -left-[15%] w-[130%] rounded-[48px] bg-bg-base border-r border-accent/40" />
    </div>
  );
}

export default PageTransition;
