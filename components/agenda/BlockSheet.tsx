"use client";

// Fiche d'un bloc (2026-10-20) : ce que le bloc représente vraiment.
//  - séance : la séance du jour du programme (exercices, matériel, salle) et
//    un bouton pour la démarrer ;
//  - repas : les aliments et grammages du repas de la diète, avec le lien
//    direct vers ce repas dans la nutrition ;
//  - trajet : mode de déplacement et pas estimés ;
//  - tous : sous-tâches cochables, copie sur d'autres jours, décalage de la
//    suite, durée, modification.

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/i18n/I18nProvider";
import Sheet from "@/components/nutrition/Sheet";
import {
  AlertTriangle, Check, ChevronRight, Copy, Dumbbell, Footprints, MapPin, Pencil, Play, Plus, Trash2, UtensilsCrossed, X,
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
  onShift?: (delta: number, scope: "jour" | "toujours") => Promise<string | null>;
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
            {/* Durée : étirer au pouce sans viser la poignée */}
            {handlers.onResize && (
              <section>
                <SectionLabel>{t("Fin du bloc")} · {clockLabel(placed.e)}</SectionLabel>
                <div className="grid grid-cols-4 gap-1.5">
                  {[-15, -5, 5, 15].map((d) => (
                    <button key={d} type="button" onClick={() => handlers.onResize!(d)} disabled={placed.e + d - placed.s < 5} className="h-10 rounded-lg border border-(--ep-line)/35 text-xs font-bold text-(--ep-strong) disabled:opacity-35">
                      {d > 0 ? "+" : "−"}{Math.abs(d)} min
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Copier sur d'autres jours, en un geste */}
            {handlers.onCopy && (
              <section>
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
              </section>
            )}

            {/* Décaler ce bloc et toute la suite */}
            {handlers.onShift && (
              <section>
                <SectionLabel>{t("Décaler ce bloc et toute la suite")}</SectionLabel>
                {isToday && startNowDelta !== 0 && Math.abs(startNowDelta) <= 3 * 60 && (
                  <button type="button" disabled={busy} onClick={() => run(() => handlers.onShift!(startNowDelta, scope)).then((e) => e && setErr(e))} className="w-full rounded-lg border text-xs font-bold py-2.5 mb-2" style={{ borderColor: "rgba(var(--ep-accent-rgb),0.6)", background: "rgba(var(--ep-accent-rgb),0.12)", color: "var(--ep-strong)" }}>
                    {t("Commencer maintenant")} ({startNowDelta > 0 ? "+" : ""}{startNowDelta} min {t("pour la suite")})
                  </button>
                )}
                <div className="grid grid-cols-4 gap-1.5">
                  {[-15, 15, 30, 60].map((d) => (
                    <button key={d} type="button" disabled={busy} onClick={() => run(() => handlers.onShift!(d, isToday ? scope : "toujours")).then((e) => e && setErr(e))} className="h-10 rounded-lg border border-(--ep-line)/35 text-xs font-bold text-(--ep-strong)">
                      {d > 0 ? "+" : "−"}{Math.abs(d)} min
                    </button>
                  ))}
                </div>
                {isToday && (
                  <div className="flex gap-1.5 mt-2">
                    <Chip active={scope === "jour"} onClick={() => setScope("jour")}>{t("Aujourd'hui seulement")}</Chip>
                    <Chip active={scope === "toujours"} onClick={() => setScope("toujours")}>{t("Toutes les semaines")}</Chip>
                  </div>
                )}
              </section>
            )}

            {msg && <p role="status" className="text-xs" style={{ color: "var(--ep-ok)" }}>{msg}</p>}
            <ErrorText>{err}</ErrorText>

            <div className="flex gap-2">
              {handlers.onEdit && (
                <button type="button" onClick={handlers.onEdit} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-(--ep-line)/40 text-(--ep-ink)/80 text-xs font-bold uppercase tracking-widest py-3">
                  <Pencil size={13} /> {t("Modifier")}
                </button>
              )}
              {handlers.onDelete && (
                <button
                  type="button"
                  onClick={() => (confirmDelete ? handlers.onDelete!() : setConfirmDelete(true))}
                  className="flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold uppercase tracking-widest py-3 px-4"
                  style={{ border: "1px solid rgba(var(--ep-bad-rgb),0.4)", color: "var(--ep-bad)", background: confirmDelete ? "rgba(var(--ep-bad-rgb),0.1)" : "transparent" }}
                >
                  <Trash2 size={13} /> {confirmDelete ? t("Confirmer") : ""}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
