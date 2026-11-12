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

          {/* Standing Athletic Female Silhouette (Muted White/Grey) */}
          <g opacity="0.30">
            {/* Athletic Head & Ponytail */}
            <circle cx="200" cy="65" r="12" fill="#27272A" stroke="#FFFFFF" strokeWidth="1.8" />
            <path d="M 192 64 C 185 64 180 72 178 78 C 182 78 188 74 191 69 Z" fill="#71717A" />
            {/* Neck */}
            <line x1="200" y1="77" x2="200" y2="88" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
            {/* Sports Top & Tapered Athletic Torso */}
            <path d="M 194 88 L 206 88 L 204 125 L 196 125 Z" fill="#3F3F46" stroke="#FFFFFF" strokeWidth="1.5" />
            {/* Defined Waist & High-Waist Leggings */}
            <path d="M 196 125 L 204 125 L 206 158 L 193 158 Z" fill="#27272A" stroke="#FFFFFF" strokeWidth="1.5" />
            {/* Thigh (Femur with Quad Sweep) */}
            <path d="M 196 158 Q 206 185 204 215 L 198 215 Q 194 185 196 158 Z" fill="#52525B" stroke="#FFFFFF" strokeWidth="1.2" />
            {/* Shank (Tibia with Athletic Calf) */}
            <path d="M 204 215 Q 207 232 204 252 L 199 252 Q 199 232 201 215 Z" fill="#52525B" stroke="#FFFFFF" strokeWidth="1.2" />
            {/* Athletic Trainer Shoe */}
            <path d="M 194 252 L 216 252 L 218 258 L 192 258 Z" fill="#71717A" />
          </g>

          {/* Squat Bottom Posture (Bold High-Contrast Female Athletic Demonstrator with Signal-Rose Joint Nodes) */}
          <g>
            {/* Athletic Head with High Ponytail */}
            <circle cx="178" cy="122" r="13" fill="#18181B" stroke="#FFFFFF" strokeWidth="2.2" />
            {/* Ponytail plume */}
            <path d="M 169 122 C 160 120 152 128 148 135 C 154 135 162 131 168 126 Z" fill="#FF4D6D" opacity="0.85" />
            {/* Neck */}
            <line x1="174" y1="134" x2="168" y2="145" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />

            {/* Athletic Torso with Sports Top & Tapered Waist (Inclined Forward) */}
            <path
              d="M 172 145 C 164 158 152 178 142 205 C 134 200 134 188 142 175 C 150 162 160 148 172 145 Z"
              fill="#27272A"
              stroke="#FFFFFF"
              strokeWidth="2"
            />

            {/* Contoured Muscular Thigh with Quad Sweep (Parallel Depth) */}
            <path
              d="M 140 205 Q 180 198 225 210 Q 180 218 140 205 Z"
              fill="#3F3F46"
              stroke="#FFFFFF"
              strokeWidth="2"
            />

            {/* Contoured Shank with Defined Calf Curve */}
            <path
              d="M 225 210 Q 220 230 205 252 Q 212 232 225 210 Z"
              fill="#3F3F46"
              stroke="#FFFFFF"
              strokeWidth="2"
            />

            {/* Athletic Training Shoe */}
            <path d="M 195 252 L 222 252 L 225 258 L 193 258 Z" fill="#A1A1AA" stroke="#FFFFFF" strokeWidth="1" />

            {/* Biomechanical Hip Joint Node */}
            <circle cx="140" cy="205" r="5.5" fill="#FF4D6D" stroke="#FFFFFF" strokeWidth="1.5" />

            {/* Biomechanical Knee Joint Node */}
            <circle cx="225" cy="210" r="6.5" fill="#FF4D6D" stroke="#FFFFFF" strokeWidth="1.8" />

            {/* Biomechanical Ankle Joint Node */}
            <circle cx="205" cy="252" r="4.5" fill="#FF4D6D" stroke="#FFFFFF" strokeWidth="1.2" />

            {/* Kinetic Hip Descent Path */}
            <path
              d="M 200 160 Q 170 180 140 205"
              stroke="#6D001A"
              strokeWidth="2"
              strokeDasharray="3 3"
              fill="none"
            />
            {/* Knee Forward Travel Path */}
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
