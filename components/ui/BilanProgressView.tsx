"use client";

import { useT } from "@/components/i18n/I18nProvider";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Download, Flame, Scale, Footprints, Moon, Zap, Beef, Wheat, Droplets, AlertTriangle } from "lucide-react";
import type { DailyLog } from "@/utils/daily-logs";
import { computeLogStreak, groupLogsByWeek } from "@/lib/daily-logs-helpers";
import { useState } from "react";
import { todayInParis } from "@/lib/dates";
import { withAlpha } from "@/lib/theme-color";

// Fusion de l'ancien "Bilan" (formulaire + liste brute par semaine) et de
// l'ancienne "Progression" (moyennes globales + export CSV) : les deux
// s'appuyaient déjà sur exactement les mêmes données (daily_logs), juste
// présentées séparément sans vraie raison. Un seul écran maintenant : vue
// d'ensemble chiffrée, tendances en graphique, détail semaine par semaine.

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: "var(--ep-s1)", border: "1px solid rgba(var(--ep-line-rgb),0.4)", borderRadius: 8, color: "var(--ep-ink)", fontSize: 11 },
  labelStyle: { color: "rgba(var(--ep-ink-rgb),0.6)", fontSize: 10 },
};
const TICK_STYLE = { fill: "rgba(var(--ep-ink-rgb),0.35)", fontSize: 9 };

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

type RangeKey = "30" | "90" | "all";
const RANGES: { key: RangeKey; label: string; days?: number }[] = [
  { key: "30", label: "30 jours", days: 30 },
  { key: "90", label: "90 jours", days: 90 },
  { key: "all", label: "Tout" },
];

const thStyle = (align: "left" | "right"): React.CSSProperties => ({ textAlign: align, padding: "8px 8px 6px", fontWeight: 800 });
const tdStyle = (align: "left" | "right"): React.CSSProperties => ({ textAlign: align, padding: "7px 8px", whiteSpace: "nowrap" });

function StatTile({ label, value, sub, gold = false }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <div
      className="ep-card"
      style={{
        padding: "12px 14px",
        borderColor: gold ? "rgba(var(--ep-gold-rgb),0.4)" : undefined,
        boxShadow: gold ? "0 0 0 1px rgba(var(--ep-gold-rgb),0.15), 0 6px 18px rgba(var(--ep-gold-rgb),0.1)" : undefined,
      }}
    >
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.3)", margin: "0 0 4px" }}>
        {label}
      </p>
      <p style={{ fontSize: 18, fontWeight: 900, color: gold ? "var(--ep-gold)" : "var(--ep-ink)", margin: 0, letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: gold ? "rgba(var(--ep-gold-rgb),0.6)" : "rgba(var(--ep-ink-rgb),0.3)", margin: "2px 0 0" }}>{sub}</p>}
    </div>
  );
}

function TrendChart({ title, data, unit, color }: {
  title: string;
  data: { date: string; value: number | null }[];
  unit: string;
  color: string;
}) {
  const t = useT();
  const hasData = data.some((d) => d.value != null);
  const chartData = withRollingAverage(data);
  return (
    <div className="ep-card" style={{ padding: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.35)", margin: "0 0 10px" }}>
        {title}
      </p>
      {hasData ? (
        <div style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--ep-line-rgb),0.1)" vertical={false} />
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
        <p className="text-xs text-(--ep-ink)/25 italic py-8 text-center">{t("Pas encore de données.")}</p>
      )}
    </div>
  );
}

function StressChip({ val }: { val: "low" | "medium" | "high" | null }) {
  if (!val) return <span style={{ color: "rgba(var(--ep-ink-rgb),0.2)" }}>-</span>;
  const colors: Record<string, string> = { low: "var(--ep-ok)", medium: "var(--ep-yellow)", high: "var(--ep-bad)" };
  const labels: Record<string, string> = { low: "Bas", medium: "Moyen", high: "Haut" };
  return (
    <span style={{
      display: "inline-block", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
      padding: "2px 8px", borderRadius: 99,
      background: withAlpha(colors[val], "20"), color: colors[val], border: `1px solid ${withAlpha(colors[val], "40")}`,
    }}>
      {labels[val]}
    </span>
  );
}

