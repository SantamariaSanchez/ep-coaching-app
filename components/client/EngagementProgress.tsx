"use client";

import { useT } from "@/components/i18n/I18nProvider";

export interface EngagementProgressData {
  monthIndex: number;
  months: number;
  weekIndex: number;
  totalWeeks: number;
  pct: number;
  daysLeft: number;
}

// Progression sobre de l'accompagnement : « Mois X sur 6 ». Aucune échéance
// commerciale côté client, juste un repère de parcours.
export function EngagementChip({ progress }: { progress: EngagementProgressData }) {
  const t = useT();
  return (
    <span
      style={{
        fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", padding: "2px 7px", borderRadius: 999,
        color: "rgba(var(--ep-ink-rgb),0.35)", background: "rgba(var(--ep-ink-rgb),0.06)", border: "1px solid rgba(var(--ep-ink-rgb),0.1)",
      }}
    >
      {t("Mois")} {progress.monthIndex} {t("sur")} {progress.months}
    </span>
  );
}

export default function EngagementProgressCard({ progress }: { progress: EngagementProgressData }) {
  const t = useT();
  return (
    <div className="ep-card" style={{ padding: "14px 16px", margin: "0 0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ep-strong)" }}>
          {t("Mois")} {progress.monthIndex} {t("sur")} {progress.months}
        </span>
        <span style={{ fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.45)" }}>
          {t("Semaine")} {progress.weekIndex} {t("sur")} {progress.totalWeeks}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.pct}
        aria-label={t("Progression de ton accompagnement")}
        style={{ height: 6, borderRadius: 999, background: "rgba(var(--ep-ink-rgb),0.08)", overflow: "hidden" }}
      >
        <div style={{ width: `${progress.pct}%`, height: "100%", background: "var(--ep-accent)", borderRadius: 999 }} />
      </div>
    </div>
  );
}
