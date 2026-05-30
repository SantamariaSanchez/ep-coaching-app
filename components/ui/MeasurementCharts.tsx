"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Measurement } from "@/utils/measurements";

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#1f0101",
    border: "1px solid rgba(137,4,4,0.4)",
    borderRadius: "8px",
    color: "#F5EDED",
    fontSize: "11px",
  },
  labelStyle: { color: "rgba(245,237,237,0.6)", fontSize: "10px" },
};

const TICK_STYLE = {
  fill: "rgba(245,237,237,0.35)",
  fontSize: 9,
};

function ChartSkeleton() {
  return (
    <div className="h-52 bg-[#1f0101]/60 rounded-xl animate-pulse" />
  );
}

function filterRecent(measurements: Measurement[], days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return measurements
    .filter((m) => new Date(m.measured_at + "T12:00:00") >= cutoff)
    .reverse();
}

function shortDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(dateStr + "T12:00:00"));
}

export default function MeasurementCharts({
  measurements,
}: {
  measurements: Measurement[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  // Weight chart — last 84 days (12 weeks)
  const weightData = filterRecent(measurements, 84)
    .filter((m) => m.weight != null)
    .map((m) => ({
      date: shortDate(m.measured_at),
      Poids: m.weight,
    }));

  // Measurements chart — last 84 days
  const bodyData = filterRecent(measurements, 84)
    .filter(
      (m) => m.waist != null || m.arm_flexed != null || m.thigh != null
    )
    .map((m) => ({
      date: shortDate(m.measured_at),
      Taille: m.waist ?? undefined,
      "Bras fl.": m.arm_flexed ?? undefined,
      Cuisse: m.thigh ?? undefined,
    }));

  return (
    <div className="space-y-6">
      {/* Weight chart */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
          Poids — 12 dernières semaines (kg)
        </p>
        {weightData.length < 2 ? (
          <p className="text-xs text-[#F5EDED]/25 italic text-center py-10">
            Minimum 2 mesures pour afficher le graphique
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(137,4,4,0.12)"
              />
              <XAxis
                dataKey="date"
                tick={TICK_STYLE}
                axisLine={{ stroke: "rgba(137,4,4,0.2)" }}
                tickLine={false}
              />
              <YAxis
                tick={TICK_STYLE}
                axisLine={{ stroke: "rgba(137,4,4,0.2)" }}
                tickLine={false}
                domain={["auto", "auto"]}
                width={38}
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Line
                type="monotone"
                dataKey="Poids"
                stroke="#E01E1E"
                strokeWidth={2}
                dot={{ fill: "#E01E1E", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Body measurements chart */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
          Mensurations — 12 dernières semaines (cm)
        </p>
        {bodyData.length < 2 ? (
          <p className="text-xs text-[#F5EDED]/25 italic text-center py-10">
            Minimum 2 mesures pour afficher le graphique
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={bodyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(137,4,4,0.12)"
              />
              <XAxis
                dataKey="date"
                tick={TICK_STYLE}
                axisLine={{ stroke: "rgba(137,4,4,0.2)" }}
                tickLine={false}
              />
              <YAxis
                tick={TICK_STYLE}
                axisLine={{ stroke: "rgba(137,4,4,0.2)" }}
                tickLine={false}
                domain={["auto", "auto"]}
                width={38}
              />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend
                wrapperStyle={{
                  fontSize: "10px",
                  color: "rgba(245,237,237,0.5)",
                }}
              />
              <Line
                type="monotone"
                dataKey="Taille"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={{ fill: "#fbbf24", strokeWidth: 0, r: 3 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="Bras fl."
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ fill: "#60a5fa", strokeWidth: 0, r: 3 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="Cuisse"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={{ fill: "#a78bfa", strokeWidth: 0, r: 3 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
