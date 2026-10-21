"use client";

// Fiche d'un bloc (2026-10-20) : ce que le bloc représente vraiment.
//  - séance : la séance du jour du programme (exercices, matériel, salle) et
//    un bouton pour la démarrer ;
//  - repas : les aliments et grammages du repas de la diète, avec le lien
//    direct vers ce repas dans la nutrition ;
//  - trajet : mode de déplacement et pas estimés ;
//  - tous : sous-tâches cochables ; imprévus du jour (décaler, pas
//    aujourd'hui, remplacer, ajouter un rdv) qui ne touchent jamais la
//    semaine type ; et, repliés, les changements de la semaine type (durée,
//    copie sur d'autres jours, modification, suppression).

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import Sheet from "@/components/nutrition/Sheet";
import {
  AlertTriangle, CalendarPlus, CalendarX, Check, ChevronDown, ChevronRight, Copy, Dumbbell, Footprints, MapPin, Pencil, Play, Plus, Replace, Trash2, UtensilsCrossed, X,
} from "lucide-react";
import { AGENDA_ICON_MAP } from "@/lib/agenda-presets";
import {
  DAY_LABELS,
  MEAL_SLOT_NAMES,
  MEAL_SLOT_ORDER,
  TRAVEL_MODES,
  blockKind,
  clockLabel,
  durationLabel,
  formatSteps,
  mealSlotOf,
  travelModeOf,
  travelSteps,
  type Placed,
  type TravelMode,
} from "@/lib/agenda-engine";
import { mealItemsFor, resolveSession, type AgendaContext } from "@/lib/agenda-links";
import { useStartSession } from "@/hooks/useStartSession";
import type { ScheduleBlock } from "@/utils/agenda";
import { Chip, DayPicker, ErrorText, SectionLabel } from "./ui";

