"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Lock,
  Shuffle,
  Sliders,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  AlertTriangle,
  LayoutTemplate,
  BookmarkPlus,
  Check,
  ExternalLink,
  Search,
} from "lucide-react";
import type { Food, DietPlanWithMeals, DietMode, DietStructure, DayOfWeek } from "@/utils/nutrition";
import { calculateNutrients } from "@/utils/nutrition-utils";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";
import type { DietPlanTemplateWithMeals } from "@/utils/diet-templates";
import type { ClientIntake } from "@/utils/client-intake";
import { buildWatchKeywords, matchesWatchKeyword } from "@/lib/food-watch-keywords";

export interface MacroTargets {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

// Barre de couverture d'un macro : ce que le plan en construction apporte
// par rapport à l'objectif fixé dans "Objectifs TDEE". C'est le repère qui
// manquait pour concevoir une diète en partant de la répartition macro au
// lieu d'empiler des aliments à l'aveugle et de compter à la fin.
function MacroCoverage({
  label,
  current,
  target,
  unit,
  color,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}) {
  const pct = target > 0 ? Math.min(150, (current / target) * 100) : 0;
  const delta = Math.round(target - current);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35">{label}</p>
        <p className="text-[10px] text-[#F5EDED]/35">
          <span className="font-black" style={{ color }}>{Math.round(current)}</span>
          {target > 0 ? ` / ${Math.round(target)}` : ""}{unit}
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-[#890404]/20 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {target > 0 && (
        <p className="text-[9px] mt-1 text-[#F5EDED]/30">
          {delta > 0 ? `Reste ${delta}${unit}` : delta < 0 ? `Dépasse de ${-delta}${unit}` : "Pile sur la cible"}
        </p>
      )}
    </div>
  );
}

export const MEAL_SLOTS = [
  { key: "breakfast", label: "Petit-déjeuner" },
  { key: "morning", label: "Collation matin" },
  { key: "lunch", label: "Déjeuner" },
  { key: "afternoon", label: "Collation après-midi" },
  { key: "preworkout", label: "Pré-entraînement" },
  { key: "postworkout", label: "Post-entraînement" },
  { key: "dinner", label: "Dîner" },
];

export const DAY_TABS: { key: DayOfWeek; label: string }[] = [
  { key: "lun", label: "Lun" },
  { key: "mar", label: "Mar" },
  { key: "mer", label: "Mer" },
  { key: "jeu", label: "Jeu" },
  { key: "ven", label: "Ven" },
  { key: "sam", label: "Sam" },
  { key: "dim", label: "Dim" },
  { key: "high", label: "🔥 High" },
];

const MODES: { key: DietMode; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "flexible", label: "Flexible", icon: Shuffle, desc: "Tu logues librement tes repas" },
  { key: "fixed", label: "Fixe", icon: Lock, desc: "Plan strict, coche chaque aliment au fil de la journée" },
  { key: "fixed_flexible", label: "Fixe Flexible", icon: Sliders, desc: "Plan avec swaps autorisés dans la même catégorie" },
];

export const MODE_LABELS: Record<DietMode, string> = {
  flexible: "Flexible",
  fixed: "Fixe",
  fixed_flexible: "Fixe flexible",
};

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

// ── Plan builder ──────────────────────────────────────────────────────────────

interface PlanMealRow {
  slotKey: string;
  foodId: string;
  foodName: string;
  quantityG: number;
  day: DayOfWeek | null;
}

