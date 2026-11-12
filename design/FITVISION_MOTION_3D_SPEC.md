# FITVISION — Motion Design & Interactive 3D Specification

**Document Version:** 1.0.0  
**Status:** Approved Architecture & Creative Specification  
**Branch:** `chore/motion-3d-spec`  
**Target Environments:** Modern Web Browsers (Desktop & Mobile), Next.js 14 App Router, React 18  

---

## 1. Executive Summary & Creative Direction

### 1.1 Creative Vision
**"PREMIUM ATHLETIC EDITORIAL + CINEMATIC MOTION + PURPOSEFUL BIOMECHANICAL 3D"**

FitVision bridges international high-performance sports editorial with precision on-device computer vision. Motion design and 3D visualization must elevate the product's identity as an elite, private, scientific training platform. Every transition, joint indicator, and kinetic element serves a clear informational purpose.

### 1.2 Aesthetic Guardrails & Strict Prohibitions
To preserve brand integrity and avoid SaaS or gaming clichés:
- **No Gaming Tropes:** No cyan/purple cyberpunk neon, glitch shaders, decorative energy shields, or holographic scanning grids.
- **No Decorative 3D Clutter:** No floating geometric cubes, spinning rings, ambient dust particles, or ungrounded props.
- **No Unnecessary Perpetual Floating:** No hovering, bobbing, or restless oscillation of UI cards. UI surfaces enter with purpose and lock stably into position.
- **No Aggressive Scroll Hijacking:** Native browser smooth scrolling is strictly preserved. No locked scroll-jacked viewports, virtual scroll overriding, or momentum manipulation.
- **No Unverified Claims:** The 3D model is explicitly labeled as a synthetic biomechanical demonstration. Real-time joint angles displayed in 3D are calculated dynamically from model geometry, never presented as an invented target "ideal" or live user telemetry.

---

## 2. Visual Palette & Typographic Mapping

| Element | Hex Code / Value | Usage in Motion & 3D |
|---|---|---|
| **Pitch Black** | `#000000` | Primary viewport backdrop, canvas background clear color |
| **Carbon Base** | `#0B0B0C` | Mannequin limb material base, card surfaces |
| **Dark Graphite** | `#161618` | Procedural mannequin body segments, secondary bevels |
| **Borders / Grid** | `#1A1A1E` | Dimensional reference ground plane, telemetry borders |
| **Burgundy Accent** | `#6D001A` | Primary interactive buttons, subtle rim lighting accent |
| **Signal Rose** | `#FF4D6D` | Restrained joint node indicators, tracked apex points |
| **Pure White** | `#FFFFFF` | Primary headlines, active telemetry readouts |
| **Muted Silver** | `#A68A8A` / `#D1D5DB` | Secondary captions, degree degree symbols, anatomical labels |

### Typographic System
- **Headlines:** `Montserrat ExtraBold 800` (Uppercase, tight letter-spacing `-0.03em`)
- **Body & Metrics:** `Inter` (Regular 400, Medium 500, SemiBold 600, Mono tabular numbers for angles/reps)
- **Editorial Accent:** `Lora Italic` (Normal 400, Title-case or Uppercase editorial emphasis)

---

## 3. Hero Motion Choreography

The hero entrance establishes cinematic authority through a quiet, sequential reveal within the first 1.2 seconds of page load.

```
Time (ms)  0ms        200ms       400ms       600ms       800ms       1000ms      1200ms
Headline   [-- L1: YOUR BODY. --]
           [-- L2: YOUR DATA. --]
                       [-- L3: YOUR EVOLUTION. (Italic) --]
Athlete    [===== Micro-scale settle (1.02 -> 1.00) =====]
HUD Card                           [-- Slide & Opacity Settle --]
Telemetry                                      [-- Joint Node Signal Rose Pulse --]
```

### 3.1 Headline Line-by-Line Reveal
- **Structure:** 3 discrete line containers with `overflow: hidden`.
  - Line 1: `YOUR BODY.` — `yPercent: 100` to `0`, `opacity: 0` to `1`, duration: `0.75s`, ease: `power3.out`.
  - Line 2: `YOUR DATA.` — begins at `+120ms` stagger, identical curve.
  - Line 3: `YOUR EVOLUTION.` (Lora Italic) — begins at `+240ms` stagger, duration: `0.85s`, ease: `power2.out` with subtle letter-spacing stabilization.
- **Reduced Motion:** If `prefers-reduced-motion` is active, headline renders instantly at full opacity with zero translation.

