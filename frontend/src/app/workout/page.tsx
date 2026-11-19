"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import WorkoutScreen from "@/components/WorkoutScreen";

function WorkoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const exercise = searchParams.get("exercise") || "squat";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 2) {
      router.back();
    } else {
      router.push("/exercises");
    }
  };

  return (
    <WorkoutScreen
      exerciseKey={exercise}
      onBack={handleBack}
    />
  );
}

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[100dvh] w-screen bg-black text-white flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
        </div>
      }
    >
      <WorkoutContent />
    </Suspense>
  );
}
