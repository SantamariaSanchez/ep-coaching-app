"use client";

import { useState, useTransition } from "react";
import { Target, Calculator, Pencil } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { saveContentTargetsAction } from "@/app/actions/app-setup";
import { safeAction } from "@/lib/safe-action";
import { CONTENT_TARGET_DEFS, MAX_TARGET, cleanTargets, reelsFromTime, type ContentTargets, type ProductionTime } from "@/lib/content-targets";

// Objectifs du jour du Studio (2026-11-15) : chaque coach fixe ses propres
// nombres (« pas définis par toi », retour d'Emmanuel), avec un calcul
// proposé pour les reels à partir de son temps de tournage et de montage.
// Visible en tête des onglets Scripts et Posts à publier.

const EMPTY_TIME: ProductionTime = { filmingMinutes: 0, editingMinutes: 0, reelMinutes: 0, youtubeMinutes: 0, youtubePerDay: 0 };

const input: React.CSSProperties = {
  width: 76, padding: "7px 9px", borderRadius: 9, fontSize: 13, fontWeight: 700,
  border: "1px solid rgba(var(--ep-ink-rgb),0.15)", background: "rgba(var(--ep-shade-rgb),0.3)", color: "var(--ep-ink)",
};

export default function ContentTargetsCard({
  initialTargets,
  initialTime,
  doneToday,
  stock,
  keys,
}: {
  initialTargets: ContentTargets;
  initialTime: ProductionTime | null;
  /** Publié aujourd'hui, par clé d'objectif. */
  doneToday: Record<string, number>;
  /** Contenus prêts (à tourner, tournés ou à publier), par clé d'objectif. */
  stock: Record<string, number>;
  /** Types proposés (selon les plateformes du coach). */
  keys: string[];
}) {
  const t = useT();
  const [targets, setTargets] = useState<ContentTargets>(initialTargets);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [time, setTime] = useState<ProductionTime>(initialTime ?? EMPTY_TIME);
  const [showCalc, setShowCalc] = useState(!!initialTime);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const defs = CONTENT_TARGET_DEFS.filter((d) => keys.includes(d.key) || targets[d.key]);
  const set = defs.filter((d) => targets[d.key]);
  const suggested = reelsFromTime(time);

  function open() {
    setDraft(Object.fromEntries(defs.map((d) => [d.key, targets[d.key] ? String(targets[d.key]) : ""])));
    setError(null);
    setEditing(true);
  }

  function save() {
    const next = cleanTargets(draft);
    const timeToSave = showCalc && (time.filmingMinutes || time.editingMinutes) ? time : null;
    const backup = targets;
    setTargets(next);
    setEditing(false);
    start(async () => {
      const res = await safeAction(() => saveContentTargetsAction(next, timeToSave));
      if (res.error) {
        setTargets(backup);
        setEditing(true);
        setError(res.error);
      }
    });
  }

  const timeField = (key: keyof ProductionTime, label: string, unit: string) => (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.7)" }}>
      <span style={{ flex: 1 }}>{t(label)}</span>
      <input
        type="number" inputMode="numeric" min={0} value={time[key] || ""}
        onChange={(e) => setTime((p) => ({ ...p, [key]: Math.max(0, Number(e.target.value) || 0) }))}
        style={input} aria-label={t(label)}
      />
      <span style={{ width: 34, fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.45)" }}>{t(unit)}</span>
    </label>
  );

  return (
    <section className="ep-card" style={{ padding: "12px 14px", marginBottom: 14 }} aria-label={t("Objectifs du jour")}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Target size={14} style={{ color: "var(--ep-accent)" }} />
        <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 900, color: "var(--ep-ink)" }}>{t("Objectifs du jour")}</p>
        {!editing && (
          <button type="button" onClick={open} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 9, border: "1px solid rgba(var(--ep-ink-rgb),0.14)", background: "transparent", color: "var(--ep-ink)", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>
            <Pencil size={12} /> {set.length ? t("Modifier") : t("Fixer mes objectifs")}
          </button>
        )}
      </div>

      {!editing && set.length === 0 && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.55)", lineHeight: 1.5 }}>
          {t("Choisis combien de contenus tu veux publier chaque jour. Le Studio te montre où tu en es, et Claude (connecteur EP Coaching) prépare ce qu'il manque.")}
        </p>
      )}

      {!editing && set.length > 0 && (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }} className="sm:grid-cols-2">
          {set.map((d) => {
            const target = targets[d.key]!;
            const done = doneToday[d.key] ?? 0;
            const s = stock[d.key] ?? 0;
            const missing = Math.max(0, target - done - s);
            const pct = Math.min(100, Math.round((done / target) * 100));
            return (
              <div key={d.key}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: "var(--ep-ink)" }}>{t(d.label)}</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: done >= target ? "var(--ep-ok)" : "var(--ep-ink)" }}>{done} / {target}</span>
                </div>
                <div style={{ marginTop: 4, height: 5, borderRadius: 999, background: "rgba(var(--ep-ink-rgb),0.08)", overflow: "hidden" }} aria-hidden>
                  <div style={{ width: `${pct}%`, height: "100%", background: done >= target ? "var(--ep-ok)" : "var(--ep-accent)", transition: "width 240ms ease" }} />
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 10.5, color: missing ? "var(--ep-warn)" : "rgba(var(--ep-ink-rgb),0.45)" }}>
                  {s} {t("prêts")}{missing ? ` · ${t("il en manque")} ${missing}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gap: 8 }} className="sm:grid-cols-2">
            {defs.map((d) => (
              <label key={d.key} style={{ display: "flex", alignItems: "center", gap: 8 }} title={t(d.hint)}>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: "var(--ep-ink)" }}>{t(d.label)}</span>
                <input
                  type="number" inputMode="numeric" min={0} max={MAX_TARGET} placeholder="0"
                  value={draft[d.key] ?? ""}
                  onChange={(e) => setDraft((p) => ({ ...p, [d.key]: e.target.value }))}
                  style={input} aria-label={`${t(d.label)} ${t("par jour")}`}
                />
                <span style={{ width: 34, fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.45)" }}>{t("/ jour")}</span>
              </label>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.45)" }}>{t("Vide ou 0 : pas d'objectif pour ce type.")}</p>

          <button type="button" onClick={() => setShowCalc((v) => !v)} aria-expanded={showCalc} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11.5, fontWeight: 800, color: "var(--ep-accent-hi2)" }}>
            <Calculator size={12} /> {t("Calculer mes reels depuis mon temps")}
          </button>
          {showCalc && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(var(--ep-shade-rgb),0.3)", display: "flex", flexDirection: "column", gap: 6 }}>
              {timeField("filmingMinutes", "Tournage par jour", "min")}
              {timeField("editingMinutes", "Montage par jour", "min")}
              {timeField("reelMinutes", "Temps pour un reel, tournage compris", "min")}
              {timeField("youtubePerDay", "Vidéos YouTube par jour", "")}
              {timeField("youtubeMinutes", "Temps pour une vidéo YouTube, tournage compris", "min")}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <p style={{ margin: 0, flex: 1, fontSize: 12.5, fontWeight: 800, color: "var(--ep-ink)" }}>
                  {time.reelMinutes ? `${t("Ça fait")} ${suggested} ${t("reels par jour")}` : t("Indique le temps d'un reel pour voir le calcul.")}
                </p>
                {time.reelMinutes > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, reel: String(suggested), ...(time.youtubePerDay ? { youtube: String(time.youtubePerDay) } : {}) }))}
                    style={{ padding: "6px 10px", borderRadius: 9, border: "none", background: "var(--ep-accent)", color: "#fff", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}
                  >
                    {t("Utiliser")}
                  </button>
                )}
              </div>
            </div>
          )}

          {error && <p style={{ margin: 0, fontSize: 12, color: "#fca5a5" }}>{t(error)}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={save} disabled={pending} style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "var(--ep-accent)", color: "#fff", fontSize: 12.5, fontWeight: 900, cursor: "pointer" }}>
              {t("Enregistrer")}
            </button>
            <button type="button" onClick={() => setEditing(false)} style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(var(--ep-ink-rgb),0.14)", background: "transparent", color: "var(--ep-ink)", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>
              {t("Annuler")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
