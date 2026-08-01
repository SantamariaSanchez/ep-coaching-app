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
  const isAlert = urgent && Number(value) > 0;

  return (
    <div
      className={`animate-scale-in ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        background: isAlert
          ? "linear-gradient(160deg, #1c0101 0%, #0e0000 100%)"
          : "linear-gradient(160deg, #180101 0%, #0d0000 100%)",
        border: `1px solid ${isAlert ? "rgba(224,30,30,0.28)" : "rgba(224,30,30,0.09)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "20px 18px 16px",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
        cursor: "default",
        boxShadow: isAlert ? "0 0 28px rgba(224,30,30,0.08)" : "none",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = isAlert ? "rgba(224,30,30,0.5)" : "rgba(224,30,30,0.22)";
        el.style.boxShadow = isAlert
          ? "0 4px 20px rgba(224,30,30,0.10)"
          : "0 4px 20px rgba(0,0,0,0.30)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = isAlert ? "rgba(224,30,30,0.28)" : "rgba(224,30,30,0.09)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = isAlert ? "0 0 28px rgba(224,30,30,0.08)" : "none";
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: 1,
        background: isAlert
          ? "linear-gradient(90deg, transparent, #E01E1E, transparent)"
          : "linear-gradient(90deg, transparent, rgba(224,30,30,0.2), transparent)",
      }} />

      {/* Icon */}
      <div style={{
        position: "absolute",
        top: 14, right: 14,
        color: isAlert ? "rgba(224,30,30,0.7)" : "rgba(224,30,30,0.3)",
      }}>
        {icon}
      </div>

      {/* Label */}
      <p className="ep-label" style={{ marginBottom: 12 }}>{label}</p>

      {/* Value */}
      <p style={{
        fontSize: 38,
        fontWeight: 900,
        letterSpacing: "-0.05em",
        color: isAlert ? "#E01E1E" : "#F5EDED",
        margin: 0,
        lineHeight: 1,
        marginBottom: sub ? 6 : 0,
      }}>
        {value}
      </p>

      {/* Sub */}
      {sub && (
        <p style={{
          fontSize: 11,
          color: "rgba(245,237,237,0.35)",
          margin: 0,
          fontWeight: 500,
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}
