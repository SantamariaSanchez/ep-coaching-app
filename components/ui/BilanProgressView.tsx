"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Download, Flame } from "lucide-react";
import type { DailyLog } from "@/utils/daily-logs";
import { groupLogsByWeek } from "@/lib/daily-logs-helpers";

// Fusion de l'ancien "Bilan" (formulaire + liste brute par semaine) et de
// l'ancienne "Progression" (moyennes globales + export CSV) : les deux
// s'appuyaient déjà sur exactement les mêmes données (daily_logs), juste
// présentées séparément sans vraie raison. Un seul écran maintenant : vue
// d'ensemble chiffrée, tendances en graphique, détail semaine par semaine.

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: "#1f0101", border: "1px solid rgba(137,4,4,0.4)", borderRadius: 8, color: "#F5EDED", fontSize: 11 },
  labelStyle: { color: "rgba(245,237,237,0.6)", fontSize: 10 },
};
const TICK_STYLE = { fill: "rgba(245,237,237,0.35)", fontSize: 9 };

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmtDay(d: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(d + "T12:00:00"));
}
function fmtShort(d: string) {
  return capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(new Date(d + "T12:00:00")));
}

function avgOf(values: (number | null)[]): number | null {
  const v = values.filter((x): x is number => x != null);
  return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

// Moyenne mobile 7 jours en plus de la valeur brute — même logique que sur
// l'onglet Sommeil, pour un langage visuel cohérent dans toute l'app.
function withRollingAverage(data: { date: string; value: number | null }[], window = 7) {
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1).map((x) => x.value).filter((v): v is number => v != null);
    const avg = slice.length > 0 ? Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 10) / 10 : null;
    return { ...d, avg };
  });
}

// Jours consécutifs avec un bilan rempli, en remontant depuis aujourd'hui —
// un jour sans entrée casse la série plutôt que d'être ignoré en silence.
function computeLogStreak(logs: DailyLog[], today: string): number {
  if (logs.length === 0) return 0;
  const dates = new Set(logs.map((l) => l.log_date));
  const earliest = [...dates].sort()[0];
  const cursor = new Date(earliest + "T12:00:00");
  const end = new Date(today + "T12:00:00");
  let run = 0;
  while (cursor.getTime() <= end.getTime()) {
    const iso = cursor.toISOString().split("T")[0];
    if (dates.has(iso)) run++;
    else run = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  return run;
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ep-card" style={{ padding: "12px 14px" }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.3)", margin: "0 0 4px" }}>
        {label}
      </p>
      <p style={{ fontSize: 18, fontWeight: 900, color: "#F5EDED", margin: 0, letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: "rgba(245,237,237,0.3)", margin: "2px 0 0" }}>{sub}</p>}
    </div>
  );
}

function TrendChart({ title, data, unit, color }: {
  title: string;
  data: { date: string; value: number | null }[];
  unit: string;
  color: string;
}) {
  const hasData = data.some((d) => d.value != null);
  const chartData = withRollingAverage(data);
  return (
    <div className="ep-card" style={{ padding: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", margin: "0 0 10px" }}>
        {title}
      </p>
      {hasData ? (
        <div style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(137,4,4,0.1)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDay} tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} width={32} domain={["auto", "auto"]} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v, name) => [`${v} ${unit}`, name === "avg" ? "Moyenne 7j" : "Valeur du jour"]}
              />
              <Line type="monotone" dataKey="value" stroke="none" dot={{ r: 2.5, fill: color, fillOpacity: 0.6 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="avg" stroke={color} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-[#F5EDED]/25 italic py-8 text-center">Pas encore de données.</p>
      )}
    </div>
  );
}

function StressChip({ val }: { val: "low" | "medium" | "high" | null }) {
  if (!val) return <span style={{ color: "rgba(245,237,237,0.2)" }}>-</span>;
  const colors: Record<string, string> = { low: "#4ade80", medium: "#facc15", high: "#f87171" };
  const labels: Record<string, string> = { low: "Bas", medium: "Moyen", high: "Haut" };
  return (
    <span style={{
      display: "inline-block", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
      padding: "2px 8px", borderRadius: 99,
      background: colors[val] + "20", color: colors[val], border: `1px solid ${colors[val]}40`,
    }}>
      {labels[val]}
    </span>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)" }}>{k}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#F5EDED" }}>{v}</span>
    </div>
  );
}

