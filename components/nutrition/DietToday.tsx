"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  CalendarClock,
  Check,
  ChefHat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Shuffle,
  SkipForward,
  Trash2,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import Sheet from "@/components/nutrition/Sheet";
import { DAY_KIND_LABEL, STATUS_LABEL, fmtGrams, pickFocusMeal, simpleEquivalent, type DayAdherence, type DayKind, type DayKindInfo, type MealStatus } from "@/lib/diet-day";
import { SLOT_END, macrosFor, type Macros } from "@/lib/nutrition-engine";
import type { Food } from "@/utils/nutrition";

// Écran du jour de la diète (refonte 2026-10-21, même saut que l'onglet
// Programme) : la semaine en un coup d'œil, le repas du moment en héros
// (quoi, combien, quand), puis la journée : macros mangées contre prévues et
// la liste des repas, chacun dépliable pour voir ses aliments et agir dessus.
// Purement visuel : les données et les écritures viennent du tracker
// (NutritionTracker), qui reste la source de vérité du journal.

export interface DayMealItem {
  key: string;
  food: Food;
  grams: number;
  logId?: string;
  planMealId?: string;
  note?: string | null;
  /** Flexible : quantité du plan quand elle a été ré-ajustée. */
  planGrams?: number;
  adjusted?: boolean;
  overridden?: boolean;
}

export interface DayMeal {
  slot: string;
  label: string;
  time: string;
  /** Heure tirée d'un bloc repas de l'agenda (sinon heure habituelle). */
  fromAgenda?: boolean;
  items: DayMealItem[];
  macros: Macros;
  /** Repas prévu par la diète ce jour-là (sinon repas ajouté hors plan). */
  planned?: boolean;
  variants?: number[];
  variant?: number;
  /** Fixe : repas du plan retiré du journal, qu'on peut remettre. */
  canRestore?: boolean;
  /** L'aliment se touche pour être modifié (quantité, remplacement). */
  editable?: (item: DayMealItem) => boolean;
}

export interface WeekDay {
  date: string;
  letter: string;
  pct: number | null;
  basis: DayAdherence["basis"];
  isToday: boolean;
  isSelected: boolean;
  future: boolean;
  disabled?: boolean;
  kind?: DayKind | null;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toneOf(pct: number | null): string {
  if (pct == null) return "rgba(var(--ep-ink-rgb),0.12)";
  if (pct >= 80) return "var(--ep-ok)";
  if (pct >= 50) return "var(--ep-warn)";
  return "var(--ep-bad)";
}

const STATUS_COLOR: Record<MealStatus, string> = {
  mange: "var(--ep-ok)",
  remplace: "var(--ep-ok)",
  ecart: "var(--ep-warn)",
  saute: "rgba(var(--ep-ink-rgb),0.5)",
};

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("fr-FR");
}

function StatusDot({ status, size = 26 }: { status: MealStatus | undefined; size?: number }) {
  const icon = size >= 26 ? 15 : 12;
  if (!status) return <span className="rounded-full border-2 border-(--ep-ink)/25 flex-shrink-0" style={{ width: size, height: size }} />;
  const color = STATUS_COLOR[status];
  const filled = status === "mange";
  return (
    <span
      className="rounded-full border-2 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, borderColor: color, background: filled ? color : "transparent", color: filled ? "var(--ep-bg)" : color }}
    >
      {status === "mange" && <Check size={icon} strokeWidth={3} />}
      {status === "remplace" && <ArrowLeftRight size={icon} strokeWidth={2.5} />}
      {status === "ecart" && <Shuffle size={icon} strokeWidth={2.5} />}
      {status === "saute" && <SkipForward size={icon} strokeWidth={2.5} />}
    </span>
  );
}

function KindIcon({ kind, size = 11 }: { kind: DayKind; size?: number }) {
  if (kind === "training") return <Dumbbell size={size} aria-hidden />;
  if (kind === "high") return <Zap size={size} aria-hidden />;
  return null;
}

/** Barre « mangé » pleine + « encore prévu » pâle, contre l'objectif du jour. */
function MacroBar({ eaten, toCome, target, color }: { eaten: number; toCome: number; target: number; color: string }) {
  const over = target > 0 && eaten > target * 1.05;
  const a = target > 0 ? Math.min(eaten / target, 1) : 0;
  const b = target > 0 ? Math.max(0, Math.min((eaten + toCome) / target, 1) - a) : 0;
  const fill = over ? "var(--ep-warn)" : color;
  return (
    <div className="h-2 rounded-full bg-(--ep-ink)/[0.08] overflow-hidden flex" aria-hidden>
      <div className="h-full transition-all duration-500" style={{ width: `${a * 100}%`, background: fill }} />
      <div className="h-full transition-all duration-500" style={{ width: `${b * 100}%`, background: fill, opacity: 0.28 }} />
    </div>
  );
}

