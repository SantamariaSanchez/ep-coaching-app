"use client";

// Création ultra rapide (2026-10-20) : on tape un créneau vide, on choisit
// le type, on tape la durée — le bloc est posé. Les blocs déjà utilisés
// (« Montage vidéo 1h30 ») se reposent en un seul tap depuis « Récents ».
// Rendez-vous et imprévus (2026-10-21) : le même panneau pose un bloc
// ponctuel (ce jour seulement) ou remplace un bloc ce jour-là, sans toucher à
// la semaine type.

import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import Sheet from "@/components/nutrition/Sheet";
import { Clock, MoreHorizontal, Plus, Minus } from "lucide-react";
import { AGENDA_ICON_MAP } from "@/lib/agenda-presets";
import {
  KIND_STYLE,
  MEAL_SLOT_NAMES,
  MEAL_SLOT_ORDER,
  TRAVEL_MODES,
  WORK_SUGGESTIONS,
  clockLabel,
  defaultMealAbs,
  durationLabel,
  formatSteps,
  travelSteps,
  type AgendaPrefs,
  type DayWindow,
  type TemplateBlock,
  type TravelMode,
} from "@/lib/agenda-engine";
import { dietSlotsForDay, sessionForDay, type AgendaContext } from "@/lib/agenda-links";
import { Chip, SectionLabel } from "./ui";

export interface RecentBlock {
  label: string;
  icon: string | null;
  color: string;
  minutes: number;
  link_ref: string | null;
  tasks: string[];
  notify: boolean;
}

type TypeKey = "seance" | "repas" | "travail" | "trajet" | "pause" | "rendezvous" | "etude" | "autre";

const TYPES: { key: TypeKey; icon: string | null; label: string; color: string }[] = [
  { key: "seance", icon: "salle", label: "Séance", color: KIND_STYLE.seance.color },
  { key: "repas", icon: "repas", label: "Repas", color: KIND_STYLE.repas.color },
  { key: "travail", icon: "travail", label: "Travail", color: KIND_STYLE.travail.color },
  { key: "trajet", icon: "pas", label: "Trajet / pas", color: KIND_STYLE.trajet.color },
  { key: "pause", icon: "pause", label: "Pause", color: KIND_STYLE.pause.color },
  { key: "rendezvous", icon: "rendezvous", label: "Rendez-vous", color: "var(--ep-pink)" },
  { key: "etude", icon: "etude", label: "Étude", color: KIND_STYLE.travail.color },
  { key: "autre", icon: null, label: "Autre…", color: "var(--ep-ink)" },
];

const DURATIONS: Record<TypeKey, number[]> = {
  seance: [45, 60, 75, 90, 120],
  repas: [15, 20, 30, 45, 60],
  travail: [30, 60, 90, 120, 180],
  trajet: [5, 10, 15, 20, 30, 45],
  pause: [10, 15, 30, 60],
  rendezvous: [30, 60, 90, 120],
  etude: [30, 60, 90, 120],
  autre: [],
};

const TRAVEL_LABEL: Record<TravelMode, string> = {
  marche: "Trajet à pied",
  transports: "Trajet en transports",
  velo: "Trajet à vélo",
  voiture: "Trajet en voiture",
};

