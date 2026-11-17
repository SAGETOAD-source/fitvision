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

/**
 * RunToken is a local cancellation token for a single initializeEngine run.
 * It is created fresh for each run and checked after every await.
 * The cleanup function can cancel it externally.
 */
export interface RunToken {
  cancelled: boolean;
  cancel: () => void;
}

/**
 * Creates a new RunToken for a single initializeEngine run.
 * The token is checked after every await; if cancelled, the run aborts silently.
 */
export function createRunToken(): RunToken {
  const token: RunToken = { cancelled: false, cancel: () => { token.cancelled = true; } };
  return token;
}

/**
 * Error thrown when a run is cancelled. Caught and ignored silently.
 */
export class CancellationError extends Error {
  constructor(message?: string) {
    super(message || "Run cancelled");
    this.name = "CancellationError";
  }
}

/**
 * Checks if a run token is cancelled and throws CancellationError if so.
 * Used after every await to abort silently.
 */
export function checkCancelled(token: RunToken): void {
  if (token.cancelled) {
    throw new CancellationError("Run cancelled");
  }
}

/**
 * Checks if an error is a CancellationError OR a browser AbortError (DOMException).
 * This handles both our internal cancellation and the browser's video.play() AbortError.
 */
export function isCancellationError(err: unknown): boolean {
  return (
    err instanceof CancellationError ||
    (err instanceof DOMException && err.name === "AbortError")
  );
}

/**
 * Pure helper for running an async step with cancellation check.
 * Returns { cancelled: true } if cancelled, otherwise { cancelled: false, value }.
 * This allows tests to run with fake promises without browser APIs.
 */
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

/**
 * Pure cleanup function for workout engine resources.
 * Accepts resources and cancelAnimationFrame function as arguments so tests
 * can pass fakes and run the real cleanup function in any environment.
 * Also sets video.srcObject = null and pauses the video.
 * Closes the PoseLandmarker if provided.
 * 
 * Signature: (stream, animFrameId, wakeLock, cancelAnimFrameFn, video?, landmarker?)
 * - Original 4-arg signature maintained for backward compatibility with tests
 * - Optional 5th video parameter for video cleanup
 * - Optional 6th landmarker parameter for landmarker cleanup
 */
export function cleanupWorkoutEngine(
  stream: MediaStream | null,
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

  // Close PoseLandmarker (6th parameter)
  if (landmarker && typeof landmarker.close === "function") {
    try {
      landmarker.close();
    } catch {
      // Ignored
    }
  }

  // Video cleanup (optional 5th parameter for backward compatibility)
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

  // Request screen Wake Lock
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      try {
        const sentinel = await (navigator as any).wakeLock.request("screen");
        wakeLockRef.current = sentinel;
      } catch (err) {
        console.warn("Wake lock request failed or unsupported:", err);
      }
    }
  }, []);

  // Stop workout
  const stopWorkout = useCallback(() => {
    cleanupWorkoutEngine(
      streamRef.current,
      animFrameIdRef.current,
      wakeLockRef.current,
      undefined,
      videoRef.current,
      landmarkerRef.current
    );
    dispatch({ type: "STOP" });

    if (onStop) {
      onStop({ reps: state.repCount, exercise: safeExercise });
    }
  }, [onStop, state.repCount, safeExercise]);

  const resetReps = useCallback(() => {
    repCounterRef.current?.reset();
    dispatch({ type: "RESET_REPS" });
  }, []);

  // Initialize engine: config, model, landmarker, camera
  const initializeEngine = useCallback(async () => {
    // Create a LOCAL run token for this run. Checked after every await.
    const token = createRunToken();
    
    dispatch({ type: "INIT_START", exerciseKey: safeExercise });

    try {
      // 1. Fetch config via /api/exercises, falling back to /exercises_snapshot.json
      let cfg: ExerciseConfig;
      const configResult = await runGuardedStep(token, async () => {
        try {
          const resp = await fetch("/api/exercises");
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

      // 2. Load model
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

      // 3. MediaPipe PoseLandmarker
      const landmarkerResult = await runGuardedStep(token, async () => {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        );
        const marker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        return marker;
      });
      
      if (landmarkerResult.cancelled) return;
      const marker = landmarkerResult.value!;
      landmarkerRef.current = marker;

      // CHECK TOKEN RIGHT AFTER LANDMARKER CREATION
      // If cancelled, close the landmarker immediately
      checkCancelled(token);

      // 4. Request camera stream
      const streamResult = await runGuardedStep(token, async () => {
        return navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 1280 },
          },
          audio: false,
        });
      });
      
      if (streamResult.cancelled) return;
      const stream = streamResult.value!;

      // If component unmounted or stop was called while getUserMedia was pending
      checkCancelled(token);
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
          // Ignore AbortError (both our CancellationError and browser DOMException) if the run was cancelled
          if (isCancellationError(playErr)) {
            return;
          }
          throw playErr;
        }
      }

      await requestWakeLock();
      dispatch({ type: "CAMERA_READY" });

      // 5. Start frame processing loop
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
              // Landmarks detected but visibility below threshold or missing required key
              if (ctx) drawPoseSkeleton(ctx, lms, canvas.width, canvas.height, false);
              dispatch({ type: "FRAME_UPDATE", bodyVisible: false });
            }
          } else {
            // No pose landmarks detected
            dispatch({ type: "FRAME_UPDATE", bodyVisible: false });
          }
        }

        animFrameIdRef.current = requestAnimationFrame(runLoop);
      };

      animFrameIdRef.current = requestAnimationFrame(runLoop);
    } catch (err: any) {
      // Check if cancelled before dispatching error
      // This catches both our CancellationError and browser AbortError
      if (!isCancellationError(err)) {
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
      // If cancelled, err is ignored silently - no dispatch
    }
  }, [safeExercise, videoRef, canvasRef, requestWakeLock]);

  useEffect(() => {
    initializeEngine();

    return () => {
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
    };
  }, [initializeEngine]);

  return {
    state,
    stopWorkout,
    resetReps,
    retry: initializeEngine,
  };
}

/**
 * Skeleton drawing routine with mirrored coordinate math matching scale-x-[-1].
 */
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