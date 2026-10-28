"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/I18nProvider";
import { TRACKING_LEVELS, TRACKING_LEVEL_HINT, TRACKING_LEVEL_LABEL, type TrackingLevel } from "@/lib/tracking-profile";

// Niveau de suivi en 1 tap (Simple / Standard / Avancé). Déduit
// automatiquement du profil, modifiable ici par la personne ; « Automatique »
// rend la main au moteur. Le même sélecteur sert au coach sur la fiche client
// (`onPick` fourni) : il fixe alors ce qui est demandé au client, rien d'autre.

export default function TrackingLevelPicker({
  level, autoLevel, source, reasons, summary, onPick, compact = false, suggestion,
}: {
  level: TrackingLevel;
  autoLevel: TrackingLevel;
  source: "auto" | "client" | "coach";
  reasons: string[];
  summary?: string[];
  onPick: (level: TrackingLevel | "auto") => Promise<{ error?: string }>;
  compact?: boolean;
  suggestion?: { level: TrackingLevel; reason: string } | null;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(v: TrackingLevel | "auto") {
    setError(null);
    start(async () => {
      const res = await onPick(v);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="ep-card" style={{ padding: compact ? "12px 12px 10px" : "14px 14px 12px", opacity: pending ? 0.7 : 1 }}>
      <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.5)" }}>
        {t("Niveau de suivi")}
      </p>
      <div role="radiogroup" aria-label={t("Niveau de suivi")} style={{ display: "flex", gap: 6 }}>
        {TRACKING_LEVELS.map((l) => (
          <button
            key={l} type="button" role="radio" aria-checked={level === l} disabled={pending} onClick={() => pick(l)}
            style={{
              flex: 1, minHeight: 44, borderRadius: 12, cursor: "pointer", fontSize: 13, fontWeight: 800,
              border: `1px solid ${level === l ? "var(--ep-accent)" : "rgba(var(--ep-line-rgb),0.3)"}`,
              background: level === l ? "var(--ep-accent)" : "rgba(var(--ep-shade-rgb),0.3)",
              color: level === l ? "var(--ep-strong)" : "rgba(var(--ep-ink-rgb),0.7)",
            }}
          >
            {t(TRACKING_LEVEL_LABEL[l])}
          </button>
        ))}
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.6)", lineHeight: 1.45 }}>{t(TRACKING_LEVEL_HINT[level])}</p>
      <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.45)", lineHeight: 1.45 }}>
        {source === "auto" ? t("Choisi pour toi d'après ton profil.") : source === "coach" ? t("Fixé par ton coach.") : t("Choisi par toi.")}
        {source !== "auto" && (
          <>
            {" "}
            <button type="button" onClick={() => pick("auto")} disabled={pending} style={{ background: "none", border: "none", padding: 0, color: "var(--ep-accent)", fontWeight: 800, fontSize: 11.5, cursor: "pointer" }}>
              {t("Revenir à l'automatique")} ({t(TRACKING_LEVEL_LABEL[autoLevel])})
            </button>
          </>
        )}
      </p>
      {suggestion && suggestion.level !== level && (
        <button
          type="button" disabled={pending} onClick={() => pick(suggestion.level)}
          style={{ marginTop: 8, width: "100%", minHeight: 44, textAlign: "left", padding: "8px 12px", borderRadius: 12, border: "1px solid rgba(var(--ep-accent-rgb),0.4)", background: "rgba(var(--ep-accent-rgb),0.08)", color: "var(--ep-ink)", fontSize: 12, cursor: "pointer" }}
        >
          <strong>{t("Passer en")} {t(TRACKING_LEVEL_LABEL[suggestion.level])} ?</strong> {t(suggestion.reason)}
        </button>
      )}
      {(reasons.length > 0 || (summary && summary.length > 0)) && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, fontWeight: 800, color: "rgba(var(--ep-ink-rgb),0.55)", minHeight: 32, display: "flex", alignItems: "center" }}>
            {t("Pourquoi ce niveau, et ce qui est suivi")}
          </summary>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: "rgba(var(--ep-ink-rgb),0.65)" }}>
            {reasons.map((r) => <li key={r}>{t(r)}</li>)}
          </ul>
          {summary && summary.length > 0 && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: "rgba(var(--ep-ink-rgb),0.65)" }}>
              {summary.map((r) => <li key={r}>{t(r)}</li>)}
            </ul>
          )}
        </details>
      )}
      {error && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ep-bad)" }}>{t(error)}</p>}
    </div>
  );
}
