import React from 'react';

export type CameraPreset = 'profile' | 'isometric' | 'front';

interface MotionLabControlsProps {
  currentView: CameraPreset;
  onViewChange: (view: CameraPreset) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  calculatedAngle: number;
  currentPhase: string;
}

export default function MotionLabControls({
  currentView,
  onViewChange,
  isPlaying,
  onTogglePlay,
  calculatedAngle,
  currentPhase,
}: MotionLabControlsProps) {
  return (
    <div className="w-full flex flex-col gap-4 bg-[#0B0B0C] border border-[#1A1A1E] rounded-3xl p-5 sm:p-6 shadow-2xl">
      {/* Top Row: Camera View Selector & Playback Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1A1A1E]">
        {/* Camera Preset Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="font-mono text-[11px] text-white/50 uppercase tracking-wider mr-1 hidden sm:inline">
            Camera:
          </span>
          <button
            type="button"
            onClick={() => onViewChange('profile')}
            aria-pressed={currentView === 'profile'}
            className={`px-3.5 py-1.5 rounded-full font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D6D] ${
              currentView === 'profile'
                ? 'bg-[#6D001A] text-white border border-[#FF4D6D]/40 shadow-sm'
                : 'bg-[#161618] text-white/70 hover:text-white border border-[#1A1A1E]'
            }`}
          >
            Profile (Default)
          </button>
          <button
            type="button"
            onClick={() => onViewChange('isometric')}
            aria-pressed={currentView === 'isometric'}
            className={`px-3.5 py-1.5 rounded-full font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D6D] ${
              currentView === 'isometric'
                ? 'bg-[#6D001A] text-white border border-[#FF4D6D]/40 shadow-sm'
                : 'bg-[#161618] text-white/70 hover:text-white border border-[#1A1A1E]'
            }`}
          >
            45° Isometric
          </button>
          <button
            type="button"
            onClick={() => onViewChange('front')}
            aria-pressed={currentView === 'front'}
            className={`px-3.5 py-1.5 rounded-full font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D6D] ${
              currentView === 'front'
                ? 'bg-[#6D001A] text-white border border-[#FF4D6D]/40 shadow-sm'
                : 'bg-[#161618] text-white/70 hover:text-white border border-[#1A1A1E]'
            }`}
          >
            Front (0°)
          </button>
        </div>

        {/* Playback Control Button */}
        <button
          type="button"
          onClick={onTogglePlay}
          aria-pressed={!isPlaying}
          aria-label={isPlaying ? 'Pause 3D movement cycle' : 'Resume 3D movement cycle'}
          className="px-4 py-1.5 rounded-full bg-[#161618] hover:bg-[#202024] text-white border border-[#1A1A1E] font-mono text-xs font-semibold uppercase tracking-wider transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D6D] flex items-center gap-2"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isPlaying ? 'bg-[#FF4D6D] animate-pulse' : 'bg-white/40'
            }`}
          />
          <span>{isPlaying ? 'Pause Movement' : 'Resume Movement'}</span>
        </button>
      </div>

      {/* Middle Row: Phase Badge & Real-Time Angle Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        {/* Phase Indicator */}
        <div className="flex flex-col gap-1.5 bg-[#121214] border border-[#1A1A1E] rounded-2xl p-4">
          <span className="font-mono text-[10px] text-white/50 tracking-widest uppercase">
            Kinematic Squat Cycle (7.0s)
          </span>
          <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wide">
            {currentPhase}
          </span>
          <span className="text-[11px] text-neutral-400">
            Planted feet (y = 0.0), smooth parametric hip hinge &amp; forward knee flexion.
          </span>
        </div>

        {/* Calculated Angle Display */}
        <div className="flex flex-col gap-1 bg-[#121214] border border-[#1A1A1E] rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-[#FF4D6D] tracking-widest uppercase font-bold">
              CALCULATED MODEL JOINT ANGLE
            </span>
            <span className="w-2 h-2 rounded-full bg-[#FF4D6D]" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-mono text-3xl sm:text-4xl font-extrabold text-white tabular-nums tracking-tight">
              {Math.round(calculatedAngle)}°
            </span>
            <span className="font-mono text-xs text-white/60 uppercase">
              Interior Knee Angle
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-0.5">
            Evaluated live via vector dot product arccos((u·v)/(|u||v|)).
          </span>
        </div>
      </div>

      {/* Mandatory Disclaimers Strip */}
      <div className="pt-2 text-center border-t border-[#1A1A1E]/80">
        <p className="font-mono text-[10px] tracking-wider text-neutral-400 uppercase">
          ILLUSTRATIVE 3D DEMONSTRATION • NOT LIVE CAMERA TRACKING • NOT A FORM STANDARD
        </p>
      </div>
    </div>
  );
}
