import React from "react";

export type CardVariant = "default" | "elevated" | "interactive";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "bg-surface border border-border-subtle text-white",
  elevated: "bg-surface-elevated border border-border-subtle text-white shadow-xl",
  interactive:
    "bg-surface-elevated border border-border-subtle text-white hover:border-accent transition-colors duration-200",
};

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8 sm:p-10",
};

export function Card({
  variant = "default",
  padding = "md",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-3xl ${VARIANT_CLASSES[variant]} ${PADDING_CLASSES[padding]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
