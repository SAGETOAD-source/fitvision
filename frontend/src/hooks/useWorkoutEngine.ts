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

/**
 * Pure cleanup function for workout engine resources.
 * Accepts resources and cancelAnimationFrame function as arguments so tests
 * can pass fakes and run the real cleanup function in any environment.
 */
export function cleanupWorkoutEngine(
  stream: MediaStreamLike | null,
  animFrameId: number | null,
  wakeLock: WakeLockSentinelLike | null,
  cancelAnimFrameFn: (id: number) => void = (id) => {
    if (typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(id);
    }
  }
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

  // Request screen Wake Lock to keep display awake during workout
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
      wakeLockRef.current
    );
    animFrameIdRef.current = null;
    streamRef.current = null;
    wakeLockRef.current = null;

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
    dispatch({ type: "INIT_START", exerciseKey: safeExercise });

    try {
      // 1. Fetch config
      let cfg: ExerciseConfig;
      try {
        const resp = await fetch("http://localhost:8000/v1/exercises");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        cfg = data.exercises[safeExercise];
      } catch {
        const snapResp = await fetch("/exercises_snapshot.json");
        const data = await snapResp.json();
        cfg = data.exercises[safeExercise];
      }

      if (!cfg) {
        throw new Error(`Exercise '${safeExercise}' configuration not found.`);
      }

      repCounterRef.current = new RepCounter(safeExercise, cfg);

      // 2. Load model
      const modelResp = await fetch(`/models/${safeExercise}.json`);
      if (!modelResp.ok) {
        throw new Error(`Failed to load model /models/${safeExercise}.json`);
      }
      const modelData: ModelData = await modelResp.json();

      dispatch({ type: "CONFIG_LOADED", config: cfg, model: modelData });

      // 3. MediaPipe PoseLandmarker
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
      landmarkerRef.current = marker;

      // 4. Request camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
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
  }, [safeExercise, videoRef, canvasRef, requestWakeLock]);

  useEffect(() => {
    initializeEngine();

    return () => {
      cleanupWorkoutEngine(
        streamRef.current,
        animFrameIdRef.current,
        wakeLockRef.current
      );
      animFrameIdRef.current = null;
      streamRef.current = null;
      wakeLockRef.current = null;
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

