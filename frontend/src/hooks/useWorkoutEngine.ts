"use client";

import { useEffect, useReducer, useRef, useCallback } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { ExerciseConfig, ModelData, NormalizedLandmark } from "@/lib/types";
import { RepCounter } from "@/lib/rep_counter";
import { predict } from "@/lib/classifier";
import {
  extractSignals,
  buildFeatureVector,
  POSE_LANDMARKS,
} from "@/lib/pose_utils";
import {
  workoutReducer,
  initialWorkoutState,
  WorkoutState,
  isValidExerciseKey,
} from "@/lib/workout_reducer";

export interface MediaStreamTrackLike {
  stop: () => void;
}

export interface MediaStreamLike {
  getTracks: () => MediaStreamTrackLike[];
}

export interface WakeLockSentinelLike {
  release: () => Promise<void> | void;
}

export interface PoseLandmarkerLike {
  close: () => void;
  detectForVideo: (video: HTMLVideoElement, timestamp: number) => { landmarks: NormalizedLandmark[][] };
}

export interface RunToken {
  cancelled: boolean;
  cancel: () => void;
}

export function createRunToken(): RunToken {
  const token: RunToken = { cancelled: false, cancel: () => { token.cancelled = true; } };
  return token;
}

export class CancellationError extends Error {
  constructor(message?: string) {
    super(message || "Run cancelled");
    this.name = "CancellationError";
  }
}

export function checkCancelled(token: RunToken): void {
  if (token.cancelled) {
    throw new CancellationError("Run cancelled");
  }
}

export function isCancellationError(err: unknown): boolean {
  return (
    err instanceof CancellationError ||
    (err instanceof DOMException && err.name === "AbortError")
  );
}

export async function runGuardedStep<T>(
  token: RunToken,
  step: () => Promise<T>
): Promise<{ cancelled: boolean; value?: T }> {
  try {
    checkCancelled(token);
    const value = await step();
    checkCancelled(token);
    return { cancelled: false, value };
  } catch (err) {
    if (isCancellationError(err)) {
      return { cancelled: true };
    }
    throw err;
  }
}

export type CameraPermissionState = "granted" | "prompt" | "denied" | "unsupported";

