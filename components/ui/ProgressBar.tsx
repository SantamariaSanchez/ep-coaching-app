"use client";

import { useEffect, useRef, useState } from "react";

type BarColor = "red" | "green" | "orange" | "blue" | "amber";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: BarColor;
  label?: string;
  showPercent?: boolean;
  height?: number;
  className?: string;
  animate?: boolean;
}

const COLOR_MAP: Record<BarColor, string> = {
  red:    "#E01E1E",
  green:  "#4ade80",
  orange: "#fb923c",
  blue:   "#60a5fa",
  amber:  "#fbbf24",
};

export default function ProgressBar({
  value,
  max = 100,
  color = "red",
  label,
  showPercent = false,
  height = 6,
  className = "",
  animate = true,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const [displayed, setDisplayed] = useState(animate ? 0 : pct);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const DURATION = 800;

  useEffect(() => {
    if (!animate) { setDisplayed(pct); return; }
    const start = displayed;
    const diff = pct - start;

    function step(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setDisplayed(start + diff * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }

    startRef.current = null;
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
              {label}
            </span>
          )}
          {showPercent && (
            <span className="text-xs font-black" style={{ color: COLOR_MAP[color] }}>
              {Math.round(displayed)}%
            </span>
          )}
        </div>
      )}
      <div
        className="rounded-full overflow-hidden"
        style={{ height, background: "#0D0000" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${displayed}%`,
            backgroundColor: COLOR_MAP[color],
            transition: "width 0.05s linear",
          }}
        />
      </div>
    </div>
  );
}
