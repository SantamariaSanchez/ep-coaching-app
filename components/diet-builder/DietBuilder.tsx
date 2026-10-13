"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Shuffle,
  Send,
  Loader2,
  Check,
  ChevronDown,
  LayoutTemplate,
  BookmarkPlus,
  X,
  AlertCircle,
  ClipboardList,
  ShoppingCart,
  Apple,
  AlertTriangle,
  Heart,
  Utensils,
  StickyNote,
} from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type { Food, DietMode, DietStructure, DayOfWeek, DietPlanWithMeals } from "@/utils/nutrition";
import { calculateNutrients } from "@/utils/nutrition-utils";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";
import type { DietPlanTemplateWithMeals } from "@/utils/diet-templates";
import type { ClientIntake } from "@/utils/client-intake";
import { buildFoodWatchContext, hasFoodWatchContext, checkFoodWatch } from "@/lib/food-watch-keywords";
import { findFoodSwapCandidate } from "@/lib/food-swap";
import { CATEGORY_ORDER } from "@/lib/shopping-list";
import { ALLERGEN_LABELS, DIET_LABELS } from "@/lib/recipes-data";
import { MEAL_SLOTS, DAY_TABS, MODE_LABELS, MacroCoverage, autoAdjustQuantities, type MacroTargets } from "@/components/ui/DietPlanManager";
import MicroBarList from "@/components/ui/MicroBarList";
import { Section, KV } from "@/components/program-builder/ClientContextPanel";
import FoodCell from "./FoodCell";
import { useIsMobile } from "@/hooks/useIsMobile";

// Conception de diète façon tableur (2026-10-13, même refonte que le
// programme) : un tableau par repas, on tape l'aliment, Entrée, la quantité,
// Entrée, ligne suivante. Macros du repas et du jour en direct, cible en haut,
// ajustement auto des grammages, copie d'un jour sur la semaine. Plus de
// fenêtre à ouvrir pour chaque aliment, plus d'accordéon en 4 phases.

interface Row {
  id: string;
  slot: string;
  day: DayOfWeek | null;
  foodId: string;
  foodName: string;
  qty: string;
  notes: string;
  variant: number; // 1 = principal, 2+ = autre choix (hors totaux)
}

const uid = () => Math.random().toString(36).slice(2, 10);
const WEEK: DayOfWeek[] = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];
const DEFAULT_SLOTS_BY_COUNT: Record<number, string[]> = {
  1: ["lunch"],
  2: ["lunch", "dinner"],
  3: ["breakfast", "lunch", "dinner"],
  4: ["breakfast", "lunch", "afternoon", "dinner"],
  5: ["breakfast", "morning", "lunch", "afternoon", "dinner"],
  6: ["breakfast", "morning", "lunch", "afternoon", "postworkout", "dinner"],
  7: MEAL_SLOTS.map((s) => s.key),
};
const MODES: { key: DietMode; label: string; hint: string }[] = [
  { key: "fixed", label: "Fixe", hint: "Il coche chaque aliment au fil de la journée." },
  { key: "fixed_flexible", label: "Fixe + échanges", hint: "Même plan, il peut échanger un aliment par un autre de la même catégorie." },
  { key: "flexible", label: "Flexible", hint: "Pas de repas imposés : il vise les macros et logue librement." },
];

type Seed = {
  meal_slot: string;
  food_id: string;
  quantity_g: number;
  day_of_week: DayOfWeek | null;
  notes?: string | null;
  variant_group?: number | null;
  foods?: Food | null;
};

function rowsFromSeed(seed: Seed[], foods: Food[]): Row[] {
  return seed.map((m) => ({
    id: uid(),
    slot: m.meal_slot,
    day: m.day_of_week,
    foodId: m.food_id,
    foodName: m.foods?.name ?? foods.find((f) => f.id === m.food_id)?.name ?? "Aliment",
    qty: String(m.quantity_g),
    notes: m.notes ?? "",
    variant: m.variant_group && m.variant_group > 1 ? m.variant_group : 1,
  }));
}

