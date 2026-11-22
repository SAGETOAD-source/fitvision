import React from "react";

export type SectionLabelVariant = "accent" | "white";

export interface SectionLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: SectionLabelVariant;
}

/**
 * Bracketed uppercase section label, e.g. [ HOW IT WORKS ]
 */
export function SectionLabel({
  children,
  variant = "accent",
  className = "",
  ...rest
}: SectionLabelProps) {
  const colorClasses = variant === "white" ? "text-white" : "text-accent";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-display text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] ${colorClasses} ${className}`.trim()}
      {...rest}
    >
      <span aria-hidden="true" className="text-brand font-black">
        [
      </span>
      <span>{children}</span>
      <span aria-hidden="true" className="text-brand font-black">
        ]
      </span>
    </span>
  );
}

export default SectionLabel;
