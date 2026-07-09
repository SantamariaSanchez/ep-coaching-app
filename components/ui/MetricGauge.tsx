"use client";

import { useEffect, useState } from "react";

interface MetricGaugeProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  unit?: string;
  className?: string;
}

function gaugeColor(pct: number): string {
  if (pct >= 0.9) return "#E01E1E";  // over target
  if (pct >= 0.7) return "#4ade80";  // good
  if (pct >= 0.4) return "#fbbf24";  // moderate
  return "#ef4444";                   // low
}

export default function MetricGauge({
  value,
  max = 100,
  size = 96,
  strokeWidth = 8,
  label,
  unit,
  className = "",
}: MetricGaugeProps) {
  const R = (size - strokeWidth) / 2;
  const CIRC = 2 * Math.PI * R;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;

  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  const offset = CIRC * (1 - animated);
  const color = gaugeColor(animated);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className={`ep-ring-wrap ${className}`}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke="rgba(224,30,30,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Fill */}
          {animated > 0 && (
            <circle
              cx={cx} cy={cy} r={R}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                transition: "stroke-dashoffset 0.9s cubic-bezier(0.34,1.56,0.64,1)",
                filter: `drop-shadow(0 0 5px ${color}60)`,
              }}
            />
          )}
        </svg>
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <span style={{
            fontSize: size >= 88 ? 20 : 15,
            fontWeight: 900,
            color: "#F5EDED",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}>
            {value}
          </span>
          {unit && (
            <span style={{
              fontSize: 8,
              color: "rgba(245,237,237,0.35)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginTop: 2,
            }}>
              {unit}
            </span>
          )}
        </div>
      </div>
      {label && (
        <p style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(245,237,237,0.3)",
          margin: 0,
          textAlign: "center",
        }}>
          / {max > 0 ? max : "-"} {label}
        </p>
      )}
    </div>
  );
}