export function PlanBuilder({
  foods,
  onCreate,
  intake,
  templates = [],
  targets = null,
  saveAsTemplate,
  templatesHref,
  subjectLabel = "ce client",
}: {
  foods: Food[];
  onCreate: (
    name: string,
    mode: DietMode,
    meals: DietPlanMealInput[],
    structure: DietStructure,
    objective?: string
  ) => Promise<void>;
  intake?: ClientIntake | null;
  /**
   * Modèles de diète du coach, proposés en point de départ : on charge la
   * structure de repas d'un modèle et on la personnalise immédiatement pour
   * ce client. Le modèle d'origine n'est jamais modifié.
   */
  templates?: DietPlanTemplateWithMeals[];
  /** Objectifs macro du client (onglet Objectifs TDEE) — repère de conception. */
  targets?: MacroTargets | null;
  /** Fournie, permet de capitaliser le plan sur mesure en modèle réutilisable. */
  saveAsTemplate?: (
    name: string,
    mode: DietMode,
    meals: DietPlanMealInput[],
    structure: DietStructure,
    objective?: string
  ) => Promise<{ error?: string; id?: string }>;
  templatesHref?: string;
  subjectLabel?: string;
}) {
  const [planName, setPlanName] = useState("");
  const [objective, setObjective] = useState("");
  const [mode, setMode] = useState<DietMode>("fixed");
  const [structure, setStructure] = useState<DietStructure>("daily");
  const [activeDay, setActiveDay] = useState<DayOfWeek>("lun");
  const [meals, setMeals] = useState<PlanMealRow[]>([]);
  const [addingToSlot, setAddingToSlot] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState("100");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [showStartingPoint, setShowStartingPoint] = useState(false);
  const [loadedTemplateName, setLoadedTemplateName] = useState<string | null>(null);

  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const currentDay = structure === "weekly" ? activeDay : null;

  const watchKeywords = useMemo(() => buildWatchKeywords(intake), [intake]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return foods.slice(0, 30);
    return foods
      .filter((f) => f.name.toLowerCase().includes(q) || (f.category ?? "").toLowerCase().includes(q))
      .slice(0, 30);
  }, [foods, search]);

  const dayMeals = useMemo(
    () => meals.filter((m) => m.day === currentDay),
    [meals, currentDay]
  );

  const planTotals = useMemo(() => {
    return dayMeals.reduce(
      (acc, m) => {
        const food = foods.find((f) => f.id === m.foodId);
        if (!food) return acc;
        const n = calculateNutrients(food, m.quantityG);
        return {
          calories: acc.calories + n.calories,
          proteins: acc.proteins + n.proteins,
          carbs: acc.carbs + n.carbs,
          fats: acc.fats + n.fats,
        };
      },
      { calories: 0, proteins: 0, carbs: 0, fats: 0 }
    );
  }, [dayMeals, foods]);

  // Macros apportées par un créneau du jour affiché — permet de raisonner
  // repas par repas ("mon petit-déj couvre 40 g de protéines") au lieu de ne
  // voir que le total de fin de journée.
  function slotTotals(slotKey: string) {
    return dayMeals
      .filter((m) => m.slotKey === slotKey)
      .reduce(
        (acc, m) => {
          const food = foods.find((f) => f.id === m.foodId);
          if (!food) return acc;
          const n = calculateNutrients(food, m.quantityG);
          return {
            calories: acc.calories + n.calories,
            proteins: acc.proteins + n.proteins,
            carbs: acc.carbs + n.carbs,
            fats: acc.fats + n.fats,
          };
        },
        { calories: 0, proteins: 0, carbs: 0, fats: 0 }
      );
  }

  function addMeal() {
    if (!selectedFood || !addingToSlot) return;
    const q = parseFloat(qty);
    if (isNaN(q) || q <= 0) return;

    setMeals((prev) => [
      ...prev,
      {
        slotKey: addingToSlot,
        foodId: selectedFood.id,
        foodName: selectedFood.name,
        quantityG: q,
        day: currentDay,
      },
    ]);
    setAddingToSlot(null);
    setSelectedFood(null);
    setSearch("");
    setQty("100");
  }

  // Charge un modèle de diète dans le constructeur : copie de travail
  // entièrement modifiable pour ce client, le modèle n'est jamais touché.
  function loadTemplate(template: DietPlanTemplateWithMeals) {
    if (
      meals.length > 0 &&
      !confirm(`Charger « ${template.name} » va remplacer les repas en cours de construction. Continuer ?`)
    ) {
      return;
    }
    setPlanName((n) => n.trim() || template.name);
    setObjective((o) => o.trim() || template.objective || "");
    setMode(template.mode);
    setStructure(template.structure);
    setMeals(
      template.diet_plan_template_meals.map((m) => ({
        slotKey: m.meal_slot,
        foodId: m.food_id,
        foodName: m.foods?.name ?? foods.find((f) => f.id === m.food_id)?.name ?? "Aliment",
        quantityG: m.quantity_g,
        day: m.day_of_week,
      }))
    );
    setLoadedTemplateName(template.name);
    setShowStartingPoint(false);
  }

  function buildMealInputs(): DietPlanMealInput[] {
    return meals.map((m, i) => ({
      meal_slot: m.slotKey,
      food_id: m.foodId,
      quantity_g: m.quantityG,
      position: i,
      day_of_week: m.day,
    }));
  }

  async function handleSaveAsTemplate() {
    if (!saveAsTemplate) return;
    const name = templateName.trim() || planName.trim();
    if (!name) { setTemplateError("Donne un nom au modèle."); return; }
    setTemplateError(null);
    setTemplateBusy(true);
    const result = await saveAsTemplate(name, mode, buildMealInputs(), structure, objective.trim() || undefined);
    setTemplateBusy(false);
    if (result.error) { setTemplateError(result.error); return; }
    setTemplateSaved(true);
    setTemplateFormOpen(false);
    setTimeout(() => setTemplateSaved(false), 4000);
  }

  async function handleSave() {
    if (!planName.trim()) { setError("Nom du plan requis."); return; }
    setSaving(true);
    setError(null);
    await onCreate(planName.trim(), mode, buildMealInputs(), structure, objective.trim() || undefined);
    setSaving(false);
    setSuccess(true);
    setPlanName("");
    setObjective("");
    setMeals([]);
    setLoadedTemplateName(null);
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <CheckCircle2 size={40} className="text-green-400" />
        <p className="text-sm font-bold text-white">Plan activé avec succès !</p>
        <button onClick={() => setSuccess(false)} className="text-xs text-[#E01E1E] hover:underline">
          Créer un autre plan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── 0. Point de départ ────────────────────────────────────────────── */}
      {(templates.length > 0 || templatesHref) && (
        <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
              Point de départ <span className="text-[#F5EDED]/20 font-normal normal-case tracking-normal">(optionnel)</span>
            </p>
            {templates.length > 0 && (
              <button
                onClick={() => setShowStartingPoint((v) => !v)}
                className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors flex-shrink-0"
              >
                {showStartingPoint ? "Masquer" : `Voir mes ${templates.length} modèle${templates.length !== 1 ? "s" : ""}`}
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#F5EDED]/30 leading-relaxed">
            Pars d&apos;un de tes modèles de diète et ajuste le pour {subjectLabel}, ou construis tout sur mesure
            ci dessous.
          </p>

          {loadedTemplateName && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] bg-[#E01E1E]/10 border border-[#E01E1E]/30 rounded-lg px-3 py-1.5">
              <Check size={11} />
              Chargé depuis « {loadedTemplateName} », ajuste librement
            </p>
          )}

          {showStartingPoint && templates.length > 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => loadTemplate(t)}
                  className="text-left bg-[#150000] border border-[#890404]/25 hover:border-[#E01E1E]/45 rounded-xl px-4 py-3 transition-colors group"
                >
                  <p className="text-sm font-bold text-white leading-tight">{t.name}</p>
                  {t.objective && <p className="text-[11px] text-[#F5EDED]/40 mt-1">{t.objective}</p>}
                  <p className="text-[10px] text-[#F5EDED]/25 mt-1.5">
                    {MODE_LABELS[t.mode]}
                    {t.structure === "weekly" ? " · hebdo" : ""} · {t.diet_plan_template_meals.length} aliment
                    {t.diet_plan_template_meals.length !== 1 ? "s" : ""}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 group-hover:text-[#E01E1E] transition-colors">
                    <LayoutTemplate size={11} />
                    Charger et personnaliser
                  </span>
                </button>
              ))}
            </div>
          )}

          {templatesHref && (
            <Link
              href={templatesHref}
              className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/70 transition-colors"
            >
              <ExternalLink size={11} />
              Gérer la bibliothèque de modèles
            </Link>
          )}
        </div>
      )}

      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
        1. Objectif &amp; structure
      </p>

      {/* Plan name + mode */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Nom du plan
          </label>
          <input
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="Ex. Prise de masse semaine 1"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Mode
          </label>
          <div className="flex gap-2">
            {MODES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-colors ${
                  mode === key
                    ? "bg-[#E01E1E]/15 border-[#E01E1E]/40 text-[#E01E1E]"
                    : "bg-[#1f0101] border-[#890404]/20 text-[#F5EDED]/30 hover:border-[#890404]/40"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#F5EDED]/30 mt-1.5">
            {MODES.find((m) => m.key === mode)?.desc}
          </p>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
          Objectif du plan <span className="text-[#F5EDED]/25 font-normal">(optionnel)</span>
        </label>
        <input
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Ex. Sèche progressive, 400 kcal sous la maintenance, protéines hautes"
          className={inputCls}
        />
      </div>

      {/* Structure: daily (simple) vs weekly (different days, optional) */}
      {mode !== "flexible" && (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Structure <span className="text-[#F5EDED]/25 font-normal">(optionnel)</span>
          </label>
          <div className="flex gap-2 mb-2">
            {[
              { key: "daily" as const, label: "Journalier", desc: "Mêmes repas chaque jour" },
              { key: "weekly" as const, label: "Hebdomadaire", desc: "Repas différents par jour + jour high" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStructure(key)}
                className={`flex-1 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  structure === key
                    ? "bg-[#E01E1E]/15 border-[#E01E1E]/40 text-[#E01E1E]"
                    : "bg-[#1f0101] border-[#890404]/20 text-[#F5EDED]/30 hover:border-[#890404]/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#F5EDED]/30">
            {structure === "weekly"
              ? "Construis chaque jour séparément, utile pour des jours \"on\"/\"off\" ou un jour de recharge glucidique."
              : "Un seul jour-type, répété tous les jours."}
          </p>
        </div>
      )}

      {/* Day tabs — only in weekly structure */}
      {mode !== "flexible" && structure === "weekly" && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {DAY_TABS.map((d) => {
            const count = meals.filter((m) => m.day === d.key).length;
            return (
              <button
                key={d.key}
                onClick={() => setActiveDay(d.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  activeDay === d.key
                    ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]"
                    : "border-[#890404]/25 text-[#F5EDED]/40"
                }`}
              >
                {d.label}
                {count > 0 && <span className="ml-1 opacity-60">· {count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Mode flexible: no meals needed */}
      {mode === "flexible" && (
        <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-5 text-center">
          <p className="text-xs text-[#F5EDED]/40">
            En mode Flexible, tu logues librement tes repas, aucun plan prédéfini nécessaire.
          </p>
        </div>
      )}

      {/* Répartition macro : la cible d'abord, le détail des aliments ensuite */}
      {mode !== "flexible" && (
        <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            Répartition macro
            {structure === "weekly" ? ` · ${DAY_TABS.find((d) => d.key === activeDay)?.label}` : ""}
            {!targets && (
              <span className="ml-2 font-normal normal-case tracking-normal text-[#F5EDED]/25">
                aucune cible définie, remplis l&apos;onglet Objectifs TDEE pour piloter au macro près
              </span>
            )}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MacroCoverage label="Calories" current={planTotals.calories} target={targets?.calories ?? 0} unit=" kcal" color="#E01E1E" />
            <MacroCoverage label="Protéines" current={planTotals.proteins} target={targets?.proteins ?? 0} unit="g" color="#60a5fa" />
            <MacroCoverage label="Glucides" current={planTotals.carbs} target={targets?.carbs ?? 0} unit="g" color="#fbbf24" />
            <MacroCoverage label="Lipides" current={planTotals.fats} target={targets?.fats ?? 0} unit="g" color="#fb7185" />
          </div>
        </div>
      )}

      {/* Meal slots for fixed modes */}
      {mode !== "flexible" && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
            2. Détail des repas
          </p>
          <div className="space-y-3">
            {MEAL_SLOTS.map((slot) => {
              const slotMeals = dayMeals.filter((m) => m.slotKey === slot.key);
              const st = slotTotals(slot.key);
              return (
                <div key={slot.key} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#F5EDED]/70">
                        {slot.label}
                      </p>
                      {slotMeals.length > 0 && (
                        <p className="text-[10px] text-[#F5EDED]/35 mt-0.5">
                          {Math.round(st.calories)} kcal · P {Math.round(st.proteins)}g · G {Math.round(st.carbs)}g · L{" "}
                          {Math.round(st.fats)}g
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setAddingToSlot(slot.key);
                        setSelectedFood(null);
                        setSearch("");
                        setQty("100");
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#E01E1E] hover:text-[#ff4444] transition-colors"
                    >
                      <Plus size={11} /> Ajouter
                    </button>
                  </div>
                  {slotMeals.length === 0 ? (
                    <p className="text-[10px] text-[#F5EDED]/20 italic">Aucun aliment</p>
                  ) : (
                    <div className="space-y-1">
                      {slotMeals.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-1 border-b border-[#890404]/10 last:border-0"
                        >
                          <div>
                            <p className="text-xs text-white">{m.foodName}</p>
                            <p className="text-[10px] text-[#F5EDED]/35">{m.quantityG}g</p>
                          </div>
                          <button
                            onClick={() =>
                              setMeals((prev) =>
                                prev.filter(
                                  (meal) =>
                                    !(
                                      meal.slotKey === m.slotKey &&
                                      meal.foodId === m.foodId &&
                                      meal.quantityG === m.quantityG &&
                                      meal.day === m.day
                                    )
                                )
                              )
                            }
                            className="text-[#F5EDED]/20 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </>
      )}

      {/* Capitaliser ce plan sur mesure en modèle réutilisable */}
      {saveAsTemplate && (
        <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl p-4">
          {templateSaved ? (
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-green-400">
              <Check size={13} />
              Modèle enregistré dans ta bibliothèque
            </p>
          ) : templateFormOpen ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                  Nom du modèle
                </label>
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={planName || "Ex. Sèche 2000 kcal, 4 repas"}
                  className={inputCls}
                />
              </div>
              {templateError && <p className="text-xs text-red-400">{templateError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setTemplateFormOpen(false); setTemplateError(null); }}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest border border-[#890404]/40 rounded-lg text-[#F5EDED]/50 hover:text-[#F5EDED]/80 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveAsTemplate}
                  disabled={templateBusy}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest bg-[#E01E1E]/15 border border-[#E01E1E]/40 rounded-lg text-[#E01E1E] hover:bg-[#E01E1E]/25 disabled:opacity-50 transition-colors"
                >
                  {templateBusy ? "Enregistrement…" : "Enregistrer le modèle"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-[#F5EDED]/35 leading-relaxed max-w-md">
                Cette structure de repas te resservira ? Enregistre la comme modèle réutilisable, sans quitter
                cette page.
              </p>
              <button
                onClick={() => { setTemplateName(planName); setTemplateFormOpen(true); }}
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors flex-shrink-0"
              >
                <BookmarkPlus size={12} />
                Enregistrer comme modèle
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-xl disabled:opacity-50 transition-colors"
      >
        {saving ? "Activation…" : "Activer ce plan"}
      </button>

      {/* Food search modal */}
      {addingToSlot && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setAddingToSlot(null)} />
          <div className="relative w-full sm:max-w-md bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col z-10">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#890404]/20 flex-shrink-0">
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                {selectedFood ? selectedFood.name : MEAL_SLOTS.find((s) => s.key === addingToSlot)?.label}
              </p>
              <button onClick={() => setAddingToSlot(null)} className="text-[#F5EDED]/40 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {!selectedFood ? (
              <>
                {watchKeywords.length > 0 && (
                  <div className="mx-5 mt-3 mb-1 flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 flex-shrink-0">
                    <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10.5px] text-amber-300/90 leading-relaxed">
                      À vérifier pour ce client : {watchKeywords.join(", ")}
                    </p>
                  </div>
                )}
                <div className="px-5 py-3 flex-shrink-0">
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un aliment…"
                    className={inputCls}
                  />
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2">
                  {filtered.length === 0 && (
                    <div className="px-3 py-8 flex flex-col items-center gap-2 text-center">
                      <Search size={18} className="text-[#F5EDED]/15" strokeWidth={1.5} />
                      <p className="text-xs text-[#F5EDED]/35 leading-relaxed">
                        Aucun aliment ne correspond à
                        <span className="text-white font-bold"> « {search.trim()} »</span>.
                        <br />
                        Essaie un autre terme, ou ajoute le à la bibliothèque d&apos;aliments.
                      </p>
                    </div>
                  )}
                  {filtered.map((food) => {
                    const watchHit = watchKeywords.length > 0 ? matchesWatchKeyword(food.name, watchKeywords) : null;
                    return (
                      <button
                        key={food.id}
                        onClick={() => { setSelectedFood(food); setQty("100"); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#1f0101] rounded-lg transition-colors"
                      >
                        <p className="text-sm text-white font-medium flex items-center gap-1.5">
                          {food.name}
                          {watchHit && <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />}
                        </p>
                        <p className="text-[10px] text-[#F5EDED]/35">
                          {food.calories_per_100} kcal/100g · P {food.proteins_per_100}g
                          {watchHit && <span className="text-amber-400/80"> · à vérifier ({watchHit})</span>}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="px-5 py-4 flex flex-col gap-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                    Quantité (g)
                  </label>
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className={inputCls}
                  />
                </div>
                {qty && parseFloat(qty) > 0 && (
                  <div className="bg-[#1f0101] rounded-lg p-3 flex gap-4 text-xs">
                    {(() => {
                      const n = calculateNutrients(selectedFood, parseFloat(qty));
                      return (
                        <>
                          <div>
                            <p className="text-[#E01E1E] font-black text-base">{Math.round(n.calories)}</p>
                            <p className="text-[#F5EDED]/40 text-[9px]">kcal</p>
                          </div>
                          <div>
                            <p className="text-blue-300 font-bold">{Math.round(n.proteins)}g</p>
                            <p className="text-[#F5EDED]/40 text-[9px]">Prot.</p>
                          </div>
                          <div>
                            <p className="text-amber-300 font-bold">{Math.round(n.carbs)}g</p>
                            <p className="text-[#F5EDED]/40 text-[9px]">Gluc.</p>
                          </div>
                          <div>
                            <p className="text-rose-300 font-bold">{Math.round(n.fats)}g</p>
                            <p className="text-[#F5EDED]/40 text-[9px]">Lip.</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedFood(null)}
                    className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 rounded-lg text-[#F5EDED]/60"
                  >
                    Retour
                  </button>
                  <button
                    onClick={addMeal}
                    className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest bg-[#E01E1E] text-white rounded-lg"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Plans list ────────────────────────────────────────────────────────────────

function PlanDetailRow({
  plan,
  foods,
  onActivate,
  onDeactivate,
  onDelete,
}: {
  plan: DietPlanWithMeals;
  foods: Food[];
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const isWeekly = plan.structure === "weekly";
  const firstDayWithMeals = plan.diet_plan_meals.find((m) => m.day_of_week)?.day_of_week ?? "lun";
  const [viewDay, setViewDay] = useState<DayOfWeek>(firstDayWithMeals);

  const visibleMeals = useMemo(
    () => (isWeekly ? plan.diet_plan_meals.filter((m) => m.day_of_week === viewDay) : plan.diet_plan_meals),
    [plan.diet_plan_meals, isWeekly, viewDay]
  );

  const bySlot = useMemo(() => {
    const map: Record<string, typeof plan.diet_plan_meals> = {};
    for (const m of visibleMeals) {
      if (!map[m.meal_slot]) map[m.meal_slot] = [];
      map[m.meal_slot].push(m);
    }
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.position - b.position);
    return map;
  }, [visibleMeals, plan]);

  const totals = useMemo(() => {
    return visibleMeals.reduce(
      (acc, m) => {
        const food = m.foods ?? foods.find((f) => f.id === m.food_id);
        if (!food) return acc;
        const n = calculateNutrients(food, m.quantity_g);
        return {
          calories: acc.calories + n.calories,
          proteins: acc.proteins + n.proteins,
          carbs: acc.carbs + n.carbs,
          fats: acc.fats + n.fats,
        };
      },
      { calories: 0, proteins: 0, carbs: 0, fats: 0 }
    );
  }, [visibleMeals, foods]);

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        plan.is_active ? "border-[#E01E1E]/40 bg-[#1f0101]" : "border-[#890404]/20 bg-[#150000]"
      }`}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {plan.is_active && <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{plan.name}</p>
            <p className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest">
              {plan.mode} {isWeekly && "· hebdo"} · {plan.diet_plan_meals.length} aliment{plan.diet_plan_meals.length !== 1 ? "s" : ""} ·{" "}
              {new Date(plan.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-[#F5EDED]/30 flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-[#F5EDED]/30 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#890404]/15 pt-3 space-y-3">
          {isWeekly && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {DAY_TABS.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setViewDay(d.key)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest transition-colors ${
                    viewDay === d.key
                      ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]"
                      : "border-[#890404]/25 text-[#F5EDED]/35"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
          {plan.diet_plan_meals.length === 0 ? (
            <p className="text-[10px] text-[#F5EDED]/25 italic">Plan flexible, aucun aliment prédéfini.</p>
          ) : visibleMeals.length === 0 ? (
            <p className="text-[10px] text-[#F5EDED]/25 italic">Aucun aliment pour ce jour.</p>
          ) : (
            <>
              {MEAL_SLOTS.filter((slot) => bySlot[slot.key]?.length).map((slot) => (
                <div key={slot.key}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5">
                    {slot.label}
                  </p>
                  <div className="space-y-1">
                    {bySlot[slot.key].map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-1">
                        <p className="text-xs text-white">{m.foods?.name ?? "Aliment"}</p>
                        <p className="text-[10px] text-[#F5EDED]/35">{m.quantity_g}g</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex gap-4 pt-2 border-t border-[#890404]/15 text-xs">
                <span className="text-[#E01E1E] font-black">{Math.round(totals.calories)} kcal</span>
                <span className="text-blue-300">P {Math.round(totals.proteins)}g</span>
                <span className="text-amber-300">G {Math.round(totals.carbs)}g</span>
                <span className="text-rose-300">L {Math.round(totals.fats)}g</span>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            {plan.is_active ? (
              <button
                disabled={busy}
                onClick={async () => { setBusy(true); await onDeactivate(); setBusy(false); }}
                className="flex-1 py-2 text-[10px] font-bold uppercase tracking-widest border border-[#890404]/40 rounded-lg text-[#F5EDED]/60 hover:text-[#F5EDED]/80 transition-colors disabled:opacity-50"
              >
                Désactiver
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={async () => { setBusy(true); await onActivate(); setBusy(false); }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-widest bg-[#E01E1E]/15 border border-[#E01E1E]/40 rounded-lg text-[#E01E1E] hover:bg-[#E01E1E]/25 transition-colors disabled:opacity-50"
              >
                <PlayCircle size={12} /> Activer
              </button>
            )}
            <button
              disabled={busy}
              onClick={async () => {
                if (!confirm("Supprimer ce plan définitivement ?")) return;
                setBusy(true);
                await onDelete();
                setBusy(false);
              }}
              className="px-3 py-2 text-[#F5EDED]/30 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PlansListView({
  plans,
  foods,
  onActivate,
  onDeactivate,
  onDelete,
}: {
  plans: DietPlanWithMeals[];
  foods: Food[];
  onActivate: (planId: string) => Promise<void>;
  onDeactivate: (planId: string) => Promise<void>;
  onDelete: (planId: string) => Promise<void>;
}) {
  if (plans.length === 0) {
    return (
      <p className="text-xs text-[#F5EDED]/25 italic text-center py-6">
        Aucun plan créé pour l&apos;instant.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {plans.map((plan) => (
        <PlanDetailRow
          key={plan.id}
          plan={plan}
          foods={foods}
          onActivate={() => onActivate(plan.id)}
          onDeactivate={() => onDeactivate(plan.id)}
          onDelete={() => onDelete(plan.id)}
        />
      ))}
    </div>
  );
}
