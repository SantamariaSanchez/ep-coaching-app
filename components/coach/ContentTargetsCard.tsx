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

  // Vue compacte (2026-11-15, « arrête d'être trop verbeux ») : une ligne de
  // pastilles « Reels 3/72 », un crayon pour régler. Rien de plus.
  return (
    <section style={{ marginBottom: 12 }} aria-label={t("Objectifs du jour")}>
      {!editing && (
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Target size={13} style={{ color: "var(--ep-accent)", flexShrink: 0 }} />
          {set.length === 0 ? (
            <button type="button" onClick={open} className="flex-shrink-0 h-8 px-3 rounded-full text-[11.5px] font-bold" style={{ border: "1px dashed rgba(var(--ep-accent-rgb),0.5)", color: "var(--ep-ink)", background: "transparent", cursor: "pointer" }}>
              {t("Fixer mes objectifs du jour")}
            </button>
          ) : (
            <>
              {set.map((d) => {
                const target = targets[d.key]!;
                const done = doneToday[d.key] ?? 0;
                const s = stock[d.key] ?? 0;
                const missing = Math.max(0, target - done - s);
                return (
                  <span
                    key={d.key}
                    title={`${s} ${t("prêts")}${missing ? ` · ${t("il en manque")} ${missing}` : ""}`}
                    className="flex-shrink-0 inline-flex items-baseline gap-1 h-8 px-2.5 rounded-full text-[11.5px] font-bold"
                    style={{ border: `1px solid ${done >= target ? "rgba(var(--ep-ok-rgb),0.5)" : missing ? "rgba(var(--ep-warn-rgb),0.45)" : "rgba(var(--ep-ink-rgb),0.12)"}`, color: "rgba(var(--ep-ink-rgb),0.65)", lineHeight: "30px" }}
                  >
                    {t(d.label)} <b style={{ color: done >= target ? "var(--ep-ok)" : "var(--ep-ink)", fontWeight: 900 }}>{done}/{target}</b>
                  </span>
                );
              })}
              <button type="button" onClick={open} aria-label={t("Modifier mes objectifs")} className="flex-shrink-0 h-8 w-8 rounded-full inline-flex items-center justify-center" style={{ border: "1px solid rgba(var(--ep-ink-rgb),0.12)", background: "transparent", color: "rgba(var(--ep-ink-rgb),0.6)", cursor: "pointer" }}>
                <Pencil size={12} />
              </button>
            </>
          )}
        </div>
      )}

      {editing && (
        <div className="ep-card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
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
