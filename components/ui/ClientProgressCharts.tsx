"use client";

import { useT } from "@/components/i18n/I18nProvider";
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
    backgroundColor: "var(--ep-s1)",
    border: "1px solid rgba(var(--ep-line-rgb),0.35)",
    borderRadius: "10px",
    fontSize: "12px",
    color: "var(--ep-ink)",
  },
  labelStyle: { color: "rgba(var(--ep-ink-rgb),0.5)", fontWeight: 600 },
  cursor: { stroke: "rgba(var(--ep-line-rgb),0.3)", strokeWidth: 1 },
};

// ── Weight chart ──────────────────────────────────────────────────────────────

function WeightChart({ data }: { data: WeightPoint[] }) {
  const t = useT();
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl">
        <p className="text-xs text-(--ep-ink)/30 uppercase tracking-widest font-semibold">
          {t("Pas encore de données")}
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
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--ep-line-rgb),0.12)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "rgba(var(--ep-ink-rgb),0.35)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[minW, maxW]}
          tick={{ fill: "rgba(var(--ep-ink-rgb),0.35)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          unit=" kg"
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(v) => [`${v ?? "···"} kg`, "Poids"]}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="var(--ep-accent)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--ep-accent)", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "var(--ep-accent)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Adherence chart ───────────────────────────────────────────────────────────

function AdherenceChart({ data }: { data: AdherencePoint[] }) {
  const t = useT();
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl">
        <p className="text-xs text-(--ep-ink)/30 uppercase tracking-widest font-semibold">
          {t("Pas encore de données")}
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--ep-line-rgb),0.12)" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: "rgba(var(--ep-ink-rgb),0.35)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "rgba(var(--ep-ink-rgb),0.35)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          unit="%"
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(v) => [`${v ?? "···"}%`, "Adhésion"]}
        />
        <Bar dataKey="adherence" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                entry.adherence >= 80
                  ? "var(--ep-ok)"
                  : entry.adherence >= 60
                  ? "var(--ep-warn)"
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
  const t = useT();
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
        <div className="h-[200px] border border-(--ep-line)/20 rounded-xl ep-skeleton" />
        <div className="h-[200px] border border-(--ep-line)/20 rounded-xl ep-skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Weight chart */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-3">
          {t("Évolution du poids")}
        </p>
        <div className="bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl p-4">
          <WeightChart data={weightData} />
        </div>
      </div>

      {/* Adherence chart */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-3">
          {t("Adhésion nutrition par semaine")}
        </p>
        <div className="bg-(--ep-s1) border border-(--ep-line)/20 rounded-xl p-4">
          <AdherenceChart data={adherenceData} />
        </div>
      </div>
    </div>
  );
}
