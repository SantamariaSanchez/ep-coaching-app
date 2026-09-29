"use client";

import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Courbes d'évolution des stats réseaux, une ligne par plateforme.

type Point = { date: string; [platform: string]: number | string | null };

const COLORS: Record<string, string> = {
  tiktok: "#ff4d6d",
  linkedin: "#60a5fa",
  youtube: "#E01E1E",
  facebook: "#a78bfa",
  instagram: "#f59e0b",
  threads: "#F5EDED",
};

const METRICS = [
  { key: "followers", label: "Abonnés" },
  { key: "views", label: "Vues" },
  { key: "reach", label: "Portée" },
  { key: "engagements", label: "Engagement" },
] as const;

export default function SocialCharts({ series, labels }: { series: Record<(typeof METRICS)[number]["key"], Point[]>; labels: Record<string, string> }) {
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("followers");
  const data = series[metric];
  const platforms = [...new Set(data.flatMap((p) => Object.keys(p).filter((k) => k !== "date")))];
  const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  return (
    <div className="ep-card" style={{ padding: "16px 14px" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              border: `1px solid ${metric === m.key ? "rgba(224,30,30,0.6)" : "rgba(137,4,4,0.35)"}`,
              background: metric === m.key ? "rgba(224,30,30,0.15)" : "transparent",
              color: metric === m.key ? "#ff6b6b" : "rgba(245,237,237,0.55)",
              cursor: "pointer",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
      {data.length === 0 || platforms.length === 0 ? (
        <p style={{ fontSize: 13, color: "rgba(245,237,237,0.45)", margin: "24px 0", textAlign: "center" }}>Pas encore de données sur cette période.</p>
      ) : (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(245,237,237,0.06)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: "rgba(245,237,237,0.4)", fontSize: 10 }} stroke="rgba(245,237,237,0.1)" minTickGap={24} />
              <YAxis tick={{ fill: "rgba(245,237,237,0.4)", fontSize: 10 }} stroke="rgba(245,237,237,0.1)" allowDecimals={false} width={52} />
              <Tooltip
                contentStyle={{ background: "#140101", border: "1px solid rgba(137,4,4,0.5)", borderRadius: 10, fontSize: 12 }}
                labelFormatter={(l) => fmtDate(String(l))}
                formatter={(v, name) => [typeof v === "number" ? v.toLocaleString("fr-FR") : String(v), labels[String(name)] ?? String(name)]}
              />
              <Legend formatter={(v) => labels[String(v)] ?? String(v)} wrapperStyle={{ fontSize: 11 }} />
              {platforms.map((p) => (
                <Line key={p} type="monotone" dataKey={p} stroke={COLORS[p] ?? "#F5EDED"} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
