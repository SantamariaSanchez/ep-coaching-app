"use client";

import { useMemo } from "react";
import { MICRO_DAILY_REF } from "@/lib/micro-references";
import { getMicroDeficiencyOrder } from "@/utils/nutrition-utils";
import type { FoodLogWithFood } from "@/utils/nutrition";

function pctColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 50) return "#f59e0b";
  return "#ef4444";
}

function pctBg(pct: number): string {
  if (pct >= 80) return "bg-green-500/15 border-green-500/20 text-green-400";
  if (pct >= 50) return "bg-amber-500/15 border-amber-500/20 text-amber-400";
  return "bg-red-500/15 border-red-500/20 text-red-400";
}

export default function MicroBarList({ logs }: { logs: FoodLogWithFood[] }) {
  const stats = useMemo(
    () => getMicroDeficiencyOrder(logs, MICRO_DAILY_REF),
    [logs]
  );

  if (stats.every((s) => s.consumed === 0)) {
    return (
      <p className="text-xs text-[#F5EDED]/25 italic">
        Données micronutriments non disponibles pour les aliments loggés.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {stats.map((s) => (
        <div key={s.key} className="flex items-center gap-3">
          {/* Name */}
          <span className="text-[10px] font-semibold text-[#F5EDED]/50 w-28 flex-shrink-0 truncate">
            {s.name}
          </span>

          {/* Bar */}
          <div className="flex-1 bg-[#890404]/15 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${Math.min(s.pct, 100)}%`,
                backgroundColor: pctColor(s.pct),
              }}
            />
          </div>

          {/* Value + % */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[9px] text-[#F5EDED]/30 w-20 text-right">
              {s.consumed}
              {s.unit} / {s.target}
              {s.unit}
            </span>
            <span
              className={`text-[9px] font-black px-1.5 py-0.5 rounded border w-12 text-center ${pctBg(s.pct)}`}
            >
              {s.pct}%
            </span>
          </div>

          {/* No data indicator */}
          {!s.hasData && s.consumed === 0 && (
            <span className="text-[8px] text-[#F5EDED]/20 italic flex-shrink-0">
              n/a
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
