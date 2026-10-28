"use client";

// « Construire ma semaine » (2026-10-20) : un générateur qui remplit la
// semaine sans trou à partir des heures de la personne, des séances de son
// programme, des repas de sa diète et des blocs de travail qu'elle choisit,
// avec les trajets entre les lieux. Aperçu avant validation ; rien n'est
// supprimé sans confirmation explicite.

import { useMemo, useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import Sheet from "@/components/nutrition/Sheet";
import { ChevronLeft, ChevronRight, Plus, Wand2, X } from "lucide-react";
import { AGENDA_ICON_MAP } from "@/lib/agenda-presets";
import {
  ALL_DAYS,
  DAY_LABELS,
  DAY_SHORT,
  TRAVEL_MODES,
  WORK_SUGGESTIONS,
  WORK_WHEN,
  buildWeek,
  clockLabel,
  durationLabel,
  formatSteps,
  genStats,
  sanitizeWindow,
  suggestedTrainingDays,
  toMin,
  windowSpan,
  type AgendaPrefs,
  type DayWindow,
  type GenBlock,
  type Placed,
  type WorkItem,
} from "@/lib/agenda-engine";
import { dietSlotsForDay, type AgendaContext } from "@/lib/agenda-links";
import type { ColumnBlockInput } from "./types";
import { Chip, DayPicker, ErrorText, PrimaryButton, SectionLabel, TimeSelect, ToggleRow } from "./ui";

const DEFAULT_MEALS = ["breakfast", "lunch", "afternoon", "dinner"];
const STEPS = ["Ta journée", "Séances et repas", "Travail", "Aperçu"];

export default function WeekBuilderSheet({
  window: initialWindow,
  prefs: initialPrefs,
  ctx,
  existing,
  alarmCols,
  scopeCol,
  onApply,
  onClose,
}: {
  window: DayWindow;
  prefs: AgendaPrefs;
  ctx: AgendaContext;
  /** Semaine type actuelle (sans réveil ni rendez-vous datés). */
  existing: Placed[];
  alarmCols: number[];
  /** Une seule journée à compléter, sinon toute la semaine. */
  scopeCol: number | null;
  onApply: (blocks: ColumnBlockInput[], mode: "completer" | "remplacer", w: DayWindow, prefs: AgendaPrefs) => Promise<string | null>;
  onClose: () => void;
}) {
  const t = useT();
  const [step, setStep] = useState(scopeCol ? 3 : 0);
  const [w, setW] = useState<DayWindow>(initialWindow);
  const [prefs, setPrefs] = useState<AgendaPrefs>(() =>
    initialPrefs.work.length ? initialPrefs : { ...initialPrefs, work: [WORK_SUGGESTIONS[0]] }
  );
  const set = <K extends keyof AgendaPrefs>(k: K, v: AgendaPrefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));

  // Jour de chaque séance : celui du programme, sinon une répartition proposée.
  const [sessionDays, setSessionDays] = useState<(number | null)[]>(() => {
    const fixed = ctx.sessions.map((s) => s.weekday ?? null);
    if (fixed.some((d) => d !== null)) return fixed;
    const sug = suggestedTrainingDays(ctx.sessions.length);
    return ctx.sessions.map((_, i) => sug[i] ?? null);
  });
  const programHasDays = ctx.sessions.some((s) => s.weekday);

  const scopeHasExisting = existing.some((p) => scopeCol === null || p.col === scopeCol);
  const [mode, setMode] = useState<"completer" | "remplacer">(scopeHasExisting ? "completer" : "remplacer");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewCol, setPreviewCol] = useState<number>(scopeCol ?? 1);
  const [newWork, setNewWork] = useState("");
  const [taskDraft, setTaskDraft] = useState<Record<number, string>>({});

  const sessionsByDay = useMemo(() => {
    const map: Record<number, { label: string } | undefined> = {};
    ctx.sessions.forEach((s, i) => {
      const d = sessionDays[i];
      if (d && !map[d]) map[d] = { label: s.label };
    });
    return map;
  }, [ctx.sessions, sessionDays]);

  const mealSlotsByDay = useMemo(() => {
    const map: Record<number, string[]> = {};
    for (const d of ALL_DAYS) {
      let slots = ctx.diet ? dietSlotsForDay(ctx, d) : DEFAULT_MEALS;
      // Diète identique tous les jours : pas de pré/post les jours sans séance.
      if (ctx.diet?.structure !== "weekly" && !sessionsByDay[d]) slots = slots.filter((s) => s !== "preworkout" && s !== "intraworkout" && s !== "postworkout");
      map[d] = slots;
    }
    return map;
  }, [ctx, sessionsByDay]);

  const generated: GenBlock[] = useMemo(() => {
    const all = buildWeek({ window: w, prefs, sessionsByDay, mealSlotsByDay, existing: mode === "completer" ? existing : [], alarmCols });
    return scopeCol ? all.filter((b) => b.col === scopeCol) : all;
  }, [w, prefs, sessionsByDay, mealSlotsByDay, mode, existing, alarmCols, scopeCol]);

  const keptExisting = mode === "completer" ? existing.filter((p) => scopeCol === null || p.col === scopeCol) : [];
  const stats = genStats(generated, w, keptExisting);
  const replaced = mode === "remplacer" ? existing.filter((p) => scopeCol === null || p.col === scopeCol).length : 0;
  const { s: ws, e: we } = windowSpan(w);
  const span = we - ws;
  const visible = generated.filter((b) => b.source !== "reveil");

  async function apply() {
    if (mode === "remplacer" && replaced > 0 && !confirm) return setConfirm(true);
    setBusy(true);
    setErr(null);
    const items: ColumnBlockInput[] = generated.map((b) => ({ col: b.col, s: b.s, e: b.e, label: b.label, icon: b.icon, color: b.color, tasks: b.tasks, notes: null, notify: b.notify, link_ref: b.link_ref }));
    const res = await onApply(items, mode, w, prefs);
    setBusy(false);
    setConfirm(false);
    if (res) setErr(res);
  }

  function updateWork(i: number, patch: Partial<WorkItem>) {
    set("work", prefs.work.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }

  const footer = (
    <div className="flex gap-2">
      {step > 0 && !(scopeCol && step === 3) && (
        <button type="button" onClick={() => { setStep(step - 1); setConfirm(false); }} className="w-12 rounded-xl border border-(--ep-line)/40 flex items-center justify-center text-(--ep-ink)/70" aria-label={t("Étape précédente")}>
          <ChevronLeft size={18} />
        </button>
      )}
      <div className="flex-1">
        {step < 3 ? (
          <PrimaryButton onClick={() => setStep(step + 1)}>
            {t("Suivant")} <ChevronRight size={14} />
          </PrimaryButton>
        ) : (
          <PrimaryButton danger={confirm} disabled={busy || generated.length === 0} onClick={apply}>
            <Wand2 size={14} />
            {busy ? t("Construction…") : confirm ? `${t("Remplacer")} ${replaced} ${t("blocs")}` : `${t("Valider")} · ${visible.length} ${t("blocs")}`}
          </PrimaryButton>
        )}
      </div>
    </div>
  );

  return (
    <Sheet
      title={scopeCol ? `${t("Compléter")} ${DAY_LABELS[scopeCol].toLowerCase()}` : t("Construire ma semaine")}
      subtitle={scopeCol ? t("Les trous se remplissent, rien n'est supprimé") : `${step + 1}/4 · ${t(STEPS[step])}`}
      onClose={onClose}
      footer={footer}
    >
      <div className="space-y-5 pb-2">
        {step === 0 && (
          <>
            <section>
              <SectionLabel>{t("Tes heures")}</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <TimeSelect label={t("Début de journée")} value={w.start} onChange={(v) => setW(sanitizeWindow(v, w.end))} />
                <TimeSelect label={t("Fin de journée")} value={w.end} allowMidnightEnd onChange={(v) => setW(sanitizeWindow(w.start, v))} />
              </div>
              <p className="text-[11px] text-(--ep-ink)/45 mt-1.5">{t("Journée de")} {durationLabel(span)}, {clockLabel(ws)} → {clockLabel(we)}. {t("Chaque minute aura sa place.")}</p>
            </section>
            <section>
              <SectionLabel>{t("Jours de travail")}</SectionLabel>
              <DayPicker value={prefs.workDays} onChange={(d) => set("workDays", d)} />
              <p className="text-[11px] text-(--ep-ink)/45 mt-1.5">{t("Les autres jours, le temps restant devient du temps libre.")}</p>
            </section>
          </>
        )}

        {step === 1 && (
          <>
            <section>
              <SectionLabel>{t("Séances du programme")}</SectionLabel>
              {ctx.sessions.length === 0 ? (
                <p className="text-xs text-(--ep-ink)/50">{t("Pas de programme actif : aucune séance ne sera ajoutée.")}</p>
              ) : (
                <div className="space-y-2.5">
                  {!programHasDays && <p className="text-[11px]" style={{ color: "var(--ep-warn)" }}>{t("Ton programme ne fixe pas de jours : voici une répartition, à ajuster.")}</p>}
                  {ctx.sessions.map((s, i) => (
                    <div key={s.id}>
                      <p className="text-xs font-bold text-(--ep-strong) mb-1">{s.label} <span className="text-(--ep-ink)/40 font-semibold">· {s.exercises.length} {t("exos")}</span></p>
                      <div className="grid grid-cols-8 gap-1">
                        {[null, ...ALL_DAYS].map((d) => {
                          const on = sessionDays[i] === d;
                          return (
                            <button
                              key={d ?? 0}
                              type="button"
                              onClick={() => setSessionDays((arr) => arr.map((x, j) => (j === i ? d : x)))}
                              className="h-8 rounded-md text-[10px] font-black border"
                              style={{ background: on ? "rgba(var(--ep-accent-rgb),0.18)" : "transparent", borderColor: on ? "rgba(var(--ep-accent-rgb),0.6)" : "rgba(var(--ep-line-rgb),0.25)", color: on ? "var(--ep-strong)" : "rgba(var(--ep-ink-rgb),0.5)" }}
                            >
                              {d ? DAY_SHORT[d] : "—"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            {ctx.sessions.length > 0 && (
              <section className="space-y-2.5">
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <SectionLabel>{t("Heure de séance")}</SectionLabel>
                    <TimeSelect label={t("Heure de séance")} step={15} value={toMin(prefs.sessionTime)} onChange={(v) => set("sessionTime", clockLabel(v))} />
                  </div>
                  <p className="text-[11px] text-(--ep-ink)/50 pb-2">
                    {t("Total avec trajets")} : <b className="text-(--ep-strong)">{durationLabel(prefs.sessionMinutes + 2 * prefs.gymTravelMinutes)}</b>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-(--ep-ink)/45 mb-1.5">{t("Durée de la séance")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[45, 60, 75, 90, 105, 120].map((m) => <Chip key={m} active={prefs.sessionMinutes === m} onClick={() => set("sessionMinutes", m)}>{durationLabel(m)}</Chip>)}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-(--ep-ink)/45 mb-1.5">{t("Trajet jusqu'à la salle (aller)")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[0, 5, 10, 15, 20, 30].map((m) => <Chip key={m} tone="ok" active={prefs.gymTravelMinutes === m} onClick={() => set("gymTravelMinutes", m)}>{m === 0 ? t("À la maison") : `${m} min`}</Chip>)}
                  </div>
                  {prefs.gymTravelMinutes > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {TRAVEL_MODES.map((m) => <Chip key={m.key} tone="ok" active={prefs.gymTravelMode === m.key} onClick={() => set("gymTravelMode", m.key)}>{t(m.label)}</Chip>)}
                    </div>
                  )}
                </div>
              </section>
            )}
            <section className="space-y-2.5">
              <SectionLabel>{t("Repas")}</SectionLabel>
              <p className="text-[11.5px] text-(--ep-ink)/60 leading-relaxed">
                {ctx.diet
                  ? `${t("D'après ta diète")} « ${ctx.diet.name} »${ctx.diet.structure === "weekly" ? ` ${t("(repas différents selon le jour)")}` : ""}. ${t("Pré et post-entraînement se calent autour de la séance.")}`
                  : t("Pas de diète active : 4 repas par défaut (petit-déjeuner, déjeuner, collation, dîner).")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[20, 30, 45].map((m) => <Chip key={m} active={prefs.mealMinutes === m} onClick={() => set("mealMinutes", m)}>{m} min</Chip>)}
              </div>
              <ToggleRow on={prefs.digestiveWalk} onChange={(v) => set("digestiveWalk", v)} label={t("Marche de 15 min après le déjeuner et le dîner")} hint={t("Compte pour tes pas.")} />
              <ToggleRow on={prefs.eveningReview} onChange={(v) => set("eveningReview", v)} label={`${t("Bilan du jour en fin de journée")} (${prefs.reviewMinutes} min)`} />
              {prefs.eveningReview && (
                <div className="flex gap-1.5">
                  {[15, 30].map((m) => <Chip key={m} active={prefs.reviewMinutes === m} onClick={() => set("reviewMinutes", m)}>{m} min</Chip>)}
                </div>
              )}
              <ToggleRow on={prefs.wakeAlarm} onChange={(v) => set("wakeAlarm", v)} label={`${t("Réveil à")} ${clockLabel(ws)}`} hint={t("Une vraie alarme, seulement si tu n'en as pas déjà une.")} />
              <ToggleRow on={prefs.notify} onChange={(v) => set("notify", v)} label={t("Me notifier au début de chaque bloc")} hint={t("Séances, repas, travail. Pas les trajets ni les pauses.")} />
            </section>
          </>
        )}

        {step === 2 && (
          <>
            <section className="space-y-2">
              <SectionLabel>{t("Tes blocs de travail")}</SectionLabel>
              {prefs.work.map((it, i) => (
                <div key={i} className="rounded-xl border border-(--ep-line)/30 bg-(--ep-s1) p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={it.label}
                      onChange={(e) => updateWork(i, { label: e.target.value })}
                      aria-label={t("Nom du bloc")}
                      className="flex-1 min-w-0 bg-transparent text-sm font-black text-(--ep-strong) outline-none"
                    />
                    <button type="button" aria-label={t("Retirer")} onClick={() => set("work", prefs.work.filter((_, j) => j !== i))} className="p-1.5 text-(--ep-ink)/35"><X size={15} /></button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Chip tone="info" active={it.minutes === 0} onClick={() => updateWork(i, { minutes: 0 })}>{t("Remplit le reste")}</Chip>
                    {[30, 60, 90, 120].map((m) => <Chip key={m} tone="info" active={it.minutes === m} onClick={() => updateWork(i, { minutes: m })}>{durationLabel(m)} / {t("jour")}</Chip>)}
                  </div>
                  {it.minutes > 0 && (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {WORK_WHEN.map((x) => <Chip key={x.key} active={it.when === x.key} onClick={() => updateWork(i, { when: x.key })}>{t(x.label)}</Chip>)}
                      </div>
                      <DayPicker value={it.days} onChange={(d) => updateWork(i, { days: d })} />
                    </>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-(--ep-ink)/45 mb-1">{t("Sous-tâches")}</p>
                    <div className="flex flex-wrap gap-1">
                      {it.tasks.map((task, k) => (
                        <span key={k} className="inline-flex items-center gap-1 text-[11px] rounded-md px-2 py-1 bg-(--ep-s2) text-(--ep-ink)/80">
                          {task}
                          <button type="button" aria-label={t("Retirer la sous-tâche")} onClick={() => updateWork(i, { tasks: it.tasks.filter((_, j) => j !== k) })} className="text-(--ep-ink)/35"><X size={11} /></button>
                        </span>
                      ))}
                    </div>
                    <form
                      className="flex gap-1.5 mt-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const v = (taskDraft[i] ?? "").trim();
                        if (!v) return;
                        updateWork(i, { tasks: [...it.tasks, v] });
                        setTaskDraft((d) => ({ ...d, [i]: "" }));
                      }}
                    >
                      <input value={taskDraft[i] ?? ""} onChange={(e) => setTaskDraft((d) => ({ ...d, [i]: e.target.value }))} placeholder={t("Ajouter une sous-tâche")} aria-label={t("Ajouter une sous-tâche")} className="flex-1 min-w-0 bg-(--ep-s2) border border-(--ep-line)/25 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) outline-none" />
                      <button type="submit" aria-label={t("Ajouter")} className="w-9 rounded-lg border border-(--ep-line)/30 flex items-center justify-center text-(--ep-strong)"><Plus size={14} /></button>
                    </form>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-1.5">
                {WORK_SUGGESTIONS.filter((s) => !prefs.work.some((w2) => w2.label === s.label)).map((s) => (
                  <Chip key={s.label} onClick={() => set("work", [...prefs.work, s])}><Plus size={12} /> {s.label}</Chip>
                ))}
              </div>
              <form
                className="flex gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = newWork.trim();
                  if (!v) return;
                  set("work", [...prefs.work, { label: v, tasks: [], minutes: 0, when: "libre", days: ALL_DAYS }]);
                  setNewWork("");
                }}
              >
                <input value={newWork} onChange={(e) => setNewWork(e.target.value)} placeholder={t("Autre bloc (ex. Coaching clients)")} aria-label={t("Autre bloc de travail")} className="flex-1 min-w-0 bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-3 py-2.5 text-sm text-(--ep-strong) outline-none" />
                <button type="submit" aria-label={t("Ajouter le bloc")} className="w-11 rounded-lg border border-(--ep-line)/35 flex items-center justify-center text-(--ep-strong)"><Plus size={16} /></button>
              </form>
            </section>
            <section className="space-y-2">
              <SectionLabel>{t("Rythme")}</SectionLabel>
              <p className="text-[10px] font-bold text-(--ep-ink)/45">{t("Sessions de remplissage de")}</p>
              <div className="flex flex-wrap gap-1.5">
                {[45, 60, 90, 120].map((m) => <Chip key={m} active={prefs.chunkMinutes === m} onClick={() => set("chunkMinutes", m)}>{durationLabel(m)} max</Chip>)}
              </div>
              <ToggleRow on={prefs.breaks} onChange={(v) => set("breaks", v)} label={t("10 min de pause entre deux sessions")} />
              <p className="text-[10px] font-bold text-(--ep-ink)/45 pt-1">{t("Trajet jusqu'au travail")}</p>
              <div className="flex flex-wrap gap-1.5">
                {[0, 10, 20, 30, 45].map((m) => <Chip key={m} tone="ok" active={prefs.workTravelMinutes === m} onClick={() => set("workTravelMinutes", m)}>{m === 0 ? t("Je travaille chez moi") : `${m} min`}</Chip>)}
              </div>
              {prefs.workTravelMinutes > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {TRAVEL_MODES.map((m) => <Chip key={m.key} tone="ok" active={prefs.workTravelMode === m.key} onClick={() => set("workTravelMode", m.key)}>{t(m.label)}</Chip>)}
                </div>
              )}
            </section>
          </>
        )}

        {step === 3 && (
          <>
            <section>
              <div className="grid grid-cols-2 gap-1.5">
                <Chip active={mode === "completer"} onClick={() => { setMode("completer"); setConfirm(false); }}>{t("Compléter les trous")}</Chip>
                <Chip active={mode === "remplacer"} onClick={() => setMode("remplacer")}>{scopeCol ? t("Refaire ce jour") : t("Refaire ma semaine")}</Chip>
              </div>
              <p className="text-[11px] mt-1.5 leading-snug" style={{ color: confirm ? "var(--ep-bad)" : "rgba(var(--ep-ink-rgb),0.5)" }}>
                {mode === "completer"
                  ? t("Tes blocs actuels restent tels quels, seuls les créneaux libres se remplissent.")
                  : replaced > 0
                    ? `${replaced} ${t("blocs de ta semaine type seront remplacés. Tes rendez-vous datés et ton réveil restent.")}`
                    : t("Ta semaine est vide : tout est créé.")}
              </p>
            </section>

            <section className="grid grid-cols-3 gap-1.5 text-center">
              {[
                { v: durationLabel(stats.workMinutes), l: t("de travail") },
                { v: String(stats.sessions), l: t("séances") },
                { v: String(stats.meals), l: t("repas") },
                { v: `~${formatSteps(stats.steps)}`, l: t("pas en trajets") },
                { v: durationLabel(stats.travelMinutes), l: t("de trajets") },
                { v: stats.gapMinutes === 0 ? "0" : durationLabel(stats.gapMinutes), l: t("de trou") },
              ].map((x) => (
                <div key={x.l} className="rounded-xl border border-(--ep-line)/25 bg-(--ep-s1) py-2 px-1">
                  <p className="text-sm font-black text-(--ep-strong) tabular-nums">{x.v}</p>
                  <p className="text-[9.5px] font-bold uppercase tracking-wide text-(--ep-ink)/45">{x.l}</p>
                </div>
              ))}
            </section>

            {/* Mini semaine : une colonne par jour, proportionnelle aux heures */}
            {!scopeCol && (
              <section>
                <div className="grid grid-cols-7 gap-1">
                  {ALL_DAYS.map((d) => {
                    const items = [...visible.filter((b) => b.col === d).map((b) => ({ s: b.s, e: b.e, color: b.color, kept: false })), ...keptExisting.filter((p) => p.col === d).map((p) => ({ s: p.s, e: p.e, color: p.block.color, kept: true }))];
                    return (
                      <button key={d} type="button" onClick={() => setPreviewCol(d)} aria-label={DAY_LABELS[d]} className="flex flex-col items-center gap-1">
                        <div className="relative w-full rounded-md overflow-hidden" style={{ height: 150, background: "rgba(var(--ep-ink-rgb),0.05)", outline: previewCol === d ? "2px solid rgba(var(--ep-accent-rgb),0.7)" : "none" }}>
                          {items.map((it, k) => (
                            <span
                              key={k}
                              className="absolute left-0 right-0"
                              style={{ top: `${((it.s - ws) / span) * 100}%`, height: `${Math.max(0.6, ((it.e - it.s) / span) * 100)}%`, background: it.kept ? "rgba(var(--ep-ink-rgb),0.22)" : `color-mix(in srgb, ${it.color} 70%, transparent)`, borderBottom: "1px solid var(--ep-bg)" }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-black" style={{ color: previewCol === d ? "var(--ep-strong)" : "rgba(var(--ep-ink-rgb),0.45)" }}>{DAY_SHORT[d]}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <SectionLabel>{DAY_LABELS[previewCol]}</SectionLabel>
              <ul className="space-y-0.5">
                {[...visible.filter((b) => b.col === previewCol).map((b) => ({ s: b.s, e: b.e, label: b.label, icon: b.icon, color: b.color, tasks: b.tasks.length, kept: false })), ...keptExisting.filter((p) => p.col === previewCol).map((p) => ({ s: p.s, e: p.e, label: p.block.label, icon: p.block.icon, color: p.block.color, tasks: (p.block.tasks ?? []).length, kept: true }))]
                  .sort((a, b) => a.s - b.s)
                  .map((b, k) => {
                    const Icon = b.icon ? AGENDA_ICON_MAP[b.icon] : null;
                    return (
                      <li key={k} className="flex items-center gap-2 text-[12px] py-1 border-b border-(--ep-line)/10" style={{ opacity: b.kept ? 0.55 : 1 }}>
                        <span className="w-[86px] flex-shrink-0 tabular-nums text-(--ep-ink)/50">{clockLabel(b.s)}–{clockLabel(b.e)}</span>
                        {Icon && <Icon size={12} style={{ color: b.color, flexShrink: 0 }} />}
                        <span className="min-w-0 truncate text-(--ep-strong) font-semibold">{b.label}</span>
                        {b.tasks > 0 && <span className="text-[10px] text-(--ep-ink)/40 flex-shrink-0">{b.tasks} {t("tâches")}</span>}
                        {b.kept && <span className="ml-auto text-[9.5px] text-(--ep-ink)/45 flex-shrink-0">{t("déjà là")}</span>}
                      </li>
                    );
                  })}
              </ul>
            </section>
            <ErrorText>{err}</ErrorText>
          </>
        )}
      </div>
    </Sheet>
  );
}