export interface BlockSheetHandlers {
  onSetTasks?: (tasks: string[], removedIndex?: number) => Promise<string | null>;
  onToggleTask?: (key: string) => void;
  onCopy?: (days: number[]) => Promise<string>;
  onShift?: (delta: number, scope: "jour" | "toujours", withFollowing: boolean) => Promise<string | null>;
  /** « Pas aujourd'hui » : retire ce bloc récurrent de cette date seulement. */
  onSkipDay?: () => void;
  /** « Remplacer par… » : bloc ponctuel à la place de celui-ci, ce jour-là. */
  onReplaceDay?: () => void;
  /** « Ajouter un rdv » ponctuel ce jour-là. */
  onAddOnce?: () => void;
  onResize?: (deltaEnd: number) => void;
  onSetLink?: (patch: { link_ref: string | null; label?: string; icon?: string }) => void;
  onMoveToDay?: (day: number) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const TRAVEL_LABEL: Record<TravelMode, string> = {
  marche: "Trajet à pied",
  transports: "Trajet en transports",
  velo: "Trajet à vélo",
  voiture: "Trajet en voiture",
};

function fmtRest(sec: number | null): string | null {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

export default function BlockSheet({
  placed,
  ctx,
  space,
  editable,
  isToday,
  nowAbs,
  completedKeys,
  canCheck,
  destination,
  handlers,
  onClose,
}: {
  /** Page à ouvrir pour un bloc sans contenu lié (formations, bilan...). */
  destination?: { label: string; href: string } | null;
  placed: Placed<ScheduleBlock>;
  ctx: AgendaContext;
  space: "coach" | "client";
  editable: boolean;
  isToday: boolean;
  nowAbs: number | null;
  completedKeys: Set<string>;
  canCheck: boolean;
  handlers: BlockSheetHandlers;
  onClose: () => void;
}) {
  const t = useT();
  const b = placed.block;
  const kind = blockKind(b);
  const Icon = b.icon ? AGENDA_ICON_MAP[b.icon] : null;
  const me = space === "coach" ? "/dashboard/coach/moi" : "/dashboard/client";
  const programHref = space === "coach" ? `${me}/programme` : "/dashboard/client/program";
  const logbookBase = space === "coach" ? "/dashboard/coach/moi/logbook" : "/dashboard/client/logbook";
  const { start, loading: starting, error: startError } = useStartSession(logbookBase);

  const [newTask, setNewTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copyDays, setCopyDays] = useState<number[]>([]);
  const [showCopy, setShowCopy] = useState(false);
  const [scope, setScope] = useState<"jour" | "toujours">("jour");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [withFollowing, setWithFollowing] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const oneOff = !!b.specific_date;
  const dayName = isToday ? t("aujourd'hui") : `${t("ce")} ${t(DAY_LABELS[placed.col]).toLowerCase()}`;

  const tasks = b.tasks ?? [];
  const done = tasks.filter((_, i) => completedKeys.has(`${b.id}:${i}`)).length;
  const startNowDelta = isToday && nowAbs !== null ? Math.round((nowAbs - placed.s) / 5) * 5 : 0;

  async function run(fn: () => Promise<string | null | undefined>) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fn();
    setBusy(false);
    return res;
  }

  async function addTask() {
    const v = newTask.trim();
    if (!v || !handlers.onSetTasks) return;
    setNewTask("");
    const e = await run(() => handlers.onSetTasks!([...tasks, v]));
    if (e) setErr(e);
  }

  // ── Contenu lié ────────────────────────────────────────────────────────
  let linked: React.ReactNode = null;
  if (kind === "seance") {
    const { session, moved } = resolveSession(ctx, b, placed.col);
    linked = (
      <section className="rounded-2xl border border-(--ep-accent)/30 bg-(--ep-s1) p-3.5">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-(--ep-accent) mb-1.5">
          <Dumbbell size={12} /> {t("Séance du programme")}
        </p>
        {session ? (
          <>
            <p className="text-base font-black text-(--ep-strong)">{session.label}</p>
            <p className="text-[11px] text-(--ep-ink)/50 mt-0.5">
              {session.exercises.length} {t("exercices")}
              {ctx.programName ? ` · ${ctx.programName}` : ""}
            </p>
            {moved && session.weekday && (
              <div className="mt-2 flex items-start gap-2 rounded-lg px-2.5 py-2" style={{ background: "rgba(var(--ep-warn-rgb),0.1)", border: "1px solid rgba(var(--ep-warn-rgb),0.3)" }}>
                <AlertTriangle size={13} style={{ color: "var(--ep-warn)", flexShrink: 0, marginTop: 1 }} />
                <div className="text-[11px] leading-snug" style={{ color: "var(--ep-warn)" }}>
                  {t("Ton programme place cette séance le")} {DAY_LABELS[session.weekday].toLowerCase()}.
                  {editable && handlers.onMoveToDay && (
                    <button type="button" onClick={() => handlers.onMoveToDay!(session.weekday!)} className="block font-black underline mt-1">
                      {t("Déplacer ce bloc au")} {DAY_LABELS[session.weekday].toLowerCase()}
                    </button>
                  )}
                </div>
              </div>
            )}
            {(ctx.gymName || session.accessories.length > 0) && (
              <div className="mt-2.5 space-y-1">
                {ctx.gymName && (
                  <p className="flex items-center gap-1.5 text-[11.5px] text-(--ep-ink)/70"><MapPin size={12} /> {ctx.gymName}</p>
                )}
                {session.accessories.length > 0 && (
                  <p className="text-[11.5px] text-(--ep-ink)/70"><span className="font-bold">{t("À prévoir :")}</span> {session.accessories.join(", ")}</p>
                )}
              </div>
            )}
            {session.notes && <p className="text-[11.5px] text-(--ep-ink)/60 mt-2 whitespace-pre-wrap">{session.notes}</p>}
            <ol className="mt-2.5 space-y-1.5">
              {session.exercises.map((ex, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-snug">
                  <span className="w-4 text-right text-(--ep-ink)/35 font-bold tabular-nums flex-shrink-0">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-bold text-(--ep-strong)">{ex.name}</span>
                    <span className="text-(--ep-ink)/50">
                      {ex.sets ? ` · ${ex.sets}×${ex.reps ?? "?"}` : ""}
                      {fmtRest(ex.rest) ? ` · ${t("repos")} ${fmtRest(ex.rest)}` : ""}
                      {ex.equipment ? ` · ${ex.equipment}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            {editable && ctx.programId && (
              <button
                type="button"
                disabled={starting}
                onClick={() => start({ dayLabel: session.label, programId: ctx.programId!, muscleGroups: session.muscleGroups })}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest py-3 disabled:opacity-50"
                style={{ background: "var(--ep-accent)", color: "var(--ep-strong)" }}
              >
                <Play size={14} /> {starting ? t("Démarrage…") : t("Démarrer cette séance")}
              </button>
            )}
            <ErrorText>{startError}</ErrorText>
          </>
        ) : (
          <p className="text-xs text-(--ep-ink)/55">
            {ctx.sessions.length ? t("Ton programme ne prévoit pas de séance ce jour-là.") : t("Pas encore de programme actif.")}
          </p>
        )}
        <Link href={programHref} onClick={onClose} className="mt-2 flex items-center justify-center gap-1 text-[11px] font-bold text-(--ep-ink)/55 py-1.5">
          {t("Voir mon programme")} <ChevronRight size={13} />
        </Link>
      </section>
    );
  } else if (kind === "repas") {
    const slot = mealSlotOf(b);
    const items = mealItemsFor(ctx, placed.col, slot);
    const kcal = items.reduce((s, i) => s + i.kcal, 0);
    const prot = items.reduce((s, i) => s + i.proteins, 0);
    linked = (
      <section className="rounded-2xl border bg-(--ep-s1) p-3.5" style={{ borderColor: "rgba(var(--ep-warn-rgb),0.35)" }}>
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--ep-warn)" }}>
          <UtensilsCrossed size={12} /> {t("Repas de ta diète")}
        </p>
        <p className="text-base font-black text-(--ep-strong)">
          {t(MEAL_SLOT_NAMES[slot] ?? "Repas")} <span className="text-(--ep-ink)/45 font-bold text-sm">· {clockLabel(placed.s)}</span>
        </p>
        {items.length > 0 ? (
          <>
            <ul className="mt-2 space-y-1">
              {items.map((it, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="text-(--ep-strong) min-w-0 truncate">{it.name}</span>
                  <span className="tabular-nums text-(--ep-ink)/60 flex-shrink-0"><b className="text-(--ep-strong)">{Math.round(it.grams)} g</b> · {it.kcal} kcal</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-(--ep-ink)/50 mt-2 tabular-nums">{t("Total")} : {kcal} kcal · {prot} g {t("de protéines")}</p>
          </>
        ) : (
          <p className="text-xs text-(--ep-ink)/55 mt-1">
            {ctx.diet ? t("Ce repas n'est pas dans ta diète ce jour-là.") : t("Pas encore de diète active : tu peux quand même noter ce que tu manges.")}
          </p>
        )}
        {editable && handlers.onSetLink && (
          <div className="mt-2.5">
            <p className="text-[10px] font-bold text-(--ep-ink)/40 mb-1.5">{t("Ce bloc correspond à")}</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {MEAL_SLOT_ORDER.map((sl) => (
                <Chip key={sl} tone="warn" active={sl === slot} onClick={() => handlers.onSetLink!({ link_ref: sl, label: MEAL_SLOT_NAMES[sl] })}>
                  <span className="whitespace-nowrap">{t(MEAL_SLOT_NAMES[sl])}</span>
                </Chip>
              ))}
            </div>
          </div>
        )}
        <Link
          href={`${me}/nutrition?repas=${slot}`}
          onClick={onClose}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest py-3"
          style={{ background: "var(--ep-warn)", color: "var(--ep-bg)" }}
        >
          {t("Ouvrir ce repas dans ma nutrition")} <ChevronRight size={14} />
        </Link>
      </section>
    );
  } else if (kind === "trajet") {
    const mode = travelModeOf(b);
    const minutes = placed.e - placed.s;
    const steps = travelSteps(mode, minutes);
    linked = (
      <section className="rounded-2xl border bg-(--ep-s1) p-3.5" style={{ borderColor: "rgba(var(--ep-ok-rgb),0.35)" }}>
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "var(--ep-ok)" }}>
          <Footprints size={12} /> {t("Trajet / pas")}
        </p>
        <p className="text-sm text-(--ep-strong)">
          <b>{durationLabel(minutes)}</b>
          {steps > 0 ? <> · ~{formatSteps(steps)} {t("pas comptés dans ta journée")}</> : <> · {t("pas de pas comptés")}</>}
        </p>
        {editable && handlers.onSetLink && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {TRAVEL_MODES.map((m) => (
              <Chip key={m.key} tone="ok" active={m.key === mode} onClick={() => handlers.onSetLink!({ link_ref: m.key, ...(/^trajet (à|en)/i.test(b.label) ? { label: TRAVEL_LABEL[m.key] } : {}), icon: m.key === "marche" ? "pas" : "trajet" })}>
                {t(m.label)}
              </Chip>
            ))}
          </div>
        )}
        <Link href={`${me}/steps`} onClick={onClose} className="mt-2 flex items-center justify-center gap-1 text-[11px] font-bold text-(--ep-ink)/55 py-1.5">
          {t("Voir mes pas")} <ChevronRight size={13} />
        </Link>
      </section>
    );
  }

  return (
    <Sheet
      title={b.label}
      subtitle={`${DAY_LABELS[placed.col]} · ${clockLabel(placed.s)} à ${clockLabel(placed.e)} · ${durationLabel(placed.e - placed.s)}${b.specific_date ? ` · ${t("ce jour seulement")}` : ""}`}
      onClose={onClose}
    >
      <div className="space-y-4 pb-2">
        {Icon && !linked && (
          <div className="flex items-center gap-2 text-xs text-(--ep-ink)/55">
            <Icon size={14} style={{ color: b.color }} /> {b.notes ? null : t("Bloc libre : ajoute des sous-tâches pour savoir quoi faire en y arrivant.")}
          </div>
        )}
        {b.notes && <p className="text-[12.5px] text-(--ep-ink)/70 whitespace-pre-wrap">{b.notes}</p>}

        {linked}
        {!linked && destination && (
          <Link href={destination.href} onClick={onClose} className="w-full flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest py-3" style={{ background: "var(--ep-accent)", color: "var(--ep-strong)" }}>
            {t(destination.label)} <ChevronRight size={14} />
          </Link>
        )}

        {/* Sous-tâches cochables (mêmes clés que la carte « En ce moment ») */}
        {(tasks.length > 0 || (editable && handlers.onSetTasks)) && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel className="mb-0">{t("À faire dans ce bloc")}</SectionLabel>
              {tasks.length > 0 && <span className="text-[11px] font-black tabular-nums text-(--ep-ink)/50">{done}/{tasks.length}</span>}
            </div>
            {tasks.length > 0 && (
              <ul className="space-y-1">
                {tasks.map((task, i) => {
                  const key = `${b.id}:${i}`;
                  const isDone = completedKeys.has(key);
                  return (
                    <li key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!canCheck}
                        onClick={() => handlers.onToggleTask?.(key)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left min-h-10 disabled:cursor-default"
                        title={canCheck ? undefined : t("Se coche le jour même")}
                      >
                        <span
                          className="flex-shrink-0 rounded-md flex items-center justify-center"
                          style={{ width: 20, height: 20, border: `1.5px solid ${isDone ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.3)"}`, background: isDone ? "var(--ep-ok)" : "transparent", opacity: canCheck ? 1 : 0.5 }}
                        >
                          {isDone && <Check size={13} strokeWidth={3} style={{ color: "var(--ep-bg)" }} />}
                        </span>
                        <span className="text-[13px] leading-snug" style={{ color: isDone ? "rgba(var(--ep-ink-rgb),0.4)" : "var(--ep-strong)", textDecoration: isDone ? "line-through" : "none" }}>{task}</span>
                      </button>
                      {editable && handlers.onSetTasks && (
                        <button type="button" aria-label={t("Retirer la tâche")} onClick={() => run(() => handlers.onSetTasks!(tasks.filter((_, j) => j !== i), i)).then((e) => e && setErr(e))} className="p-2 text-(--ep-ink)/30">
                          <X size={14} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {!canCheck && tasks.length > 0 && <p className="text-[10.5px] text-(--ep-ink)/40 mt-1">{t("Les cases se cochent le jour du bloc.")}</p>}
            {editable && handlers.onSetTasks && (
              <form
                className="flex gap-1.5 mt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addTask();
                }}
              >
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder={t("Ex. Monter un reel")}
                  aria-label={t("Nouvelle sous-tâche")}
                  className="flex-1 min-w-0 bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-3 py-2.5 text-sm text-(--ep-strong) outline-none"
                />
                <button type="submit" disabled={busy || !newTask.trim()} aria-label={t("Ajouter la sous-tâche")} className="w-11 rounded-lg border border-(--ep-line)/35 flex items-center justify-center text-(--ep-strong) disabled:opacity-40">
                  <Plus size={16} />
                </button>
              </form>
            )}
          </section>
        )}

        {editable && (
          <>
            {/* Imprévu ce jour-là : rien ici ne touche la semaine type, sauf
                « Toutes les semaines » choisi explicitement pour le décalage. */}
            {(handlers.onShift || handlers.onSkipDay || handlers.onReplaceDay || handlers.onAddOnce) && (
              <section className="rounded-2xl border border-(--ep-line)/25 bg-(--ep-s1) p-3.5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-(--ep-ink)/45">
                  {oneOff ? t("Rendez-vous de ce jour") : `${t("Imprévu")} ${dayName}`}
                </p>

                {handlers.onShift && (
                  <div>
                    <p className="text-[12px] font-bold text-(--ep-strong) mb-1.5">{t("Décaler")}</p>
                    <div className="grid grid-cols-6 gap-1">
                      {[-30, -15, -5, 5, 15, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => handlers.onShift!(d, oneOff ? "jour" : scope, withFollowing)).then((e) => e && setErr(e))}
                          className="h-10 rounded-lg border border-(--ep-line)/35 text-[11.5px] font-bold tabular-nums text-(--ep-strong) disabled:opacity-40"
                        >
                          {d > 0 ? "+" : "−"}{Math.abs(d)}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 mt-2 min-h-9 text-[12px] text-(--ep-ink)/75 cursor-pointer select-none">
                      <input type="checkbox" checked={withFollowing} onChange={(e) => setWithFollowing(e.target.checked)} className="w-4 h-4 accent-(--ep-accent)" />
                      {t("Décaler aussi la suite de la journée")}
                    </label>
                    {!oneOff && (
                      <div className="grid grid-cols-2 gap-1.5 mt-1">
                        <Chip active={scope === "jour"} onClick={() => setScope("jour")}><span className="w-full text-center">{isToday ? t("Aujourd'hui") : t("Ce jour-là")}</span></Chip>
                        <Chip active={scope === "toujours"} onClick={() => setScope("toujours")}><span className="w-full text-center">{t("Toutes les semaines")}</span></Chip>
                      </div>
                    )}
                    {isToday && startNowDelta !== 0 && Math.abs(startNowDelta) <= 3 * 60 && (
                      <button type="button" disabled={busy} onClick={() => run(() => handlers.onShift!(startNowDelta, oneOff ? "jour" : scope, withFollowing)).then((e) => e && setErr(e))} className="w-full rounded-lg border text-xs font-bold py-2.5 mt-2" style={{ borderColor: "rgba(var(--ep-accent-rgb),0.6)", background: "rgba(var(--ep-accent-rgb),0.12)", color: "var(--ep-strong)" }}>
                        {t("Commencer maintenant")} ({startNowDelta > 0 ? "+" : "−"}{Math.abs(startNowDelta)} min)
                      </button>
                    )}
                  </div>
                )}

                {(handlers.onSkipDay || handlers.onReplaceDay) && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {handlers.onSkipDay && (
                      <button type="button" disabled={busy} onClick={handlers.onSkipDay} className="flex items-center justify-center gap-1.5 h-11 rounded-xl border border-(--ep-line)/35 text-[12px] font-bold text-(--ep-strong) disabled:opacity-40">
                        <CalendarX size={14} /> {isToday ? t("Pas aujourd'hui") : t("Pas ce jour-là")}
                      </button>
                    )}
                    {handlers.onReplaceDay && (
                      <button type="button" disabled={busy} onClick={handlers.onReplaceDay} className="flex items-center justify-center gap-1.5 h-11 rounded-xl border border-(--ep-line)/35 text-[12px] font-bold text-(--ep-strong) disabled:opacity-40">
                        <Replace size={14} /> {t("Remplacer par…")}
                      </button>
                    )}
                  </div>
                )}
                {handlers.onAddOnce && (
                  <button type="button" onClick={handlers.onAddOnce} className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl text-[12px] font-bold" style={{ border: "1px dashed rgba(var(--ep-accent-rgb),0.5)", color: "var(--ep-strong)" }}>
                    <CalendarPlus size={14} /> {t("Ajouter un rdv")} {dayName}
                  </button>
                )}
                {oneOff && (
                  <p className="text-[11px] text-(--ep-ink)/45">{t("Bloc ponctuel : il ne revient pas les autres semaines.")}</p>
                )}
              </section>
            )}

            {msg && <p role="status" className="text-xs" style={{ color: "var(--ep-ok)" }}>{msg}</p>}
            <ErrorText>{err}</ErrorText>

            {/* Semaine type : replié, pour ne pas la changer sans le vouloir. */}
            {!oneOff && (handlers.onResize || handlers.onCopy || handlers.onEdit || handlers.onDelete) && (
              <section className="border-t border-(--ep-line)/15 pt-3">
                <button type="button" onClick={() => setShowWeek((v) => !v)} aria-expanded={showWeek} className="w-full flex items-center justify-between min-h-10 text-left">
                  <span>
                    <span className="block text-[12px] font-bold text-(--ep-strong)">{t("Changer toutes les semaines")}</span>
                    <span className="block text-[11px] text-(--ep-ink)/45">{t("Heure, durée, copie sur d'autres jours, suppression")}</span>
                  </span>
                  <ChevronDown size={16} className="text-(--ep-ink)/45 transition-transform" style={{ transform: showWeek ? "rotate(180deg)" : undefined }} />
                </button>
                {showWeek && (
                  <div className="space-y-4 mt-3">
                    {handlers.onResize && (
                      <div>
                        <SectionLabel>{t("Fin du bloc")} · {clockLabel(placed.e)}</SectionLabel>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[-15, -5, 5, 15].map((d) => (
                            <button key={d} type="button" onClick={() => handlers.onResize!(d)} disabled={placed.e + d - placed.s < 5} className="h-10 rounded-lg border border-(--ep-line)/35 text-xs font-bold text-(--ep-strong) disabled:opacity-35">
                              {d > 0 ? "+" : "−"}{Math.abs(d)} min
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {handlers.onCopy && (
                      <div>
                        <SectionLabel>{t("Copier sur d'autres jours")}</SectionLabel>
                        {!showCopy ? (
                          <div className="flex flex-wrap gap-1.5">
                            <Chip onClick={() => run(() => handlers.onCopy!([1, 2, 3, 4, 5].filter((d) => d !== placed.col))).then((m) => setMsg(m ?? null))} disabled={busy}>
                              <Copy size={12} /> {t("Lun → Ven")}
                            </Chip>
                            <Chip onClick={() => run(() => handlers.onCopy!([1, 2, 3, 4, 5, 6, 7].filter((d) => d !== placed.col))).then((m) => setMsg(m ?? null))} disabled={busy}>
                              <Copy size={12} /> {t("Toute la semaine")}
                            </Chip>
                            <Chip onClick={() => setShowCopy(true)}>{t("Choisir les jours…")}</Chip>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <DayPicker value={copyDays} onChange={setCopyDays} exclude={placed.col} shortcuts={false} />
                            <button
                              type="button"
                              disabled={busy || copyDays.length === 0}
                              onClick={() => run(() => handlers.onCopy!(copyDays)).then((m) => { setMsg(m ?? null); setShowCopy(false); setCopyDays([]); })}
                              className="w-full h-10 rounded-lg text-xs font-black uppercase tracking-widest disabled:opacity-40"
                              style={{ background: "rgba(var(--ep-accent-rgb),0.16)", border: "1px solid rgba(var(--ep-accent-rgb),0.55)", color: "var(--ep-strong)" }}
                            >
                              {t("Copier")} ({copyDays.length})
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <EditDeleteRow onEdit={handlers.onEdit} onDelete={handlers.onDelete} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} deleteLabel={t("Supprimer")} />
                  </div>
                )}
              </section>
            )}

            {oneOff && <EditDeleteRow onEdit={handlers.onEdit} onDelete={handlers.onDelete} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} deleteLabel={t("Supprimer ce rdv")} />}
          </>
        )}
      </div>
    </Sheet>
  );
}

function EditDeleteRow({
  onEdit,
  onDelete,
  confirmDelete,
  setConfirmDelete,
  deleteLabel,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  deleteLabel: string;
}) {
  const t = useT();
  if (!onEdit && !onDelete) return null;
  return (
    <div className="flex gap-2">
      {onEdit && (
        <button type="button" onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-(--ep-line)/40 text-(--ep-ink)/80 text-xs font-bold uppercase tracking-widest py-3">
          <Pencil size={13} /> {t("Modifier")}
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
          className="flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold uppercase tracking-widest py-3 px-4"
          style={{ border: "1px solid rgba(var(--ep-bad-rgb),0.4)", color: "var(--ep-bad)", background: confirmDelete ? "rgba(var(--ep-bad-rgb),0.1)" : "transparent" }}
        >
          <Trash2 size={13} /> {confirmDelete ? t("Confirmer") : deleteLabel}
        </button>
      )}
    </div>
  );
}
