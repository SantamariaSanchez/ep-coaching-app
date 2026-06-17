import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "highlighted" | "hero" | "flat";
}

export default function Card({
  title,
  children,
  className = "",
  variant = "default",
}: CardProps) {
  const cls =
    variant === "highlighted" ? "ep-card-highlighted"
    : variant === "hero"        ? "ep-card-hero"
    : variant === "flat"        ? "ep-card-flat"
    : "ep-card";

  return (
    <div className={`${cls} p-5 ${className}`}>
      {title && <p className="ep-section-title">{title}</p>}
      {children}
    </div>
  );
}
