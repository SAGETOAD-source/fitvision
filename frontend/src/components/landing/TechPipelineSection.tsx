import React from 'react';

export default function TechPipelineSection() {
  const pipeline = [
    {
      num: '01',
      title: 'Camera',
      tech: 'getUserMedia',
      detail: 'Local camera stream captured directly in the browser document.',
    },
    {
      num: '02',
      title: 'MediaPipe Pose',
      tech: 'WebAssembly Model',
      detail: 'Downloaded vision runtime extracts 3D landmark coordinates in-browser.',
    },
    {
      num: '03',
      title: 'Joint Angles',
      tech: 'Vector Trigonometry',
      detail: 'Pure geometric calculations derive interior joint angles from landmarks.',
    },
    {
      num: '04',
      title: 'Classifier',
      tech: 'TypeScript Decision Trees',
      detail: 'In-browser decision tree walker evaluates angle vectors to classify state.',
    },
    {
      num: '05',
      title: 'Rep Counter',
      tech: 'Debounced Logic',
      detail: 'State machine verifies phase transitions, target depth, and rep counts.',
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20" id="architecture">
      <div className="rounded-3xl bg-[#0B0B0C] card-border p-6 sm:p-10 lg:p-12">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="text-xs font-mono uppercase tracking-widest text-[#FF4D6D] font-bold mb-2">
            System Architecture
          </div>
          <h2 className="font-headline text-3xl sm:text-4xl text-white font-extrabold tracking-tight">
            The FitVision Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mt-2 font-sans">
            A deterministic, fully client-side sequence executing continuously within the browser.
          </p>
        </div>

        {/* 5-Stage Architecture Pipeline Cards */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-2 w-full">
          {pipeline.map((stage, idx) => (
            <React.Fragment key={stage.num}>
              <div
                className={`p-4 sm:p-5 rounded-2xl card-border text-center flex-1 min-w-[150px] w-full lg:w-auto transition-all ${
                  idx === pipeline.length - 1
                    ? 'bg-[#6D001A] border-[#FF4D6D]/40 text-white shadow-lg shadow-[#6D001A]/30'
                    : 'bg-[#131314] text-neutral-200'
                }`}
              >
                <div
                  className={`text-[11px] font-mono mb-1 ${
                    idx === pipeline.length - 1 ? 'text-white/80' : 'text-neutral-500'
                  }`}
                >
                  {stage.num}
                </div>
                <div className="font-headline text-sm sm:text-base font-bold text-white mb-0.5">
                  {stage.title}
                </div>
                <div
                  className={`text-[10px] font-mono mb-2 ${
                    idx === pipeline.length - 1 ? 'text-[#FF4D6D] font-semibold' : 'text-[#FF4D6D]'
                  }`}
                >
                  {stage.tech}
                </div>
                <p className="text-[11px] text-neutral-300 leading-snug font-sans">
                  {stage.detail}
                </p>
              </div>

              {idx < pipeline.length - 1 && (
                <div className="flex items-center justify-center text-[#FF4D6D] shrink-0 my-1 lg:my-0 select-none">
                  {/* Horizontal arrow on desktop, vertical arrow on mobile */}
                  <svg
                    className="w-5 h-5 hidden lg:block"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                  <svg
                    className="w-5 h-5 lg:hidden"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Architectural Pillars (Verified Facts Only) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 pt-8 border-t border-[#1A1A1E]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1E] flex items-center justify-center text-[#FF4D6D] shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <div className="font-headline text-sm font-bold text-white mb-1">
                Client-Side Execution
              </div>
              <div className="text-xs text-neutral-400 font-sans leading-relaxed">
                MediaPipe WebAssembly pose detection and TypeScript decision tree classifiers execute on client hardware directly in the browser.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1E] flex items-center justify-center text-[#FF4D6D] shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <div className="font-headline text-sm font-bold text-white mb-1">
                Zero Frame Uploads
              </div>
              <div className="text-xs text-neutral-400 font-sans leading-relaxed">
                Camera frames are evaluated in browser memory and discarded immediately; video streams never leave your device.
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1E] flex items-center justify-center text-[#FF4D6D] shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="font-headline text-sm font-bold text-white mb-1">
                Deterministic Debounce
              </div>
              <div className="text-xs text-neutral-400 font-sans leading-relaxed">
                Rep counts require consistent phase confirmations over consecutive frames, eliminating false triggers.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

