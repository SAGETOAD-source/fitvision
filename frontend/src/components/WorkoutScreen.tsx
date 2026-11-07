"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { ExerciseConfig, ModelData, NormalizedLandmark } from "@/lib/types";
import { RepCounter } from "@/lib/rep_counter";
import { predict } from "@/lib/classifier";
import {
  extractSignals,
  buildFeatureVector,
  POSE_LANDMARKS,
} from "@/lib/pose_utils";

export type WorkoutUiState =
  | "loading"
  | "ready"
  | "permission_denied"
  | "error";

export interface WorkoutScreenProps {
  exerciseKey?: string;
  onStop?: (stats: { reps: number; exercise: string }) => void;
}

/**
 * Determines whether a feedback message represents positive form ("good")
 * or a corrective warning ("warning").
 */
export function getFeedbackVariant(
  feedback: string | null
): "good" | "warning" | "neutral" {
  if (!feedback) return "neutral";
  const lower = feedback.toLowerCase();
  if (
    lower.includes("good") ||
    lower.includes("great") ||
    lower.includes("completed") ||
    lower.includes("counted")
  ) {
    return "good";
  }
  return "warning";
}

/**
 * Helper to stop all tracks on a MediaStream to avoid camera leaks.
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

/**
 * Checks if the required landmarks for an exercise are visible.
 */
export function isBodyVisible(
  landmarks: NormalizedLandmark[] | null | undefined,
  config: ExerciseConfig | null
): boolean {
  if (!landmarks || landmarks.length === 0 || !config) return false;
  const signals = extractSignals(landmarks, config);
  return signals !== null;
}