export async function getCameraPermissionState(): Promise<CameraPermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unsupported";
  }
  try {
    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
    return status.state;
  } catch {
    return "unsupported";
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string
): Promise<{ value: T; timedOut: boolean; abandonedPromise: Promise<T> | null }> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const racePromise = Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new TimeoutError(timeoutMessage)), ms);
    })
  ]);

  try {
    const value = await racePromise;
    if (timeoutId) clearTimeout(timeoutId);
    return { value, timedOut: false, abandonedPromise: null };
  } catch (err) {
    if (err instanceof TimeoutError) {
      return { value: null as unknown as T, timedOut: true, abandonedPromise: promise };
    }
    if (timeoutId) clearTimeout(timeoutId);
    throw err;
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export function isTimeoutError(err: unknown): boolean {
  return err instanceof TimeoutError;
}

export function cleanupWorkoutEngine(
  stream: MediaStreamLike | null,
  animFrameId: number | null,
  wakeLock: WakeLockSentinelLike | null,
  cancelAnimFrameFn: (id: number) => void = (id) => {
    if (typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(id);
    }
  },
  video?: HTMLVideoElement | null,
  landmarker?: PoseLandmarkerLike | null
): void {
  if (animFrameId !== null && typeof cancelAnimFrameFn === "function") {
    cancelAnimFrameFn(animFrameId);
  }

  if (stream) {
    try {
      const tracks = stream.getTracks();
      if (Array.isArray(tracks)) {
        tracks.forEach((track) => {
          if (track && typeof track.stop === "function") {
            track.stop();
          }
        });
      }
    } catch (e) {
      console.warn("Error stopping stream tracks:", e);
    }
  }

  if (wakeLock && typeof wakeLock.release === "function") {
    try {
      wakeLock.release();
    } catch {
      // Ignored if wake lock was already released
    }
  }

  if (landmarker && typeof landmarker.close === "function") {
    try {
      landmarker.close();
    } catch {
      // Ignored
    }
  }

  if (video) {
    try {
      video.srcObject = null;
      if (typeof video.pause === "function") {
        video.pause();
      }
    } catch {
      // Ignored
    }
  }
}

export interface UseWorkoutEngineProps {
  exerciseKey: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onStop?: (stats: { reps: number; exercise: string }) => void;
}

export function useWorkoutEngine({
  exerciseKey,
  videoRef,
  canvasRef,
  onStop,
}: UseWorkoutEngineProps) {
  const safeExercise = isValidExerciseKey(exerciseKey) ? exerciseKey : "squat";
  const [state, dispatch] = useReducer(
    workoutReducer,
    initialWorkoutState(safeExercise)
  );

  const repCounterRef = useRef<RepCounter | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const tokenRef = useRef<RunToken | null>(null);

  const requestWakeLock = useCallback(async (token: RunToken) => {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      try {
        const sentinel = await (navigator as any).wakeLock.request("screen");
        if (token.cancelled) {
          try {
            await sentinel?.release?.();
          } catch {
            // Ignored
          }
          return;
        }
        wakeLockRef.current = sentinel;
      } catch (err) {
        console.warn("Wake lock request failed or unsupported:", err);
      }
    }
  }, []);

  const initializeEngine = useCallback(async (token: RunToken) => {
    tokenRef.current = token;

    dispatch({ type: "INIT_START", exerciseKey: safeExercise });

    try {
      let cfg: ExerciseConfig;
      const configResult = await runGuardedStep(token, async () => {
        try {
          const resp = await fetch("http://localhost:8000/v1/exercises");
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.json();
          if (data?.exercises?.[safeExercise]) {
            return data.exercises[safeExercise];
          }
          throw new Error("Exercise not found in API response");
        } catch {
          const snapResp = await fetch("/exercises_snapshot.json");
          const data = await snapResp.json();
          return data.exercises[safeExercise];
        }
      });

      if (configResult.cancelled) return;
      cfg = configResult.value!;

      if (!cfg) {
        throw new Error(`Exercise '${safeExercise}' configuration not found.`);
      }

      repCounterRef.current = new RepCounter(safeExercise, cfg);

      const modelResult = await runGuardedStep(token, async () => {
        const modelResp = await fetch(`/models/${safeExercise}.json`);
        if (!modelResp.ok) {
          throw new Error(`Failed to load model /models/${safeExercise}.json`);
        }
        return modelResp.json();
      });

      if (modelResult.cancelled) return;
      const modelData: ModelData = modelResult.value!;

      dispatch({ type: "CONFIG_LOADED", config: cfg, model: modelData });

      // G1: Await FilesetResolver and PoseLandmarker directly.
      // If token is cancelled, close marker immediately and return.
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
      );
      if (token.cancelled) return;

      const marker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      if (token.cancelled) {
        marker.close();
        return;
      }
      landmarkerRef.current = marker;

      // F5: getUserMedia is started only after permission check so cancelled run does not leak
      const permissionState = await getCameraPermissionState();
      // F2: check cancellation after every await (Req 2)
      if (token.cancelled) return;
      const shouldTimeout = permissionState === "granted";

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: false,
      };
      const getUserMediaPromise = navigator.mediaDevices.getUserMedia(constraints);

      let cameraStream: MediaStream | null = null;
      let timedOut = false;
      let abandonedPromise: Promise<MediaStream> | null = null;

      if (shouldTimeout) {
        const timedResult = await withTimeout(getUserMediaPromise, 10000, "Your camera did not respond. Check that it is connected, or try another camera.");
        cameraStream = timedResult.value;
        timedOut = timedResult.timedOut;
        abandonedPromise = timedResult.abandonedPromise;
      } else {
        cameraStream = await getUserMediaPromise;
      }

      if (timedOut) {
        if (abandonedPromise) {
          abandonedPromise.then((lateStream) => {
            lateStream.getTracks().forEach((track) => track.stop());
          }).catch(() => { /* ignore */ });
        }

        if (!token.cancelled) {
          dispatch({
            type: "ERROR",
            message: "Your camera did not respond. Check that it is connected, or try another camera.",
          });
        }
        return;
      }

      if (!cameraStream) {
        throw new Error("Failed to get camera stream");
      }

      const streamResult = await runGuardedStep(token, async () => cameraStream!);

      if (streamResult.cancelled) {
        // F3: stop tracks of a stream obtained by a cancelled run (Req 2 / Req 3)
        cameraStream!.getTracks().forEach((t) => t.stop());
        return;
      }
      const stream = streamResult.value!;

      if (token.cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          if (token.cancelled && isCancellationError(playErr)) {
            return;
          }
          throw playErr;
        }
      }

      // F6: check cancellation after video.play()
      if (token.cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      // F7: pass token so cancelled run releases sentinel immediately without assigning
      await requestWakeLock(token);

      // F6: check cancellation after requestWakeLock() before dispatching or starting RAF loop
      if (token.cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      dispatch({ type: "CAMERA_READY" });

      const runLoop = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && canvas && video.readyState >= 2 && landmarkerRef.current) {
          const timestamp = performance.now();
          const results = landmarkerRef.current.detectForVideo(video, timestamp);

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (results.landmarks && results.landmarks.length > 0) {
            const lms = results.landmarks[0] as NormalizedLandmark[];
            const sigs = extractSignals(lms, cfg);

            if (sigs !== null) {
              if (ctx) drawPoseSkeleton(ctx, lms, canvas.width, canvas.height, true);

              const features = buildFeatureVector(sigs, cfg);
              const rawPred = predict(modelData, features);

              if (repCounterRef.current) {
                const updateRes = repCounterRef.current.update(rawPred, sigs);
                dispatch({
                  type: "FRAME_UPDATE",
                  bodyVisible: true,
                  confirmedState: (updateRes.confirmedState || rawPred).toUpperCase(),
                  repCount: updateRes.repCount,
                  feedback: updateRes.repCompleted
                    ? updateRes.feedback || "Good depth!"
                    : undefined,
                });
              }
            } else {
              if (ctx) drawPoseSkeleton(ctx, lms, canvas.width, canvas.height, false);
              dispatch({ type: "FRAME_UPDATE", bodyVisible: false });
            }
          } else {
            dispatch({ type: "FRAME_UPDATE", bodyVisible: false });
          }
        }

        animFrameIdRef.current = requestAnimationFrame(runLoop);
      };

      animFrameIdRef.current = requestAnimationFrame(runLoop);
    } catch (err: any) {
      // F4a: ignore cancellation errors from a cancelled run (Req 4)
      if (token.cancelled && isCancellationError(err)) {
        return;
      }
      // F4b: AbortError on a NON-cancelled run must be surfaced, not swallowed (Req 4)
      if (isCancellationError(err)) {
        if (!token.cancelled) {
          dispatch({
            type: "ERROR",
            message: (err as Error).message || "Camera playback was interrupted.",
          });
        }
        return;
      }
      // F4c / Req 5: non-cancellation errors only dispatch when this run's token is not cancelled
      if (!token.cancelled) {
        console.error("useWorkoutEngine init failure:", err);
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError" ||
          err.message?.includes("Permission denied")
        ) {
          dispatch({ type: "PERMISSION_DENIED" });
        } else {
          dispatch({
            type: "ERROR",
            message: err.message || "Failed to initialize workout engine.",
          });
        }
      }
    }
  }, [safeExercise, videoRef, canvasRef, requestWakeLock]);

  const retry = useCallback(() => {
    cleanupWorkoutEngine(
      streamRef.current,
      animFrameIdRef.current,
      wakeLockRef.current,
      undefined,
      videoRef.current,
      landmarkerRef.current
    );
    animFrameIdRef.current = null;
    streamRef.current = null;
    wakeLockRef.current = null;
    landmarkerRef.current = null;

    if (tokenRef.current) {
      tokenRef.current.cancel();
    }
    const newToken = createRunToken();
    initializeEngine(newToken);
  }, [initializeEngine]);

  const stopWorkout = useCallback(() => {
    if (tokenRef.current) {
      tokenRef.current.cancel();
    }
    cleanupWorkoutEngine(
      streamRef.current,
      animFrameIdRef.current,
      wakeLockRef.current,
      undefined,
      videoRef.current,
      landmarkerRef.current
    );
    animFrameIdRef.current = null;
    streamRef.current = null;
    wakeLockRef.current = null;
    landmarkerRef.current = null;
    dispatch({ type: "STOP" });

    if (onStop) {
      onStop({ reps: state.repCount, exercise: safeExercise });
    }
  }, [onStop, state.repCount, safeExercise]);

  const resetReps = useCallback(() => {
    repCounterRef.current?.reset();
    dispatch({ type: "RESET_REPS" });
  }, []);

  useEffect(() => {
    const token = createRunToken();
    initializeEngine(token);

    const videoEl = videoRef.current;

    return () => {
      token.cancel();
      if (tokenRef.current) {
        tokenRef.current.cancel();
      }
      cleanupWorkoutEngine(
        streamRef.current,
        animFrameIdRef.current,
        wakeLockRef.current,
        undefined,
        videoRef.current || videoEl,
        landmarkerRef.current
      );
      animFrameIdRef.current = null;
      streamRef.current = null;
      wakeLockRef.current = null;
      landmarkerRef.current = null;
    };
  }, [initializeEngine, videoRef]);

  return {
    state,
    stopWorkout,
    resetReps,
    retry,
  };
}

export function drawPoseSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  w: number,
  h: number,
  isValid: boolean
) {
  const connections = [
    [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
    [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
    [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
    [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
    [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
    [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
    [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
    [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
    [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
    [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
    [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
    [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  ];

  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);

  ctx.lineWidth = 5;
  ctx.strokeStyle = isValid ? "#10b981" : "#f59e0b";

  for (const [startIdx, endIdx] of connections) {
    const p1 = landmarks[startIdx];
    const p2 = landmarks[endIdx];
    if (
      p1 &&
      p2 &&
      (p1.visibility ?? 1) > 0.3 &&
      (p2.visibility ?? 1) > 0.3
    ) {
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }
  }

  ctx.fillStyle = isValid ? "#38bdf8" : "#fbbf24";
  for (const lm of landmarks) {
    if ((lm.visibility ?? 1) > 0.3) {
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  ctx.restore();
}