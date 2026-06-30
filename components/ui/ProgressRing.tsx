"use client";

import { useEffect, useState } from "react";

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  unit?: string;
  sublabel?: string;
  /** Show value as a percentage integer (0-100) instead of raw value */
  asPercent?: boolean;
  className?: string;
  delay?: number;
}

export default function ProgressRing({
  value,
  max = 100,
  size = 110,
  strokeWidth = 8,
  color = "var(--color-ep-red)",
  trackColor,
  label,
  unit,
  sublabel,
  asPercent = false,
  className = "",
  delay = 0,
}: ProgressRingProps) {
  const R = (size - strokeWidth) / 2;
  const CIRC = 2 * Math.PI * R;
  const rawPct = max > 0 ? Math.min(value / max, 1) : 0;

  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      // One extra frame to ensure CSS transition fires
      requestAnimationFrame(() => setAnimated(rawPct));
    }, delay);
    return () => clearTimeout(timer);
  }, [rawPct, delay]);

  const offset = CIRC * (1 - animated);
  const cx = size / 2;
  const cy = size / 2;

  const track = trackColor ?? "rgba(var(--color-ep-red-rgb),0.06)";
  const displayValue = asPercent ? Math.round(rawPct * 100) : value;
  const displayUnit = asPercent ? "%" : unit;

  // Size-adaptive text
  const valueFontSize = size >= 100 ? 24 : size >= 72 ? 18 : 14;
  const unitFontSize = size >= 100 ? 10 : 8;

  return (
    <div className={`ep-ring-wrap ${className}`}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={label ?? "Progress"}
        >
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke={track}
            strokeWidth={strokeWidth}
          />
          {/* Fill */}
          <circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={animated > 0 ? offset : CIRC}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{
              transition: `stroke-dashoffset 1s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
              filter: `drop-shadow(0 0 6px ${color}60)`,
            }}
          />
        </svg>

        {/* Center content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
          }}
        >
          <span
            style={{
              fontSize: valueFontSize,
              fontWeight: 900,
              color: "var(--color-ep-light)",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            {displayValue}
          </span>
          {displayUnit && (
            <span
              style={{
                fontSize: unitFontSize,
                color: "rgba(var(--color-ep-light-rgb),0.35)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginTop: 2,
              }}
            >
              {displayUnit}
            </span>
          )}
        </div>
      </div>

      {/* Label below ring */}
      {label && (
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(var(--color-ep-light-rgb),0.35)",
            margin: 0,
            textAlign: "center",
          }}
        >
          {label}
        </p>
      )}
      {sublabel && (
        <p
          style={{
            fontSize: 9,
            fontWeight: 500,
            color: "rgba(var(--color-ep-light-rgb),0.2)",
            margin: 0,
            textAlign: "center",
          }}
        >
          {sublabel}
        </p>
      )}
    </div>
  );
}