export default function WorkoutScreen({
  exerciseKey = "squat",
  onStop,
}: WorkoutScreenProps) {
  const [uiState, setUiState] = useState<WorkoutUiState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [exerciseConfig, setExerciseConfig] = useState<ExerciseConfig | null>(
    null
  );
  const [model, setModel] = useState<ModelData | null>(null);
  const [landmarker, setLandmarker] = useState<PoseLandmarker | null>(null);

  // Live workout stats
  const [repCount, setRepCount] = useState<number>(0);
  const [confirmedState, setConfirmedState] = useState<string>("READY");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [bodyVisible, setBodyVisible] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const repCounterRef = useRef<RepCounter | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 1. Initialize config, model, and MediaPipe
  const initialize = useCallback(async () => {
    setUiState("loading");
    setErrorMessage("");

    try {
      // 1. Fetch exercise config
      let cfg: ExerciseConfig;
      try {
        const resp = await fetch("http://localhost:8000/v1/exercises");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        cfg = data.exercises[exerciseKey];
      } catch {
        const snapResp = await fetch("/exercises_snapshot.json");
        const data = await snapResp.json();
        cfg = data.exercises[exerciseKey];
      }

      if (!cfg) {
        throw new Error(`Exercise '${exerciseKey}' not found in configuration.`);
      }

      setExerciseConfig(cfg);
      repCounterRef.current = new RepCounter(exerciseKey, cfg);

      // 2. Load model
      const modelResp = await fetch(`/models/${exerciseKey}.json`);
      if (!modelResp.ok) {
        throw new Error(`Failed to load model /models/${exerciseKey}.json`);
      }
      const modelData: ModelData = await modelResp.json();
      setModel(modelData);

      // 3. Initialize MediaPipe PoseLandmarker
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
      setLandmarker(marker);

      // 4. Request camera access
      await startCamera(marker, cfg, modelData);
    } catch (err: any) {
      console.error("WorkoutScreen initialization error:", err);
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError" ||
        err.message?.includes("Permission denied")
      ) {
        setUiState("permission_denied");
      } else {
        setUiState("error");
        setErrorMessage(err.message || "Failed to start workout screen.");
      }
    }
  }, [exerciseKey]);

  // 2. Start Camera and processing loop
  const startCamera = async (
    marker: PoseLandmarker,
    cfg: ExerciseConfig,
    modelData: ModelData
  ) => {
    try {
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

      setUiState("ready");
      startLoop(marker, cfg, modelData);
    } catch (err: any) {
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setUiState("permission_denied");
      } else {
        setUiState("error");
        setErrorMessage(err.message || "Camera access failed.");
      }
    }
  };

  // 3. Frame processing loop
  const startLoop = (
    marker: PoseLandmarker,
    cfg: ExerciseConfig,
    modelData: ModelData
  ) => {
    const loop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const timestamp = performance.now();
        const results = marker.detectForVideo(video, timestamp);

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (results.landmarks && results.landmarks.length > 0) {
          const lms = results.landmarks[0] as NormalizedLandmark[];
          const visible = isBodyVisible(lms, cfg);
          setBodyVisible(visible);

          if (ctx) {
            drawSkeleton(ctx, lms, canvas.width, canvas.height, visible);
          }

          if (visible) {
            const sigs = extractSignals(lms, cfg);
            if (sigs) {
              const features = buildFeatureVector(sigs, cfg);
              const rawPred = predict(modelData, features);

              if (repCounterRef.current) {
                const updateRes = repCounterRef.current.update(rawPred, sigs);
                setConfirmedState(
                  (updateRes.confirmedState || rawPred).toUpperCase()
                );
                setRepCount(updateRes.repCount);
                if (updateRes.repCompleted) {
                  setFeedback(updateRes.feedback || "Good depth!");
                }
              }
            }
          }
        } else {
          setBodyVisible(false);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
  };

  // 4. Teardown on unmount
  useEffect(() => {
    initialize();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, [initialize]);

  // 5. Stop workout handler
  const handleStop = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    stopMediaStream(streamRef.current);
    streamRef.current = null;

    if (onStop) {
      onStop({ reps: repCount, exercise: exerciseKey });
    }
  };

  // Skeleton Drawing Helper (with mirror awareness)
  const drawSkeleton = (
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    w: number,
    h: number,
    isValid: boolean
  ) => {
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
    // Mirror the canvas coordinate space to match scale-x-[-1] on the video
    ctx.translate(w, 0);
    ctx.scale(-1, 1);

    ctx.lineWidth = 5;
    ctx.strokeStyle = isValid ? "#10b981" : "#f59e0b"; // emerald when valid, amber when uncertain

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

    // Joints
    ctx.fillStyle = isValid ? "#38bdf8" : "#fbbf24";
    for (const lm of landmarks) {
      if ((lm.visibility ?? 1) > 0.3) {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, 6, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  const feedbackVariant = getFeedbackVariant(feedback);

  return (
    <div className="relative h-[100dvh] w-screen bg-black overflow-hidden select-none flex flex-col justify-between font-sans">
      {/* 1. Camera Viewport + Skeleton Overlay */}
      <div className="absolute inset-0 w-full h-full">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover scale-x-[-1]"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      </div>

      {/* 2. Top HUD: 2-meter readable rep counter & dynamic feedback */}
      <div className="relative z-10 w-full pt-8 pb-4 px-6 flex flex-col items-center text-center pointer-events-none bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Minimal Exercise & State Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-xs font-bold uppercase tracking-widest text-zinc-300 backdrop-blur-md shadow-lg mb-2">
          <span className="text-emerald-400 font-extrabold">
            {exerciseConfig?.display_name || exerciseKey.toUpperCase()}
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-200">{confirmedState}</span>
        </div>

        {/* Huge Rep Counter (Readable from 2 meters) */}
        <div className="text-8xl sm:text-9xl font-black font-mono tracking-tighter text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)] leading-none my-1">
          {repCount}
        </div>

        {/* Short Feedback Line */}
        {feedback && (
          <div
            className={`mt-2 px-5 py-1.5 rounded-full text-base sm:text-lg font-black tracking-wide uppercase backdrop-blur-md transition-all duration-200 border ${
              feedbackVariant === "good"
                ? "bg-emerald-950/85 text-emerald-400 border-emerald-500/60 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                : "bg-amber-950/85 text-amber-400 border-amber-500/60 shadow-[0_0_24px_rgba(245,158,11,0.35)]"
            }`}
          >
            {feedback}
          </div>
        )}

        {/* Live Warning: Body Not Fully Visible */}
        {!bodyVisible && uiState === "ready" && (
          <div className="mt-4 px-4 py-2 rounded-xl bg-amber-950/90 border border-amber-500/70 text-amber-300 text-xs sm:text-sm font-bold shadow-2xl backdrop-blur-md animate-pulse flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>Step back — ensure your full body is visible</span>
          </div>
        )}
      </div>

      {/* 3. Bottom Action Bar: Big Stop Button */}
      <div className="relative z-10 w-full pb-8 pt-4 px-6 flex justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <button
          onClick={handleStop}
          className="w-full max-w-xs h-16 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-lg uppercase tracking-wider rounded-2xl shadow-[0_8px_30px_rgba(220,38,38,0.5)] border border-red-500 transition-all flex items-center justify-center gap-2"
        >
          <span className="w-3.5 h-3.5 bg-white rounded-sm inline-block"></span>
          <span>Stop Workout</span>
        </button>
      </div>

      {/* 4. State: Camera Loading */}
      {uiState === "loading" && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping"></div>
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-xl font-extrabold text-emerald-400 mb-2">
            Starting Camera & AI
          </h2>
          <p className="text-sm text-zinc-400 max-w-xs">
            Loading MediaPipe Pose and {exerciseKey} classifier into your browser...
          </p>
        </div>
      )}

      {/* 5. State: Camera Permission Denied */}
      {uiState === "permission_denied" && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-20 h-20 rounded-full bg-red-950/80 border border-red-500/50 flex items-center justify-center text-3xl mb-6 shadow-2xl">
            📷🚫
          </div>
          <h2 className="text-2xl font-black text-red-400 mb-2">
            Camera Access Denied
          </h2>
          <p className="text-sm text-zinc-300 max-w-xs mb-4">
            FitVision processes your video 100% locally on your device. Video never leaves your phone or computer.
          </p>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 text-left max-w-xs mb-6 space-y-1">
            <p className="font-bold text-zinc-200 mb-1">To enable camera:</p>
            <p>1. Tap the lock/tune icon in your browser address bar.</p>
            <p>2. Allow "Camera" permission.</p>
            <p>3. Tap "Try Again" below.</p>
          </div>
          <button
            onClick={initialize}
            className="w-full max-w-xs h-14 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-black font-extrabold text-base rounded-xl shadow-lg transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* 6. State: Generic Error */}
      {uiState === "error" && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-16 h-16 rounded-full bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-2xl mb-4">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-amber-400 mb-2">
            Unable to Start Workout
          </h2>
          <p className="text-sm text-zinc-400 max-w-xs mb-6 font-mono">
            {errorMessage}
          </p>
          <button
            onClick={initialize}
            className="w-full max-w-xs h-14 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold text-base rounded-xl border border-zinc-700 transition"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
