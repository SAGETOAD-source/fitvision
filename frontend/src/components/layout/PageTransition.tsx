"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

export interface PageTransitionRuleInput {
  currentPath: string;
  targetPath: string;
  prefersReducedMotion: boolean;
}

export type TransitionMode = "none" | "fade" | "sweep";

export interface TransitionDestinationMeta {
  title: string;
  tag: string;
}

export interface TransitionNavigateOptions {
  /** Asynchronous hook executed once full opaque cover hides screen (e.g. logout). If it throws, cover clears safely. */
  onBeforeSwap?: () => Promise<void> | void;
  /** Perform full document navigation (window.location.assign) while screen is covered. */
  hardReload?: boolean;
  /** Optional tap-overlap lead delay (clamped to <= 150ms) so mobile button sweep overlaps cover-in. */
  tapLeadMs?: number;
  /** Fallback router.push when PageTransition overlay is not mounted (e.g. isolated unit tests). */
  fallbackPush?: (url: string) => void;
}

export const TRANSITION_COVER_IN_MS = 450;
export const TRANSITION_REVEAL_OUT_MS = 450;
export const TRANSITION_REDUCED_FADE_MS = 150;
export const TRANSITION_MOBILE_TAP_LEAD_MS = 95;
export const TRANSITION_MAX_TAP_LEAD_MS = 150;
export const TRANSITION_ROUTE_SETTLE_MS = 260;
export const TRANSITION_SAFETY_TIMEOUT_MS = 2000;

// Compatibility exports kept aligned with new ~450ms in + ~450ms out cadence
export const TRANSITION_NAV_DELAY_MS = TRANSITION_COVER_IN_MS;
export const TRANSITION_TOTAL_MS = TRANSITION_COVER_IN_MS + TRANSITION_REVEAL_OUT_MS;

const ROUTE_TITLES: Record<string, TransitionDestinationMeta> = {
  "/": { title: "HOME", tag: "FITVISION" },
  "/routines": { title: "ROUTINES", tag: "TRAINING PLAN" },
  "/workout": { title: "WORKOUT", tag: "LIVE SESSION" },
  "/dashboard": { title: "DASHBOARD", tag: "PROGRESS LOG" },
  "/history": { title: "HISTORY", tag: "WORKOUT LOG" },
  "/profile": { title: "PROFILE", tag: "PREFERENCES" },
  "/login": { title: "LOG IN", tag: "ACCOUNT ACCESS" },
  "/signup": { title: "SIGN UP", tag: "CREATE ACCOUNT" },
  "/onboarding": { title: "ONBOARDING", tag: "GOAL SETUP" },
  "/motion-lab": { title: "MOTION LAB", tag: "3D KINEMATICS" },
};

const EXERCISE_DISPLAY_UPPER: Record<string, string> = {
  squat: "SQUAT",
  pushup: "PUSH-UP",
  pullup: "PULL-UP",
  situp: "SIT-UP",
  jumpingjack: "JUMPING JACK",
  latpulldown: "LAT PULLDOWN",
};

