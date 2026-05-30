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
  if (pct >= 0.9) return "#E01E1E"; // over target — red
  if (pct >= 0.7) return "#4ade80"; // good — green
  if (pct >= 0.4) return "#fbbf24"; // moderate — amber
  return "#ef4444";                  // low — red
}

export default function MetricGauge({
  value,
  max = 100,
  size = 88,
  strokeWidth = 7,
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
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke="#0D0000"
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
              style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-black text-white leading-none">{value}</span>
          {unit && (
            <span className="text-[8px] text-[#F5EDED]/40 uppercase tracking-wider mt-0.5">
              {unit}
            </span>
          )}
        </div>
      </div>
      {label && (
        <p className="text-[9px] text-[#F5EDED]/35 font-semibold uppercase tracking-widest text-center">
          / {max > 0 ? max : "—"} {label}
        </p>
      )}
    </div>
  );
}
