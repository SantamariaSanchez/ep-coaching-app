"use client";

import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
  urgent?: boolean;
  delay?: number;
  className?: string;
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  urgent = false,
  delay = 0,
  className = "",
}: StatCardProps) {
  const isUrgent = urgent && Number(value) > 0;

  return (
    <div
      className={`animate-fade-up ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        background: "linear-gradient(135deg, #1A0101 0%, #0D0000 100%)",
        border: isUrgent
          ? "1px solid rgba(224,30,30,0.35)"
          : "1px solid var(--ep-border)",
        borderRadius: 14,
        padding: "20px 24px",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
        cursor: "default",
        boxShadow: isUrgent ? "0 0 24px rgba(224,30,30,0.1)" : "none",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = isUrgent
          ? "rgba(224,30,30,0.6)"
          : "rgba(224,30,30,0.3)";
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "0 8px 32px rgba(224,30,30,0.12)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = isUrgent
          ? "rgba(224,30,30,0.35)"
          : "var(--ep-border)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = isUrgent ? "0 0 24px rgba(224,30,30,0.1)" : "none";
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: isUrgent
            ? "linear-gradient(90deg, transparent, #E01E1E, transparent)"
            : "linear-gradient(90deg, transparent, rgba(224,30,30,0.3), transparent)",
        }}
      />

      {/* Icon */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          color: isUrgent ? "rgba(224,30,30,0.8)" : "rgba(224,30,30,0.4)",
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(245,237,237,0.35)",
          marginBottom: 12,
        }}
      >
        {label}
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          color: isUrgent ? "#E01E1E" : "#F5EDED",
          lineHeight: 1,
          marginBottom: sub ? 8 : 0,
        }}
      >
        {value}
      </div>

      {/* Sub */}
      {sub && (
        <div
          style={{
            fontSize: 12,
            color: "rgba(245,237,237,0.4)",
            fontWeight: 500,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