export default function DietToday({
  isToday,
  dayLabel,
  meals,
  status,
  adherence,
  eaten,
  toCome,
  target,
  dayKind,
  nextKind,
  week,
  weekAvg,
  weekTitle,
  canPrevWeek,
  canNextWeek,
  onShiftWeek,
  onBackToday,
  busy,
  readOnly,
  extraSlots = [],
  onAddSlot,
  onToggle,
  onSetStatus,
  onCook,
  onReplace,
  onAteOther,
  onSkip,
  onSelectDay,
  onMarkPast,
  onEditItem,
  onAdd,
  onChooseVariant,
  onRestore,
  openSlot,
  intro,
  footer,
}: {
  /** Repas à ouvrir d'emblée (lien « ?repas=lunch » depuis un bloc de l'agenda). */
  openSlot?: string | null;
  isToday: boolean;
  dayLabel: string;
  meals: DayMeal[];
  status: Record<string, MealStatus | undefined>;
  adherence: DayAdherence;
  /** Ce qui est réellement mangé (repas cochés ou notés). */
  eaten: Macros;
  /** Ce qui reste prévu dans les repas pas encore cochés. */
  toCome: Macros;
  target: Macros;
  dayKind: DayKindInfo | null;
  /** Demain, quand la diète y change de type de journée. */
  nextKind?: DayKindInfo | null;
  week: WeekDay[];
  weekAvg: number | null;
  weekTitle: string;
  canPrevWeek?: boolean;
  canNextWeek?: boolean;
  onShiftWeek?: (delta: number) => void;
  onBackToday?: () => void;
  busy: boolean;
  /** Aperçu coach : on regarde, on ne coche rien. */
  readOnly?: boolean;
  extraSlots?: { key: string; label: string }[];
  onAddSlot?: (slot: string) => void;
  onToggle: (slot: string) => void;
  onSetStatus: (slot: string, status: MealStatus | null) => void;
  onCook: (slot: string) => void;
  /** Remplacer un aliment du repas par un équivalent. */
  onReplace: (slot: string, itemKey: string) => void;
  onAteOther: (slot: string) => void;
  onSkip: (slot: string) => void;
  onSelectDay: (date: string) => void;
  /** Coche d'un tap tous les repas passés restés sans réponse. */
  onMarkPast?: (slots: string[]) => void;
  onEditItem?: (slot: string, item: DayMealItem) => void;
  onAdd?: (slot: string) => void;
  onChooseVariant?: (slot: string, variant: number) => void;
  onRestore?: (slot: string) => void;
  /** Encart affiché avant la journée (ex. pas encore de diète). */
  intro?: ReactNode;
  /** Bas de page (mode de suivi, réglages). */
  footer?: ReactNode;
}) {
  const t = useT();
  const [hhmm, setHhmm] = useState(nowHHMM);
  useEffect(() => {
    const id = setInterval(() => setHhmm(nowHHMM()), 60000);
    return () => clearInterval(id);
  }, []);
  const linked = openSlot && meals.some((m) => m.slot === openSlot) ? openSlot : null;
  const [open, setOpen] = useState<Set<string>>(() => new Set(linked ? [linked] : []));
  const [flash, setFlash] = useState<string | null>(linked);
  const [sheetSlot, setSheetSlot] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  // Arrivée depuis l'agenda (?repas=) ou un rappel (?meal=) : le repas est
  // déplié, amené au centre de l'écran et souligné quelques secondes.
  useEffect(() => {
    if (!linked) return;
    const raf = requestAnimationFrame(() => document.getElementById(`diet-day-${linked}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    const id = setTimeout(() => setFlash(null), 2800);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(id);
    };
  }, [linked]);

  const plannedMeals = meals.filter((m) => m.planned);
  const focus = isToday ? pickFocusMeal(plannedMeals.map((m) => m.slot), status, hhmm) : null;
  const focusMeal = focus ? meals.find((m) => m.slot === focus.slot) ?? null : null;
  const focusIdx = focus ? meals.findIndex((m) => m.slot === focus.slot) : meals.length;
  const pastOpen = isToday ? meals.filter((m, i) => m.planned && i < focusIdx && !status[m.slot] && hhmm >= m.time).map((m) => m.slot) : [];
  const sheetMeal = sheetSlot ? meals.find((m) => m.slot === sheetSlot) ?? null : null;
  const locked = busy || !!readOnly;
  const hasTarget = target.calories > 0;
  const remaining = Math.max(0, target.calories - eaten.calories);

  function openSheet(slot: string, replace = false) {
    setReplacing(replace);
    setSheetSlot(slot);
  }
  function replaceIn(m: DayMeal) {
    if (m.items.length === 1) onReplace(m.slot, m.items[0].key);
    else openSheet(m.slot, true);
  }
  function toggleOpen(slot: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  }

  const focusTag = focus
    ? focus.when === "now"
      ? { label: t("C'est l'heure"), color: "var(--ep-accent-hi2)", rgb: "--ep-accent-rgb" }
      : focus.when === "next"
        ? { label: t("Prochain repas"), color: "var(--ep-accent-hi2)", rgb: "--ep-accent-rgb" }
        : { label: t("Pas encore coché"), color: "var(--ep-warn)", rgb: "--ep-warn-rgb" }
    : null;

  const sideCol = isToday && plannedMeals.length > 0;
  // Grand écran : semaine en haut, repas du moment à gauche, journée à droite.
  return (
    <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-4 lg:gap-y-3 lg:items-start">
      {/* 1. La semaine en un coup d'œil, et le choix du jour */}
      <section aria-label={t("Ma semaine")} className="lg:col-span-2 rounded-2xl border border-(--ep-line)/25 bg-(--ep-s1) px-1.5 pt-2 pb-1.5">
        <div className="flex items-center gap-1 px-1 mb-1">
          {onShiftWeek && (
            <button type="button" aria-label={t("Semaine précédente")} disabled={!canPrevWeek} onClick={() => onShiftWeek(-7)} className="w-8 h-8 -my-1 rounded-lg flex items-center justify-center text-(--ep-ink)/55 disabled:opacity-25">
              <ChevronLeft size={15} />
            </button>
          )}
          <p className="flex-1 min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-(--ep-ink)/50">{weekTitle}</p>
          {onBackToday && !isToday ? (
            <button type="button" onClick={onBackToday} className="-my-1 min-h-8 px-1.5 text-[10.5px] font-black uppercase tracking-wider text-(--ep-accent-hi2)">
              {t("Aujourd'hui")}
            </button>
          ) : (
            weekAvg != null && (
              <p className="text-[11px] text-(--ep-ink)/55 whitespace-nowrap">
                {t("Suivi")} <b className="text-(--ep-strong) tabular-nums">{weekAvg} %</b>
              </p>
            )
          )}
          {onShiftWeek && (
            <button type="button" aria-label={t("Semaine suivante")} disabled={!canNextWeek} onClick={() => onShiftWeek(7)} className="w-8 h-8 -my-1 rounded-lg flex items-center justify-center text-(--ep-ink)/55 disabled:opacity-25">
              <ChevronRight size={15} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {week.map((d) => {
            const num = parseInt(d.date.slice(8, 10), 10);
            const kindLabel = d.kind ? `, ${t(DAY_KIND_LABEL[d.kind]).toLowerCase()}` : "";
            return (
              <button
                key={d.date}
                type="button"
                disabled={d.future || d.disabled}
                onClick={() => onSelectDay(d.date)}
                aria-label={`${d.letter} ${num}${kindLabel} : ${d.future ? t("à venir") : d.pct == null ? t("pas de données") : `${d.pct} %`}`}
                aria-current={d.isSelected ? "date" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl pt-1 pb-1.5 min-h-[62px] ${d.isSelected ? "bg-(--ep-ink)/[0.07]" : ""} ${d.future || d.disabled ? "opacity-45" : ""}`}
              >
                <span className={`text-[9.5px] font-black ${d.isToday ? "text-(--ep-accent)" : "text-(--ep-ink)/45"}`}>{d.letter}</span>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[12.5px] font-black tabular-nums ${d.isToday ? "bg-(--ep-accent) text-(--ep-strong)" : "text-(--ep-ink)/80"}`}
                >
                  {num}
                </span>
                <span className="h-3 flex items-center text-(--ep-ink)/60">{d.kind && <KindIcon kind={d.kind} size={10} />}</span>
                <span className="w-5 h-1 rounded-full" style={{ background: d.future ? "rgba(var(--ep-ink-rgb),0.08)" : toneOf(d.pct), opacity: d.basis === "estime" ? 0.5 : 1 }} />
              </button>
            );
          })}
        </div>
      </section>

      <div className="lg:col-span-2 space-y-3 empty:hidden">{intro}</div>

      {/* 2. Le repas du moment, en grand */}
      {isToday && focusMeal && focus && focusTag && (
        <section
          aria-label={t("Repas du moment")}
          className="lg:col-start-1 lg:row-start-3 rounded-2xl border bg-(--ep-s1) p-3.5"
          style={{ borderColor: "rgba(var(--ep-accent-rgb),0.45)", boxShadow: "0 0 28px rgba(var(--ep-accent-rgb),0.10)" }}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <span
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wide"
                style={{ color: focusTag.color, background: `rgba(var(${focusTag.rgb}),0.14)` }}
              >
                <Clock size={10} aria-hidden /> {focusTag.label}
              </span>
              <h2 className="mt-1 text-[26px] font-black uppercase tracking-tight leading-[1.05] text-(--ep-strong) break-words">{focusMeal.label}</h2>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[22px] font-black text-(--ep-strong) tabular-nums leading-none">{focusMeal.time}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-(--ep-ink)/45">
                {focusMeal.fromAgenda ? (
                  <>
                    <CalendarClock size={10} aria-hidden /> {t("Agenda")}
                  </>
                ) : (
                  t("Heure habituelle")
                )}
              </p>
            </div>
          </div>

          <p className="mt-2 text-[12.5px] text-(--ep-ink)/60 tabular-nums">
            <b className="text-(--ep-strong) text-[15px]">{fmtInt(focusMeal.macros.calories)}</b> {t("kcal")}
            <span className="mx-1.5 text-(--ep-ink)/25">·</span>
            <b className="text-(--ep-strong) text-[15px]">{fmtInt(focusMeal.macros.proteins)} g</b> {t("de protéines")}
            <span className="block sm:inline sm:ml-2 text-[11px] text-(--ep-ink)/45">
              {t("Glucides")} {fmtInt(focusMeal.macros.carbs)} g · {t("Lipides")} {fmtInt(focusMeal.macros.fats)} g
            </span>
          </p>

          <ul className="mt-2 divide-y divide-(--ep-line)/15 border-y border-(--ep-line)/15">
            {focusMeal.items.map((i) => {
              const eq = simpleEquivalent(i.food, i.grams);
              return (
                <li key={i.key} className="flex items-center gap-3 py-2">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] leading-snug text-(--ep-ink)/90 break-words">{i.food.name}</span>
                    {(eq || i.note) && (
                      <span className="block text-[11.5px] leading-snug text-(--ep-ink)/50">
                        {eq}
                        {eq && i.note ? " · " : ""}
                        {i.note}
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-black text-(--ep-strong) tabular-nums whitespace-nowrap">{fmtGrams(i.grams)}</span>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
            <button
              type="button"
              disabled={locked}
              onClick={() => onSetStatus(focusMeal.slot, "mange")}
              className="min-h-[48px] rounded-xl bg-(--ep-accent) text-(--ep-strong) text-[13px] font-black uppercase tracking-wider inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check size={17} strokeWidth={3} /> {t("Mangé")}
            </button>
            <button
              type="button"
              disabled={locked || focusMeal.items.length === 0}
              onClick={() => replaceIn(focusMeal)}
              className="min-h-[48px] px-2 rounded-xl border border-(--ep-line)/40 text-(--ep-strong) text-[13px] font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <ArrowLeftRight size={15} className="flex-shrink-0" /> {t("Remplacer")}
            </button>
            <button
              type="button"
              aria-label={t("Autres options du repas")}
              disabled={!!readOnly}
              onClick={() => openSheet(focusMeal.slot)}
              className="min-h-[48px] w-12 rounded-xl border border-(--ep-line)/40 text-(--ep-ink)/75 inline-flex items-center justify-center disabled:opacity-50"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </section>
      )}

      {isToday && !focus && plannedMeals.length > 0 && (
        <section className="lg:col-start-1 lg:row-start-3 rounded-2xl border border-(--ep-ok)/30 bg-(--ep-ok)/[0.06] p-3.5 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-(--ep-ok)/15 text-(--ep-ok)">
            <Check size={20} strokeWidth={3} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-black uppercase tracking-tight text-(--ep-strong)">{t("Journée bouclée")}</p>
            <p className="text-xs text-(--ep-ink)/60">
              {t("Tous tes repas sont cochés.")} {adherence.pct != null && `${t("Suivi du jour")}\u00a0: ${adherence.pct}\u00a0%.`}
            </p>
          </div>
        </section>
      )}

      {/* 3. La journée : macros et repas */}
      <section aria-label={t("Ma journée")} className={`${sideCol ? "lg:col-start-2 lg:row-start-3 lg:row-span-2" : "lg:col-span-2"} rounded-2xl border border-(--ep-line)/25 bg-(--ep-s1) overflow-hidden`}>
        <div className="px-3.5 pt-3 pb-3">
          <div className="flex items-center gap-2">
            <p className="flex-1 min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-(--ep-ink)/50 first-letter:uppercase">{isToday ? t("Ma journée") : dayLabel}</p>
            {dayKind && (
              <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wide bg-(--ep-accent)/10 text-(--ep-accent-hi2) whitespace-nowrap">
                <KindIcon kind={dayKind.kind} size={10} />
                {t(DAY_KIND_LABEL[dayKind.kind])}
                {dayKind.session ? ` · ${dayKind.session}` : ""}
              </span>
            )}
          </div>

          {hasTarget ? (
            <>
              <div className="mt-2 flex items-baseline gap-1.5 tabular-nums">
                <span className="text-[26px] font-black text-(--ep-strong) leading-none">{fmtInt(eaten.calories)}</span>
                <span className="text-[12px] text-(--ep-ink)/55">/ {fmtInt(target.calories)} {t("kcal")}</span>
                <span className="ml-auto text-[11.5px] text-(--ep-ink)/55 whitespace-nowrap">
                  {eaten.calories > target.calories * 1.05 ? (
                    <b className="text-(--ep-warn)">+{fmtInt(eaten.calories - target.calories)} {t("kcal")}</b>
                  ) : (
                    <>
                      {t("reste")} <b className="text-(--ep-strong)">{fmtInt(remaining)}</b>
                    </>
                  )}
                </span>
              </div>
              <div className="mt-1.5">
                <MacroBar eaten={eaten.calories} toCome={toCome.calories} target={target.calories} color="var(--ep-accent)" />
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-3">
                {(
                  [
                    { key: "proteins", label: t("Protéines"), color: "var(--ep-info)" },
                    { key: "carbs", label: t("Glucides"), color: "var(--ep-yellow)" },
                    { key: "fats", label: t("Lipides"), color: "var(--ep-violet)" },
                  ] as const
                ).map((m) => (
                  <div key={m.key} className="min-w-0">
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-(--ep-ink)/45 truncate">{m.label}</p>
                    <p className="text-[12px] tabular-nums text-(--ep-ink)/60 whitespace-nowrap">
                      <b className="text-(--ep-strong) text-[13.5px]">{fmtInt(eaten[m.key])}</b>/{fmtInt(target[m.key])} g
                    </p>
                    <div className="mt-1">
                      <MacroBar eaten={eaten[m.key]} toCome={toCome[m.key]} target={target[m.key]} color={m.color} />
                    </div>
                  </div>
                ))}
              </div>
              {toCome.calories > 0 && (
                <p className="mt-2 text-[10.5px] text-(--ep-ink)/40 leading-snug">{t("Plein : mangé. Pâle : encore prévu aujourd'hui.")}</p>
              )}
            </>
          ) : (
            <p className="mt-1.5 text-[12px] text-(--ep-ink)/50 leading-snug">
              <b className="text-(--ep-strong) tabular-nums">{fmtInt(eaten.calories)} {t("kcal")}</b> · P {fmtInt(eaten.proteins)} · G {fmtInt(eaten.carbs)} · L {fmtInt(eaten.fats)}
            </p>
          )}

          {nextKind && dayKind && nextKind.kind !== dayKind.kind && isToday && (
            <p className="mt-2 text-[11.5px] text-(--ep-ink)/55 leading-snug">
              {t("Demain")} : <b className="text-(--ep-ink)/85">{t(DAY_KIND_LABEL[nextKind.kind]).toLowerCase()}</b>, {fmtInt(nextKind.kcal)} {t("kcal")}
              {nextKind.kcal !== dayKind.kcal && (
                <span className="text-(--ep-ink)/40">
                  {" "}
                  ({nextKind.kcal > dayKind.kcal ? "+" : "−"}
                  {fmtInt(Math.abs(nextKind.kcal - dayKind.kcal))})
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 px-3.5 pb-2 border-t border-(--ep-line)/15 pt-2.5">
          <p className="flex-1 text-[10px] font-black uppercase tracking-widest text-(--ep-ink)/50">{t("Mes repas")}</p>
          <p className="text-[11px] text-(--ep-ink)/55">
            {adherence.pct != null ? (
              <>
                <b className="text-(--ep-strong) tabular-nums">{adherence.pct} %</b> {t("suivi")}
                {adherence.basis === "checks" && <span className="text-(--ep-ink)/40 tabular-nums"> · {adherence.answered}/{adherence.total}</span>}
              </>
            ) : plannedMeals.length > 0 ? (
              <span className="text-(--ep-ink)/40">{t("Coche tes repas")}</span>
            ) : null}
          </p>
        </div>

        {onMarkPast && !readOnly && pastOpen.length > 0 && (
          <button
            type="button"
            disabled={locked}
            onClick={() => onMarkPast(pastOpen)}
            className="mx-3.5 mb-2 w-[calc(100%-1.75rem)] min-h-[44px] rounded-xl border border-(--ep-ok)/35 bg-(--ep-ok)/[0.07] text-(--ep-ok) text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Check size={14} strokeWidth={3} /> {pastOpen.length > 1 ? `${t("J'ai suivi les")} ${pastOpen.length} ${t("repas précédents")}` : t("J'ai suivi le repas précédent")}
          </button>
        )}

        <ul>
          {meals.map((m) => {
            const st = status[m.slot];
            const isFocus = focus?.slot === m.slot;
            const isOpen = open.has(m.slot);
            const late = isToday && !st && m.planned && !isFocus && hhmm >= (SLOT_END[m.slot] ?? "23:59");
            const tag = st
              ? st === "mange"
                ? null
                : { label: t(STATUS_LABEL[st]), color: STATUS_COLOR[st] }
              : isFocus
                ? { label: focus?.when === "late" ? t("Pas coché") : focus?.when === "now" ? t("Maintenant") : t("Prochain"), color: focus?.when === "late" ? "var(--ep-warn)" : "var(--ep-accent-hi2)" }
                : late
                  ? { label: t("Pas coché"), color: "var(--ep-warn)" }
                  : null;
            const empty = m.items.length === 0;
            return (
              <li
                key={m.slot}
                id={`diet-day-${m.slot}`}
                className={`scroll-mt-20 border-t border-(--ep-line)/12 transition-shadow ${isFocus && !isOpen ? "bg-(--ep-accent)/[0.05]" : ""} ${isOpen ? "bg-(--ep-ink)/[0.025]" : ""}`}
                style={flash === m.slot ? { boxShadow: "inset 0 0 0 2px rgba(var(--ep-accent-rgb),0.7)" } : undefined}
              >
                <div className="flex items-stretch">
                  {m.planned || !empty ? (
                    <button
                      type="button"
                      disabled={locked || (!m.planned && !st)}
                      onClick={() => onToggle(m.slot)}
                      aria-pressed={!!st}
                      aria-label={st ? `${m.label} : ${t(STATUS_LABEL[st])}. ${t("Toucher pour décocher")}` : `${t("Marquer")} ${m.label} ${t("comme mangé")}`}
                      className="w-12 min-h-[56px] flex items-center justify-center flex-shrink-0 disabled:opacity-100"
                    >
                      <StatusDot status={st} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={locked || !onAdd}
                      onClick={() => onAdd?.(m.slot)}
                      aria-label={`${t("Ajouter un aliment à")} ${m.label}`}
                      className="w-12 min-h-[56px] flex items-center justify-center flex-shrink-0 text-(--ep-ink)/45 disabled:opacity-50"
                    >
                      <span className="w-[26px] h-[26px] rounded-full border-2 border-dashed border-(--ep-ink)/25 flex items-center justify-center">
                        <Plus size={13} />
                      </span>
                    </button>
                  )}
                  <button type="button" aria-expanded={isOpen} onClick={() => toggleOpen(m.slot)} className="flex-1 min-w-0 flex items-center gap-2 py-2.5 pr-3 text-left">
                    <span className="flex-1 min-w-0">
                      <span className="flex items-baseline gap-2 min-w-0">
                        <span className="text-[11.5px] font-bold text-(--ep-ink)/45 tabular-nums flex-shrink-0">{m.time}</span>
                        <span className={`text-[14px] font-bold truncate ${st === "saute" ? "text-(--ep-ink)/45 line-through" : "text-(--ep-strong)"}`}>{m.label}</span>
                      </span>
                      {(!isOpen || tag) && (
                        <span className="block text-[11.5px] text-(--ep-ink)/50 truncate mt-0.5">
                          {tag && (
                            <span className="text-[9.5px] font-black uppercase tracking-wider" style={{ color: tag.color }}>
                              {tag.label}
                              {!isOpen && " · "}
                            </span>
                          )}
                          {!isOpen && (empty ? t("Rien de noté") : m.items.map((i) => `${i.food.name} ${fmtGrams(i.grams)}`).join(" · "))}
                        </span>
                      )}
                    </span>
                    {!empty && (
                      <span className="text-right flex-shrink-0 tabular-nums leading-tight">
                        <span className="block text-[13px] font-black text-(--ep-ink)/85">{fmtInt(m.macros.calories)}</span>
                        <span className="block text-[9.5px] text-(--ep-ink)/40">{t("kcal")}</span>
                      </span>
                    )}
                    <ChevronDown size={16} className={`text-(--ep-ink)/30 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {isOpen && (
                  <div className="pl-12 pr-3.5 pb-3">
                    {m.variants && m.variants.length > 1 && onChooseVariant && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {m.variants.map((v) => (
                          <button
                            key={v}
                            type="button"
                            disabled={locked}
                            onClick={() => v !== m.variant && onChooseVariant(m.slot, v)}
                            className={`px-2.5 py-1 rounded-full border text-[10.5px] font-bold ${m.variant === v ? "bg-(--ep-accent)/15 border-(--ep-accent)/50 text-(--ep-accent-hi2)" : "border-(--ep-line)/30 text-(--ep-ink)/50"}`}
                          >
                            {v === 1 ? t("Choix habituel") : `${t("Option")} ${v}`}
                          </button>
                        ))}
                      </div>
                    )}

                    {empty ? (
                      <p className="py-1 text-[12px] text-(--ep-ink)/45">{m.planned ? t("Rien de prévu pour ce repas.") : t("Ajoute ce que tu as mangé.")}</p>
                    ) : (
                      <ul className="divide-y divide-(--ep-line)/12">
                        {m.items.map((i) => {
                          const eq = simpleEquivalent(i.food, i.grams);
                          const mm = macrosFor(i.food, i.grams);
                          const canEdit = !readOnly && !!onEditItem && (m.editable ? m.editable(i) : false);
                          const body = (
                            <>
                              <span className="flex-1 min-w-0">
                                <span className="block text-[14px] leading-snug text-(--ep-ink)/90 break-words">
                                  {i.food.name}
                                  {i.overridden && <Shuffle size={11} className="inline ml-1.5 -mt-0.5 text-(--ep-accent-hi2)" aria-label={t("remplacé")} />}
                                </span>
                                <span className="block text-[11px] leading-snug text-(--ep-ink)/45 tabular-nums">
                                  {eq ? `${eq} · ` : ""}
                                  {fmtInt(mm.calories)} {t("kcal")} · P {fmtInt(mm.proteins)}
                                  {i.adjusted && i.planGrams != null && (
                                    <span className="text-(--ep-warn)">
                                      {" "}
                                      · {t("ajusté (plan")} {fmtGrams(i.planGrams)})
                                    </span>
                                  )}
                                </span>
                                {i.note && <span className="block text-[11px] leading-snug text-(--ep-ink)/55 italic">{i.note}</span>}
                              </span>
                              <span className="text-[15px] font-black text-(--ep-strong) tabular-nums whitespace-nowrap">{fmtGrams(i.grams)}</span>
                            </>
                          );
                          return (
                            <li key={i.key}>
                              {canEdit ? (
                                <button type="button" onClick={() => onEditItem!(m.slot, i)} className="w-full flex items-center gap-3 py-2 text-left">
                                  {body}
                                </button>
                              ) : (
                                <div className="flex items-center gap-3 py-2">{body}</div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {!empty && (
                      <p className="mt-1 text-[11px] text-(--ep-ink)/45 tabular-nums">
                        {t("Total")} : <b className="text-(--ep-ink)/75">{fmtInt(m.macros.calories)} {t("kcal")}</b> · P {fmtInt(m.macros.proteins)} · G {fmtInt(m.macros.carbs)} · L {fmtInt(m.macros.fats)}
                      </p>
                    )}

                    {m.canRestore && onRestore && !st && (
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => onRestore(m.slot)}
                        className="mt-2 w-full min-h-[40px] rounded-xl border border-(--ep-line)/35 text-(--ep-ink)/75 text-[11.5px] font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <RotateCcw size={13} /> {t("Remettre le repas du plan")}
                      </button>
                    )}

                    {!readOnly && (
                      <div className="mt-2 flex gap-2">
                        {m.planned && (
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => (st ? onToggle(m.slot) : onSetStatus(m.slot, "mange"))}
                            className={`flex-1 min-h-[44px] rounded-xl text-[12px] font-black uppercase tracking-wider inline-flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                              st ? "border border-(--ep-line)/40 text-(--ep-ink)/70" : "bg-(--ep-accent) text-(--ep-strong)"
                            }`}
                          >
                            {st ? (
                              <>
                                <RotateCcw size={13} /> {t("Décocher")}
                              </>
                            ) : (
                              <>
                                <Check size={15} strokeWidth={3} /> {t("Mangé")}
                              </>
                            )}
                          </button>
                        )}
                        {m.planned && !empty && (
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => replaceIn(m)}
                            aria-label={t("Remplacer un aliment")}
                            className="min-h-[44px] w-11 rounded-xl border border-(--ep-line)/40 text-(--ep-ink)/75 inline-flex items-center justify-center disabled:opacity-50"
                          >
                            <ArrowLeftRight size={16} />
                          </button>
                        )}
                        {onAdd && (
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => onAdd(m.slot)}
                            aria-label={`${t("Ajouter un aliment à")} ${m.label}`}
                            className={`min-h-[44px] rounded-xl border border-(--ep-line)/40 text-(--ep-ink)/75 inline-flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                              m.planned ? "w-11" : "flex-1 text-[12px] font-bold uppercase tracking-wider"
                            }`}
                          >
                            <Plus size={16} />
                            {!m.planned && t("Ajouter")}
                          </button>
                        )}
                        {m.planned && (
                          <button
                            type="button"
                            onClick={() => openSheet(m.slot)}
                            aria-label={t("Autres options du repas")}
                            className="min-h-[44px] w-11 rounded-xl border border-(--ep-line)/40 text-(--ep-ink)/75 inline-flex items-center justify-center"
                          >
                            <MoreHorizontal size={17} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {onAddSlot && !readOnly && extraSlots.length > 0 && (
          <div className="border-t border-(--ep-line)/12 px-3.5 py-2">
            {!showExtra ? (
              <button type="button" onClick={() => setShowExtra(true)} className="min-h-[40px] inline-flex items-center gap-1.5 text-[11.5px] font-bold text-(--ep-ink)/55">
                <Plus size={14} /> {plannedMeals.length > 0 ? t("Ajouter un repas hors plan") : t("Ajouter un repas")}
              </button>
            ) : (
              <div className="flex flex-wrap gap-1.5 py-1">
                {extraSlots.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      onAddSlot(s.key);
                      setShowExtra(false);
                      setOpen((prev) => new Set(prev).add(s.key));
                    }}
                    className="px-3 py-1.5 rounded-full border border-dashed border-(--ep-line)/40 text-[11px] font-bold text-(--ep-ink)/60"
                  >
                    + {t(s.label)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {footer && <div className={sideCol ? "lg:col-start-1 lg:row-start-4" : "lg:col-span-2"}>{footer}</div>}

      {/* Panneau d'un repas : cuisine, remplacement, écart, sauté */}
      {sheetMeal && (
        <Sheet title={sheetMeal.label} subtitle={`${sheetMeal.time} · ${fmtInt(sheetMeal.macros.calories)} kcal · P ${fmtInt(sheetMeal.macros.proteins)} g`} onClose={() => setSheetSlot(null)}>
          {!replacing ? (
            <div className="space-y-2">
              {sheetMeal.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSheetSlot(null);
                    onCook(sheetMeal.slot);
                  }}
                  className="w-full min-h-[52px] rounded-xl border border-(--ep-line)/30 px-3 flex items-center gap-3 text-left"
                >
                  <ChefHat size={17} className="text-(--ep-accent-hi2) flex-shrink-0" />
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-(--ep-strong)">{t("Je cuisine")}</span>
                    <span className="block text-[11px] text-(--ep-ink)/50">{t("Les aliments un par un, à peser et cocher")}</span>
                  </span>
                </button>
              )}
              <p className="pt-2 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45">{t("Pas tout à fait comme prévu ?")}</p>
              {sheetMeal.items.length > 0 && (
                <button type="button" disabled={busy} onClick={() => setReplacing(true)} className="w-full min-h-[52px] rounded-xl border border-(--ep-line)/30 px-3 flex items-center gap-3 text-left disabled:opacity-50">
                  <ArrowLeftRight size={16} className="text-(--ep-ok) flex-shrink-0" />
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-(--ep-strong)">{t("J'ai remplacé un aliment")}</span>
                    <span className="block text-[11px] text-(--ep-ink)/50">{t("Quantité équivalente calculée, ça compte comme suivi")}</span>
                  </span>
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSheetSlot(null);
                  onAteOther(sheetMeal.slot);
                }}
                className="w-full min-h-[52px] rounded-xl border border-(--ep-line)/30 px-3 flex items-center gap-3 text-left disabled:opacity-50"
              >
                <UtensilsCrossed size={16} className="text-(--ep-warn) flex-shrink-0" />
                <span className="flex-1">
                  <span className="block text-sm font-bold text-(--ep-strong)">{t("J'ai mangé autre chose")}</span>
                  <span className="block text-[11px] text-(--ep-ink)/50">{t("Écart noté, tu peux ajouter ce que tu as mangé")}</span>
                </span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSheetSlot(null);
                  onSkip(sheetMeal.slot);
                }}
                className="w-full min-h-[52px] rounded-xl border border-(--ep-line)/30 px-3 flex items-center gap-3 text-left disabled:opacity-50"
              >
                <SkipForward size={16} className="text-(--ep-ink)/50 flex-shrink-0" />
                <span className="block text-sm font-bold text-(--ep-strong)">{t("Je l'ai sauté")}</span>
              </button>
              {status[sheetMeal.slot] && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onSetStatus(sheetMeal.slot, null);
                    setSheetSlot(null);
                  }}
                  className="w-full min-h-[44px] rounded-xl text-xs font-bold text-(--ep-ink)/50 inline-flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} /> {t("Effacer ma réponse")} ({t(STATUS_LABEL[status[sheetMeal.slot]!])})
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-(--ep-ink)/70">{t("Quel aliment as-tu remplacé ?")}</p>
              {sheetMeal.items.map((i) => (
                <button
                  key={i.key}
                  type="button"
                  onClick={() => {
                    const slot = sheetMeal.slot;
                    setSheetSlot(null);
                    onReplace(slot, i.key);
                  }}
                  className="w-full min-h-[52px] rounded-xl border border-(--ep-line)/30 px-3 flex items-center gap-3 text-left"
                >
                  <span className="flex-1 min-w-0 text-[15px] text-(--ep-strong) break-words">{i.food.name}</span>
                  <span className="text-sm font-bold text-(--ep-ink)/60 tabular-nums whitespace-nowrap">{fmtGrams(i.grams)}</span>
                  <ChevronRight size={16} className="text-(--ep-ink)/30 flex-shrink-0" />
                </button>
              ))}
              <button type="button" onClick={() => setReplacing(false)} className="w-full min-h-[44px] text-xs font-bold text-(--ep-ink)/50">
                {t("Retour")}
              </button>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
