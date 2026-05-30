import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "highlighted";
}

export default function Card({
  title,
  children,
  className = "",
  variant = "default",
}: CardProps) {
  return (
    <div
      className={`${variant === "highlighted" ? "ep-card-highlighted" : "ep-card"} p-5 ${className}`}
    >
      {title && <p className="ep-section-title">{title}</p>}
      {children}
    </div>
  );
}
