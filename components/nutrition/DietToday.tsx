"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useState } from "react";
import { ArrowLeftRight, Check, ChefHat, ChevronRight, Clock, MoreHorizontal, Shuffle, SkipForward, Trash2, UtensilsCrossed } from "lucide-react";
import Sheet from "@/components/nutrition/Sheet";
import { STATUS_LABEL, fmtGrams, pickFocusMeal, simpleEquivalent, type DayAdherence, type MealStatus } from "@/lib/diet-day";
import type { Macros } from "@/lib/nutrition-engine";
import type { Food } from "@/utils/nutrition";

// Écran d'ouverture de la diète (2026-10-14) : le repas du moment en grand,
// la journée en liste compacte avec une case « mangé » en un tap, l'écart en
// un tap, et le suivi de la semaine. Purement visuel : les données et les
// écritures viennent du tracker (NutritionTracker), qui reste la source de
// vérité du journal.

export interface DayMealItem {
  key: string;
  food: Food;
  grams: number;
}

export interface DayMeal {
  slot: string;
  label: string;
  time: string;
  items: DayMealItem[];
  macros: Macros;
}

export interface WeekDay {
  date: string;
  letter: string;
  pct: number | null;
  basis: DayAdherence["basis"];
  isToday: boolean;
  isSelected: boolean;
  future: boolean;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toneOf(pct: number | null): string {
  if (pct == null) return "rgba(var(--ep-ink-rgb),0.08)";
  if (pct >= 80) return "var(--ep-ok)";
  if (pct >= 50) return "var(--ep-warn)";
  return "var(--ep-bad)";
}

function StatusDot({ status, size = 28 }: { status: MealStatus | undefined; size?: number }) {
  const icon = size >= 28 ? 16 : 13;
  if (!status) {
    return <span className="rounded-full border-2 border-(--ep-ink)/25 flex-shrink-0" style={{ width: size, height: size }} />;
  }
  const color = status === "ecart" ? "var(--ep-warn)" : status === "saute" ? "rgba(var(--ep-ink-rgb),0.45)" : "var(--ep-ok)";
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

function macroLine(m: Macros): string {
  return `${Math.round(m.calories)} kcal · P ${Math.round(m.proteins)} · G ${Math.round(m.carbs)} · L ${Math.round(m.fats)}`;
}

export default function DietToday({
  isToday,
  dayLabel,
  meals,
  status,
  adherence,
  week,
  weekAvg,
  busy,
  onToggle,
  onSetStatus,
  onCook,
  onReplace,
  onAteOther,
  onSkip,
  onSelectDay,
  onMarkPast,
}: {
  isToday: boolean;
  dayLabel: string;
  meals: DayMeal[];
  status: Record<string, MealStatus | undefined>;
  adherence: DayAdherence;
  week: WeekDay[];
  weekAvg: number | null;
  busy: boolean;
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
}) {
  const t = useT();
  const [hhmm, setHhmm] = useState(nowHHMM);
  useEffect(() => {
    const id = setInterval(() => setHhmm(nowHHMM()), 60000);
    return () => clearInterval(id);
  }, []);
  const [sheetSlot, setSheetSlot] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);

  const focus = isToday ? pickFocusMeal(meals.map((m) => m.slot), status, hhmm) : null;
  const focusMeal = focus ? meals.find((m) => m.slot === focus.slot) ?? null : null;
  // Repas passés (heure de fin dépassée) sans réponse, aujourd'hui seulement.
  const focusIdx = focus ? meals.findIndex((m) => m.slot === focus.slot) : meals.length;
  const pastOpen = isToday ? meals.filter((m, i) => i < focusIdx && !status[m.slot] && hhmm >= m.time).map((m) => m.slot) : [];
  const sheetMeal = sheetSlot ? meals.find((m) => m.slot === sheetSlot) ?? null : null;

  function openSheet(slot: string) {
    setReplacing(false);
    setSheetSlot(slot);
  }

  return (
    <div className="space-y-3">
      {/* 1. Le repas du moment, en grand */}
      {isToday && focusMeal && focus && (
        <section aria-label={t("Repas du moment")} className="rounded-2xl border border-(--ep-accent)/35 bg-(--ep-s1) p-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest"
              style={{
                background: focus.when === "late" ? "rgba(var(--ep-warn-rgb),0.14)" : "rgba(var(--ep-accent-rgb),0.14)",
                color: focus.when === "late" ? "var(--ep-warn)" : "var(--ep-accent-hi2)",
              }}
            >
              <Clock size={11} /> {focus.when === "now" ? t("C'est l'heure") : focus.when === "next" ? t("Prochain repas") : t("Pas encore coché")}
            </span>
            <span className="ml-auto text-lg font-black text-(--ep-strong) tabular-nums">{focusMeal.time}</span>
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-(--ep-strong)">{focusMeal.label}</h2>

          <ul className="mt-3 divide-y divide-(--ep-line)/15">
            {focusMeal.items.map((i) => {
              const eq = simpleEquivalent(i.food, i.grams);
              return (
                <li key={i.key} className="flex items-center gap-3 py-2.5">
                  <span className="flex-1 min-w-0 text-base leading-snug text-(--ep-ink)/90">{i.food.name}</span>
                  <span className="text-right flex-shrink-0">
                    <span className="block text-xl font-black text-(--ep-strong) tabular-nums leading-tight">{fmtGrams(i.grams)}</span>
                    {eq && <span className="block text-xs text-(--ep-ink)/50">{eq}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-1 text-[11px] text-(--ep-ink)/45">{macroLine(focusMeal.macros)}</p>

          <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onSetStatus(focusMeal.slot, "mange")}
              className="min-h-[48px] rounded-xl bg-(--ep-accent) text-(--ep-strong) text-sm font-black uppercase tracking-wider inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check size={17} strokeWidth={3} /> {t("Mangé")}
            </button>
            <button
              type="button"
              onClick={() => onCook(focusMeal.slot)}
              className="min-h-[48px] px-3.5 rounded-xl border border-(--ep-line)/40 text-(--ep-strong) text-sm font-bold inline-flex items-center justify-center gap-1.5"
            >
              <ChefHat size={17} /> {t("Je cuisine")}
            </button>
            <button
              type="button"
              aria-label={t("Écart ou remplacement")}
              onClick={() => openSheet(focusMeal.slot)}
              className="min-h-[48px] w-12 rounded-xl border border-(--ep-line)/40 text-(--ep-ink)/75 inline-flex items-center justify-center"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </section>
      )}

      {isToday && !focus && meals.length > 0 && (
        <section className="rounded-2xl border border-(--ep-ok)/30 bg-(--ep-ok)/[0.06] p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-(--ep-ok)/15 text-(--ep-ok)">
            <Check size={20} strokeWidth={3} />
          </span>
          <div>
            <p className="text-base font-black text-(--ep-strong)">{t("Journée bouclée")}</p>
            <p className="text-xs text-(--ep-ink)/60">
              {t("Tous tes repas sont cochés.")} {adherence.pct != null && `${t("Suivi du jour")} : ${adherence.pct} %.`}
            </p>
          </div>
        </section>
      )}

      {/* 2. La journée en liste compacte */}
      <section aria-label={t("Mes repas")} className="rounded-2xl border border-(--ep-line)/25 bg-(--ep-s1) overflow-hidden">
        <div className="px-4 pt-3.5 pb-2">
          <div className="flex items-baseline gap-2">
            <p className="flex-1 text-[11px] font-black uppercase tracking-widest text-(--ep-ink)/55 first-letter:uppercase">{isToday ? t("Ma journée") : dayLabel}</p>
            <p className="text-xs text-(--ep-ink)/55">
              {adherence.pct != null ? (
                <>
                  <b className="text-(--ep-strong) tabular-nums">{adherence.pct} %</b> {t("suivi")}
                  {adherence.basis === "checks" && <span className="text-(--ep-ink)/40"> · {adherence.answered}/{adherence.total}</span>}
                </>
              ) : (
                <span className="text-(--ep-ink)/40">{t("Coche tes repas")}</span>
              )}
            </p>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-(--ep-ink)/[0.07] overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${adherence.pct ?? 0}%`, background: toneOf(adherence.pct) }} />
          </div>
        </div>
        {onMarkPast && pastOpen.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMarkPast(pastOpen)}
            className="mx-4 mb-2.5 w-[calc(100%-2rem)] min-h-[44px] rounded-xl border border-(--ep-ok)/35 bg-(--ep-ok)/[0.07] text-(--ep-ok) text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Check size={14} strokeWidth={3} /> {pastOpen.length > 1 ? `${t("J'ai suivi les")} ${pastOpen.length} ${t("repas précédents")}` : t("J'ai suivi le repas précédent")}
          </button>
        )}
        <ul>
          {meals.map((m) => {
            const st = status[m.slot];
            const isFocus = focus?.slot === m.slot;
            return (
              <li key={m.slot} id={`diet-day-${m.slot}`} className={`flex items-stretch border-t border-(--ep-line)/12 ${isFocus ? "bg-(--ep-accent)/[0.05]" : ""}`}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onToggle(m.slot)}
                  aria-pressed={!!st}
                  aria-label={st ? `${m.label} : ${t(STATUS_LABEL[st])}. ${t("Toucher pour décocher")}` : `${t("Marquer")} ${m.label} ${t("comme mangé")}`}
                  className="w-14 min-h-[56px] flex items-center justify-center flex-shrink-0 disabled:opacity-60"
                >
                  <StatusDot status={st} />
                </button>
                <button type="button" onClick={() => openSheet(m.slot)} className="flex-1 min-w-0 flex items-center gap-2 py-2.5 pr-3 text-left">
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-(--ep-ink)/45 tabular-nums">{m.time}</span>
                      <span className={`text-sm font-bold truncate ${st === "saute" ? "text-(--ep-ink)/45 line-through" : "text-(--ep-strong)"}`}>{m.label}</span>
                      {st && st !== "mange" && <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: st === "ecart" ? "var(--ep-warn)" : st === "saute" ? "rgba(var(--ep-ink-rgb),0.45)" : "var(--ep-ok)" }}>{t(STATUS_LABEL[st])}</span>}
                    </span>
                    <span className="block text-xs text-(--ep-ink)/55 truncate mt-0.5">
                      {m.items.length > 0 ? m.items.map((i) => `${i.food.name} ${fmtGrams(i.grams)}`).join(" · ") : t("Rien de prévu")}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-(--ep-ink)/30 flex-shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 3. La semaine */}
      <section aria-label={t("Ma semaine")} className="rounded-2xl border border-(--ep-line)/25 bg-(--ep-s1) p-4">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-(--ep-ink)/55">{t("Ma semaine")}</p>
          <p className="text-xs text-(--ep-ink)/55">
            {weekAvg != null ? (
              <>
                {t("Moyenne")} <b className="text-(--ep-strong) tabular-nums">{weekAvg} %</b>
              </>
            ) : (
              t("Pas encore de données")
            )}
          </p>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d) => (
            <button
              key={d.date}
              type="button"
              disabled={d.future}
              onClick={() => onSelectDay(d.date)}
              aria-label={`${d.letter} : ${d.pct == null ? t("pas de données") : `${d.pct} %`}`}
              aria-current={d.isSelected ? "date" : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl py-1.5 min-h-[64px] ${d.isSelected ? "bg-(--ep-ink)/[0.06]" : ""} disabled:opacity-40`}
            >
              <span className={`text-[10px] font-bold ${d.isToday ? "text-(--ep-accent-hi2)" : "text-(--ep-ink)/45"}`}>{d.letter}</span>
              <span className="relative w-full flex-1 flex items-end justify-center">
                <span className="w-5 h-8 rounded-md bg-(--ep-ink)/[0.07] overflow-hidden flex items-end">
                  <span
                    className="w-full rounded-md transition-all duration-500"
                    style={{
                      height: `${d.pct == null ? 0 : Math.max(8, d.pct)}%`,
                      background: toneOf(d.pct),
                      opacity: d.basis === "estime" ? 0.45 : 1,
                    }}
                  />
                </span>
              </span>
              <span className="text-[10px] font-bold tabular-nums text-(--ep-ink)/60">{d.pct == null ? "·" : d.pct}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-(--ep-ink)/40 leading-snug">{t("Barre pleine : repas cochés. Barre pâle : estimé d'après les calories notées.")}</p>
      </section>

      {/* Panneau d'un repas : détail, cuisine, écart en un tap */}
      {sheetMeal && (
        <Sheet title={sheetMeal.label} subtitle={`${sheetMeal.time} · ${macroLine(sheetMeal.macros)}`} onClose={() => setSheetSlot(null)}>
          {!replacing ? (
            <div className="space-y-4">
              <ul className="divide-y divide-(--ep-line)/15">
                {sheetMeal.items.map((i) => {
                  const eq = simpleEquivalent(i.food, i.grams);
                  return (
                    <li key={i.key} className="flex items-center gap-3 py-2.5">
                      <span className="flex-1 min-w-0 text-[15px] text-(--ep-ink)/90">{i.food.name}</span>
                      <span className="text-right">
                        <span className="block text-lg font-black text-(--ep-strong) tabular-nums">{fmtGrams(i.grams)}</span>
                        {eq && <span className="block text-[11px] text-(--ep-ink)/50">{eq}</span>}
                      </span>
                    </li>
                  );
                })}
                {sheetMeal.items.length === 0 && <li className="py-3 text-sm text-(--ep-ink)/50">{t("Rien de prévu pour ce repas.")}</li>}
              </ul>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onSetStatus(sheetMeal.slot, "mange");
                    setSheetSlot(null);
                  }}
                  className="min-h-[48px] rounded-xl bg-(--ep-accent) text-(--ep-strong) text-sm font-black inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check size={16} strokeWidth={3} /> {t("Mangé")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSheetSlot(null);
                    onCook(sheetMeal.slot);
                  }}
                  className="min-h-[48px] rounded-xl border border-(--ep-line)/40 text-(--ep-strong) text-sm font-bold inline-flex items-center justify-center gap-2"
                >
                  <ChefHat size={16} /> {t("Je cuisine")}
                </button>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45 mb-2">{t("Pas tout à fait comme prévu ?")}</p>
                <div className="space-y-2">
                  {sheetMeal.items.length > 0 && (
                    <button type="button" disabled={busy} onClick={() => setReplacing(true)} className="w-full min-h-[48px] rounded-xl border border-(--ep-line)/30 px-3 flex items-center gap-3 text-left disabled:opacity-50">
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
                    className="w-full min-h-[48px] rounded-xl border border-(--ep-line)/30 px-3 flex items-center gap-3 text-left disabled:opacity-50"
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
                    className="w-full min-h-[48px] rounded-xl border border-(--ep-line)/30 px-3 flex items-center gap-3 text-left disabled:opacity-50"
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
              </div>
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
                  <span className="flex-1 text-[15px] text-(--ep-strong)">{i.food.name}</span>
                  <span className="text-sm font-bold text-(--ep-ink)/60 tabular-nums">{fmtGrams(i.grams)}</span>
                  <ChevronRight size={16} className="text-(--ep-ink)/30" />
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