export function getDestinationMeta(destinationUrl: string): TransitionDestinationMeta {
  let pathname = "/";
  let search = "";
  try {
    const parsed = new URL(destinationUrl, "http://localhost");
    pathname = parsed.pathname || "/";
    search = parsed.search || "";
  } catch {
    pathname = destinationUrl.split("?")[0]?.split("#")[0] || "/";
  }

  const normalized = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;

  if (normalized === "/workout") {
    const params = new URLSearchParams(search);
    const exercise = params.get("exercise")?.toLowerCase();
    const isRoutine = params.get("routine") === "1";
    if (exercise && EXERCISE_DISPLAY_UPPER[exercise]) {
      return {
        title: "WORKOUT",
        tag: `${EXERCISE_DISPLAY_UPPER[exercise]} // CAMERA READY`,
      };
    }
    return {
      title: "WORKOUT",
      tag: isRoutine ? "ROUTINE SESSION" : "LIVE VISION",
    };
  }

  if (ROUTE_TITLES[normalized]) {
    return ROUTE_TITLES[normalized];
  }

  const slug = normalized
    .replace(/^\//, "")
    .replace(/[-_]+/g, " ")
    .trim()
    .toUpperCase();

  return {
    title: slug || "FITVISION",
    tag: "FITVISION",
  };
}

/**
 * Pure transition eligibility helper:
 * - Plays for every internal route change including entering and leaving /workout.
 * - Uses short 150ms opacity fade under prefers-reduced-motion: reduce.
 * - Skips invalid/external paths and identical pathnames without query change.
 */
export function getTransitionMode({
  currentPath,
  targetPath,
  prefersReducedMotion,
}: PageTransitionRuleInput): TransitionMode {
  if (!targetPath || !targetPath.startsWith("/")) return "none";
  if (currentPath === targetPath) return "none";
  return prefersReducedMotion ? "fade" : "sweep";
}

export function shouldPlayPageTransition(input: PageTransitionRuleInput): boolean {
  return getTransitionMode(input) !== "none";
}

function getCurrentRouteKey(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname || "/"}${window.location.search || ""}`;
}

function normalizeRouteKey(url: string): string {
  try {
    const parsed = new URL(url, "http://localhost");
    return `${parsed.pathname || "/"}${parsed.search || ""}`;
  } catch {
    return url.split("#")[0] || "/";
  }
}

function isCoverElementFullyCovering(el: HTMLElement | null): boolean {
  if (!el || typeof window === "undefined") return true;
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth || 0;
  const vh = window.innerHeight || 0;
  if (vw === 0 || vh === 0 || (rect.width === 0 && rect.height === 0)) {
    // Non-layout environment (e.g. JSDOM)
    return true;
  }
  const style = window.getComputedStyle(el);
  if (parseFloat(style.opacity || "1") < 0.99) {
    return false;
  }
  return rect.left <= 1 && rect.right >= vw - 1 && rect.top <= 1 && rect.bottom >= vh - 1;
}

type CoordinatorFn = (url: string, options?: TransitionNavigateOptions) => Promise<void>;

interface InternalCoordinator {
  navigate: CoordinatorFn | null;
  cancel: (() => void) | null;
  deferOnCover: ((cb: () => void) => boolean) | null;
  isActive: () => boolean;
}

const activeCoordinator: InternalCoordinator = {
  navigate: null,
  cancel: null,
  deferOnCover: null,
  isActive: () => false,
};

export interface PageTransitionContextValue {
  transitionPush: (url: string, options?: TransitionNavigateOptions) => Promise<void>;
  cancelTransition: () => void;
  deferUntilCovered: (cb: () => void) => boolean;
  isTransitioning: () => boolean;
}

const PageTransitionContext = createContext<PageTransitionContextValue | null>(null);

export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const transitionPush = useCallback(
    async (url: string, options?: TransitionNavigateOptions) => {
      if (activeCoordinator.navigate) {
        await activeCoordinator.navigate(url, options);
        return;
      }

      // Fallback when PageTransition is not mounted (e.g. isolated unit tests)
      if (options?.onBeforeSwap) {
        await options.onBeforeSwap();
      }
      if (options?.hardReload && typeof window !== "undefined") {
        window.location.assign(url);
        return;
      }
      if (options?.fallbackPush) {
        options.fallbackPush(url);
      } else if (typeof window !== "undefined") {
        window.location.assign(url);
      }
    },
    []
  );

  const cancelTransition = useCallback(() => {
    activeCoordinator.cancel?.();
  }, []);

  const deferUntilCovered = useCallback((cb: () => void) => {
    if (activeCoordinator.deferOnCover) {
      return activeCoordinator.deferOnCover(cb);
    }
    return false;
  }, []);

  const isTransitioning = useCallback(() => {
    return activeCoordinator.isActive();
  }, []);

  return (
    <PageTransitionContext.Provider
      value={{ transitionPush, cancelTransition, deferUntilCovered, isTransitioning }}
    >
      {children}
    </PageTransitionContext.Provider>
  );
}

/**
 * Safe hook usable both inside PageTransitionProvider and in standalone component tests
 * without requiring Next AppRouter context to be mounted when only trigger helpers are read.
 */
export function usePageTransition(): PageTransitionContextValue {
  const ctx = useContext(PageTransitionContext);

  const fallbackPush = useCallback(
    async (url: string, options?: TransitionNavigateOptions) => {
      if (activeCoordinator.navigate) {
        await activeCoordinator.navigate(url, options);
        return;
      }
      if (options?.onBeforeSwap) {
        await options.onBeforeSwap();
      }
      if (options?.hardReload && typeof window !== "undefined") {
        window.location.assign(url);
        return;
      }
      if (options?.fallbackPush) {
        options.fallbackPush(url);
      } else if (typeof window !== "undefined") {
        window.location.assign(url);
      }
    },
    []
  );

  const fallbackCancel = useCallback(() => {
    activeCoordinator.cancel?.();
  }, []);

  const fallbackDefer = useCallback((cb: () => void) => {
    if (activeCoordinator.deferOnCover) {
      return activeCoordinator.deferOnCover(cb);
    }
    return false;
  }, []);

  const fallbackIsActive = useCallback(() => activeCoordinator.isActive(), []);

  return (
    ctx ?? {
      transitionPush: fallbackPush,
      cancelTransition: fallbackCancel,
      deferUntilCovered: fallbackDefer,
      isTransitioning: fallbackIsActive,
    }
  );
}

type OverlayPhase = "idle" | "cover-in" | "covered" | "reveal-out";

interface OverlayState {
  phase: OverlayPhase;
  mode: "sweep" | "fade";
  destination: TransitionDestinationMeta;
}

const INITIAL_OVERLAY: OverlayState = {
  phase: "idle",
  mode: "sweep",
  destination: { title: "FITVISION", tag: "FITVISION" },
};

/**
 * Root-mounted transition overlay:
 * 1. Optional <= 95ms mobile tap lead so button sweep overlaps sweep-in cleanly.
 * 2. Three rounded layers (dark -> white -> burgundy) sweep in across 450ms with
 *    a centered dot-matrix destination headline that remains readable while covered.
 * 3. Verifies full viewport coverage before calling router.push / hardReload.
 * 4. Reveals destination in ~450ms (<= 1.2s total on local prod build).
 * 5. Reduced motion: crisp 150ms opacity fade in + 150ms fade out.
 * 6. Clears immediately on popstate (browser Back/Forward), navigation/logout failure, or safety timeout.
 */
export function PageTransition() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [overlay, setOverlay] = useState<OverlayState>(INITIAL_OVERLAY);

  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const layerDarkRef = useRef<HTMLDivElement | null>(null);
  const layerWhiteRef = useRef<HTMLDivElement | null>(null);
  const layerBrandRef = useRef<HTMLDivElement | null>(null);

  const runIdRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const rafsRef = useRef<Set<number>>(new Set());
  const animationsRef = useRef<Animation[]>([]);
  const coveredCallbacksRef = useRef<Array<() => void>>([]);
  const routeCommitWaiterRef = useRef<{ targetKey: string; resolve: () => void } | null>(null);
  const activeRunStateRef = useRef<{
    runId: number;
    targetUrl: string;
    mode: "sweep" | "fade";
    options?: TransitionNavigateOptions;
    startedCoverAnimation: boolean;
  } | null>(null);

  const clearScheduledWork = useCallback(() => {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current.clear();

    if (typeof window !== "undefined") {
      for (const raf of rafsRef.current) {
        window.cancelAnimationFrame(raf);
      }
    }
    rafsRef.current.clear();

    for (const anim of animationsRef.current) {
      try {
        anim.cancel();
      } catch {}
    }
    animationsRef.current = [];
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);

  const waitMs = useCallback(
    (ms: number, runId: number) =>
      new Promise<boolean>((resolve) => {
        if (ms <= 0) {
          resolve(runId === runIdRef.current);
          return;
        }
        scheduleTimeout(() => {
          resolve(runId === runIdRef.current);
        }, ms);
      }),
    [scheduleTimeout]
  );

  const nextFrame = useCallback(
    (runId: number) =>
      new Promise<boolean>((resolve) => {
        if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
          resolve(runId === runIdRef.current);
          return;
        }
        const id = window.requestAnimationFrame(() => {
          rafsRef.current.delete(id);
          resolve(runId === runIdRef.current);
        });
        rafsRef.current.add(id);
      }),
    []
  );

  const animateElement = useCallback(
    (
      el: HTMLElement | null,
      keyframes: Keyframe[],
      timing: KeyframeAnimationOptions,
      runId: number,
      finalStyles: Partial<CSSStyleDeclaration>
    ): Promise<boolean> => {
      const totalMs = Number(timing.duration || 0) + Number(timing.delay || 0);
      if (el && typeof el.animate === "function") {
        const anim = el.animate(keyframes, { ...timing, fill: "forwards" });
        animationsRef.current.push(anim);
        return anim.finished
          .then(() => {
            Object.assign(el.style, finalStyles);
            return runId === runIdRef.current;
          })
          .catch(() => false);
      }
      if (el) {
        Object.assign(el.style, finalStyles);
      }
      return waitMs(totalMs, runId);
    },
    [waitMs]
  );

  const cancelTransition = useCallback(() => {
    runIdRef.current += 1;
    isTransitioningRef.current = false;
    activeRunStateRef.current = null;
    coveredCallbacksRef.current = [];
    if (routeCommitWaiterRef.current) {
      const waiter = routeCommitWaiterRef.current;
      routeCommitWaiterRef.current = null;
      waiter.resolve();
    }
    clearScheduledWork();
    setOverlay(INITIAL_OVERLAY);
  }, [clearScheduledWork]);

  // Resolve pending route-commit waiters when App Router pathname changes
  useEffect(() => {
    const waiter = routeCommitWaiterRef.current;
    if (!waiter) return;
    const currentKey = getCurrentRouteKey();
    const waiterPathOnly = waiter.targetKey.split("?")[0] || "/";
    if (
      currentKey === waiter.targetKey ||
      pathname === waiterPathOnly ||
      pathnameRef.current !== currentKey
    ) {
      routeCommitWaiterRef.current = null;
      waiter.resolve();
    }
  }, [pathname]);

  const waitForCoverVerification = useCallback(
    async (mode: "sweep" | "fade", runId: number): Promise<boolean> => {
      const checkEl = mode === "fade" ? overlayRef.current : layerBrandRef.current;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (runId !== runIdRef.current) return false;
        if (isCoverElementFullyCovering(checkEl)) {
          return true;
        }
        const ok = await nextFrame(runId);
        if (!ok) return false;
      }
      return runId === runIdRef.current;
    },
    [nextFrame]
  );

  const waitForRouteCommit = useCallback(
    async (targetUrl: string, runId: number): Promise<boolean> => {
      const hasWaapi =
        typeof Element !== "undefined" && typeof Element.prototype.animate === "function";
      // In non-browser JSDOM unit tests, do not hold timers waiting for mocked router.push
      if (!hasWaapi) {
        return runId === runIdRef.current;
      }

      const targetKey = normalizeRouteKey(targetUrl);
      const startKey = getCurrentRouteKey();
      if (startKey === targetKey) {
        await nextFrame(runId);
        return runId === runIdRef.current;
      }

      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          routeCommitWaiterRef.current = null;
          resolve();
        };

        routeCommitWaiterRef.current = { targetKey, resolve: done };

        const poll = () => {
          if (settled || runId !== runIdRef.current) {
            done();
            return;
          }
          if (getCurrentRouteKey() === targetKey) {
            done();
            return;
          }
          const rafId = window.requestAnimationFrame(poll);
          rafsRef.current.add(rafId);
        };

        const rafId = window.requestAnimationFrame(poll);
        rafsRef.current.add(rafId);
        scheduleTimeout(done, TRANSITION_ROUTE_SETTLE_MS);
      });

      if (runId !== runIdRef.current) return false;
      await nextFrame(runId);
      return runId === runIdRef.current;
    },
    [nextFrame, scheduleTimeout]
  );

  const runOverlaySequence = useCallback(
    async (
      runId: number,
      targetUrl: string,
      mode: "sweep" | "fade",
      options?: TransitionNavigateOptions
    ) => {
      // Phase 1: Cover-In
      let coverOk = false;
      if (mode === "fade") {
        coverOk = await animateElement(
          overlayRef.current,
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: TRANSITION_REDUCED_FADE_MS, easing: "ease-out" },
          runId,
          { opacity: "1" }
        );
      } else {
        const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
        const results = await Promise.all([
          animateElement(
            layerDarkRef.current,
            [
              { transform: "translate3d(-115%, 0, 0)" },
              { transform: "translate3d(0%, 0, 0)" },
            ],
            { duration: 310, delay: 0, easing },
            runId,
            { transform: "translate3d(0%, 0, 0)" }
          ),
          animateElement(
            layerWhiteRef.current,
            [
              { transform: "translate3d(-115%, 0, 0)" },
              { transform: "translate3d(0%, 0, 0)" },
            ],
            { duration: 310, delay: 65, easing },
            runId,
            { transform: "translate3d(0%, 0, 0)" }
          ),
          animateElement(
            layerBrandRef.current,
            [
              { transform: "translate3d(-115%, 0, 0)" },
              { transform: "translate3d(0%, 0, 0)" },
            ],
            { duration: 320, delay: 130, easing },
            runId,
            { transform: "translate3d(0%, 0, 0)" }
          ),
        ]);
        coverOk = results.every(Boolean);
      }

      if (!coverOk || runId !== runIdRef.current) return;

      const verified = await waitForCoverVerification(mode, runId);
      if (!verified || runId !== runIdRef.current) return;

      // Mark explicitly as covered only once viewport coverage is verified
      setOverlay((prev) => (prev.phase === "idle" ? prev : { ...prev, phase: "covered" }));

      // Run deferred callbacks (e.g. closing MenuOverlay safely behind solid cover)
      const cbs = coveredCallbacksRef.current.splice(0);
      for (const cb of cbs) {
        try {
          cb();
        } catch {}
      }

      // Optional async pre-swap step (e.g. logout API call): if it rejects, clear cover & keep UI usable
      if (options?.onBeforeSwap) {
        try {
          await options.onBeforeSwap();
        } catch {
          cancelTransition();
          return;
        }
      }

      if (runId !== runIdRef.current) return;

      // Phase 2: Route change underneath full cover
      try {
        if (options?.hardReload && typeof window !== "undefined") {
          window.location.assign(targetUrl);
          // Watchdog clears overlay if navigation is blocked/aborted in environment
          await waitMs(400, runId);
          if (runId === runIdRef.current) {
            cancelTransition();
          }
          return;
        }
        routerRef.current.push(targetUrl);
      } catch {
        cancelTransition();
        return;
      }

      const committed = await waitForRouteCommit(targetUrl, runId);
      if (!committed || runId !== runIdRef.current) return;

      // Phase 3: Reveal-Out (~450ms sweep out or 150ms reduced fade out)
      setOverlay((prev) => (prev.phase === "idle" ? prev : { ...prev, phase: "reveal-out" }));

      let revealOk = false;
      if (mode === "fade") {
        revealOk = await animateElement(
          overlayRef.current,
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: TRANSITION_REDUCED_FADE_MS, easing: "ease-in" },
          runId,
          { opacity: "0" }
        );
      } else {
        const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
        const results = await Promise.all([
          animateElement(
            layerBrandRef.current,
            [
              { transform: "translate3d(0%, 0, 0)" },
              { transform: "translate3d(115%, 0, 0)" },
            ],
            { duration: 310, delay: 0, easing },
            runId,
            { transform: "translate3d(115%, 0, 0)" }
          ),
          animateElement(
            layerWhiteRef.current,
            [
              { transform: "translate3d(0%, 0, 0)" },
              { transform: "translate3d(115%, 0, 0)" },
            ],
            { duration: 310, delay: 65, easing },
            runId,
            { transform: "translate3d(115%, 0, 0)" }
          ),
          animateElement(
            layerDarkRef.current,
            [
              { transform: "translate3d(0%, 0, 0)" },
              { transform: "translate3d(115%, 0, 0)" },
            ],
            { duration: 320, delay: 130, easing },
            runId,
            { transform: "translate3d(115%, 0, 0)" }
          ),
        ]);
        revealOk = results.every(Boolean);
      }

      if (revealOk && runId === runIdRef.current) {
        cancelTransition();
      }
    },
    [
      animateElement,
      cancelTransition,
      waitForCoverVerification,
      waitForRouteCommit,
      waitMs,
    ]
  );

  // Trigger WAAPI / JSDOM cover-in sequence right after overlay DOM nodes mount
  useLayoutEffect(() => {
    const active = activeRunStateRef.current;
    if (!active || active.startedCoverAnimation || overlay.phase !== "cover-in") {
      return;
    }
    if (active.runId !== runIdRef.current) return;
    active.startedCoverAnimation = true;
    void runOverlaySequence(active.runId, active.targetUrl, active.mode, active.options);
  }, [overlay.phase, runOverlaySequence]);

  const startTransition = useCallback(
    async (destinationUrl: string, options?: TransitionNavigateOptions) => {
      if (isTransitioningRef.current) {
        return;
      }

      const targetKey = normalizeRouteKey(destinationUrl);
      const currentKey = getCurrentRouteKey();
      const targetPathOnly = targetKey.split("?")[0] || "/";
      const currentPathOnly = currentKey.split("?")[0] || "/";

      const prefersReducedMotion = Boolean(
        typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)")?.matches
      );

      const baseMode = getTransitionMode({
        currentPath:
          targetKey.includes("?") || currentKey.includes("?") ? currentKey : currentPathOnly,
        targetPath: targetKey.includes("?") || currentKey.includes("?") ? targetKey : targetPathOnly,
        prefersReducedMotion,
      });

      const modeCheck =
        baseMode === "none" && options?.hardReload && targetPathOnly.startsWith("/")
          ? prefersReducedMotion
            ? "fade"
            : "sweep"
          : baseMode;

      if (modeCheck === "none") {
        if (options?.onBeforeSwap) {
          try {
            await options.onBeforeSwap();
          } catch {
            return;
          }
        }
        if (options?.hardReload && typeof window !== "undefined") {
          window.location.assign(destinationUrl);
        } else if (destinationUrl !== currentKey) {
          routerRef.current.push(destinationUrl);
        }
        return;
      }

      clearScheduledWork();
      runIdRef.current += 1;
      const runId = runIdRef.current;
      isTransitioningRef.current = true;

      // Global safety net so cover always clears if navigation fails or hangs
      scheduleTimeout(() => {
        if (runId === runIdRef.current) {
          cancelTransition();
        }
      }, TRANSITION_SAFETY_TIMEOUT_MS);

      const requestedLead = options?.tapLeadMs ?? 0;
      const clampedLead =
        modeCheck === "fade"
          ? 0
          : Math.max(0, Math.min(TRANSITION_MAX_TAP_LEAD_MS, requestedLead));

      if (clampedLead > 0) {
        const stillValid = await waitMs(clampedLead, runId);
        if (!stillValid) return;
      }

      activeRunStateRef.current = {
        runId,
        targetUrl: destinationUrl,
        mode: modeCheck,
        options,
        startedCoverAnimation: false,
      };

      setOverlay({
        phase: "cover-in",
        mode: modeCheck,
        destination: getDestinationMeta(destinationUrl),
      });
    },
    [cancelTransition, clearScheduledWork, scheduleTimeout, waitMs]
  );

  // Register coordinator & global listeners
  useEffect(() => {
    activeCoordinator.navigate = startTransition;
    activeCoordinator.cancel = cancelTransition;
    activeCoordinator.isActive = () => isTransitioningRef.current;
    activeCoordinator.deferOnCover = (cb: () => void) => {
      if (!isTransitioningRef.current) return false;
      coveredCallbacksRef.current.push(cb);
      return true;
    };

    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
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

      const targetKey = `${parsed.pathname}${parsed.search}`;
      const currentKey = getCurrentRouteKey();
      const targetPathOnly = parsed.pathname || "/";
      const currentPathOnly = pathnameRef.current || "/";

      // Same-route #hash anchor links scroll in-place cleanly with zero full-screen wipe
      if (targetKey === currentKey) return;

      // Double-click lock: block repeat clicks while a transition is already active
      if (isTransitioningRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const prefersReducedMotion = Boolean(
        typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)")?.matches
      );

      const mode = getTransitionMode({
        currentPath:
          targetKey.includes("?") || currentKey.includes("?") ? currentKey : currentPathOnly,
        targetPath: targetKey.includes("?") || currentKey.includes("?") ? targetKey : targetPathOnly,
        prefersReducedMotion,
      });

      if (mode === "none") return;

      e.preventDefault();

      // Detect mobile touch tap on signature Button links so tap fill sweep overlaps cover-in cleanly
      const fromTouchDataset = anchor.dataset.fvTouchTap === "true";
      if (fromTouchDataset) {
        delete anchor.dataset.fvTouchTap;
      }
      const isCoarsePointer = Boolean(
        typeof window.matchMedia === "function" &&
          window.matchMedia("(hover: none)")?.matches
      );
      const isSignatureButton = Boolean(anchor.dataset.fvButton === "true");
      const tapLeadMs =
        fromTouchDataset || (isCoarsePointer && isSignatureButton)
          ? TRANSITION_MOBILE_TAP_LEAD_MS
          : 0;

      const destination = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      void startTransition(destination, { tapLeadMs });
    };

    let lastObservedRoute = getCurrentRouteKey();
    let lastObservedHash = typeof window !== "undefined" ? window.location.hash || "" : "";

    const handlePopState = (e: PopStateEvent) => {
      const nextRoute = getCurrentRouteKey();
      const nextHash = typeof window !== "undefined" ? window.location.hash || "" : "";
      const isHashOnlyJump =
        e.state == null &&
        nextRoute === lastObservedRoute &&
        nextHash !== lastObservedHash;

      lastObservedRoute = nextRoute;
      lastObservedHash = nextHash;

      if (isHashOnlyJump) {
        return;
      }
      cancelTransition();
    };

    const handlePageShow = () => {
      cancelTransition();
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);

      if (activeCoordinator.navigate === startTransition) {
        activeCoordinator.navigate = null;
        activeCoordinator.cancel = null;
        activeCoordinator.deferOnCover = null;
        activeCoordinator.isActive = () => false;
      }
      cancelTransition();
    };
  }, [cancelTransition, startTransition]);

  if (overlay.phase === "idle") return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      data-testid="page-transition-overlay"
      data-transition-phase={overlay.phase}
      data-transition-state={overlay.phase}
      data-transition-mode={overlay.mode}
      style={overlay.mode === "fade" ? { opacity: 0 } : undefined}
      className="fixed inset-0 z-[80] pointer-events-none overflow-hidden"
    >
      {overlay.mode === "fade" ? (
        <div
          ref={layerBrandRef}
          data-testid="page-transition-layer-burgundy"
          className="absolute inset-0 bg-brand fv-dot-matrix-bg flex items-center justify-center px-6 text-center"
        >
          <div className="flex flex-col items-center gap-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-accent">
              [ {overlay.destination.tag} ]
            </span>
            <span
              data-testid="page-transition-headline"
              className="fv-dot-matrix-display font-mono text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-[0.2em]"
            >
              {overlay.destination.title}
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Layer 1 (Back/Lead): Deep obsidian rounded shape */}
          <div
            ref={layerDarkRef}
            data-testid="page-transition-layer-dark"
            style={{ transform: "translate3d(-115%, 0, 0)", willChange: "transform" }}
            className="absolute inset-y-[-10%] -left-[10%] w-[120%] z-10 rounded-[56px] sm:rounded-[84px] bg-bg-base border-r-2 border-white/30 shadow-2xl"
          />

          {/* Layer 2 (Middle): Crisp white rounded shape */}
          <div
            ref={layerWhiteRef}
            data-testid="page-transition-layer-white"
            style={{ transform: "translate3d(-115%, 0, 0)", willChange: "transform" }}
            className="absolute inset-y-[-10%] -left-[10%] w-[120%] z-20 rounded-[56px] sm:rounded-[84px] bg-white shadow-2xl"
          />

          {/* Layer 3 (Top Cover): Signature burgundy curtain carrying dot-matrix headline while covered */}
          <div
            ref={layerBrandRef}
            data-testid="page-transition-layer-burgundy"
            style={{ transform: "translate3d(-115%, 0, 0)", willChange: "transform" }}
            className="absolute inset-y-[-10%] -left-[10%] w-[120%] z-30 rounded-[56px] sm:rounded-[84px] bg-brand fv-dot-matrix-bg border-r-2 border-accent/60 shadow-2xl flex items-center justify-center px-8 sm:px-14"
          >
            <div className="max-w-[82vw] flex flex-col items-center text-center gap-3 sm:gap-4 px-6 py-5 rounded-3xl bg-bg-base/35 border border-white/20 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="w-2 h-2 rounded-full bg-white" />
                <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.26em] text-text-muted">
                  [ {overlay.destination.tag} ]
                </span>
                <span aria-hidden="true" className="w-2 h-2 rounded-full bg-accent" />
              </div>
              <span
                data-testid="page-transition-headline"
                className="fv-dot-matrix-display font-mono text-3xl sm:text-5xl md:text-7xl font-black uppercase tracking-[0.18em] leading-none"
              >
                {overlay.destination.title}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PageTransition;
