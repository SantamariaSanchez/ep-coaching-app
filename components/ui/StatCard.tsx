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
          ? "linear-gradient(160deg, var(--color-ep-card) 0%, var(--color-ep-deep) 100%)"
          : "linear-gradient(160deg, var(--color-ep-deep) 0%, var(--color-ep-deep) 100%)",
        border: `1px solid ${isAlert ? "rgba(var(--color-ep-red-rgb),0.28)" : "rgba(var(--color-ep-red-rgb),0.09)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "20px 18px 16px",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
        cursor: "default",
        boxShadow: isAlert ? "0 0 28px rgba(var(--color-ep-red-rgb),0.08)" : "none",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = isAlert ? "rgba(var(--color-ep-red-rgb),0.5)" : "rgba(var(--color-ep-red-rgb),0.22)";
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = isAlert
          ? "0 12px 40px rgba(var(--color-ep-red-rgb),0.14)"
          : "0 8px 32px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = isAlert ? "rgba(var(--color-ep-red-rgb),0.28)" : "rgba(var(--color-ep-red-rgb),0.09)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = isAlert ? "0 0 28px rgba(var(--color-ep-red-rgb),0.08)" : "none";
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: 1,
        background: isAlert
          ? "linear-gradient(90deg, transparent, var(--color-ep-red), transparent)"
          : "linear-gradient(90deg, transparent, rgba(var(--color-ep-red-rgb),0.2), transparent)",
      }} />

      {/* Icon */}
      <div style={{
        position: "absolute",
        top: 14, right: 14,
        color: isAlert ? "rgba(var(--color-ep-red-rgb),0.7)" : "rgba(var(--color-ep-red-rgb),0.3)",
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
        color: isAlert ? "var(--color-ep-red)" : "var(--color-ep-light)",
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
          color: "rgba(var(--color-ep-light-rgb),0.35)",
          margin: 0,
          fontWeight: 500,
        }}>
          {sub}
        </p>
      )}
    </div>
  );
}
