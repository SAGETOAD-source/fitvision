/**
 * useWorkoutEngine StrictMode & Cancellation Tests
 *
 * Runs in <React.StrictMode> to verify:
 * - Proper cancellation handling during React 18 double-mount
 * - No resource leaks (streams, landmarkers, wake locks, RAF)
 * - Tests A-G, F2, F3, F5, F6, F7, G1, G2, G3
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { useWorkoutEngine } from "../src/hooks/useWorkoutEngine";

// ============================================================
// Types & Fake Resources
// ============================================================

interface FakeTrack {
  stop: ReturnType<typeof vi.fn>;
}

interface FakeStream {
  tracks: FakeTrack[];
  getTracks: () => FakeTrack[];
}

interface FakeLandmarker {
  close: ReturnType<typeof vi.fn>;
  detectForVideo: ReturnType<typeof vi.fn>;
}

interface FakeWakeLockSentinel {
  release: ReturnType<typeof vi.fn>;
}

let createdStreams: FakeStream[] = [];
let createdLandmarkers: FakeLandmarker[] = [];
let createdWakeLocks: FakeWakeLockSentinel[] = [];

function makeFakeTrack(): FakeTrack {
  return { stop: vi.fn() };
}

function makeFakeStream(): FakeStream {
  const tracks = [makeFakeTrack(), makeFakeTrack()];
  const stream: FakeStream = {
    tracks,
    getTracks: () => tracks,
  };
  createdStreams.push(stream);
  return stream;
}

function makeFakeLandmarker(): FakeLandmarker {
  const marker: FakeLandmarker = {
    close: vi.fn(),
    detectForVideo: vi.fn().mockReturnValue({ landmarks: [] }),
  };
  createdLandmarkers.push(marker);
  return marker;
}

function makeFakeWakeLock(): FakeWakeLockSentinel {
  const sentinel: FakeWakeLockSentinel = {
    release: vi.fn(),
  };
  createdWakeLocks.push(sentinel);
  return sentinel;
}

// ============================================================
// MediaPipe & Browser API Mocks
// ============================================================

let landmarkerCreatePromise: Promise<FakeLandmarker> | null = null;
let landmarkerResolver: ((lm: FakeLandmarker) => void) | null = null;

let getUserMediaPromise: Promise<FakeStream> | null = null;
let getUserMediaResolver: ((s: FakeStream) => void) | null = null;

let wakeLockPromise: Promise<FakeWakeLockSentinel> | null = null;
let wakeLockResolver: ((wl: FakeWakeLockSentinel) => void) | null = null;

let permissionState = "prompt";
let permissionQueryPromise: Promise<{ state: string }> | null = null;
let permissionQueryResolver: ((val: { state: string }) => void) | null = null;

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn().mockResolvedValue({}),
  },
  PoseLandmarker: {
    createFromOptions: vi.fn().mockImplementation(() => {
      if (landmarkerCreatePromise) return landmarkerCreatePromise;
      return Promise.resolve(makeFakeLandmarker());
    }),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function setupFetchMock() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/api/exercises") || url.includes("exercises_snapshot.json")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          exercises: {
            squat: {
              signals: ["knee_angle"],
              thresholds: { down: 90, up: 160 },
              rep_start: "down",
              rep_end: "up",
            },
          },
        }),
      });
    }
    if (url.includes("/models/")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          model: "rf_squat",
          trees: [],
        }),
      });
    }
    return Promise.resolve({ ok: false, json: async () => ({}) });
  });
}

// ============================================================
// Test Harness in <React.StrictMode>
// ============================================================

interface HarnessProps {
  onEngine?: (engine: ReturnType<typeof useWorkoutEngine>) => void;
  exerciseKey?: string;
  onStop?: (stats: { reps: number; exercise: string }) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

function Harness({ onEngine, exerciseKey = "squat", onStop, videoRef: externalVideoRef }: HarnessProps) {
  const defaultVideoRef = React.useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || defaultVideoRef;
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const engine = useWorkoutEngine({
    exerciseKey,
    videoRef,
    canvasRef,
    onStop,
  });

  React.useEffect(() => {
    onEngine?.(engine);
  });

  return (
    <div>
      <video ref={videoRef} />
      <canvas ref={canvasRef} />
      <div data-testid="status">{engine.state.status}</div>
      <div data-testid="reps">{engine.state.repCount}</div>
    </div>
  );
}

// ============================================================
// Test Suite
// ============================================================

describe("useWorkoutEngine in <React.StrictMode>", () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let mockWakeLockRequest: ReturnType<typeof vi.fn>;
  let mockPermissionsQuery: ReturnType<typeof vi.fn>;
  let mockPlay: ReturnType<typeof vi.fn>;
  let mockPause: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    createdStreams = [];
    createdLandmarkers = [];
    createdWakeLocks = [];

    landmarkerCreatePromise = null;
    landmarkerResolver = null;
    getUserMediaPromise = null;
    getUserMediaResolver = null;
    wakeLockPromise = null;
    wakeLockResolver = null;
    permissionState = "prompt";
    permissionQueryPromise = null;
    permissionQueryResolver = null;

    setupFetchMock();

    vi.mocked(FilesetResolver.forVisionTasks).mockResolvedValue({} as any);
    vi.mocked(PoseLandmarker.createFromOptions).mockImplementation(() => {
      if (landmarkerCreatePromise) return landmarkerCreatePromise as any;
      return Promise.resolve(makeFakeLandmarker() as any);
    });

    mockPlay = vi.fn().mockResolvedValue(undefined);
    mockPause = vi.fn();
    window.HTMLMediaElement.prototype.play = mockPlay;
    window.HTMLMediaElement.prototype.pause = mockPause;

    mockGetUserMedia = vi.fn().mockImplementation(() => {
      if (getUserMediaPromise) return getUserMediaPromise;
      return Promise.resolve(makeFakeStream());
    });

    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
      writable: true,
    });

    mockPermissionsQuery = vi.fn().mockImplementation(() => {
      if (permissionQueryPromise) return permissionQueryPromise;
      return Promise.resolve({ state: permissionState });
    });

    Object.defineProperty(navigator, "permissions", {
      value: { query: mockPermissionsQuery },
      configurable: true,
      writable: true,
    });

    mockWakeLockRequest = vi.fn().mockImplementation(() => {
      if (wakeLockPromise) return wakeLockPromise;
      return Promise.resolve(makeFakeWakeLock());
    });

    Object.defineProperty(navigator, "wakeLock", {
      value: { request: mockWakeLockRequest },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------
  // Test A: StrictMode double-mount cleans up cancelled run's stream without leaking (Strengthened)
  // ------------------------------------------------------------
  it("Test A: StrictMode double-mount leaves exactly one live stream assigned to video.srcObject and stops all other streams", async () => {
    const videoRef = React.createRef<HTMLVideoElement>();
    let engine!: ReturnType<typeof useWorkoutEngine>;
    let unmountFn!: () => void;

    await act(async () => {
      const { unmount } = render(
        <React.StrictMode>
          <Harness videoRef={videoRef} onEngine={(e) => { engine = e; }} />
        </React.StrictMode>
      );
      unmountFn = unmount;
    });

    // Advance timers so StrictMode double-mount completes and settles
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Exactly one stream must have live (non-stopped) tracks
    const liveStreams = createdStreams.filter((stream) =>
      stream.tracks.every((track) => track.stop.mock.calls.length === 0)
    );
    expect(liveStreams.length).toBe(1);

    // That live stream must be the one assigned to video.srcObject
    expect(videoRef.current?.srcObject).toBe(liveStreams[0]);

    // Every other stream must have ALL its tracks stopped
    const stoppedStreams = createdStreams.filter((stream) => stream !== liveStreams[0]);
    stoppedStreams.forEach((stream) => {
      stream.tracks.forEach((track) => {
        expect(track.stop).toHaveBeenCalled();
      });
    });

    await act(async () => {
      unmountFn();
    });
  });

  // ------------------------------------------------------------
  // Test B: Active remount in StrictMode completes and cleans up on unmount (Strengthened)
  // ------------------------------------------------------------
  it("Test B: closes inactive landmarkers during StrictMode double-mount, and on unmount stops all streams and clears video.srcObject", async () => {
    const videoRef = React.createRef<HTMLVideoElement>();
    let engine!: ReturnType<typeof useWorkoutEngine>;
    let unmountFn!: () => void;

    await act(async () => {
      const { unmount } = render(
        <React.StrictMode>
          <Harness videoRef={videoRef} onEngine={(e) => { engine = e; }} />
        </React.StrictMode>
      );
      unmountFn = unmount;
    });

    // Allow async init steps to complete
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(engine?.state.status).toBe("active");

    // Every landmarker created except the live active one was closed
    const openLandmarkers = createdLandmarkers.filter((lm) => lm.close.mock.calls.length === 0);
    expect(openLandmarkers.length).toBe(1);

    const closedLandmarkers = createdLandmarkers.filter((lm) => lm.close.mock.calls.length > 0);
    expect(closedLandmarkers.length).toBe(createdLandmarkers.length - 1);

    // Keep reference to video element before unmounting
    const videoEl = videoRef.current;

    // Now unmount the component
    await act(async () => {
      unmountFn();
      await vi.advanceTimersByTimeAsync(50);
    });

    // After unmount: NO stream has live tracks (all streams stopped)
    createdStreams.forEach((stream) => {
      stream.tracks.forEach((track) => {
        expect(track.stop).toHaveBeenCalled();
      });
    });

    // All landmarkers are closed
    createdLandmarkers.forEach((lm) => {
      expect(lm.close).toHaveBeenCalled();
    });

    // video.srcObject is null
    expect(videoEl?.srcObject).toBeNull();
  });

  // ------------------------------------------------------------
  // Test C: Fast unmount closes PoseLandmarker immediately (G1)
  // ------------------------------------------------------------
  it("Test C: fast unmount closes PoseLandmarker without assigning to ref (G1)", async () => {
    let resolveLandmarker!: (lm: FakeLandmarker) => void;
    landmarkerCreatePromise = new Promise<FakeLandmarker>((res) => {
      resolveLandmarker = res;
    });

    let unmountFn!: () => void;
    await act(async () => {
      const { unmount } = render(
        <React.StrictMode>
          <Harness />
        </React.StrictMode>
      );
      unmountFn = unmount;
    });

    // Advance microtasks to reach landmarker creation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    // Unmount before landmarker resolves
    await act(async () => {
      unmountFn();
    });

    const lateLandmarker = makeFakeLandmarker();
    await act(async () => {
      resolveLandmarker(lateLandmarker);
      await vi.advanceTimersByTimeAsync(10);
    });

    // G1: Landmarker must be closed immediately
    expect(lateLandmarker.close).toHaveBeenCalled();
  });

  // ------------------------------------------------------------
  // Test D: getUserMedia timeout path stops late-resolving stream (Mutation 4 target)
  // ------------------------------------------------------------
  it("Test D: getUserMedia timeout path stops late stream when permission is granted", async () => {
    permissionState = "granted";

    let resolveCameraStream!: (s: FakeStream) => void;
    mockGetUserMedia.mockImplementation(() => {
      return new Promise<FakeStream>((res) => {
        resolveCameraStream = res;
      });
    });

    let engine!: ReturnType<typeof useWorkoutEngine>;
    await act(async () => {
      render(
        <React.StrictMode>
          <Harness onEngine={(e) => { engine = e; }} />
        </React.StrictMode>
      );
    });

    // Advance timers by 10500ms to trigger the withTimeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10500);
    });

    expect(engine?.state.status).toBe("error");
    expect(engine?.state.errorMessage).toContain("Your camera did not respond");

    // Later, the camera stream finally resolves
    const lateStream = makeFakeStream();
    await act(async () => {
      resolveCameraStream(lateStream);
      await vi.advanceTimersByTimeAsync(10);
    });

    // Mutation 4 check: late stream MUST be stopped via abandonedPromise handler
    lateStream.tracks.forEach((track) => {
      expect(track.stop).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------
  // Test E: retry() cleans up existing refs, cancels old token, and resets (G2)
  // ------------------------------------------------------------
  it("Test E: retry() cleans up all existing resources and starts fresh token (G2)", async () => {
    let engine!: ReturnType<typeof useWorkoutEngine>;
    await act(async () => {
      render(
        <React.StrictMode>
          <Harness onEngine={(e) => { engine = e; }} />
        </React.StrictMode>
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(engine?.state.status).toBe("active");

    const previousStream = createdStreams[createdStreams.length - 1];

    // Call retry()
    await act(async () => {
      engine?.retry();
      await vi.advanceTimersByTimeAsync(50);
    });

    // G2: previous stream tracks must have been stopped by retry()'s cleanupWorkoutEngine
    previousStream.tracks.forEach((track) => {
      expect(track.stop).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------
  // Test F: stopWorkout() cancels tokenRef.current and cleans up (G3)
  // ------------------------------------------------------------
  it("Test F: stopWorkout() cancels tokenRef.current so in-flight init cannot start (G3)", async () => {
    let resolveLateStream!: (s: FakeStream) => void;
    mockGetUserMedia.mockImplementation(() => {
      return new Promise<FakeStream>((res) => {
        resolveLateStream = res;
      });
    });

    let engine!: ReturnType<typeof useWorkoutEngine>;
    await act(async () => {
      render(
        <React.StrictMode>
          <Harness onEngine={(e) => { engine = e; }} />
        </React.StrictMode>
      );
    });

    // Advance to let init reach getUserMedia
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    // While init is in-flight awaiting stream, call stopWorkout()
    await act(async () => {
      engine?.stopWorkout();
    });

    expect(engine?.state.status).toBe("stopped");

    // Now let the stream resolve
    const stream = makeFakeStream();
    await act(async () => {
      resolveLateStream(stream);
      await vi.advanceTimersByTimeAsync(10);
    });

    // G3: cancelled token prevented status from transitioning to active
    expect(engine?.state.status).toBe("stopped");
    stream.tracks.forEach((t) => {
      expect(t.stop).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------
  // Test G: Wake lock sentinel released immediately if cancelled before resolve (F7)
  // ------------------------------------------------------------
  it("Test G: wake lock released immediately if resolved after cancel/cleanup (F7)", async () => {
    let resolveWakeLock!: (wl: FakeWakeLockSentinel) => void;
    wakeLockPromise = new Promise<FakeWakeLockSentinel>((res) => {
      resolveWakeLock = res;
    });

    let unmountFn!: () => void;
    await act(async () => {
      const { unmount } = render(
        <React.StrictMode>
          <Harness />
        </React.StrictMode>
      );
      unmountFn = unmount;
    });

    // Allow init up to wake lock request
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    // Unmount before wakeLock resolves
    await act(async () => {
      unmountFn();
    });

    const sentinel = makeFakeWakeLock();
    await act(async () => {
      resolveWakeLock(sentinel);
      await vi.advanceTimersByTimeAsync(10);
    });

    // F7: Sentinel must be released immediately upon resolving for a cancelled run
    expect(sentinel.release).toHaveBeenCalled();
  });

  // ------------------------------------------------------------
  // Test F2 & F5: Cancellation during permission check does not call getUserMedia (F2/F5)
  // ------------------------------------------------------------
  it("Test F2 & F5: cancellation during permission query does not leak getUserMedia", async () => {
    permissionQueryPromise = new Promise<{ state: string }>((res) => {
      permissionQueryResolver = res;
    });

    let unmountFn!: () => void;
    await act(async () => {
      const { unmount } = render(
        <React.StrictMode>
          <Harness />
        </React.StrictMode>
      );
      unmountFn = unmount;
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    // Unmount while awaiting permission check
    await act(async () => {
      unmountFn();
    });

    // Resolve permission query late
    await act(async () => {
      permissionQueryResolver!({ state: "granted" });
      await vi.advanceTimersByTimeAsync(10);
    });

    // F5: getUserMedia is only called AFTER permission check; since run was cancelled, it is never called!
    expect(mockGetUserMedia).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------
  // Test F6: Cancelled run after video.play() never dispatches CAMERA_READY (F6 / Mutation 3 target)
  // ------------------------------------------------------------
  it("Test F6: cancelled run after video.play() never dispatches CAMERA_READY or starts RAF loop", async () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");

    let resolvePlay!: () => void;
    mockPlay.mockImplementation(() => {
      return new Promise<void>((res) => {
        resolvePlay = res;
      });
    });

    let unmountFn!: () => void;
    await act(async () => {
      const { unmount } = render(
        <React.StrictMode>
          <Harness />
        </React.StrictMode>
      );
      unmountFn = unmount;
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    // Clear any previous RAF calls from mount
    rafSpy.mockClear();

    // Cancel / unmount while play is awaiting
    await act(async () => {
      unmountFn();
    });

    // Resolve play late
    await act(async () => {
      resolvePlay();
      await vi.advanceTimersByTimeAsync(10);
    });

    // F6: Cancelled run must never start requestAnimationFrame loop
    expect(rafSpy).not.toHaveBeenCalled();
  });
});
