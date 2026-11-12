import React from 'react';

export default function WorkflowSection() {
  const steps = [
    {
      num: '01',
      title: 'Set Up Your Camera',
      description:
        'Open FitVision on your laptop or prop your phone a few paces back so your full body remains in view. No markers, calibration grids, or specialized hardware required.',
      tag: 'Laptop Webcam or Phone',
    },
    {
      num: '02',
      title: 'Move Naturally',
      description:
        'Perform your workout at your normal tempo. FitVision tracks 33 anatomical keypoints and calculates joint flexion angles directly in your browser on every frame.',
      tag: 'On-Device Pose Tracking',
    },
    {
      num: '03',
      title: 'Get Instant Feedback',
      description:
        'Watch your repetitions register cleanly upon reaching full extension, confirm proper depth, and receive immediate corrective cues when posture needs refinement.',
      tag: 'Live 2m HUD & Rep Counter',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20" id="workflow">
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
        <div className="text-xs font-mono uppercase tracking-widest text-[#FF4D6D] font-bold mb-2">
          3-Step Workflow
        </div>
        <h2 className="font-headline text-3xl sm:text-4xl text-white font-extrabold tracking-tight">
          How FitVision Works
        </h2>
        <p className="text-sm sm:text-base text-neutral-300 mt-3">
          No wearables. No external sensors. Launch your camera and receive immediate, distraction-free athletic feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {steps.map((step) => (
          <div
            key={step.num}
            className="rounded-3xl bg-[#0B0B0C] card-border p-6 sm:p-8 flex flex-col justify-between hover:border-[#FF4D6D]/40 transition-colors duration-200"
          >
            <div>
              <div className="font-headline text-4xl sm:text-5xl font-black text-neutral-700 mb-4 select-none">
                {step.num}
              </div>
              <h3 className="font-headline text-xl text-white font-bold mb-3">
                {step.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
                {step.description}
              </p>
            </div>
            <div className="mt-8 pt-5 border-t border-[#1A1A1E] flex items-center gap-2 text-white text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D6D]" />
              <span>{step.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