### 3.2 Hero Athlete Photograph Treatment
- **Initial Load:** Single soft scale settle from `scale: 1.02` to `scale: 1.00` over `1.2s` (`power2.out`).
- **Interactive Parallax (Desktop Only):** Subtle pointer-driven micro-parallax clamped to a maximum offset of `±6px` on the X-axis and `±4px` on the Y-axis.
  - Formula: $T_x = (X_{\text{cursor}} - X_{\text{center}}) \times 0.012$
  - Easing: Damped spring interpolation (`lerp: 0.08`).
  - Mobile: Parallax is completely disabled. Zero device-motion / gyroscope permissions are requested.

### 3.3 Illustrative Workout HUD Entrance
- **Entrance:** Staggered `+400ms` after headline initiation.
  - Initial state: `x: +16px`, `opacity: 0`.
  - Final state: `x: 0px`, `opacity: 1`, duration: `0.65s`, ease: `power2.out`.
- **Steady State:** Firmly docked; zero continuous floating or bobbing.
- **Telemetry Beacon:** A single 6px Signal Rose (`#FF4D6D`) indicator pip exhibits a slow, restrained rhythmic pulse:
  - Keyframes: `opacity: 1.0` (0s) → `opacity: 0.45` (1.2s) → `opacity: 1.0` (2.4s).

---

## 4. Signature 3D Biomechanical Demonstrator

The signature interactive feature is a dedicated 3D biomechanical visualization demonstrating the anatomy of a correct squat cycle. It serves as an educational bridge between the user's body and FitVision's on-device computer vision engine.

```
        [ Head / Cranium ]
               |
        [ Cervical Spine ]
               |
        [ Thoracic Cage ] === [ Shoulders / Humerus ]
               |
        [ Lumbar Spine ]
               |
          [ Pelvis ]
         /          \
    (Hip Node)    (Hip Node)   <-- #FF4D6D Joint Node
        |              |
    [ Femur ]      [ Femur ]
        |              |
   (Knee Node)    (Knee Node)  <-- #FF4D6D Dynamic Angle Arc
        |              |
    [ Tibia ]      [ Tibia ]
        |              |
  (Ankle Node)   (Ankle Node)
        |              |
     [ Foot ]       [ Foot ]
```

### 4.1 Procedural Mannequin Architecture (vs. External Rigged Asset)
**Decision:** We evaluate and specify a **custom procedural articulated mannequin** built directly using Three.js / React Three Fiber primitives:
- **Zero Asset Payload:** 0 KB GLTF/GLB download, eliminating network latency, asset decoding delays, and CDN failure modes.
- **Precise Anatomical Hierarchy:** Assembled from geometric primitives:
  - Pelvis & Torso: Chamfered rounded boxes and tapered cylinders (`CylinderGeometry`).
  - Limbs: Articulated capsules (`CapsuleGeometry`) representing thighs, shanks, arms.
  - Joint Articulations: Spheres (`SphereGeometry`) positioned exactly at joint pivot centers.
- **Total Polygon Budget:** $\approx 1,850$ triangles total, guaranteeing 60 FPS across low-tier mobile GPUs.
- **Direct Mathematical Control:** Joint rotations are driven directly via parent-child `Group` transforms, guaranteeing 100% stable angle calculation without animation rig de-syncing.

### 4.2 Five-Phase Kinematic Squat Cycle
The animation loop is a continuous, anatomically verified kinematic cycle running on a 7.0-second period:

| Phase | Time Window | Biomechanical Action | Hip State | Knee State |
|---|---|---|---|---|
| **1. Standing Base** | 0.0s – 1.0s | Upright anatomical posture, stable core | Neutral ($180^\circ$) | Full extension ($180^\circ$) |
| **2. Controlled Descent** | 1.0s – 3.0s | Smooth hip hinge with simultaneous knee flexion | Flexion ($180^\circ \to 95^\circ$) | Flexion ($180^\circ \to 90^\circ$) |
| **3. Parallel Inflexion** | 3.0s – 4.0s | Brief deceleration at target parallel depth | Inflexion plateau ($92^\circ$) | Parallel depth ($88^\circ$) |
| **4. Concentric Ascent** | 4.0s – 6.0s | Controlled drive upward, hips and chest rising synchronously | Extension ($92^\circ \to 180^\circ$) | Extension ($88^\circ \to 180^\circ$) |
| **5. Full Lockout Pause** | 6.0s – 7.0s | Return to standing equilibrium before next cycle | Rested ($180^\circ$) | Rested ($180^\circ$) |

