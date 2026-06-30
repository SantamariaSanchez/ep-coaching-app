"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Trophy, TrendingUp } from "lucide-react";
import type { SessionWithSets, PersonalRecord } from "@/utils/sessions";

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "var(--color-ep-card)",
    border: "1px solid rgba(var(--color-ep-dark-red-rgb),0.4)",
    borderRadius: "8px",
    color: "var(--color-ep-light)",
    fontSize: "11px",
  },
  labelStyle: { color: "rgba(var(--color-ep-light-rgb),0.6)", fontSize: "10px" },
};

const TICK_STYLE = { fill: "rgba(var(--color-ep-light-rgb),0.35)", fontSize: 9 };

// Per-exercise weight progression chart, built straight from session_sets —
// covers every exercise ever logged, not just the ones with a recorded PR.
export default function ExerciseProgressionChart({
  sessions,
  records,
}: {
  sessions: SessionWithSets[];
  records: PersonalRecord[];
}) {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const allExerciseNames = [
    ...new Set(sessions.flatMap((s) => s.sets.map((set) => set.exercise_name))),
  ].sort();

  if (allExerciseNames.length === 0) {
    return (
      <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-8 text-center">
        <TrendingUp size={24} className="text-[var(--color-ep-light)]/15 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm text-[var(--color-ep-light)]/40">
          Tes performances par exercice apparaîtront ici après ta première séance
        </p>
      </div>
    );
  }

  const current = selectedExercise ?? allExerciseNames[0];

  const bySession: Record<string, { date: string; maxWeight: number; reps: number | null; rir: number | null; score: number | null }> = {};

  for (const session of sessions) {
    const setsForEx = session.sets.filter(
      (s) => s.exercise_name === current && s.weight_kg != null
    );
    if (setsForEx.length === 0) continue;
    const maxSet = setsForEx.reduce((best, s) =>
      (s.weight_kg ?? 0) > (best.weight_kg ?? 0) ? s : best
    );
    if (!bySession[session.id]) {
      bySession[session.id] = {
        date: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
          new Date(session.session_date + "T12:00:00")
        ),
        maxWeight: maxSet.weight_kg ?? 0,
        reps: maxSet.reps_actual,
        rir: maxSet.rir_actual,
        score: maxSet.standardization_score,
      };
    }
  }

  const chartData = Object.values(bySession).slice(-10);
  const bestRecord = records
    .filter((r) => r.exercise_name === current)
    .sort((a, b) => b.weight_kg - a.weight_kg)[0];

  const recentTableData = sessions
    .filter((s) => s.sets.some((set) => set.exercise_name === current))
    .slice(0, 5)
    .map((s) => {
      const setsForEx = s.sets.filter((set) => set.exercise_name === current);
      const maxSet = setsForEx.reduce((best, set) =>
        (set.weight_kg ?? 0) > (best.weight_kg ?? 0) ? set : best
      );
      return {
        date: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
          new Date(s.session_date + "T12:00:00")
        ),
        weight: maxSet.weight_kg,
        reps: maxSet.reps_actual,
        rir: maxSet.rir_actual,
        score: maxSet.standardization_score,
      };
    });

  return (
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-5">
      {/* Exercise selector */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {allExerciseNames.map((ex) => (
          <button
            key={ex}
            onClick={() => setSelectedExercise(ex)}
            className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border transition-colors ${
              current === ex
                ? "bg-[var(--color-ep-red)]/15 text-[var(--color-ep-red)] border-[var(--color-ep-red)]/30"
                : "text-[var(--color-ep-light)]/40 border-[var(--color-ep-dark-red)]/20 hover:border-[var(--color-ep-dark-red)]/40"
            }`}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Best record */}
      {bestRecord && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
          <Trophy size={14} className="text-amber-400" />
          <div>
            <p className="text-[9px] text-[var(--color-ep-light)]/35 uppercase tracking-wider">PR</p>
            <p className="text-lg font-black text-white">
              {bestRecord.weight_kg} kg
              {bestRecord.reps && (
                <span className="text-sm font-normal text-[var(--color-ep-light)]/40 ml-1.5">
                  × {bestRecord.reps} reps
                </span>
              )}
            </p>
          </div>
          <p className="ml-auto text-[9px] text-[var(--color-ep-light)]/35">
            {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
              new Date(bestRecord.achieved_at + "T12:00:00")
            )}
          </p>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 ? (
        <div className="h-40 mb-5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-ep-dark-red-rgb),0.15)" />
              <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, "Charge max"]} />
              {bestRecord && (
                <ReferenceLine
                  y={bestRecord.weight_kg}
                  stroke="#fbbf24"
                  strokeDasharray="4 4"
                  label={{ value: "PR", fill: "#fbbf24", fontSize: 9 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="maxWeight"
                stroke="var(--color-ep-red)"
                strokeWidth={2}
                dot={{ fill: "var(--color-ep-red)", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-ep-light)]/25 italic mb-5">
          Encore trop peu de séances sur cet exercice pour tracer une courbe.
        </p>
      )}

      {/* Table */}
      {recentTableData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {["Date", "Charge", "Reps", "RIR réel", "Score tech."].map((h) => (
                  <th
                    key={h}
                    className="text-[8px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/30 pb-2 text-left pr-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTableData.map((row, i) => (
                <tr key={i} className="border-t border-[var(--color-ep-dark-red)]/10">
                  <td className="py-2 pr-3 text-[var(--color-ep-light)]/60">{row.date}</td>
                  <td className="py-2 pr-3 font-black text-white">
                    {row.weight != null ? `${row.weight} kg` : "—"}
                  </td>
                  <td className="py-2 pr-3 text-[var(--color-ep-light)]/60">{row.reps ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {row.rir != null ? (
                      <span
                        className={`font-bold ${
                          row.rir <= 1 ? "text-red-400" : row.rir <= 3 ? "text-green-400" : "text-blue-400"
                        }`}
                      >
                        {row.rir}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="py-2">
                    {row.score != null ? (
                      <span
                        className={`font-bold ${
                          row.score < 3 ? "text-red-400" : row.score < 4 ? "text-amber-400" : "text-green-400"
                        }`}
                      >
                        {row.score}/5
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
