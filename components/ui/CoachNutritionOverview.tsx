"use client";

import Link from "next/link";
import { Shuffle, Lock, Sliders, TrendingUp } from "lucide-react";
import type { ClientNutritionSummary, DietMode } from "@/utils/nutrition";

const PHASE_LABELS: Record<string, string> = {
  deficit: "Déficit",
  maintenance: "Maintenance",
  surplus: "Surplus",
};

const PHASE_COLORS: Record<string, string> = {
  deficit: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  maintenance: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  surplus: "text-green-400 bg-green-500/10 border-green-500/20",
};

const MODE_ICONS: Record<DietMode, React.ElementType> = {
  flexible: Shuffle,
  fixed: Lock,
  fixed_flexible: Sliders,
};

const MODE_LABELS: Record<DietMode, string> = {
  flexible: "Flexible",
  fixed: "Fixe",
  fixed_flexible: "Fixe Flex.",
};

function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 w-6">
        {label}
      </span>
      <div className="flex-1 bg-[#890404]/15 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[9px] text-[#F5EDED]/40 w-10 text-right">
        {current}g
      </span>
    </div>
  );
}

export default function CoachNutritionOverview({
  clients,
}: {
  clients: ClientNutritionSummary[];
}) {
  if (clients.length === 0) {
    return (
      <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-8 text-center">
        <p className="text-sm text-[#F5EDED]/30">Aucun client trouvé.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((c) => {
        const calPct =
          c.caloriesTarget > 0
            ? Math.min((c.todayCalories / c.caloriesTarget) * 100, 100)
            : 0;

        const calColor =
          calPct >= 85
            ? "#22c55e"
            : calPct >= 60
            ? "#f59e0b"
            : "#ef4444";

        const ModeIcon = c.dietMode ? MODE_ICONS[c.dietMode] : Shuffle;

        return (
          <Link
            key={c.clientId}
            href={`/dashboard/coach/clients/${c.clientId}/nutrition`}
            className="block bg-[#1f0101] border border-[#890404]/20 hover:border-[#890404]/50 rounded-xl p-4 space-y-3 transition-colors group"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate group-hover:text-[#E01E1E] transition-colors">
                  {c.clientName}
                </p>
                {c.phase && (
                  <span
                    className={`inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border mt-1 ${
                      PHASE_COLORS[c.phase] ??
                      "text-[#F5EDED]/40 bg-white/5 border-white/10"
                    }`}
                  >
                    {PHASE_LABELS[c.phase] ?? c.phase}
                  </span>
                )}
              </div>
              {c.dietMode && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-[#890404]/20 text-[#F5EDED]/50 border border-[#890404]/20 flex-shrink-0">
                  <ModeIcon size={9} />
                  {MODE_LABELS[c.dietMode]}
                </span>
              )}
            </div>

            {/* Calories progress */}
            <div>
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
                  Calories
                </span>
                <div className="text-right">
                  <span className="text-sm font-black text-white">
                    {c.todayCalories}
                  </span>
                  <span className="text-[10px] text-[#F5EDED]/30">
                    /{c.caloriesTarget} kcal
                  </span>
                </div>
              </div>
              <div className="bg-[#890404]/15 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${calPct}%`, backgroundColor: calColor }}
                />
              </div>
            </div>

            {/* Macros bars */}
            {c.caloriesTarget > 0 && (
              <div className="space-y-1.5 pt-1">
                <MacroBar
                  label="P"
                  current={c.todayProteins}
                  target={c.proteinsTarget}
                  color="#60a5fa"
                />
                <MacroBar
                  label="G"
                  current={c.todayCarbs}
                  target={c.carbsTarget}
                  color="#fbbf24"
                />
                <MacroBar
                  label="L"
                  current={c.todayFats}
                  target={c.fatsTarget}
                  color="#fb7185"
                />
              </div>
            )}

            {/* No profile */}
            {c.caloriesTarget === 0 && (
              <p className="text-[10px] text-[#F5EDED]/25 italic">
                Pas d&apos;objectif défini
              </p>
            )}

            {/* Adherence badge */}
            {c.weeklyAdherence > 0 && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-[#890404]/10">
                <TrendingUp size={10} className="text-[#F5EDED]/30" />
                <span className="text-[9px] text-[#F5EDED]/35">
                  Adhésion 7j :{" "}
                  <span className="text-white font-bold">
                    {c.weeklyAdherence}%
                  </span>
                </span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