### 4.3 Mathematically Computed Joint Telemetry
Angle readouts are **never hardcoded or simulated with arbitrary numbers**. Instead, in every frame:
1. World coordinates of the Hip node ($\vec{P}_{\text{hip}}$), Knee node ($\vec{P}_{\text{knee}}$), and Ankle node ($\vec{P}_{\text{ankle}}$) are sampled:
   $$\vec{u} = \vec{P}_{\text{hip}} - \vec{P}_{\text{knee}}, \quad \vec{v} = \vec{P}_{\text{ankle}} - \vec{P}_{\text{knee}}$$
2. The internal knee flexion angle is calculated:
   $$\theta_{\text{knee}} = \arccos\left(\frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}\right) \times \frac{180}{\pi}$$
3. The computed float is rounded to an integer and projected to the HUD readout in real time.
4. **Mandatory Illustrative Labeling:**
   - Display banner: `CALCULATED MODEL JOINT ANGLE`
   - Explicit disclaimer: `ILLUSTRATIVE 3D DEMONSTRATION • NOT LIVE CAMERA TRACKING`

### 4.4 Shading, Materials & Studio Lighting
- **Mannequin Finish:** `MeshStandardMaterial`
  - Color: `#161618` (Dark Graphite)
  - Roughness: `0.78` (Matte athletic finish, non-reflective)
  - Metalness: `0.15`
- **Joint Nodes:** `MeshBasicMaterial`
  - Color: `#FF4D6D` (Signal Rose)
  - Small spherical beacons at hip and knee centers ($r = 0.035\,\text{m}$)
- **Angle Indicator Arc:** Thin dynamic 3D line strip (`LineBasicMaterial`, `#FF4D6D`, opacity `0.85`) drawn in the sagittal plane between thigh and shank vectors.
- **Lighting Setup:**
  - Key Light: Directional light from top-front-right (`#FFFFFF`, intensity `1.0`).
  - Rim Light: Directional light from rear-left (`#6D001A` deep burgundy, intensity `0.45`), providing subtle athletic edge separation from pitch black.
  - Fill / Ambient: Hemispherical ambient light (`#202024` / `#000000`, intensity `0.3`).
  - Ground Plane: Circular hairline radial grid ($r = 1.4\,\text{m}$, stroke `#1A1A1E`), providing spatial grounding.

### 4.5 User Interaction & Controls
- **Desktop Pointer Interaction:**
  - Orbit rotation via pointer drag with damped inertia (`dampingFactor: 0.05`).
  - Clamped polar angle: $\theta_{\text{polar}} \in [65^\circ, 88^\circ]$ (prevents flipping underneath the ground plane).
  - Clamped azimuth angle: $\theta_{\text{azimuth}} \in [-55^\circ, +55^\circ]$ (maintains focus on frontal/three-quarter movement).
- **Keyboard Accessibility:**
  - Accessible button cluster:
    - `[1] Front View (0°)`
    - `[2] 45° Athletic Isometric`
    - `[3] Profile Sagittal View (90°)`
    - `[Space / K] Pause / Resume Movement`
  - Full keyboard focus ring (`ring-2 ring-[#FF4D6D]`) and screen reader labels.
- **Mobile Interaction:**
  - Touch gestures do not block vertical page scrolling (`touch-action: pan-y`).
  - Simplified interaction: Tap buttons to cycle between Front, 45°, and Profile views. Drag is optional and single-finger horizontal only.
  - Zero device-orientation / gyroscope APIs used.

---

## 5. Scroll Motion Choreography (GSAP & ScrollTrigger)

All page scroll motion strictly adheres to native browser physics. Animations are triggered by intersection thresholds, not scroll hijacking.

```
Viewport Progress    0% (Top) -------- 50% (Active) -------- 100% (Passed)
Trigger Line                 [  ScrollTrigger Enters  ]
Reveal Animation             [ y: 24px -> 0, opacity: 0 -> 1 ]
Stagger Cadence              [ Card 1 -> Card 2 -> Card 3 ]
```

### 5.1 Section-by-Section Storyboard

