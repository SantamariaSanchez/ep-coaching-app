"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CheckIn } from "@/utils/checkins";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeightPoint {
  date: string;
  label: string;
  weight: number;
}

interface AdherencePoint {
  week: string;
  adherence: number;
}

// ── Tooltip styles ────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#1f0101",
    border: "1px solid rgba(137, 4, 4, 0.35)",
    borderRadius: "10px",
    fontSize: "12px",
    color: "#F5EDED",
  },
  labelStyle: { color: "rgba(245,237,237,0.5)", fontWeight: 600 },
  cursor: { stroke: "rgba(137,4,4,0.3)", strokeWidth: 1 },
};

// ── Weight chart ──────────────────────────────────────────────────────────────

function WeightChart({ data }: { data: WeightPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-[#1f0101] border border-[#890404]/20 rounded-xl">
        <p className="text-xs text-[#F5EDED]/30 uppercase tracking-widest font-semibold">
          Pas encore de données
        </p>
      </div>
    );
  }

  const weights = data.map((d) => d.weight);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(137,4,4,0.12)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "rgba(245,237,237,0.35)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[minW, maxW]}
          tick={{ fill: "rgba(245,237,237,0.35)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          unit=" kg"
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(v) => [`${v ?? "N/A"} kg`, "Poids"]}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#E01E1E"
          strokeWidth={2}
          dot={{ r: 3, fill: "#E01E1E", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#E01E1E" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Adherence chart ───────────────────────────────────────────────────────────

function AdherenceChart({ data }: { data: AdherencePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-[#1f0101] border border-[#890404]/20 rounded-xl">
        <p className="text-xs text-[#F5EDED]/30 uppercase tracking-widest font-semibold">
          Pas encore de données
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(137,4,4,0.12)" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: "rgba(245,237,237,0.35)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "rgba(245,237,237,0.35)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          unit="%"
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(v) => [`${v ?? "N/A"}%`, "Adhésion"]}
        />
        <Bar dataKey="adherence" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.adherence >= 80
                  ? "#4ade80"
                  : entry.adherence >= 60
                  ? "#fbbf24"
                  : "#ef4444"
              }
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClientProgressCharts({
  checkins,
}: {
  checkins: CheckIn[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Weight data from check-ins — chronological
  const weightData: WeightPoint[] = checkins
    .filter((c) => c.weight != null || c.weight_avg != null)
    .slice()
    .reverse()
    .map((c) => ({
      date: c.week_start,
      weight: (c.weight_avg ?? c.weight)!,
      label: `S${c.week_number}`,
    }));

  // Adherence data — chronological
  const adherenceData: AdherencePoint[] = checkins
    .filter((c) => c.nutrition_adherence != null)
    .slice()
    .reverse()
    .map((c) => ({
      week: `S${c.week_number}`,
      adherence: c.nutrition_adherence!,
    }));

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="h-[200px] bg-[#1f0101] border border-[#890404]/20 rounded-xl animate-pulse" />
        <div className="h-[200px] bg-[#1f0101] border border-[#890404]/20 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Weight chart */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Évolution du poids
        </p>
        <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
          <WeightChart data={weightData} />
        </div>
      </div>

      {/* Adherence chart */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Adhésion nutrition par semaine
        </p>
        <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
          <AdherenceChart data={adherenceData} />
        </div>
      </div>
    </div>
  );
}
