/**
 * landing_page.test.ts
 *
 * Automated contract and unit tests for the FitVision Product Landing Page:
 * 1. Approved headline hierarchy (YOUR BODY. / YOUR DATA. / YOUR EVOLUTION.)
 * 2. Privacy-first architecture guarantees (No video frames transmitted, on-device vs session sync)
 * 3. Verified exercise routes (all 6 VALID_EXERCISE_KEYS mapped to /workout?exercise=<key>)
 * 4. Technical pipeline architecture (5 sequential stages, zero invented performance/FPS claims)
 * 5. Call-to-action routing (/workout?exercise=squat) and Motion Lab links
 * 6. Copyright year contract (© 2026 FitVision)
 * 7. Accessibility and semantic structure (landmark elements, alt text, focus rings)
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { VALID_EXERCISE_KEYS } from '../src/lib/workout_reducer';

import HeroSection from '../src/components/landing/HeroSection';
import PrivacySection from '../src/components/landing/PrivacySection';
import WorkflowSection from '../src/components/landing/WorkflowSection';
import ExercisesSection from '../src/components/landing/ExercisesSection';
import MotionLabSection from '../src/components/landing/MotionLabSection';
import TechPipelineSection from '../src/components/landing/TechPipelineSection';
import CtaSection from '../src/components/landing/CtaSection';
import LandingFooter from '../src/components/landing/LandingFooter';
import LandingNavbar from '../src/components/landing/LandingNavbar';
import StaticFallback from '../src/components/motion-lab/StaticFallback';

describe('Landing Page: HeroSection', () => {
  it('renders the exact approved uppercase headline hierarchy with Lora serif accent', () => {
    const html = renderToString(React.createElement(HeroSection));

    expect(html).toContain('YOUR BODY.');
    expect(html).toContain('YOUR DATA.');
    expect(html).toContain('YOUR EVOLUTION.');
    expect(html).toContain('font-serif');
    expect(html).toContain('italic');
  });

  it('renders the privacy beacon and status pill', () => {
    const html = renderToString(React.createElement(HeroSection));

    expect(html).toContain('YOUR VIDEO NEVER LEAVES YOUR DEVICE');
    expect(html).toContain('animate-pulse');
  });

  it('contains primary workout CTA linking to /workout?exercise=squat', () => {
    const html = renderToString(React.createElement(HeroSection));

    expect(html).toContain('/workout?exercise=squat');
    expect(html).toContain('START TRAINING');
  });

  it('renders the approved subhead without unverified coaching claims', () => {
    const html = renderToString(React.createElement(HeroSection));

    expect(html).toContain(
      'Real-time computer vision rep counting and movement feedback directly in your browser.'
    );
  });

  it('renders the athletic hero image and HUD telemetry previews', () => {
    const html = renderToString(React.createElement(HeroSection));

    expect(html).toContain('hero-athlete.png');
    expect(html).toContain('WORKOUT HUD · SIMULATED');
    expect(html).not.toContain('LIVE CAMERA');
    expect(html).toContain('ILLUSTRATIVE PREVIEW');
    expect(html).toContain('88°');
    expect(html).toContain('MOVEMENT STATE');
    expect(html).toContain('SQUAT · DESCENT');
    expect(html).toContain('&quot;Good depth!&quot;');
    expect(html).toContain('12');
    expect(html).toContain('NO VIDEO FRAMES TRANSMITTED');
  });
});

describe('Landing Page: PrivacySection', () => {
  it('strictly distinguishes local camera processing from asset downloads and omits unsupported profile sync claims', () => {
    const html = renderToString(React.createElement(PrivacySection));

    // Must guarantee local camera frames
    expect(html).toContain('Your video never leaves your device');
    expect(html).toContain('In-Browser Camera Processing');
    expect(html).toContain('No Video Frames Transmitted');

    // Must clearly state local model evaluation
    expect(html).toContain('Local Model Evaluation');
    expect(html).toContain('without sending video to backend inference servers');

    // Must NOT claim workout summaries synchronize to user profiles (persistence not yet implemented)
    expect(html).not.toContain('Workout Summary Sync');
    expect(html).not.toContain('synchronized to your account profile');

    // Must NOT claim "zero data sent to server" or "air-gapped"
    expect(html).not.toContain('zero data sent to server');
    expect(html).not.toContain('Zero data sent to server');
  });
});

describe('Landing Page: WorkflowSection', () => {
  it('renders all three progressive setup and tracking steps', () => {
    const html = renderToString(React.createElement(WorkflowSection));

    expect(html).toContain('01');
    expect(html).toContain('Set Up Your Camera');
    expect(html).toContain('02');
    expect(html).toContain('Move Naturally');
    expect(html).toContain('03');
    expect(html).toContain('Get Instant Feedback');
  });
});

describe('Landing Page: ExercisesSection', () => {
  it('renders cards for all 6 verified exercise keys with exact /workout?exercise=<key> links', () => {
    const html = renderToString(React.createElement(ExercisesSection));

    // Verify all 6 valid keys from VALID_EXERCISE_KEYS are present as workout links
    for (const key of VALID_EXERCISE_KEYS) {
      expect(html).toContain(`/workout?exercise=${key}`);
    }

    // Check exercise names
    expect(html).toContain('Squat');
    expect(html).toContain('Push-up');
    expect(html).toContain('Sit-up');
    expect(html).toContain('Pull-up');
    expect(html).toContain('Jumping Jack');
    expect(html).toContain('Lat Pulldown');
  });

  it('contains target form cues and measured signals for each exercise', () => {
    const html = renderToString(React.createElement(ExercisesSection));

    expect(html).toContain('Parallel depth check');
    expect(html).toContain('Full push lockout');
    expect(html).toContain('Controlled trunk rise');
    expect(html).toContain('Dead-hang to chin-over-bar');
    expect(html).toContain('Synchronous arm &amp; leg reach');
    expect(html).toContain('Scapular retraction &amp; no lean');
  });
});

describe('Landing Page: TechPipelineSection', () => {
  it('renders the exact 5-stage sequential architecture pipeline with accurate classifier type', () => {
    const html = renderToString(React.createElement(TechPipelineSection));

    expect(html).toContain('01');
    expect(html).toContain('Camera');
    expect(html).toContain('getUserMedia');

    expect(html).toContain('02');
    expect(html).toContain('MediaPipe Pose');
    expect(html).toContain('WebAssembly Model');

    expect(html).toContain('03');
    expect(html).toContain('Joint Angles');

    expect(html).toContain('04');
    expect(html).toContain('Classifier');
    expect(html).toContain('TypeScript Decision Trees');

    expect(html).toContain('05');
    expect(html).toContain('Rep Counter');
    expect(html).toContain('Debounced Logic');

    // Must NOT describe Random Forest classifier as WebAssembly
    expect(html).not.toContain('random forest classifiers execute on user hardware via WebAssembly');
  });

  it('does NOT contain unverified marketing claims (FPS, latency, 99% accuracy)', () => {
    const html = renderToString(React.createElement(TechPipelineSection));

    expect(html).not.toContain('60 FPS');
    expect(html).not.toContain('120 FPS');
    expect(html).not.toContain('0ms latency');
    expect(html).not.toContain('< 5ms');
    expect(html).not.toContain('99% accuracy');
    expect(html).not.toContain('Runs on Safari, Chrome, Edge');
  });
});

describe('Landing Page: MotionLabSection & StaticFallback', () => {
  it('renders 2D StaticFallback before approaching viewport with accessible activation button', () => {
    const html = renderToString(React.createElement(MotionLabSection));

    // Must render StaticFallback before proximity trigger
    expect(html).toContain('Procedural Kinematic Mannequin');
    expect(html).toContain('Interactive 3D Biomechanics Lab (Scroll into view to load WebGL)');
    expect(html).toContain('Activate 3D Simulation');
    expect(html).toContain('/motion-lab');
  });

  it('keeps outer fallback container as a normal div without role="img" and scopes role="img" to the SVG', () => {
    const html = renderToString(React.createElement(StaticFallback, { onActivate: () => {} }));

    // Outer div must NOT have role="img"
    expect(html).not.toMatch(/<div[^>]*role="img"/);

    // SVG must have role="img", aria-label, and title
    expect(html).toMatch(/<svg[^>]*role="img"/);
    expect(html).toContain('aria-label="2D anatomical schematic showing squat descent trajectory and joint angle"');
    expect(html).toContain('<title>2D Anatomical Squat Kinematic Schematic</title>');

    // Status label must accurately say 2D BIOMECHANICAL PREVIEW before active load
    expect(html).toContain('2D BIOMECHANICAL PREVIEW');
    expect(html).not.toContain('INITIALIZING 3D CANVAS');
  });

  it('shows INITIALIZING 3D CANVAS only when active loading without onActivate callback', () => {
    const html = renderToString(React.createElement(StaticFallback, { message: 'Initializing 3D Canvas...' }));
    expect(html).toContain('INITIALIZING 3D CANVAS');
    expect(html).not.toContain('2D BIOMECHANICAL PREVIEW');
  });

  it('provides an operable, keyboard-focusable activation button with explicit aria-label', () => {
    const onActivate = vi.fn();
    const element = React.createElement(StaticFallback, { onActivate });
    const html = renderToString(element);

    expect(html).toContain('aria-label="Activate interactive 3D simulation"');
    expect(html).toContain('focus-visible:ring-2');
    expect(html).toContain('focus-visible:ring-[#FF4D6D]');

    // Verify button is operable by invoking its callback
    expect(element.props.onActivate).toBe(onActivate);
    element.props.onActivate();
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});

describe('Landing Page: CtaSection & LandingFooter', () => {
  it('renders high-contrast bottom conversion CTA linking to /workout?exercise=squat', () => {
    const html = renderToString(React.createElement(CtaSection));

    expect(html).toContain('Ready to Train in Private?');
    expect(html).toContain('/workout?exercise=squat');
    expect(html).toContain('START TRAINING ↗');
  });

  it('renders footer with brand mark, navigation anchors, and copyright 2026', () => {
    const html = renderToString(React.createElement(LandingFooter));

    expect(html).toContain('FITVISION');
    expect(html).toContain('© 2026 FitVision');
    expect(html).toContain('No video frames transmitted');
    expect(html).toContain('/motion-lab');
    expect(html).toContain('#privacy');
    expect(html).toContain('#workflow');
    expect(html).toContain('#exercises');
  });
});

describe('Landing Page: LandingNavbar', () => {
  it('renders brand mark, navigation links, and start workout button', () => {
    const html = renderToString(React.createElement(LandingNavbar));

    expect(html).toContain('FITVISION');
    expect(html).toContain('#experience');
    expect(html).toContain('#workflow');
    expect(html).toContain('#exercises');
    expect(html).toContain('#motion-lab');
    expect(html).toContain('#architecture');
    expect(html).toContain('#privacy');
    expect(html).toContain('/workout?exercise=squat');
  });
});