| Section | ScrollTrigger Start | Motion Pattern | Timing / Easing | Fallback / Reduced Motion |
|---|---|---|---|---|
| **1. Hero** | Page Load | Sequential typographic mask reveal + HUD entry | 0.0s – 1.2s, `power3.out` | Instant full render, 0s duration |
| **2. Privacy Assurance** | `top 80%` | Horizontal card group reveal: subtle upward drift (`y: 20px -> 0`) | Duration `0.6s`, stagger `0.08s`, `power2.out` | Opacity only, 0s duration |
| **3. How It Works** | `top 75%` | Numbered step cards (01, 02, 03) reveal sequentially | Duration `0.55s`, stagger `0.12s`, `power2.out` | Instant full render |
| **4. 3D Biomechanical** | `top 70%` | Canvas fades in; mannequin begins squat cycle from standing rest | Duration `0.8s`, `power2.out`; cycle loops | Static standing model or SVG schematic |
| **5. Supported Exercises** | `top 75%` | 6 exercise cards reveal in 2-row cadence ($3 \times 2$) | Duration `0.5s`, stagger `0.06s`, `power2.out` | Instant full render |
| **6. Engine Pipeline** | `top 80%` | 5 pipeline stages highlight sequentially along connection arrows | Sequential border-glow sweep, `0.1s` per node | Static connected cards |
| **7. Bottom CTA** | `top 85%` | Burgundy container soft scale settle (`scale: 0.98 -> 1.0`) | Duration `0.7s`, `power2.out` | Static full scale |

### 5.2 GSAP Implementation Guidelines
- **Scoping & Cleanup:** Every animation must use the `@gsap/react` `useGSAP` hook with a root reference to ensure automatic timeline reversion when components unmount:
  ```typescript
  useGSAP(() => {
    gsap.from(".reveal-node", {
      scrollTrigger: { trigger: containerRef.current, start: "top 80%" },
      y: 20,
      opacity: 0,
      stagger: 0.08,
      duration: 0.6,
      ease: "power2.out"
    });
  }, { scope: containerRef });
  ```
- **Performance:** Animate strictly GPU-composited properties: `transform` (`x`, `y`, `scale`) and `opacity`. Never animate `width`, `height`, `top`, `margin`, or `padding`.

---

## 6. Performance, Accessibility & Isolation Protocols

### 6.1 Complete Engine Isolation Guardrail
> [!IMPORTANT]
> The interactive 3D component and marketing motion system must remain **100% architecturally isolated** from the live workout screen (`frontend/src/app/workout/page.tsx`) and the MediaPipe vision engine.
> - No WebGL contexts, Three.js libraries, or heavy animation libraries shall be imported into the active camera rep-counting pipeline.
> - The live workout screen maintains its lean, pure 2D Canvas overlay for real-time inference latency integrity.

### 6.2 Dynamic Lazy Loading & Viewport Pausing
- **Code Splitting:** The 3D experience is dynamically loaded using `next/dynamic` with SSR disabled:
  ```typescript
  const BiomechanicalScene = dynamic(
    () => import("@/components/landing/BiomechanicalScene"),
    { ssr: false, loading: () => <BiomechanicalSkeletonFallback /> }
  );
  ```
- **Intersection Observer Rendering Gate:**
  A dedicated `IntersectionObserver` monitors the 3D container. When the component scrolls outside the active viewport:
  - The Three.js render loop is suspended (`gl.setAnimationLoop(null)` or internal state `isRendering = false`).
  - GPU cycles drop to zero until the user scrolls the section back into view.

### 6.3 Mobile GPU Budget & Constraints
- **Device Pixel Ratio (DPR) Clamping:** Mobile retina screens (e.g., DPR 3.0) can exhaust mobile GPU fill rate. We enforce:
  $$\text{DPR}_{\text{clamped}} = \min(\text{window.devicePixelRatio}, 1.5)$$
- **Antialiasing Optimization:** Enable FXAA or lightweight `antialias: false` on mobile devices with high DPI screens.
- **Max Budgets:**
  - Draw Calls: $\le 12$ calls per frame.
  - Triangle Count: $\le 2,500$ triangles total.
  - Memory: $\le 18\,\text{MB}$ total WebGL heap allocation.

### 6.4 Reduced Motion & Accessibility Protocol
- **Media Query Compliance:** The system listens for `window.matchMedia('(prefers-reduced-motion: reduce)')`.
  - When enabled:
    - All GSAP timeline durations are collapsed to `0s` (immediate state resolution).
    - The 3D mannequin halts kinematic cycling and displays a static, upright standing anatomical pose.
    - Pointer auto-rotation is disabled; manual button-based view toggles remain accessible.