// Chaque métrique a sa propre couleur (reprise des TrendChart au dessus,
// même langage visuel du haut en bas de l'écran) et sa propre icône —
// retour direct 2026-09-02 : "tout en bas les infos de bilan sont très
// mal, illisible, c'est moche, c'est le même style partout, difficile de
// repérer". Avant, tout (poids, pas, sommeil, macros) rendait en gris
// uniforme minuscule, sans aucun repère visuel pour distinguer une ligne
// d'une autre au premier coup d'œil.
const METRIC_STYLE = {
  poids:     { color: "var(--ep-red)",   Icon: Scale },
  pas:       { color: "var(--ep-ok)",         Icon: Footprints },
  sommeil:   { color: "#818cf8",         Icon: Moon },
  kcal:      { color: "var(--ep-warn)",         Icon: Zap },
  proteines: { color: "var(--ep-pink)",  Icon: Beef },
  glucides:  { color: "var(--ep-gold)",  Icon: Wheat },
  lipides:   { color: "var(--ep-orange)",         Icon: Droplets },
} as const;

function KV({ metric, label, value }: { metric: keyof typeof METRIC_STYLE; label: string; value: string | null }) {
  const { color, Icon } = METRIC_STYLE[metric];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <div style={{
        width: 22, height: 22, borderRadius: 7, flexShrink: 0,
        background: `${withAlpha(color, "1a")}`, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={11} style={{ color }} strokeWidth={2.2} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.3)", margin: 0, lineHeight: 1.3 }}>
          {label}
        </p>
        <p style={{ fontSize: 13, fontWeight: 800, color: value !== null ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.2)", margin: 0, lineHeight: 1.3 }}>
          {value ?? "-"}
        </p>
      </div>
    </div>
  );
}

function AvgRow({ metric, label, value, unit = "" }: { metric: keyof typeof METRIC_STYLE; label: string; value: number | null; unit?: string }) {
  const { color, Icon } = METRIC_STYLE[metric];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(var(--ep-line-rgb),0.08)" }}>
      <div style={{
        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
        background: `${withAlpha(color, "1a")}`, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={12} style={{ color }} strokeWidth={2.2} />
      </div>
      <span style={{ flex: 1, fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.5)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 900, color: value !== null ? color : "rgba(var(--ep-ink-rgb),0.15)", letterSpacing: "-0.01em" }}>
        {value !== null ? `${value}${unit}` : "-"}
      </span>
    </div>
  );
}

function DayCard({ log }: { log: DailyLog }) {
  const t = useT();
  return (
    <div className="ep-card" style={{ padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(var(--ep-accent-rgb),0.6)" }}>
            {fmtShort(log.log_date)}
          </span>
          {log.training_name && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ep-ink)" }}>{log.training_name}</span>
          )}
        </div>
        {log.stress && <StressChip val={log.stress} />}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px" }}>
        <KV metric="poids" label={t("Poids")} value={log.weight_morning != null ? `${log.weight_morning} kg` : null} />
        <KV metric="pas" label={t("Pas")} value={log.steps != null ? log.steps.toLocaleString("fr-FR") : null} />
        <KV metric="sommeil" label={t("Sommeil")} value={log.sleep_hours != null ? `${log.sleep_hours}h` : null} />
        <KV metric="kcal" label={t("Kcal")} value={log.calories_kcal != null ? `${log.calories_kcal}` : null} />
      </div>
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
  const t = useT();
  const [range, setRange] = useState<RangeKey>("30");
  // MASTERCLASS.md Axe L : new Date().toISOString() rend la date en UTC —
  // entre minuit et 1h/2h du matin heure de Paris, "today" pointait encore
  // sur hier et faussait la série (computeLogStreak) juste après minuit.
  const today = todayInParis();

  if (logs.length === 0) {
    return (
      <div className="ep-card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <p style={{ color: "rgba(var(--ep-ink-rgb),0.3)", fontSize: 13, margin: 0 }}>
          {t("Remplis ton bilan du jour ci-dessus pour voir ta progression apparaître ici.")}
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
  const cutoff = RANGES.find((r) => r.key === range)?.days;
  const minDate = cutoff ? new Date(new Date(today + "T12:00:00").getTime() - cutoff * 86400000).toISOString().slice(0, 10) : "";
  const inRange = (data: { date: string; value: number | null }[]) => (minDate ? data.filter((d) => d.date >= minDate) : data);

  const weightData = sorted.map((l) => ({ date: l.log_date, value: l.weight_morning }));
  const sleepData = sorted.map((l) => ({ date: l.log_date, value: l.sleep_hours }));
  const stepsData = sorted.map((l) => ({ date: l.log_date, value: l.steps }));
  const caloriesData = sorted.map((l) => ({ date: l.log_date, value: l.calories_kcal }));

  // Alerte dette de sommeil, calculée directement sur daily_logs — même
  // règle que generateInsightsForLatest (lib/biometric-rules.ts, ≥3 nuits
  // à moins de 6h sur les 4 derniers relevés), mais cette règle "intelligente"
  // n'existait jusqu'ici que côté biometric_logs (saisie manuelle de Moi >
  // Sommeil ou sync Oura) : quiconque ne loggue son sommeil QUE via le
  // bilan quotidien (cas réel confirmé : des nuits à 3,1h et 4,1h déjà
  // enregistrées) n'était jamais alerté nulle part, malgré des données
  // réellement alarmantes déjà en base.
  const last4Sleep = sorted.slice(-4).map((l) => l.sleep_hours);
  const shortNights = last4Sleep.filter((h) => h != null && h < 6).length;
  const sleepDebtWarning = last4Sleep.length >= 3 && shortNights >= 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {sleepDebtWarning && (
        <div
          style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "rgba(var(--ep-warn-rgb),0.08)", border: "1px solid rgba(var(--ep-warn-rgb),0.25)",
            borderRadius: 12, padding: "14px 16px",
          }}
        >
          <AlertTriangle size={15} style={{ color: "var(--ep-warn)", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: "var(--ep-ink)", margin: 0, lineHeight: 1.5 }}>
            <strong>{t("Dette de sommeil")}</strong> : {shortNights}{" "}{t("nuit")}{shortNights > 1 ? "s" : ""}{" "}{t("à moins de 6h sur tes")}{" "}{last4Sleep.length}{" "}{t("derniers bilans. Réduis le volume d'entraînement de 10-20% cette semaine et priorise le sommeil avant tout, la récupération ne suivra pas sinon.")}
          </p>
        </div>
      )}

      {/* Courbes : le poids en grand avec sa période au choix, les autres en grille */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
          <div role="tablist" aria-label={t("Période")} style={{ display: "inline-flex", gap: 4 }}>
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={range === r.key}
                onClick={() => setRange(r.key)}
                style={{
                  padding: "6px 12px", borderRadius: 99, fontSize: 11.5, fontWeight: 800, cursor: "pointer",
                  border: `1px solid ${range === r.key ? "rgba(var(--ep-accent-rgb),0.6)" : "rgba(var(--ep-ink-rgb),0.1)"}`,
                  background: range === r.key ? "rgba(var(--ep-accent-rgb),0.15)" : "transparent",
                  color: range === r.key ? "var(--ep-accent-hi2)" : "rgba(var(--ep-ink-rgb),0.55)",
                }}
              >
                {t(r.label)}
              </button>
            ))}
          </div>
          {exportHref && (
            <a
              href={exportHref}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                color: "var(--ep-ink)", textDecoration: "none",
                background: "rgba(var(--ep-line-rgb),0.2)", border: "1px solid rgba(var(--ep-line-rgb),0.3)",
                borderRadius: 8, padding: "7px 12px",
              }}
            >
              <Download size={12} />{" "}{t("Export CSV")}
            </a>
          )}
        </div>
        <TrendChart title={t("Évolution du poids")} data={inRange(weightData)} unit="kg" color="var(--ep-accent)" />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <TrendChart title={t("Sommeil")} data={inRange(sleepData)} unit="h" color="#818cf8" />
        <TrendChart title={t("Pas")} data={inRange(stepsData)} unit="" color="var(--ep-ok)" />
        <TrendChart title={t("Calories")} data={inRange(caloriesData)} unit="kcal" color="var(--ep-warn)" />
      </div>

      {/* Détail semaine par semaine : la plus récente ouverte, un tableau compact par semaine */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(var(--ep-accent-rgb),0.6)", margin: "0 0 10px" }}>
          {t("Détail par semaine")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {weeks.map(({ weekStart, logs: wLogs, averages }, idx) => (
            <details key={weekStart} open={idx === 0} className="ep-card" style={{ padding: 0 }}>
              <summary style={{ listStyle: "none", cursor: "pointer", padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: "var(--ep-ink)" }}>
                  {t("Semaine du")}{" "}{fmtShort(weekStart)}
                  {streak > 0 && idx === 0 && <Flame size={11} style={{ display: "inline", marginLeft: 5, verticalAlign: -1, color: "var(--ep-gold)" }} />}
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.6)" }}>
                  {averages.weight != null && <span>{averages.weight} kg</span>}
                  {averages.calories_kcal != null && <span>{Math.round(averages.calories_kcal)} kcal</span>}
                  {averages.proteins_g != null && <span>{Math.round(averages.proteins_g)} g P</span>}
                  {averages.steps != null && <span>{Math.round(averages.steps).toLocaleString("fr-FR")} {t("pas")}</span>}
                  {averages.sleep_hours != null && <span>{averages.sleep_hours} h</span>}
                </span>
                <span style={{ fontSize: 10, color: "rgba(var(--ep-ink-rgb),0.4)", fontWeight: 700 }}>{wLogs.length} {t("jour")}{wLogs.length > 1 ? "s" : ""}</span>
              </summary>
              <div style={{ overflowX: "auto", padding: "0 6px 8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
                  <thead>
                    <tr style={{ color: "rgba(var(--ep-ink-rgb),0.45)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      <th style={thStyle("left")}>{t("Jour")}</th>
                      <th style={thStyle("right")}>{t("Poids")}</th>
                      <th style={thStyle("right")}>{t("Kcal")}</th>
                      <th style={thStyle("right")}>{t("Prot.")}</th>
                      <th style={thStyle("right")}>{t("Pas")}</th>
                      <th style={thStyle("right")}>{t("Sommeil")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wLogs.map((log) => (
                      <tr key={log.id} style={{ borderTop: "1px solid rgba(var(--ep-line-rgb),0.1)" }}>
                        <td style={tdStyle("left")}>
                          <span style={{ fontWeight: 800 }}>{fmtShort(log.log_date)}</span>
                          {log.training_name && <span style={{ display: "block", fontSize: 10.5, color: "rgba(var(--ep-ink-rgb),0.5)", fontWeight: 600 }}>{log.training_name}</span>}
                        </td>
                        <td style={tdStyle("right")}>{log.weight_morning != null ? `${log.weight_morning} kg` : "–"}</td>
                        <td style={tdStyle("right")}>{log.calories_kcal != null ? log.calories_kcal : "–"}</td>
                        <td style={tdStyle("right")}>{log.proteins_g != null ? `${log.proteins_g} g` : "–"}</td>
                        <td style={tdStyle("right")}>{log.steps != null ? log.steps.toLocaleString("fr-FR") : "–"}</td>
                        <td style={tdStyle("right")}>{log.sleep_hours != null ? `${log.sleep_hours} h` : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
