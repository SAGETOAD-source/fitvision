"use client";

import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { ExerciseConfig, ModelData, NormalizedLandmark } from "@/lib/types";
import { RepCounter } from "@/lib/rep_counter";
import { predict } from "@/lib/classifier";
import {
  extractSignals,
  buildFeatureVector,
  POSE_LANDMARKS,
} from "@/lib/pose_utils";

// Baseline benchmark numbers from Python live_predict run on raw_videos/squat.mp4
const PYTHON_BASELINE = {
  totalFrames: 635,
  repCount: 6,
  avgLeftKneeAngle: 126.33,
};

export default function M0Page() {
  const [initStatus, setInitStatus] = useState<string>("Initializing...");
  const [config, setConfig] = useState<ExerciseConfig | null>(null);
  const [model, setModel] = useState<ModelData | null>(null);
  const [landmarker, setLandmarker] = useState<PoseLandmarker | null>(null);

  // Live state
  const [mode, setMode] = useState<"webcam" | "video">("webcam");
  const [repCount, setRepCount] = useState<number>(0);
  const [confirmedState, setConfirmedState] = useState<string>("standing");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [angles, setAngles] = useState<{ left: number; right: number } | null>(
    null
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Parity benchmark state
  const [benchmarkResult, setBenchmarkResult] = useState<{
    totalFrames: number;
    repCount: number;
    avgAngle: number;
    angleDelta: number;
    repEvents: Array<{ frame: number; rep: number; feedback: string }>;
    isFinished: boolean;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const repCounterRef = useRef<RepCounter | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const anglesHistoryRef = useRef<number[]>([]);
  const frameCountRef = useRef<number>(0);
  const repEventsRef = useRef<
    Array<{ frame: number; rep: number; feedback: string }>
  >([]);

  // 1. Fetch config and model
  useEffect(() => {
    async function loadAssets() {
      try {
        setInitStatus("Fetching exercise configuration from /v1/exercises...");
        let squatConfig: ExerciseConfig;

        try {
          const resp = await fetch("http://localhost:8000/v1/exercises");
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.json();
          squatConfig = data.exercises.squat;
        } catch {
          // Fallback to static snapshot if local backend isn't up
          setInitStatus("Backend offline: loading bundled exercise snapshot...");
          const snapResp = await fetch("/exercises_snapshot.json");
          const data = await snapResp.json();
          squatConfig = data.exercises.squat;
        }
        setConfig(squatConfig);
        repCounterRef.current = new RepCounter("squat", squatConfig);

        setInitStatus("Loading exported Random Forest model (/models/squat.json)...");
        const modelResp = await fetch("/models/squat.json");
        if (!modelResp.ok) throw new Error("Failed to load /models/squat.json");
        const modelData: ModelData = await modelResp.json();
        setModel(modelData);

        setInitStatus("Initializing MediaPipe PoseLandmarker...");
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

        setInitStatus("Ready");
      } catch (err: any) {
        console.error("Initialization error:", err);
        setInitStatus(`Error: ${err.message || String(err)}`);
      }
    }
    loadAssets();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  // 2. Start / Stop Webcam
  const startWebcam = async () => {
    if (!videoRef.current || !landmarker || !config || !model) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsRunning(true);
      setMode("webcam");
      repCounterRef.current?.reset();
      setRepCount(0);
      setFeedback(null);
      processWebcamLoop();
    } catch (err: any) {
      alert("Failed to access camera: " + err.message);
    }
  };

  const stopWebcam = () => {
    setIsRunning(false);
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // 3. Live Webcam processing loop
  const processWebcamLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !landmarker || !config || !model) return;

    if (video.readyState >= 2) {
      const timestamp = performance.now();
      const results = landmarker.detectForVideo(video, timestamp);

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      if (results.landmarks && results.landmarks.length > 0) {
        const rawLms = results.landmarks[0] as NormalizedLandmark[];
        if (ctx) drawPose(ctx, rawLms, canvas.width, canvas.height);

        const sigs = extractSignals(rawLms, config);
        if (sigs) {
          setAngles({ left: Math.round(sigs.left), right: Math.round(sigs.right) });
          const features = buildFeatureVector(sigs, config);
          const rawPred = predict(model, features);

          if (repCounterRef.current) {
            const updateRes = repCounterRef.current.update(rawPred, sigs);
            setConfirmedState(updateRes.confirmedState || rawPred);
            setRepCount(updateRes.repCount);
            if (updateRes.repCompleted) {
              setFeedback(updateRes.feedback || "Rep completed!");
            }
          }
        }
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(processWebcamLoop);
  };

  // 4. Video file parity benchmark runner
  const handleVideoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !videoRef.current || !config || !model || !landmarker) return;

    stopWebcam();
    setMode("video");
    const videoUrl = URL.createObjectURL(file);
    const video = videoRef.current;
    video.srcObject = null;
    video.src = videoUrl;

    anglesHistoryRef.current = [];
    frameCountRef.current = 0;
    repEventsRef.current = [];
    repCounterRef.current?.reset();
    setRepCount(0);
    setFeedback(null);
    setBenchmarkResult(null);

    video.onloadeddata = () => {
      setIsRunning(true);
      video.play();
      processVideoBenchmarkLoop();
    };
  };

  const processVideoBenchmarkLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !landmarker || !config || !model) return;

    if (video.ended || video.paused) {
      if (video.ended) {
        finishBenchmark();
      }
      return;
    }

    if (video.readyState >= 2) {
      const timestamp = performance.now();
      const results = landmarker.detectForVideo(video, timestamp);
      frameCountRef.current += 1;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      if (results.landmarks && results.landmarks.length > 0) {
        const rawLms = results.landmarks[0] as NormalizedLandmark[];
        if (ctx) drawPose(ctx, rawLms, canvas.width, canvas.height);

        const sigs = extractSignals(rawLms, config);
        if (sigs) {
          anglesHistoryRef.current.push(sigs.left);
          setAngles({ left: Math.round(sigs.left), right: Math.round(sigs.right) });
          const features = buildFeatureVector(sigs, config);
          const rawPred = predict(model, features);

          if (repCounterRef.current) {
            const updateRes = repCounterRef.current.update(rawPred, sigs);
            setConfirmedState(updateRes.confirmedState || rawPred);
            setRepCount(updateRes.repCount);
            if (updateRes.repCompleted) {
              const fb = updateRes.feedback || "Good depth!";
              setFeedback(fb);
              repEventsRef.current.push({
                frame: frameCountRef.current,
                rep: updateRes.repCount,
                feedback: fb,
              });
            }
          }
        }
      }
    }

    animationFrameIdRef.current = requestAnimationFrame(processVideoBenchmarkLoop);
  };

  const finishBenchmark = () => {
    setIsRunning(false);
    const totalFrames = frameCountRef.current;
    const repCount = repCounterRef.current?.repCount || 0;
    const avgAngle =
      anglesHistoryRef.current.length > 0
        ? anglesHistoryRef.current.reduce((a, b) => a + b, 0) /
          anglesHistoryRef.current.length
        : 0;

    const angleDelta = Math.abs(avgAngle - PYTHON_BASELINE.avgLeftKneeAngle);

    setBenchmarkResult({
      totalFrames,
      repCount,
      avgAngle: Number(avgAngle.toFixed(2)),
      angleDelta: Number(angleDelta.toFixed(2)),
      repEvents: [...repEventsRef.current],
      isFinished: true,
    });
  };

  // Helper: Draw Pose skeleton on canvas
  const drawPose = (
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    w: number,
    h: number
  ) => {
    // Key connections for squat (hips -> knees -> ankles)
    const connections = [
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
      [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
      [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
      [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
      [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
      [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
      [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
    ];

    ctx.lineWidth = 4;
    ctx.strokeStyle = "#10b981"; // emerald

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

    // Draw joints
    ctx.fillStyle = "#38bdf8"; // sky blue
    for (const lm of landmarks) {
      if ((lm.visibility ?? 1) > 0.3) {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center mb-6 border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black text-emerald-400">
            FitVision M0 Parity Prototype
          </h1>
          <p className="text-xs text-slate-400">
            In-Browser MediaPipe.js + Random Forest Squat Rep Counter
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              initStatus === "Ready"
                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                : "bg-amber-950 text-amber-400 border border-amber-800"
            }`}
          >
            {initStatus}
          </span>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Video Viewport */}
        <div className="md:col-span-2 flex flex-col items-center bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-contain"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />

            {!isRunning && (
              <div className="text-center p-6 bg-slate-900/90 rounded-lg border border-slate-700 max-w-xs z-10">
                <p className="text-sm font-medium text-slate-300 mb-4">
                  Camera is inactive. Choose a mode below to start:
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={startWebcam}
                    disabled={initStatus !== "Ready"}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-sm rounded shadow transition"
                  >
                    Start Live Webcam
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="w-full mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              {isRunning && (
                <button
                  onClick={stopWebcam}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-xs font-bold rounded shadow transition"
                >
                  Stop
                </button>
              )}
              <button
                onClick={() => {
                  repCounterRef.current?.reset();
                  setRepCount(0);
                  setFeedback(null);
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded border border-slate-700 transition"
              >
                Reset Reps
              </button>
            </div>

            {/* Benchmark File Input */}
            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-xs font-bold rounded shadow transition flex items-center gap-1">
                <span>Benchmark Video (squat.mp4)</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileSelected}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: HUD & Metrics */}
        <div className="flex flex-col gap-4">
          {/* Big Rep Counter Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center shadow-xl">
            <div className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-1">
              Squat Reps
            </div>
            <div className="text-7xl font-black text-emerald-400 my-2 tracking-tighter">
              {repCount}
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
              State: <span className="ml-1 text-emerald-400">{confirmedState}</span>
            </div>

            {feedback && (
              <div
                className={`mt-4 p-2 text-sm font-bold rounded-lg border ${
                  feedback.includes("Good")
                    ? "bg-emerald-950/80 border-emerald-700 text-emerald-300"
                    : "bg-amber-950/80 border-amber-700 text-amber-300"
                }`}
              >
                {feedback}
              </div>
            )}
          </div>

          {/* Real-time Angle Signals */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Live Joint Angles
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Left Knee (Primary)</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {angles ? `${angles.left}°` : "--"}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-75"
                    style={{
                      width: angles ? `${Math.min(100, (angles.left / 180) * 100)}%` : "0%",
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Right Knee</span>
                  <span className="font-mono text-sky-400 font-bold">
                    {angles ? `${angles.right}°` : "--"}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full transition-all duration-75"
                    style={{
                      width: angles ? `${Math.min(100, (angles.right / 180) * 100)}%` : "0%",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Parity Baseline Rules Info */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="font-bold text-slate-300">M0 Parity Exit Criteria</div>
            <div>• Reps on squat.mp4 must equal Python (6 reps).</div>
            <div>• Mean angle difference must be &lt; 5.0°.</div>
            <div>• Leaf probabilities summed with Math.fround.</div>
          </div>
        </div>
      </div>

      {/* Benchmark Scorecard (Appears when video benchmark completes) */}
      {benchmarkResult && (
        <div className="w-full max-w-4xl mt-6 bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center justify-between">
            <span>Video Parity Scorecard: squat.mp4</span>
            <span
              className={`px-3 py-1 text-xs rounded-full font-bold ${
                benchmarkResult.repCount === PYTHON_BASELINE.repCount &&
                benchmarkResult.angleDelta < 5.0
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                  : "bg-red-950 text-red-400 border border-red-700"
              }`}
            >
              {benchmarkResult.repCount === PYTHON_BASELINE.repCount &&
              benchmarkResult.angleDelta < 5.0
                ? "PARITY CRITERIA PASSED"
                : "PARITY CRITERIA FAILED"}
            </span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="py-2">Metric</th>
                  <th className="py-2">Python Baseline</th>
                  <th className="py-2">Browser Result</th>
                  <th className="py-2">Delta</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                <tr>
                  <td className="py-2 font-medium">Rep Count</td>
                  <td className="py-2 font-mono">{PYTHON_BASELINE.repCount} reps</td>
                  <td className="py-2 font-mono font-bold text-emerald-400">
                    {benchmarkResult.repCount} reps
                  </td>
                  <td className="py-2 font-mono">
                    {Math.abs(benchmarkResult.repCount - PYTHON_BASELINE.repCount)}
                  </td>
                  <td className="py-2 font-bold text-emerald-400">
                    {benchmarkResult.repCount === PYTHON_BASELINE.repCount
                      ? "PASS"
                      : "FAIL"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Left Knee Mean Angle</td>
                  <td className="py-2 font-mono">{PYTHON_BASELINE.avgLeftKneeAngle}°</td>
                  <td className="py-2 font-mono font-bold text-emerald-400">
                    {benchmarkResult.avgAngle}°
                  </td>
                  <td className="py-2 font-mono">{benchmarkResult.angleDelta}°</td>
                  <td className="py-2 font-bold text-emerald-400">
                    {benchmarkResult.angleDelta < 5.0 ? "PASS (< 5°)" : "FAIL (>= 5°)"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Total Frames Processed</td>
                  <td className="py-2 font-mono">{PYTHON_BASELINE.totalFrames}</td>
                  <td className="py-2 font-mono">{benchmarkResult.totalFrames}</td>
                  <td className="py-2 font-mono">
                    {Math.abs(benchmarkResult.totalFrames - PYTHON_BASELINE.totalFrames)}
                  </td>
                  <td className="py-2 text-slate-400">INFO</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
