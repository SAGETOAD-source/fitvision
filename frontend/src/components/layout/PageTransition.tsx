"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export interface PageTransitionRuleInput {
  currentPath: string;
  targetPath: string;
  prefersReducedMotion: boolean;
}

export const TRANSITION_NAV_DELAY_MS = 290;
export const TRANSITION_TOTAL_MS = 860;

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
 * FitLab-style layered burgundy + crimson + charcoal rounded-shape sweep transition (~0.85s):
 * - Sweeps rounded shapes across the screen, swaps the route underneath at peak coverage (~290ms),
 *   then sweeps away to reveal the destination page.
 * - Always pointer-events-none so interactions are never blocked.
 * - Skipped completely on /workout routes and under prefers-reduced-motion.
 */
export function PageTransition() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [sweepKey, setSweepKey] = useState(0);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPathRef = useRef(pathname);
  const routerRef = useRef(router);

  routerRef.current = router;

  useEffect(() => {
    currentPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const triggerSweep = (destinationUrl: string) => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      if (endTimerRef.current) clearTimeout(endTimerRef.current);

      setSweepKey((k) => k + 1);

      navTimerRef.current = setTimeout(() => {
        navTimerRef.current = null;
        routerRef.current.push(destinationUrl);
      }, TRANSITION_NAV_DELAY_MS);

      endTimerRef.current = setTimeout(() => {
        endTimerRef.current = null;
        setSweepKey(0);
      }, TRANSITION_TOTAL_MS);
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
      if (anchor.getAttribute("aria-disabled") === "true") return;

      const rawHref = anchor.getAttribute("href") || "";
      if (!rawHref || rawHref.startsWith("#")) return;

      let parsed: URL;
      try {
        parsed = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }
      if (parsed.origin !== window.location.origin) return;

      const prefersReducedMotion = Boolean(
        typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)")?.matches
      );

      if (
        shouldPlayPageTransition({
          currentPath: currentPathRef.current,
          targetPath: parsed.pathname,
          prefersReducedMotion,
        })
      ) {
        // Defer route change until rounded burgundy curtain reaches full coverage (~290ms)
        e.preventDefault();
        const destination = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        triggerSweep(destination);
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
    };
  }, []);

  if (sweepKey === 0) return null;

  return (
    <div
      key={sweepKey}
      aria-hidden="true"
      data-testid="page-transition-overlay"
      className="fixed inset-0 z-[80] pointer-events-none overflow-hidden motion-reduce:hidden"
    >
      {/* Layer 1: Leading dark rounded wipe */}
      <div className="fv-page-sweep-primary absolute inset-y-[-12%] -left-[12%] w-[124%] rounded-[72px] bg-surface border-r-2 border-accent/60 shadow-2xl" />

      {/* Layer 2: Soft crimson contour wave */}
      <div className="fv-page-sweep-accent absolute inset-y-[-12%] -left-[12%] w-[124%] rounded-[72px] bg-accent" />

      {/* Layer 3 (Top): Signature deep burgundy rounded curtain holding full peak coverage */}
      <div className="fv-page-sweep-secondary absolute inset-y-[-12%] -left-[12%] w-[124%] rounded-[72px] bg-brand shadow-2xl" />

      {/* Mid-sweep brand flash over peak burgundy coverage */}
      <div className="fv-page-sweep-brand absolute inset-0 flex items-center justify-center">
        <span className="font-display text-2xl sm:text-4xl font-black uppercase tracking-[0.22em] text-white">
          FITVISION
        </span>
      </div>
    </div>
  );
}

export default PageTransition;