export default function QuickAddSheet({
  col,
  start: initialStart,
  gapEnd,
  window: w,
  prefs,
  ctx,
  recents,
  onCreate,
  onMore,
  onClose,
  title,
  onceLabel,
  defaultOnce = false,
  lockOnce = false,
}: {
  /** Titre du panneau (« Remplacer … aujourd'hui »). */
  title?: string;
  /** Libellé du choix ponctuel (« Aujourd'hui seulement ») ; absent = pas de choix. */
  onceLabel?: string;
  /** Choix ponctuel coché à l'ouverture. */
  defaultOnce?: boolean;
  /** Ponctuel imposé (remplacement d'un bloc ce jour-là). */
  lockOnce?: boolean;
  col: number;
  start: number;
  gapEnd: number | null;
  window: DayWindow;
  prefs: AgendaPrefs;
  ctx: AgendaContext;
  recents: RecentBlock[];
  onCreate: (b: TemplateBlock, once: boolean) => void;
  onMore: (prefill: Partial<TemplateBlock> & { s: number; e: number }, once: boolean) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [start, setStart] = useState(initialStart);
  const [type, setType] = useState<TypeKey | null>(null);
  const session = sessionForDay(ctx, col);
  const sessionLabels = ctx.sessions.length ? [...new Set(ctx.sessions.map((s) => s.label))] : [];
  const [sessionLabel, setSessionLabel] = useState<string>(session?.label ?? sessionLabels[0] ?? "");
  const daySlots = dietSlotsForDay(ctx, col);
  const slotChoices = (daySlots.length ? MEAL_SLOT_ORDER.filter((s) => daySlots.includes(s)) : MEAL_SLOT_ORDER);
  const nearestSlot = [...slotChoices].sort((a, b) => Math.abs(defaultMealAbs(a, w) - start) - Math.abs(defaultMealAbs(b, w) - start))[0] ?? "lunch";
  const [slot, setSlot] = useState(nearestSlot);
  const workChoices = [...prefs.work, ...WORK_SUGGESTIONS.filter((s) => !prefs.work.some((p) => p.label === s.label))].slice(0, 8);
  const [work, setWork] = useState(0);
  const [mode, setMode] = useState<TravelMode>("marche");
  const [once, setOnce] = useState(lockOnce || defaultOnce);

  const free = gapEnd !== null && gapEnd > start ? gapEnd - start : null;

  function blockFor(typeKey: TypeKey, minutes: number): TemplateBlock {
    const base = { s: start, e: start + minutes, tasks: [] as string[], notes: null, link_ref: null as string | null };
    switch (typeKey) {
      case "seance": {
        const l = sessionLabel || "Séance";
        return { ...base, label: sessionLabel ? `Séance : ${l}` : "Séance", icon: "salle", color: KIND_STYLE.seance.color, link_ref: sessionLabel || null, notify: prefs.notify };
      }
      case "repas":
        return { ...base, label: MEAL_SLOT_NAMES[slot] ?? "Repas", icon: "repas", color: KIND_STYLE.repas.color, link_ref: slot, notify: prefs.notify };
      case "travail": {
        const it = workChoices[work] ?? { label: "Travail", tasks: [] };
        return { ...base, label: it.label, icon: "travail", color: KIND_STYLE.travail.color, tasks: it.tasks, notify: prefs.notify };
      }
      case "trajet":
        return { ...base, label: TRAVEL_LABEL[mode], icon: mode === "marche" ? "pas" : "trajet", color: KIND_STYLE.trajet.color, link_ref: mode, notify: false };
      case "pause":
        return { ...base, label: "Pause", icon: "pause", color: KIND_STYLE.pause.color, notify: false };
      case "rendezvous":
        return { ...base, label: "Rendez-vous", icon: "rendezvous", color: "var(--ep-pink)", notify: true };
      case "etude":
        return { ...base, label: "Étude", icon: "etude", color: KIND_STYLE.travail.color, notify: prefs.notify };
      default:
        return { ...base, label: "", icon: null, color: "var(--ep-info)", notify: false };
    }
  }

  const durations = type ? DURATIONS[type] : [];
  const defaultDuration = type === "seance" ? prefs.sessionMinutes : type === "repas" ? prefs.mealMinutes : null;

  return (
    <Sheet title={title ?? t("Ajouter un bloc")} subtitle={free ? `${t("Libre jusqu'à")} ${clockLabel(gapEnd!)} · ${durationLabel(free)}` : undefined} onClose={onClose}>
      <div className="space-y-4 pb-2">
        {/* Heure de début, ajustable au pouce */}
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => setStart((s) => Math.max(0, s - 15))} aria-label={t("15 min plus tôt")} className="w-10 h-10 rounded-full border border-(--ep-line)/35 flex items-center justify-center text-(--ep-ink)/70">
            <Minus size={16} />
          </button>
          <p className="flex items-center gap-1.5 text-2xl font-black tabular-nums text-(--ep-strong)">
            <Clock size={16} className="text-(--ep-ink)/40" /> {clockLabel(start)}
          </p>
          <button type="button" onClick={() => setStart((s) => s + 15)} aria-label={t("15 min plus tard")} className="w-10 h-10 rounded-full border border-(--ep-line)/35 flex items-center justify-center text-(--ep-ink)/70">
            <Plus size={16} />
          </button>
        </div>

        {onceLabel && !lockOnce && (
          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={t("Quand")}>
            <Chip active={once} onClick={() => setOnce(true)}>
              <span className="w-full text-center">{onceLabel}</span>
            </Chip>
            <Chip active={!once} onClick={() => setOnce(false)}>
              <span className="w-full text-center">{t("Toutes les semaines")}</span>
            </Chip>
          </div>
        )}

        {recents.length > 0 && !type && (
          <div>
            <SectionLabel>{t("Récents, en un tap")}</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {recents.map((r) => {
                const Icon = r.icon ? AGENDA_ICON_MAP[r.icon] : null;
                return (
                  <button
                    key={`${r.label}-${r.minutes}`}
                    type="button"
                    onClick={() => onCreate({ s: start, e: start + r.minutes, label: r.label, icon: r.icon, color: r.color, tasks: r.tasks, notes: null, notify: r.notify, link_ref: r.link_ref }, once)}
                    className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg border text-xs font-bold text-(--ep-strong)"
                    style={{ borderColor: "rgba(var(--ep-line-rgb),0.35)" }}
                  >
                    {Icon && <Icon size={13} style={{ color: r.color }} />}
                    <span className="truncate max-w-[150px]">{r.label}</span>
                    <span className="text-(--ep-ink)/40 font-semibold">{durationLabel(r.minutes)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <SectionLabel>{t("Type")}</SectionLabel>
          <div className="grid grid-cols-4 gap-1.5">
            {TYPES.map((ty) => {
              const Icon = ty.icon ? AGENDA_ICON_MAP[ty.icon] : MoreHorizontal;
              const active = type === ty.key;
              return (
                <button
                  key={ty.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (ty.key === "autre") return onMore({ s: start, e: start + (free && free <= 120 ? free : 60) }, once);
                    setType(active ? null : ty.key);
                  }}
                  className="flex flex-col items-center justify-center gap-1 h-16 rounded-xl border text-[10.5px] font-bold leading-tight text-center px-1 transition-colors"
                  style={{
                    borderColor: active ? "rgba(var(--ep-accent-rgb),0.65)" : "rgba(var(--ep-line-rgb),0.3)",
                    background: active ? "rgba(var(--ep-accent-rgb),0.12)" : "transparent",
                    color: active ? "var(--ep-strong)" : "rgba(var(--ep-ink-rgb),0.7)",
                  }}
                >
                  {Icon && <Icon size={18} style={{ color: ty.color }} strokeWidth={2} />}
                  {t(ty.label)}
                </button>
              );
            })}
          </div>
        </div>

        {type === "seance" && sessionLabels.length > 0 && (
          <div>
            <SectionLabel>{t("Séance du programme")}</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {sessionLabels.map((l) => (
                <Chip key={l} active={sessionLabel === l} onClick={() => setSessionLabel(l)}>
                  {l}
                  {session?.label === l && <span className="text-(--ep-accent)">·</span>}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {type === "repas" && (
          <div>
            <SectionLabel>{daySlots.length ? t("Repas de ta diète") : t("Quel repas")}</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {slotChoices.map((sl) => (
                <Chip key={sl} active={slot === sl} onClick={() => setSlot(sl)}>{t(MEAL_SLOT_NAMES[sl])}</Chip>
              ))}
            </div>
          </div>
        )}
        {type === "travail" && (
          <div>
            <SectionLabel>{t("Quoi")}</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {workChoices.map((it, i) => (
                <Chip key={it.label} active={work === i} onClick={() => setWork(i)}>
                  {it.label}
                  {it.tasks.length > 0 && <span className="text-(--ep-ink)/40">{it.tasks.length}</span>}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {type === "trajet" && (
          <div>
            <SectionLabel>{t("Comment")}</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {TRAVEL_MODES.map((m) => (
                <Chip key={m.key} active={mode === m.key} onClick={() => setMode(m.key)} tone="ok">{t(m.label)}</Chip>
              ))}
            </div>
          </div>
        )}

        {type && type !== "autre" && (
          <div>
            <SectionLabel>{t("Durée, et c'est posé")}</SectionLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {free !== null && free >= 5 && free <= 6 * 60 && !durations.includes(free) && (
                <button
                  type="button"
                  onClick={() => onCreate(blockFor(type, free), once)}
                  className="col-span-3 h-11 rounded-xl text-xs font-black uppercase tracking-widest"
                  style={{ background: "var(--ep-accent)", color: "var(--ep-strong)" }}
                >
                  {t("Tout le créneau")} · {durationLabel(free)}
                </button>
              )}
              {durations.map((m) => {
                const highlight = m === defaultDuration || m === free;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onCreate(blockFor(type, m), once)}
                    className="h-11 rounded-xl border text-sm font-black tabular-nums"
                    style={{
                      borderColor: highlight ? "rgba(var(--ep-accent-rgb),0.65)" : "rgba(var(--ep-line-rgb),0.35)",
                      background: highlight ? "rgba(var(--ep-accent-rgb),0.12)" : "transparent",
                      color: "var(--ep-strong)",
                    }}
                  >
                    {durationLabel(m)}
                    {type === "trajet" && travelSteps(mode, m) > 0 && (
                      <span className="block text-[9.5px] font-semibold text-(--ep-ink)/45">~{formatSteps(travelSteps(mode, m))} {t("pas")}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => { const b = blockFor(type, defaultDuration ?? 60); onMore(b, once); }} className="mt-3 text-[11px] font-bold text-(--ep-ink)/45 underline underline-offset-2">
              {t("Plus d'options (nom, notes, tâches, rappel)")}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
