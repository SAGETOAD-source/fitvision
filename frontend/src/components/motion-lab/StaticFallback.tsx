import React from 'react';

interface StaticFallbackProps {
  message?: string;
  isError?: boolean;
  onActivate?: () => void;
}

export default function StaticFallback({
  message = '2D Biomechanical Demonstration Fallback',
  isError = false,
  onActivate,
}: StaticFallbackProps) {
  const statusText = isError
    ? 'STATIC SCHEMATIC (NO WEBGL)'
    : onActivate
    ? '2D BIOMECHANICAL PREVIEW'
    : 'INITIALIZING 3D CANVAS';

  return (
    <div
      className="relative w-full h-full min-h-[460px] rounded-3xl bg-[#0B0B0C] border border-[#1A1A1E] flex flex-col items-center justify-between p-6 sm:p-8 select-none overflow-hidden"
    >
      {/* Top Status Header */}
      <div className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isError || onActivate ? 'bg-[#FF4D6D]' : 'bg-[#FF4D6D] animate-pulse'
            }`}
          />
          <span className="font-mono text-xs font-semibold tracking-widest uppercase text-white/80">
            {statusText}
          </span>
        </div>
        <span className="font-mono text-[10px] tracking-wider uppercase text-neutral-400 bg-[#161618] border border-[#1A1A1E] px-2.5 py-1 rounded-full">
          2D VECTOR FALLBACK
        </span>
      </div>

      {/* Center 2D SVG Anatomical Kinematic Diagram */}
      <div className="relative w-full max-w-md aspect-[4/3] my-auto flex items-center justify-center">
        <svg
          role="img"
          aria-label="2D anatomical schematic showing squat descent trajectory and joint angle"
          viewBox="0 0 400 300"
          className="w-full h-full text-white"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>2D Anatomical Squat Kinematic Schematic</title>
          {/* Ground Line */}
          <line
            x1="40"
            y1="260"
            x2="360"
            y2="260"
            stroke="#1A1A1E"
            strokeWidth="3"
            strokeDasharray="4 4"
          />
          <text
            x="360"
            y="275"
            textAnchor="end"
            fill="#71717A"
            fontSize="10"
            fontFamily="monospace"
          >
            GROUND PLANE (Y = 0)
          </text>

          {/* Standing Leg Silhouette (Muted White/Grey) */}
          <g opacity="0.35">
            {/* Torso */}
            <line x1="200" y1="90" x2="200" y2="160" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
            {/* Head */}
            <circle cx="200" cy="70" r="14" fill="#27272A" stroke="#FFFFFF" strokeWidth="2" />
            {/* Thigh (Femur) */}
            <line x1="200" y1="160" x2="205" y2="215" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            {/* Shank (Tibia) */}
            <line x1="205" y1="215" x2="205" y2="252" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
            {/* Foot */}
            <rect x="195" y="252" width="28" height="8" rx="2" fill="#52525B" />
          </g>

          {/* Squat Bottom Posture (Bold High-Contrast with Signal-Rose Joint Nodes) */}
          <g>
            {/* Torso inclining forward */}
            <line x1="165" y1="150" x2="140" y2="205" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
            {/* Head */}
            <circle cx="178" cy="130" r="14" fill="#18181B" stroke="#FFFFFF" strokeWidth="2.5" />
            {/* Pelvis/Hip Center */}
            <circle cx="140" cy="205" r="5" fill="#FF4D6D" />
            {/* Thigh (Femur) reaching near-parallel */}
            <line x1="140" y1="205" x2="225" y2="210" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
            {/* Knee Joint Node */}
            <circle cx="225" cy="210" r="6" fill="#FF4D6D" stroke="#FFFFFF" strokeWidth="1.5" />
            {/* Shank (Tibia) inclined forward */}
            <line x1="225" y1="210" x2="205" y2="252" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
            {/* Ankle Joint Node */}
            <circle cx="205" cy="252" r="4.5" fill="#FF4D6D" />
            {/* Planted Foot */}
            <rect x="195" y="252" width="30" height="8" rx="2" fill="#A1A1AA" />

            {/* Kinetic Descent Curve */}
            <path
              d="M 200 160 Q 170 180 140 205"
              stroke="#6D001A"
              strokeWidth="2"
              strokeDasharray="3 3"
              fill="none"
            />
            {/* Knee forward travel curve */}
            <path
              d="M 205 215 Q 215 212 225 210"
              stroke="#FF4D6D"
              strokeWidth="2"
              strokeDasharray="2 2"
              fill="none"
            />
          </g>

          {/* Callouts */}
          <text x="140" y="228" fill="#FF4D6D" fontSize="10" fontFamily="monospace" fontWeight="bold">
            HIP HINGE
          </text>
          <text x="235" y="214" fill="#FF4D6D" fontSize="10" fontFamily="monospace" fontWeight="bold">
            KNEE PIVOT
          </text>
          <text x="235" y="258" fill="#A1A1AA" fontSize="10" fontFamily="monospace">
            PLANTED FOOT
          </text>
        </svg>
      </div>

      {/* Bottom Information & Disclaimers */}
      <div className="w-full flex flex-col items-center text-center gap-1.5 z-10 pt-2 border-t border-[#1A1A1E]">
        <p className="font-mono text-xs text-white/90 font-medium">
          {message}
        </p>
        {onActivate && (
          <button
            type="button"
            onClick={onActivate}
            className="my-1 px-5 py-2 rounded-full bg-[#1A1A1E] hover:bg-[#6D001A] text-white text-xs font-mono font-bold tracking-wider uppercase border border-[#FF4D6D]/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D6D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0C] shadow-sm cursor-pointer"
            aria-label="Activate interactive 3D simulation"
          >
            Activate 3D Simulation
          </button>
        )}
        <p className="font-mono text-[9px] tracking-widest text-[#FF4D6D] uppercase">
          ILLUSTRATIVE 3D DEMONSTRATION • NOT LIVE CAMERA TRACKING • NOT A FORM STANDARD
        </p>
      </div>

      {/* Screen reader semantic summary table */}
      <table className="sr-only">
        <caption>Biomechanical Squat 5-Phase Kinematic Cycle</caption>
        <thead>
          <tr>
            <th scope="col">Phase</th>
            <th scope="col">Duration</th>
            <th scope="col">Joint Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1. Standing Base</td>
            <td>1.0s</td>
            <td>Upright anatomical posture, extended knees</td>
          </tr>
          <tr>
            <td>2. Controlled Descent</td>
            <td>2.0s</td>
            <td>Hips hinge down and backward, knees travel forward</td>
          </tr>
          <tr>
            <td>3. Parallel Bottom</td>
            <td>1.0s</td>
            <td>Femur reaches parallel to floor, stable center of gravity</td>
          </tr>
          <tr>
            <td>4. Concentric Ascent</td>
            <td>2.0s</td>
            <td>Synchronous extension of hips and knees upward</td>
          </tr>
          <tr>
            <td>5. Lockout Pause</td>
            <td>1.0s</td>
            <td>Return to neutral upright lockout</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
