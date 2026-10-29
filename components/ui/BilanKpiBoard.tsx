"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { DailyLog } from "@/utils/daily-logs";
import { todayInParis } from "@/lib/dates";

// Tableau de bord en haut de « Bilan & progression » : les chiffres qui
// comptent se lisent d'un coup d'œil, sans descendre. Chaque tuile donne la
// moyenne des 7 derniers jours, l'écart avec les 7 jours d'avant et une
// mini-courbe des 14 derniers jours.

type Metric = {
  key: string;
  label: string;
  unit: string;
  color: string;
  pick: (l: DailyLog) => number | null | undefined;
  decimals: number;
  /** +1 : monter est positif, -1 : descendre est positif, 0 : neutre (dépend de l'objectif). */
  good: 1 | -1 | 0;
};

const METRICS: Metric[] = [
  { key: "weight", label: "Poids", unit: "kg", color: "var(--ep-red)", pick: (l) => l.weight_morning, decimals: 1, good: 0 },
  { key: "kcal", label: "Kcal / jour", unit: "kcal", color: "var(--ep-warn)", pick: (l) => l.calories_kcal, decimals: 0, good: 0 },
  { key: "prot", label: "Protéines", unit: "g", color: "var(--ep-pink)", pick: (l) => l.proteins_g, decimals: 0, good: 1 },
  { key: "steps", label: "Pas / jour", unit: "", color: "var(--ep-ok)", pick: (l) => l.steps, decimals: 0, good: 1 },
  { key: "sleep", label: "Sommeil", unit: "h", color: "#818cf8", pick: (l) => l.sleep_hours, decimals: 1, good: 1 },
];

function dayShift(iso: string, delta: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function avg(values: (number | null | undefined)[]): number | null {
  const v = values.filter((x): x is number => typeof x === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function Spark({ values, color }: { values: (number | null)[]; color: string }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  if (pts.length < 2) return <div style={{ height: 28 }} />;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const span = max - min || 1;
  const w = 100;
  const h = 28;
  const path = pts
    .map((p, k) => `${k === 0 ? "M" : "L"}${((p.i / Math.max(1, values.length - 1)) * w).toFixed(1)},${(h - 3 - ((p.v - min) / span) * (h - 6)).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 28, display: "block" }} aria-hidden>
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function fmtNum(n: number, decimals: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function BilanKpiBoard({ logs, streakDays }: { logs: DailyLog[]; streakDays?: number }) {
  const t = useT();
  if (logs.length === 0) return null;
  const today = todayInParis();
  const byDate = new Map(logs.map((l) => [l.log_date, l]));
  const last14 = Array.from({ length: 14 }, (_, i) => byDate.get(dayShift(today, i - 13)) ?? null);
  const cur = last14.slice(7);
  const prev = last14.slice(0, 7);

  return (
    <section aria-label={t("Mes chiffres")} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
      {METRICS.map((m) => {
        const now = avg(cur.map((l) => (l ? m.pick(l) : null)));
        const before = avg(prev.map((l) => (l ? m.pick(l) : null)));
        const delta = now != null && before != null ? now - before : null;
        const rounded = delta != null ? Number(delta.toFixed(m.decimals)) : null;
        const up = rounded != null && rounded > 0;
        const down = rounded != null && rounded < 0;
        const positive = m.good === 0 || rounded == null || rounded === 0 ? null : (m.good === 1) === up;
        const tone = positive == null ? "rgba(var(--ep-ink-rgb),0.5)" : positive ? "var(--ep-ok)" : "var(--ep-warn)";
        return (
          <div key={m.key} className="ep-card" style={{ padding: "11px 12px 8px", minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.5)" }}>{t(m.label)}</p>
            <p style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: now != null ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.25)", lineHeight: 1.1 }}>
              {now != null ? fmtNum(now, m.decimals) : "–"}
              {now != null && m.unit && <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.45)", marginLeft: 3 }}>{m.unit}</span>}
            </p>
            <p style={{ margin: "2px 0 4px", fontSize: 11, fontWeight: 800, color: tone, display: "flex", alignItems: "center", gap: 2 }}>
              {rounded == null ? (
                <span style={{ color: "rgba(var(--ep-ink-rgb),0.35)", fontWeight: 600 }}>{t("7 derniers jours")}</span>
              ) : (
                <>
                  {up ? <ArrowUpRight size={13} /> : down ? <ArrowDownRight size={13} /> : <Minus size={13} />}
                  {up ? "+" : ""}
                  {fmtNum(rounded, m.decimals)} {m.unit}
                  <span style={{ marginLeft: 3, fontWeight: 600, color: "rgba(var(--ep-ink-rgb),0.4)" }}>{t("vs semaine d'avant")}</span>
                </>
              )}
            </p>
            <Spark values={last14.map((l) => (l ? (m.pick(l) ?? null) : null))} color={m.color} />
          </div>
        );
      })}
      {streakDays != null && streakDays > 0 && (
        <div className="ep-card" style={{ padding: "11px 12px", borderColor: "rgba(var(--ep-gold-rgb),0.4)" }}>
          <p style={{ margin: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.5)" }}>{t("Bilans d'affilée")}</p>
          <p style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 900, color: "var(--ep-gold)", lineHeight: 1.1 }}>{streakDays}<span style={{ fontSize: 11, marginLeft: 3 }}>{t("jours")}</span></p>
        </div>
      )}
    </section>
  );
}