export default function DietBuilder({
  clientName,
  foods,
  intake = null,
  targets = null,
  templates = [],
  initialPlan = null,
  onCreate,
  saveAsTemplate,
  onEditTargets,
  onClose,
  self = false,
}: {
  clientName: string;
  foods: Food[];
  intake?: ClientIntake | null;
  targets?: MacroTargets | null;
  templates?: DietPlanTemplateWithMeals[];
  /** Plan existant à reprendre (modifier = enregistrer une nouvelle version). */
  initialPlan?: DietPlanWithMeals | null;
  onCreate: (
    name: string,
    mode: DietMode,
    meals: DietPlanMealInput[],
    structure: DietStructure,
    objective?: string,
    dayNotes?: Record<string, string>,
    socialNotes?: string
  ) => Promise<{ error?: string }>;
  saveAsTemplate?: (name: string, mode: DietMode, meals: DietPlanMealInput[], structure: DietStructure, objective?: string) => Promise<{ error?: string; id?: string }>;
  onEditTargets?: () => void;
  onClose?: () => void;
  /** Le coach conçoit sa propre diète (pas de fiche client, pas de notif). */
  self?: boolean;
}) {
  const tr = useT();
  const confirm = useConfirm();
  const firstName = clientName.split(" ")[0] || clientName;
  const foodById = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);

  const [name, setName] = useState(initialPlan?.name ?? "");
  const [objective, setObjective] = useState(initialPlan?.objective ?? "");
  const [mode, setMode] = useState<DietMode>(initialPlan?.mode ?? "fixed");
  const [structure, setStructure] = useState<DietStructure>(initialPlan?.structure ?? "daily");
  const [activeDay, setActiveDay] = useState<DayOfWeek>("lun");
  const [rows, setRows] = useState<Row[]>(() => (initialPlan ? rowsFromSeed(initialPlan.diet_plan_meals, foods) : []));
  const [dayNotes, setDayNotes] = useState<Partial<Record<DayOfWeek, string>>>(
    () => ((initialPlan as unknown as { day_notes?: Record<string, string> | null })?.day_notes ?? {}) as Partial<Record<DayOfWeek, string>>
  );
  const [socialNotes, setSocialNotes] = useState(((initialPlan as unknown as { social_notes?: string | null })?.social_notes ?? "") || "");
  const [slots, setSlots] = useState<string[]>(() => {
    const used = new Set((initialPlan?.diet_plan_meals ?? []).map((m) => m.meal_slot));
    if (used.size) return MEAL_SLOTS.map((s) => s.key).filter((k) => used.has(k));
    const n = intake?.meals_ideal && intake.meals_ideal >= 1 && intake.meals_ideal <= 7 ? intake.meals_ideal : 4;
    return DEFAULT_SLOTS_BY_COUNT[n];
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [templateMenu, setTemplateMenu] = useState(false);
  const [templateForm, setTemplateForm] = useState<{ name: string; busy: boolean; ok: boolean; error: string | null } | null>(null);
  const [adjustMsg, setAdjustMsg] = useState<string | null>(null);
  const [showExtras, setShowExtras] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);
  const pendingFocus = useRef<string | null>(null);
  const isMobile = useIsMobile();

  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    const el = document.querySelector<HTMLInputElement>(`[data-dcell="${pendingFocus.current}"]`);
    pendingFocus.current = null;
    el?.focus();
    el?.select();
  });

  const watch = useMemo(() => buildFoodWatchContext(intake), [intake]);
  const hasWatch = hasFoodWatchContext(watch);
  const currentDay: DayOfWeek | null = structure === "weekly" ? activeDay : null;
  const dayRows = rows.filter((r) => r.day === currentDay);
  const shownSlots = MEAL_SLOTS.filter((s) => slots.includes(s.key) || dayRows.some((r) => r.slot === s.key));

  const nutrientsOf = (r: Row) => {
    const f = foodById.get(r.foodId);
    const g = parseFloat(r.qty);
    if (!f || !g) return { calories: 0, proteins: 0, carbs: 0, fats: 0 };
    return calculateNutrients(f, g);
  };
  const sum = (list: Row[]) =>
    list.reduce(
      (a, r) => {
        if (r.variant > 1) return a;
        const n = nutrientsOf(r);
        return { calories: a.calories + n.calories, proteins: a.proteins + n.proteins, carbs: a.carbs + n.carbs, fats: a.fats + n.fats };
      },
      { calories: 0, proteins: 0, carbs: 0, fats: 0 }
    );
  const dayTotals = sum(dayRows);

  // ── Édition ──────────────────────────────────────────────────────────────
  function patch(id: string, p: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
  }

  function addFood(slot: string, food: Food, afterQtyFocus = true) {
    const id = uid();
    const prevInSlot = [...dayRows].reverse().find((r) => r.slot === slot && r.foodId === food.id);
    setRows((prev) => [
      ...prev,
      { id, slot, day: currentDay, foodId: food.id, foodName: food.name, qty: prevInSlot?.qty ?? "100", notes: "", variant: 1 },
    ]);
    setDrafts((d) => ({ ...d, [slot]: "" }));
    if (afterQtyFocus) pendingFocus.current = `${slot}:${id}:qty`;
  }

  function slotRows(slot: string) {
    return dayRows.filter((r) => r.slot === slot);
  }

  function focusNext(slot: string) {
    pendingFocus.current = `${slot}:new:food`;
    setDrafts((d) => ({ ...d }));
  }

  function swap(r: Row) {
    const current = foodById.get(r.foodId);
    if (!current) return;
    const next = findFoodSwapCandidate(current, foods, intake, slotRows(r.slot).map((x) => x.foodId));
    if (next) patch(r.id, { foodId: next.id, foodName: next.name });
  }

  function autoAdjust() {
    if (!targets) return;
    setAdjustMsg(null);
    const principal = dayRows.filter((r) => r.variant === 1 && foodById.has(r.foodId));
    const res = autoAdjustQuantities(
      principal.map((r) => ({ localId: r.id, slotKey: r.slot, foodId: r.foodId, foodName: r.foodName, quantityG: parseFloat(r.qty) || 0, day: r.day, notes: r.notes })),
      foods,
      targets
    );
    if (!res) {
      setAdjustMsg(tr("Il faut au moins une source de protéines, de glucides et de lipides dans la journée pour ajuster."));
      return;
    }
    setRows((prev) => prev.map((r) => (r.id in res ? { ...r, qty: String(res[r.id]) } : r)));
    setAdjustMsg(tr("Grammages ajustés sur la cible ✓"));
    setTimeout(() => setAdjustMsg(null), 2500);
  }

  async function copyDayToWeek() {
    if (!currentDay) return;
    const others = WEEK.filter((d) => d !== currentDay);
    const filled = others.filter((d) => rows.some((r) => r.day === d));
    if (filled.length && !(await confirm(tr("Copier ce jour sur toute la semaine remplace les {n} jour(s) déjà remplis. Continuer ?", { n: filled.length })))) return;
    setRows((prev) => [
      ...prev.filter((r) => r.day === currentDay || r.day === "high" || !others.includes(r.day as DayOfWeek)),
      ...others.flatMap((d) => prev.filter((r) => r.day === currentDay).map((r) => ({ ...r, id: uid(), day: d }))),
    ]);
  }

  async function switchStructure(next: DietStructure) {
    if (next === structure) return;
    if (next === "weekly") {
      // Le jour-type devient le lundi... et toute la semaine, prêt à varier.
      setRows((prev) => {
        const base = prev.filter((r) => r.day === null);
        return [...prev.filter((r) => r.day !== null), ...WEEK.flatMap((d) => base.map((r) => ({ ...r, id: uid(), day: d })))].filter((r) => r.day !== null);
      });
      setActiveDay("lun");
    } else {
      if (rows.some((r) => r.day !== null && r.day !== activeDay) && !(await confirm(tr("Garder seulement le jour affiché comme jour-type ?")))) return;
      setRows((prev) => prev.filter((r) => r.day === activeDay).map((r) => ({ ...r, day: null })));
    }
    setStructure(next);
  }

  async function loadTemplate(t: DietPlanTemplateWithMeals) {
    setTemplateMenu(false);
    if (rows.length && !(await confirm(tr("Charger « {name} » remplace les repas en cours. Continuer ?", { name: t.name })))) return;
    setName((n) => n || t.name);
    setObjective((o) => o || t.objective || "");
    setMode(t.mode);
    setStructure(t.structure);
    const seeded = rowsFromSeed(t.diet_plan_template_meals as unknown as Seed[], foods);
    setRows(seeded);
    setSlots(MEAL_SLOTS.map((s) => s.key).filter((k) => seeded.some((r) => r.slot === k)));
  }

  function mealInputs(): DietPlanMealInput[] {
    return rows
      .filter((r) => r.foodId && parseFloat(r.qty) > 0)
      .map((r, i) => ({
        meal_slot: r.slot,
        food_id: r.foodId,
        quantity_g: Math.round(parseFloat(r.qty)),
        position: i,
        day_of_week: structure === "weekly" ? r.day : null,
        notes: r.notes.trim() || null,
        variant_group: r.variant > 1 ? r.variant : null,
      }));
  }

  async function activate() {
    setError(null);
    const meals = mealInputs();
    if (mode !== "flexible" && meals.length === 0) {
      setError(tr("Ajoute au moins un aliment, ou passe en mode Flexible."));
      return;
    }
    if (structure === "weekly" && mode !== "flexible") {
      const empty = WEEK.filter((d) => !rows.some((r) => r.day === d));
      if (empty.length && !(await confirm(tr("{n} jour(s) de la semaine sont vides. Activer quand même ?", { n: empty.length })))) return;
    }
    const cleanDayNotes = Object.fromEntries(Object.entries(dayNotes).filter(([, v]) => (v ?? "").trim())) as Record<string, string>;
    setSaving(true);
    const res = await onCreate(
      name.trim() || (objective.trim() ? objective.trim().slice(0, 40) : tr("Plan nutrition")),
      mode,
      mode === "flexible" ? [] : meals,
      structure,
      objective.trim() || undefined,
      Object.keys(cleanDayNotes).length ? cleanDayNotes : undefined,
      socialNotes.trim() || undefined
    );
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone(true);
  }

  async function saveTemplate() {
    if (!saveAsTemplate || !templateForm) return;
    if (!templateForm.name.trim()) {
      setTemplateForm({ ...templateForm, error: tr("Donne un nom au modèle.") });
      return;
    }
    setTemplateForm({ ...templateForm, busy: true, error: null });
    const res = await saveAsTemplate(templateForm.name.trim(), mode, mealInputs(), structure, objective.trim() || undefined);
    setTemplateForm(res.error ? { ...templateForm, busy: false, error: res.error } : { ...templateForm, busy: false, ok: true });
    if (!res.error) setTimeout(() => setTemplateForm(null), 2000);
  }

  // Liste de courses de la semaine (option principale seulement).
  const shopping = useMemo(() => {
    const totals = new Map<string, { name: string; category: string; grams: number }>();
    const mult = structure === "weekly" ? 1 : 7;
    for (const r of rows) {
      if (r.variant > 1) continue;
      const f = foodById.get(r.foodId);
      const g = parseFloat(r.qty);
      if (!f || !g) continue;
      const e = totals.get(f.id) ?? { name: f.name, category: f.category ?? "Divers", grams: 0 };
      e.grams += g * mult;
      totals.set(f.id, e);
    }
    return [...totals.values()]
      .map((v) => ({ ...v, grams: Math.round(v.grams / 10) * 10 }))
      .sort((a, b) => (CATEGORY_ORDER.indexOf(a.category) + 1 || 999) - (CATEGORY_ORDER.indexOf(b.category) + 1 || 999) || a.name.localeCompare(b.name, "fr"));
  }, [rows, foodById, structure]);

  const microLogs = dayRows.filter((r) => r.variant === 1).map((r) => ({ foods: foodById.get(r.foodId) ?? null, quantity_g: parseFloat(r.qty) || 0 }));

  // Ctrl+S
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && !done) activate();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  if (done) {
    return (
      <div className="rounded-xl border border-green-500/40 bg-(--ep-okbg) px-4 py-6 text-center">
        <Check size={28} className="mx-auto text-green-400 mb-2" />
        <p className="text-sm font-bold text-(--ep-strong)">
          {self ? tr("Plan activé.") : tr("Plan activé. {name} a reçu une notification.", { name: firstName })}
        </p>
        <div className="mt-3 flex justify-center gap-4">
          <button type="button" onClick={() => setDone(false)} className="text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/60 hover:text-(--ep-strong)">
            {tr("Modifier encore")}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="text-[11px] font-bold uppercase tracking-widest text-(--ep-accent)">
              {tr("Fermer")}
            </button>
          )}
        </div>
      </div>
    );
  }

  const panel = !self ? (
    <NutritionContext clientName={clientName} intake={intake} socialNotes={socialNotes} onSocialNotes={setSocialNotes} />
  ) : null;
  const pct = (v: number, t: number) => (t > 0 ? Math.round((v / t) * 100) : 0);

  return (
    <div className={panel ? "lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-5" : ""}>
      {panel && (
        <aside className="hidden lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1 pb-6">{panel}</div>
        </aside>
      )}
      <div className="min-w-0 space-y-3">
        {/* Structure */}
        <div className="rounded-xl border border-(--ep-line)/35 bg-(--ep-s3) p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {panel && (
              <button
                type="button"
                onClick={() => setMobilePanel(true)}
                className="lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-(--ep-accent)/40 bg-(--ep-accent)/10 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-accent)"
              >
                <ClipboardList size={13} /> {tr("Fiche")} {firstName}
              </button>
            )}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr("Nom du plan (ex. Sèche, semaine 1)")}
              aria-label={tr("Nom du plan")}
              className="flex-1 min-w-[180px] bg-transparent text-lg font-black text-(--ep-strong) placeholder:text-(--ep-ink)/25 placeholder:font-semibold focus:outline-none border-b border-transparent focus:border-(--ep-accent)/50"
            />
            {templates.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTemplateMenu((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-(--ep-line)/40 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/60 hover:text-(--ep-strong)"
                >
                  <LayoutTemplate size={13} /> {tr("Partir d'un modèle")} <ChevronDown size={12} />
                </button>
                {templateMenu && (
                  <div className="absolute right-0 top-full mt-1 z-30 w-72 max-h-80 overflow-y-auto rounded-lg border border-(--ep-line)/50 bg-(--ep-s3) shadow-2xl py-1">
                    {templates.map((t) => (
                      <button key={t.id} type="button" onClick={() => loadTemplate(t)} className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-(--ep-line)/25">
                        <span className="font-semibold text-(--ep-strong)">{t.name}</span>
                        <span className="block text-[10.5px] text-(--ep-ink)/45">
                          {MODE_LABELS[t.mode]} · {t.diet_plan_template_meals.length} {tr("aliments")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex rounded-lg overflow-hidden border border-(--ep-line)/40" role="group" aria-label={tr("Mode")}>
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  title={tr(m.hint)}
                  onClick={() => setMode(m.key)}
                  aria-pressed={mode === m.key}
                  className={`px-2.5 h-8 text-[11.5px] font-semibold ${mode === m.key ? "bg-(--ep-accent) text-white" : "bg-(--ep-shade)/15 text-(--ep-ink)/60 hover:text-(--ep-strong)"}`}
                >
                  {tr(m.label)}
                </button>
              ))}
            </div>
            {mode !== "flexible" && (
              <div className="flex rounded-lg overflow-hidden border border-(--ep-line)/40" role="group" aria-label={tr("Structure")}>
                {(
                  [
                    ["daily", "Même chaque jour"],
                    ["weekly", "Jour par jour"],
                  ] as const
                ).map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => switchStructure(k)}
                    aria-pressed={structure === k}
                    className={`px-2.5 h-8 text-[11.5px] font-semibold ${structure === k ? "bg-(--ep-accent) text-white" : "bg-(--ep-shade)/15 text-(--ep-ink)/60 hover:text-(--ep-strong)"}`}
                  >
                    {tr(l)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-(--ep-ink)/45 -mt-1">{tr(MODES.find((m) => m.key === mode)!.hint)}</p>

          <input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder={tr("Objectif en une phrase (le client le voit), ex. Sèche douce, 400 kcal sous la maintenance")}
            aria-label={tr("Objectif du plan")}
            className="w-full bg-(--ep-shade)/10 border border-(--ep-line)/25 focus:border-(--ep-accent)/50 rounded-lg px-3 py-2 text-[12.5px] text-(--ep-strong) placeholder:text-(--ep-ink)/30 outline-none"
          />

          {mode !== "flexible" && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 mr-1">{tr("Repas")}</span>
              {MEAL_SLOTS.map((s) => {
                const on = shownSlots.some((x) => x.key === s.key);
                const locked = dayRows.some((r) => r.slot === s.key);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => !locked && setSlots((p) => (p.includes(s.key) ? p.filter((k) => k !== s.key) : [...p, s.key]))}
                    aria-pressed={on}
                    title={locked ? tr("Ce repas contient des aliments") : undefined}
                    className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${on ? "border-(--ep-accent) bg-(--ep-accent)/12 text-(--ep-strong)" : "border-(--ep-line)/30 text-(--ep-ink)/45 hover:text-(--ep-strong)"}`}
                  >
                    {tr(s.label)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cible et total du jour, toujours visible */}
        {mode !== "flexible" && (
          <div className="sticky top-0 z-20 rounded-xl border border-(--ep-line)/35 bg-(--ep-s1)/95 backdrop-blur px-3 py-2.5">
            <div className="grid grid-cols-4 gap-3">
              <MacroCoverage label={tr("Kcal")} current={dayTotals.calories} target={targets?.calories ?? 0} unit="" color="var(--ep-accent)" />
              <MacroCoverage label={tr("Prot.")} current={dayTotals.proteins} target={targets?.proteins ?? 0} unit="g" color="var(--ep-info)" />
              <MacroCoverage label={tr("Gluc.")} current={dayTotals.carbs} target={targets?.carbs ?? 0} unit="g" color="var(--ep-warn)" />
              <MacroCoverage label={tr("Lip.")} current={dayTotals.fats} target={targets?.fats ?? 0} unit="g" color="#fb7185" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
              {targets ? (
                <>
                  <button type="button" onClick={autoAdjust} disabled={!dayRows.length} className="inline-flex items-center gap-1 font-bold text-(--ep-accent) disabled:opacity-40">
                    <RefreshCw size={11} /> {tr("Ajuster les grammages sur la cible")}
                  </button>
                  <span className="text-(--ep-ink)/40">
                    {pct(dayTotals.calories, targets.calories)}% {tr("de la cible")}
                  </span>
                </>
              ) : (
                <span className="text-amber-300">{tr("Pas encore de cible macro.")}</span>
              )}
              {onEditTargets && (
                <button type="button" onClick={onEditTargets} className="font-semibold text-(--ep-ink)/50 hover:text-(--ep-strong) underline-offset-2 hover:underline">
                  {targets ? tr("Modifier la cible") : tr("Calculer la cible")}
                </button>
              )}
              {adjustMsg && <span className="text-(--ep-ink)/70">{adjustMsg}</span>}
            </div>
          </div>
        )}

        {mode === "flexible" ? (
          <div className="rounded-xl border border-(--ep-line)/30 bg-(--ep-s1) p-5 text-center text-[13px] text-(--ep-ink)/60">
            {tr("En mode Flexible, pas de repas à construire : {name} vise ses macros et logue ce qu'il mange.", { name: firstName })}
          </div>
        ) : (
          <>
            {structure === "weekly" && (
              <div className="flex flex-wrap items-center gap-1.5">
                {DAY_TABS.map((d) => {
                  const n = rows.filter((r) => r.day === d.key).length;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setActiveDay(d.key)}
                      aria-pressed={activeDay === d.key}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${activeDay === d.key ? "border-(--ep-accent) bg-(--ep-accent) text-white" : "border-(--ep-line)/30 text-(--ep-ink)/55"}`}
                    >
                      {d.label}
                      {n > 0 && <span className="ml-1 opacity-70">· {n}</span>}
                    </button>
                  );
                })}
                {activeDay !== "high" && (
                  <button type="button" onClick={copyDayToWeek} className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-(--ep-ink)/55 hover:text-(--ep-strong)">
                    <Copy size={12} /> {tr("Copier ce jour sur la semaine")}
                  </button>
                )}
                <input
                  value={dayNotes[activeDay] ?? ""}
                  onChange={(e) => setDayNotes((p) => ({ ...p, [activeDay]: e.target.value }))}
                  placeholder={tr("Note du jour (ex. jour de jambes, glucides plus hauts)")}
                  aria-label={tr("Note du jour")}
                  className="w-full mt-1 bg-transparent border-b border-(--ep-line)/25 focus:border-(--ep-accent)/50 px-1 py-1 text-[12px] text-(--ep-ink)/80 placeholder:text-(--ep-ink)/30 outline-none"
                />
              </div>
            )}

            {shownSlots.map((slot) => {
              const list = slotRows(slot.key);
              const st = sum(list);
              const draft = drafts[slot.key] ?? "";
              return (
                <section key={slot.key} className="rounded-xl border border-(--ep-line)/30 bg-(--ep-s5) overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-(--ep-s3) border-b border-(--ep-line)/20">
                    <p className="text-[13px] font-black uppercase tracking-wide text-(--ep-strong)">{tr(slot.label)}</p>
                    <p className="text-[11px] text-(--ep-ink)/50">
                      <b className="text-(--ep-strong)">{Math.round(st.calories)}</b> kcal · P {Math.round(st.proteins)} · G {Math.round(st.carbs)} · L {Math.round(st.fats)}
                    </p>
                  </div>
                  {isMobile ? (
                    <div className="divide-y divide-(--ep-line)/15">
                      {list.map((r) => {
                        const n = nutrientsOf(r);
                        const f = foodById.get(r.foodId);
                        const hits = f && hasWatch ? checkFoodWatch(f, watch) : [];
                        const alt = r.variant > 1;
                        return (
                          <div key={r.id} className={`px-3 py-2.5 ${alt ? "opacity-70" : ""}`}>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="flex items-center gap-1.5 text-[15px] font-semibold text-(--ep-strong)">
                                  {alt && <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-(--ep-shade)/20">{tr("ou")}</span>}
                                  <span className="truncate">{r.foodName}</span>
                                  {hits.length > 0 && <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />}
                                </p>
                                <p className="text-[12px] text-(--ep-ink)/55">
                                  {Math.round(n.calories)} kcal · P {Math.round(n.proteins)} · G {Math.round(n.carbs)} · L {Math.round(n.fats)}
                                </p>
                              </div>
                              <label className="flex items-center gap-1 flex-shrink-0">
                                <input
                                  data-dcell={`${slot.key}:${r.id}:qty`}
                                  value={r.qty}
                                  inputMode="decimal"
                                  onChange={(e) => patch(r.id, { qty: e.target.value.replace(",", ".").replace(/[^\d.]/g, "").slice(0, 5) })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      focusNext(slot.key);
                                    }
                                  }}
                                  aria-label={tr("Grammes")}
                                  className="w-20 h-11 rounded-lg bg-(--ep-shade)/15 border border-(--ep-line)/25 text-center text-[16px] font-bold text-(--ep-strong) outline-none focus:border-(--ep-accent)"
                                />
                                <span className="text-[12px] text-(--ep-ink)/50">g</span>
                              </label>
                              <button type="button" aria-label={tr("Autre choix")} onClick={() => patch(r.id, { variant: alt ? 1 : 2 })} className={`w-9 h-11 flex items-center justify-center ${alt ? "text-(--ep-accent)" : "text-(--ep-ink)/40"}`}>
                                <Shuffle size={16} />
                              </button>
                              <button type="button" aria-label={tr("Supprimer")} onClick={() => setRows((p) => p.filter((x) => x.id !== r.id))} className="w-9 h-11 flex items-center justify-center text-(--ep-ink)/40">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex items-center px-3 py-1.5">
                        <Plus size={15} className="text-(--ep-ink)/35 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <FoodCell
                            value={draft}
                            foods={foods}
                            watch={hasWatch ? watch : null}
                            hideIncompatibleDiet={watch.diet ?? null}
                            cellId={`${slot.key}:new:food`}
                            placeholder={tr("Ajouter un aliment…")}
                            onChange={(v) => setDrafts((d) => ({ ...d, [slot.key]: v }))}
                            onPick={(food) => addFood(slot.key, food)}
                            onNavKey={() => {}}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse table-fixed min-w-[640px]">
                      <colgroup>
                        <col />
                        <col style={{ width: 78 }} />
                        <col style={{ width: 58 }} />
                        <col style={{ width: 46 }} />
                        <col style={{ width: 46 }} />
                        <col style={{ width: 46 }} />
                        <col style={{ width: 170 }} />
                        <col style={{ width: 84 }} />
                      </colgroup>
                      <thead>
                        <tr className="text-[9.5px] font-bold uppercase tracking-widest text-(--ep-ink)/35">
                          <th className="text-left px-2 py-1">{tr("Aliment")}</th>
                          <th className="py-1">{tr("Grammes")}</th>
                          <th className="py-1">kcal</th>
                          <th className="py-1">P</th>
                          <th className="py-1">G</th>
                          <th className="py-1">L</th>
                          <th className="text-left px-2 py-1">{tr("Note")}</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r) => {
                          const n = nutrientsOf(r);
                          const f = foodById.get(r.foodId);
                          const hits = f && hasWatch ? checkFoodWatch(f, watch) : [];
                          const alt = r.variant > 1;
                          return (
                            <tr key={r.id} className={`group border-t border-(--ep-line)/15 ${alt ? "opacity-70" : ""}`}>
                              <td className="px-2 py-1.5">
                                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-(--ep-strong)">
                                  {alt && <span className="text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded bg-(--ep-shade)/20 text-(--ep-ink)/70">{tr("ou")}</span>}
                                  <span className="truncate" title={r.foodName}>{r.foodName}</span>
                                  {hits.length > 0 && (
                                    <span title={hits.join(", ")} className="text-amber-400 flex-shrink-0">
                                      <AlertTriangle size={12} />
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="p-0">
                                <input
                                  data-dcell={`${slot.key}:${r.id}:qty`}
                                  value={r.qty}
                                  inputMode="decimal"
                                  onChange={(e) => patch(r.id, { qty: e.target.value.replace(",", ".").replace(/[^\d.]/g, "").slice(0, 5) })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      focusNext(slot.key);
                                    }
                                  }}
                                  aria-label={tr("Grammes")}
                                  className="w-full bg-transparent text-center text-[13px] font-bold text-(--ep-strong) py-2 focus:outline-none focus:bg-(--ep-accent)/[0.07]"
                                />
                              </td>
                              <td className="text-center text-[12px] text-(--ep-ink)/70">{Math.round(n.calories)}</td>
                              <td className="text-center text-[12px] text-(--ep-ink)/60">{Math.round(n.proteins)}</td>
                              <td className="text-center text-[12px] text-(--ep-ink)/60">{Math.round(n.carbs)}</td>
                              <td className="text-center text-[12px] text-(--ep-ink)/60">{Math.round(n.fats)}</td>
                              <td className="p-0">
                                <input
                                  value={r.notes}
                                  onChange={(e) => patch(r.id, { notes: e.target.value })}
                                  placeholder=""
                                  aria-label={tr("Note")}
                                  className="w-full bg-transparent px-2 py-2 text-[12px] text-(--ep-ink)/75 focus:outline-none focus:bg-(--ep-accent)/[0.07]"
                                />
                              </td>
                              <td className="pr-1">
                                <div className="flex items-center justify-end gap-0.5">
                                  <button type="button" title={alt ? tr("Repasser en choix principal") : tr("Faire un autre choix pour ce repas (ou)")} aria-label={tr("Autre choix")} onClick={() => patch(r.id, { variant: alt ? 1 : 2 })} className={`p-1.5 rounded ${alt ? "text-(--ep-accent)" : "text-(--ep-ink)/30 hover:text-(--ep-strong)"}`}>
                                    <Shuffle size={12} />
                                  </button>
                                  {f?.category && (
                                    <button type="button" title={tr("Remplacer par un équivalent")} aria-label={tr("Remplacer")} onClick={() => swap(r)} className="p-1.5 rounded text-(--ep-ink)/30 hover:text-(--ep-strong)">
                                      <RefreshCw size={12} />
                                    </button>
                                  )}
                                  <button type="button" title={tr("Supprimer")} aria-label={tr("Supprimer")} onClick={() => setRows((p) => p.filter((x) => x.id !== r.id))} className="p-1.5 rounded text-(--ep-ink)/30 hover:text-red-400">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="border-t border-(--ep-line)/15">
                          <td className="p-0" colSpan={8}>
                            <div className="flex items-center">
                              <Plus size={13} className="ml-2 text-(--ep-ink)/30 flex-shrink-0" />
                              <FoodCell
                                value={draft}
                                foods={foods}
                                watch={hasWatch ? watch : null}
                                hideIncompatibleDiet={watch.diet ?? null}
                                cellId={`${slot.key}:new:food`}
                                placeholder={list.length ? tr("Ajouter un aliment…") : tr("Tape un aliment (ex. riz, poulet, flocons d'avoine)…")}
                                onChange={(v) => setDrafts((d) => ({ ...d, [slot.key]: v }))}
                                onPick={(food) => addFood(slot.key, food)}
                                onNavKey={() => {}}
                              />
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  )}
                </section>
              );
            })}
          </>
        )}

        {/* Courses + micronutriments */}
        {mode !== "flexible" && rows.length > 0 && (
          <div className="rounded-xl border border-(--ep-line)/25 bg-(--ep-s1)">
            <button type="button" onClick={() => setShowExtras((v) => !v)} aria-expanded={showExtras} className="w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/55">
              <ShoppingCart size={13} /> {tr("Liste de courses et micronutriments")}
              <ChevronDown size={13} className="ml-auto" style={{ transform: showExtras ? "rotate(180deg)" : undefined }} />
            </button>
            {showExtras && (
              <div className="px-3 pb-3 grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-1.5">{tr("Courses pour 7 jours")}</p>
                  {shopping.map((s) => (
                    <p key={s.name} className="flex justify-between text-[12px] py-0.5 border-b border-(--ep-line)/10">
                      <span className="text-(--ep-ink)/70">{s.name}</span>
                      <b className="text-(--ep-strong)">{s.grams >= 1000 ? `${(s.grams / 1000).toFixed(1)} kg` : `${s.grams} g`}</b>
                    </p>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-1.5">{tr("Micronutriments du jour affiché")}</p>
                  <MicroBarList logs={microLogs} foods={foods} />
                </div>
              </div>
            )}
          </div>
        )}

        {saveAsTemplate && rows.length > 0 && (
          <div>
            {templateForm ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-(--ep-line)/30 bg-(--ep-s1) p-2.5">
                {templateForm.ok ? (
                  <p className="text-[12px] font-bold text-green-400 inline-flex items-center gap-1.5">
                    <Check size={13} /> {tr("Modèle enregistré")}
                  </p>
                ) : (
                  <>
                    <input
                      autoFocus
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder={tr("Nom du modèle")}
                      aria-label={tr("Nom du modèle")}
                      className="flex-1 min-w-[160px] bg-(--ep-shade)/15 border border-(--ep-line)/30 rounded-md px-2.5 py-1.5 text-[12.5px] text-(--ep-strong) outline-none"
                    />
                    <button type="button" onClick={saveTemplate} disabled={templateForm.busy} className="rounded-md bg-(--ep-accent)/15 border border-(--ep-accent)/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-strong) disabled:opacity-50">
                      {templateForm.busy ? "…" : tr("Enregistrer")}
                    </button>
                    <button type="button" onClick={() => setTemplateForm(null)} aria-label={tr("Annuler")} className="p-1.5 text-(--ep-ink)/40">
                      <X size={14} />
                    </button>
                    {templateForm.error && <p className="w-full text-[11.5px] text-red-400">{templateForm.error}</p>}
                  </>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => setTemplateForm({ name, busy: false, ok: false, error: null })} className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45 hover:text-(--ep-strong)">
                <BookmarkPlus size={13} /> {tr("Enregistrer comme modèle réutilisable")}
              </button>
            )}
          </div>
        )}

        {/* Action */}
        <div className="sticky z-30 bottom-[calc(80px+env(safe-area-inset-bottom))] md:bottom-3">
          <div className="rounded-xl border border-(--ep-line)/45 bg-(--ep-s5)/95 backdrop-blur px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 shadow-2xl">
            {onClose && (
              <button type="button" onClick={onClose} className="text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/45 hover:text-(--ep-strong)">
                {tr("Annuler")}
              </button>
            )}
            <span className="text-[11px] text-(--ep-ink)/45 flex-1 min-w-[120px]">
              {rows.length} {tr("aliments")}
              {!self && ` · ${tr("{name} reçoit une notification", { name: firstName })}`}
            </span>
            <button type="button" onClick={activate} disabled={saving} title="Ctrl+S" className="inline-flex items-center gap-2 rounded-lg bg-(--ep-accent) hover:bg-(--ep-accent-2) disabled:opacity-60 px-4 py-2.5 text-[12px] font-black uppercase tracking-widest text-white">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {self ? tr("Activer") : tr("Activer pour {name}", { name: firstName })}
            </button>
            {error && (
              <p className="w-full inline-flex items-center gap-1.5 text-[12px] text-red-400">
                <AlertCircle size={13} /> {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {panel && mobilePanel && (
        <div className="lg:hidden fixed inset-0 z-[70] flex">
          <div className="absolute inset-0 bg-(--ep-shade)/70" onClick={() => setMobilePanel(false)} />
          <div className="relative ml-auto h-full w-[min(92vw,380px)] bg-(--ep-bg) border-l border-(--ep-line)/40 overflow-y-auto p-3 pt-[calc(env(safe-area-inset-top)+12px)]">
            <button type="button" onClick={() => setMobilePanel(false)} aria-label={tr("Fermer")} className="absolute top-[calc(env(safe-area-inset-top)+8px)] right-3 p-1.5 text-(--ep-ink)/50">
              <X size={18} />
            </button>
            {panel}
          </div>
        </div>
      )}
    </div>
  );
}

function NutritionContext({ clientName, intake, socialNotes, onSocialNotes }: { clientName: string; intake: ClientIntake | null; socialNotes: string; onSocialNotes: (v: string) => void }) {
  const tr = useT();
  const avoid = [
    intake?.allergens?.length ? { k: tr("Allergies"), v: intake.allergens.map((a) => ALLERGEN_LABELS[a]).join(", ") } : null,
    intake?.diet_type ? { k: tr("Régime"), v: DIET_LABELS[intake.diet_type] } : null,
    intake?.dietary_restrictions ? { k: tr("Restrictions"), v: intake.dietary_restrictions } : null,
    intake?.disliked_foods ? { k: tr("N'aime pas"), v: intake.disliked_foods } : null,
    intake?.health_issues ? { k: tr("Santé"), v: intake.health_issues } : null,
  ].filter(Boolean) as { k: string; v: string }[];
  const likes = [
    intake?.liked_foods ? { k: tr("Adore"), v: intake.liked_foods } : null,
    intake?.plan_preference ? { k: tr("Préférence"), v: intake.plan_preference === "fixe" ? tr("Plan fixe") : tr("Macros flexibles") } : null,
    intake?.calorie_preference ? { k: tr("Calories"), v: intake.calorie_preference === "lineaire" ? tr("Pareil tous les jours") : tr("Variables selon les jours") } : null,
  ].filter(Boolean) as { k: string; v: string }[];
  const habits = [
    intake?.goal_3_months ? { k: tr("Objectif 3 mois"), v: intake.goal_3_months } : null,
    intake?.meals_current || intake?.meals_ideal
      ? { k: tr("Repas par jour"), v: [intake?.meals_current ? `${intake.meals_current} ${tr("aujourd'hui")}` : null, intake?.meals_ideal ? `${intake.meals_ideal} ${tr("idéal")}` : null].filter(Boolean).join(" · ") }
      : null,
    intake?.known_calories ? { k: tr("Calories connues"), v: `${intake.known_calories} kcal` } : null,
    intake?.typical_day ? { k: tr("Journée type"), v: intake.typical_day } : null,
    intake?.work_hours ? { k: tr("Travail"), v: intake.work_hours } : null,
    intake?.cheat_meals_per_week != null ? { k: tr("Écarts / semaine"), v: String(intake.cheat_meals_per_week) } : null,
  ].filter(Boolean) as { k: string; v: string }[];
  return (
    <div className="space-y-2 text-[12px]">
      <p className="px-1 text-[10px] font-black uppercase tracking-widest text-(--ep-accent)">
        {tr("Nutrition de")} {clientName.split(" ")[0]}
      </p>
      {!intake && <p className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200">{tr("Pas encore d'onboarding rempli.")}</p>}
      {avoid.length > 0 && (
        <Section icon={<AlertTriangle size={12} />} title={tr("À éviter")} tone="danger" defaultOpen>
          <KV items={avoid} />
        </Section>
      )}
      {likes.length > 0 && (
        <Section icon={<Heart size={12} />} title={tr("Ce qu'il aime")} defaultOpen>
          <KV items={likes} />
        </Section>
      )}
      {habits.length > 0 && (
        <Section icon={<Utensils size={12} />} title={tr("Habitudes")} defaultOpen>
          <KV items={habits} />
        </Section>
      )}
      <Section icon={<StickyNote size={12} />} title={tr("Vie sociale, sorties")} defaultOpen>
        <textarea
          value={socialNotes}
          onChange={(e) => onSocialNotes(e.target.value)}
          rows={3}
          placeholder={tr("Ex. resto le vendredi, repas de famille le dimanche midi…")}
          aria-label={tr("Contraintes sociales")}
          className="w-full bg-(--ep-shade)/15 border border-(--ep-line)/25 focus:border-(--ep-accent)/50 rounded-md px-2 py-1.5 text-[12px] text-(--ep-strong) placeholder:text-(--ep-ink)/25 outline-none resize-y"
        />
      </Section>
      <p className="px-1 flex items-center gap-1 text-[10.5px] text-(--ep-ink)/35">
        <Apple size={11} /> {tr("Les aliments à surveiller sont signalés d'un triangle dans la recherche.")}
      </p>
    </div>
  );
}