- **Screen Reader Support:**
  - The 3D canvas is marked with `role="img"` and `aria-label="Interactive 3D anatomical model demonstrating joint angle tracking during a squat exercise."`
  - A hidden semantic text table summarizes the 5 movement phases for visually impaired users.
- **Static 2D Fallback:**
  If WebGL is unavailable or context creation fails, the component gracefully renders a high-contrast 2D SVG vector schematic of the squat trajectory with zero layout shift.

### 6.5 WebGL Resource Teardown Protocol
To prevent memory leaks during client-side Next.js route transitions, explicit teardown is enforced on unmount:
```typescript
useEffect(() => {
  return () => {
    // 1. Revert GSAP contexts
    ctx.revert();
    // 2. Dispose Three.js geometries and materials
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
    // 3. Force WebGL context release
    renderer.forceContextLoss();
    renderer.dispose();
  };
}, []);
```

---

## 7. Technical Feasibility & Compatibility Matrix

### 7.1 Next.js 14 & React 18 Stack Verification
FitVision's frontend runs on **Next.js 14.2.18** and **React 18.3.1**.

| Library | Target Version Line | React 18 Compatibility Status | Notes |
|---|---|---|---|
| `three` | `^0.169.0` | Verified Compatible | Core WebGL engine. Lightweight modular imports. |
| `@types/three` | `^0.169.0` | Verified Compatible | TypeScript type definitions. |
| `@react-three/fiber` | `^8.17.10` (v8) | **Mandatory React 18 Target** | **Do not use v9** (v9 requires React 19). v8 is fully supported in React 18.3. |
| `@react-three/drei` | `^9.117.x` (v9) | Verified Compatible with R3F v8 | Provides `OrbitControls`, `Html` overlays. |
| `gsap` | `^3.12.5` | Verified Compatible | Industry-standard performant animation engine. |
| `@gsap/react` | `^2.1.1` | Verified Compatible | Official `useGSAP` hook with React 18 Strict Mode cleanup support. |

### 7.2 Implementation Size & Alternative Evaluation
- **Option A (Specified):** R3F v8 + Drei + GSAP.
  - *Gzip Impact:* $\approx 140\,\text{KB}$ total (fully code-split on landing route, 0 KB in workout route).
  - *Advantage:* Declarative JSX scene graph, rapid procedural joint binding, robust React lifecycle.
- **Option B (Ultra-Minimalist Alternative):** Vanilla Three.js wrapped in a custom `useEffect` canvas + lightweight CSS keyframe animations.
  - *Gzip Impact:* $\approx 90\,\text{KB}$ total.
  - *Evaluation:* While slightly smaller, manual Three.js state synchronization with React state increases component complexity. Option A is recommended for reliable maintainability.

---

## 8. Proposed Component Architecture

```
frontend/src/components/landing/
├── motion/
│   ├── MotionHeroText.tsx          # GSAP 3-line headline reveal with Lora Italic accent
│   ├── ScrollSectionWrapper.tsx    # ScrollTrigger intersection reveal wrapper
│   └── TelemetryPulseIndicator.tsx # Restrained signal-rose status beacon
└── biomechanical-3d/
    ├── BiomechanicalDemonstrator.tsx # Client-side dynamic wrapper with IntersectionObserver
    ├── BiomechanicalCanvas.tsx       # R3F Canvas with camera, lighting, and clamped controls
    ├── ProceduralMannequin.tsx       # Kinematic procedural mesh segments and joint spheres
    ├── JointAngleOverlay.tsx         # Real-time mathematical angle readout badge
    └── BiomechanicalFallback.tsx     # Static 2D SVG schematic for no-WebGL / reduced-motion
```

---

## 9. Review Checklist & Deliverables

- [x] Evaluated procedural articulated mannequin (0 KB asset payload) over external rigged character.
- [x] Outlined 5-phase squat cycle with real-time vector angle calculation.
- [x] Preserved strict FitVision visual identity (Black `#000000`, Carbon `#0B0B0C`, Burgundy `#6D001A`, Rose `#FF4D6D`, White `#FFFFFF`).
- [x] Banned aggressive gaming tropes, cyan neon, floating cubes, and scroll-jacking.
- [x] Defined complete performance budgets, mobile DPR clamping, and WebGL resource teardown.
- [x] Verified React 18 / Next.js 14 compatibility using React Three Fiber v8.
- [x] Confirmed zero changes to application code, backend, or live workout screens.
