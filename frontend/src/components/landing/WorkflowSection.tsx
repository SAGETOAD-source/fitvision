import React from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  ProgressAccordion,
  type ProgressAccordionItem,
} from "@/components/ui/ProgressAccordion";

const WORKFLOW_STEPS: ProgressAccordionItem[] = [
  {
    num: "01",
    title: "Set Up Your Camera",
    description:
      "Open FitVision on your laptop or prop your phone a few paces back so your full body remains in view. No markers, calibration grids, or specialized hardware required.",
    tag: "Laptop Webcam or Phone",
    placeholderLabel:
      "TODO: Approved photo of female athlete positioning device camera at full-body training distance.",
  },
  {
    num: "02",
    title: "Move Naturally",
    description:
      "Perform your workout at your normal tempo. FitVision tracks 33 anatomical keypoints and calculates joint flexion angles directly in your browser on every frame.",
    tag: "On-Device Pose Tracking",
    placeholderLabel:
      "TODO: Approved photo of female athlete mid-movement with clear side/front visibility.",
  },
  {
    num: "03",
    title: "Get Instant Feedback",
    description:
      "Watch your repetitions register cleanly upon reaching full extension, confirm proper depth, and receive immediate corrective cues when posture needs refinement.",
    tag: "Live 2m HUD & Rep Counter",
    placeholderLabel:
      "TODO: Approved photo of female athlete checking rep count and form cues between sets.",
  },
];

export default function WorkflowSection() {
  return (
    <section
      className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-16 sm:py-24"
      id="workflow"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-16">
        <div className="space-y-3">
          <SectionLabel>How It Works</SectionLabel>
          <div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white font-black uppercase tracking-tight">
              How FitVision Works
            </h2>
            <div aria-hidden="true" className="w-14 h-1 bg-brand mt-4" />
          </div>
        </div>
        <p className="text-sm sm:text-base text-text-muted max-w-md font-sans leading-relaxed">
          No wearables. No external sensors. Launch your camera and receive immediate, distraction-free athletic feedback.
        </p>
      </div>

      <ProgressAccordion
        items={WORKFLOW_STEPS}
        progressDuration={6000}
        ariaLabel="3-step FitVision workflow"
      />
    </section>
  );
}
