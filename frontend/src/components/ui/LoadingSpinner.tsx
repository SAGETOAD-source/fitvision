import React from "react";

export type SpinnerSize = "sm" | "md" | "lg";

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  label?: string;
  showLabel?: boolean;
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "w-5 h-5 border-2",
  md: "w-9 h-9 border-[3px]",
  lg: "w-14 h-14 border-4",
};

export function LoadingSpinner({
  size = "md",
  label = "Loading...",
  showLabel = false,
  className = "",
  ...rest
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`inline-flex flex-col items-center justify-center gap-3 ${className}`.trim()}
      {...rest}
    >
      <div
        data-testid="loading-spinner-ring"
        className={`rounded-full border-brand border-t-accent animate-spin motion-reduce:animate-none ${SIZE_CLASSES[size]}`}
      />
      {showLabel ? (
        <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
          {label}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}

export default LoadingSpinner;