function AvgRow({ label, value, unit = "" }: { label: string; value: number | null; unit?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(137,4,4,0.08)" }}>
      <span style={{ fontSize: 10, color: "rgba(245,237,237,0.35)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: value !== null ? "#F5EDED" : "rgba(245,237,237,0.15)" }}>
        {value !== null ? `${value}${unit}` : "-"}
      </span>
    </div>
  );
}

function DayCard({ log }: { log: DailyLog }) {
  return (
    <div className="ep-card" style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
      <div style={{ gridColumn: "1 / -1", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(224,30,30,0.5)" }}>
          {fmtShort(log.log_date)}
        </span>
        {log.training_name && (
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#F5EDED" }}>{log.training_name}</span>
        )}
      </div>
      {log.weight_morning != null && <KV k="Poids" v={`${log.weight_morning} kg`} />}
      {log.steps != null && <KV k="Pas" v={log.steps.toLocaleString("fr-FR")} />}
      {log.sleep_hours != null && <KV k="Sommeil" v={`${log.sleep_hours}h`} />}
      {log.calories_kcal != null && <KV k="Kcal" v={`${log.calories_kcal}`} />}
      {log.proteins_g != null && <KV k="Prot" v={`${log.proteins_g}g`} />}
      {log.stress && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)" }}>Stress</span>
          <StressChip val={log.stress} />
        </div>
      )}
    </div>
  );
}

export default function BilanProgressView({
  logs,
  exportHref,
}: {
  logs: DailyLog[];
  /** Lien de téléchargement CSV, omis si non pertinent (ex. vue lecture seule sans export). */
  exportHref?: string;
}) {
  const today = new Date().toISOString().split("T")[0];

  if (logs.length === 0) {
    return (
      <div className="ep-card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: "rgba(245,237,237,0.3)", fontSize: 13, margin: 0 }}>
          Remplis ton bilan du jour ci-dessus pour voir ta progression apparaître ici.
        </p>
      </div>
    );
  }

  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const weeks = groupLogsByWeek(logs);

  const weightsWithDate = sorted.filter((l) => l.weight_morning != null);
  const firstWeight = weightsWithDate[0]?.weight_morning ?? null;
  const lastWeight = weightsWithDate[weightsWithDate.length - 1]?.weight_morning ?? null;
  const weightDelta = firstWeight != null && lastWeight != null ? Math.round((lastWeight - firstWeight) * 10) / 10 : null;

  const streak = computeLogStreak(logs, today);
  const avgSteps = avgOf(logs.map((l) => l.steps));
  const avgSleep = avgOf(logs.map((l) => l.sleep_hours));

  const weightData = sorted.map((l) => ({ date: l.log_date, value: l.weight_morning }));
  const sleepData = sorted.map((l) => ({ date: l.log_date, value: l.sleep_hours }));
  const stepsData = sorted.map((l) => ({ date: l.log_date, value: l.steps }));
  const caloriesData = sorted.map((l) => ({ date: l.log_date, value: l.calories_kcal }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Vue d'ensemble */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(224,30,30,0.5)", margin: 0 }}>
            Vue d&apos;ensemble · {logs.length} jour{logs.length > 1 ? "s" : ""}
          </p>
          {exportHref && (
            <a
              href={exportHref}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                color: "#F5EDED", textDecoration: "none",
                background: "rgba(137,4,4,0.2)", border: "1px solid rgba(137,4,4,0.3)",
                borderRadius: 8, padding: "7px 12px",
              }}
            >
              <Download size={12} /> Export CSV
            </a>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            label="Poids"
            value={weightDelta != null ? `${weightDelta > 0 ? "+" : ""}${weightDelta} kg` : "—"}
            sub={lastWeight != null ? `${lastWeight} kg actuel` : undefined}
          />
          <StatTile label="Pas / jour" value={avgSteps != null ? Math.round(avgSteps).toLocaleString("fr-FR") : "—"} />
          <StatTile label="Sommeil" value={avgSleep != null ? `${avgSleep.toFixed(1)}h` : "—"} />
          <StatTile label="Bilans d'affilée" value={`${streak}j`} sub={streak > 0 ? "en cours" : undefined} />
        </div>
      </div>

      {/* Poids : la tendance qui compte le plus */}
      <TrendChart title="Évolution du poids" data={weightData} unit="kg" color="#E01E1E" />

      {/* Autres métriques */}
      <div className="grid md:grid-cols-3 gap-4">
        <TrendChart title="Sommeil" data={sleepData} unit="h" color="#818cf8" />
        <TrendChart title="Pas" data={stepsData} unit="" color="#4ade80" />
        <TrendChart title="Calories" data={caloriesData} unit="kcal" color="#fbbf24" />
      </div>

      {/* Détail semaine par semaine */}
      <div>
        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(224,30,30,0.5)", marginBottom: 12 }}>
          Détail par semaine
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {weeks.map(({ weekStart, logs: wLogs, averages }) => (
            <div key={weekStart}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                borderBottom: "1px solid rgba(137,4,4,0.15)", paddingBottom: 8,
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(224,30,30,0.5)" }}>
                  Semaine du {fmtShort(weekStart)}
                </span>
                <span style={{ fontSize: 9, color: "rgba(245,237,237,0.2)", fontWeight: 600 }}>
                  {wLogs.length} jour{wLogs.length > 1 ? "s" : ""}
                  {streak > 0 && weekStart === weeks[0]?.weekStart && (
                    <Flame size={10} style={{ display: "inline", marginLeft: 4, verticalAlign: -1, color: "#E01E1E" }} />
                  )}
                </span>
              </div>

              <div className="ep-card" style={{ padding: "10px 14px", marginBottom: 10 }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(224,30,30,0.4)", margin: "0 0 8px" }}>
                  Moyennes
                </p>
                <AvgRow label="Poids" value={averages.weight} unit=" kg" />
                <AvgRow label="Pas" value={averages.steps} />
                <AvgRow label="Sommeil" value={averages.sleep_hours} unit="h" />
                <AvgRow label="Qualité sommeil" value={averages.sleep_rating} unit="%" />
                <AvgRow label="Kcal" value={averages.calories_kcal} unit=" kcal" />
                <AvgRow label="Protéines" value={averages.proteins_g} unit="g" />
                <AvgRow label="Glucides" value={averages.carbs_g} unit="g" />
                <AvgRow label="Lipides" value={averages.fats_g} unit="g" />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {wLogs.map((log) => <DayCard key={log.id} log={log} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
