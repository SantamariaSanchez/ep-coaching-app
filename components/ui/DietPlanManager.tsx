"use client";

import { useState, useMemo, useEffect } from "react";
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
  ClipboardCheck,
  ShoppingCart,
  RefreshCw,
} from "lucide-react";
import type { Food, DietPlanWithMeals, DietMode, DietStructure, DayOfWeek } from "@/utils/nutrition";
import { calculateNutrients } from "@/utils/nutrition-utils";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";
import type { DietPlanTemplateWithMeals } from "@/utils/diet-templates";
import type { ClientIntake } from "@/utils/client-intake";
import { buildFoodWatchContext, hasFoodWatchContext, summarizeFoodWatchContext, checkFoodWatch } from "@/lib/food-watch-keywords";
import { CATEGORY_ORDER } from "@/lib/shopping-list";
import { updateFoodPrepNotes } from "@/app/dashboard/client/nutrition/actions";
import { findFoodSwapCandidate } from "@/lib/food-swap";
import type { RoadmapWithData } from "@/utils/roadmap";
import PhaseHeader from "./PhaseHeader";
import RoadmapContextPanel from "./RoadmapContextPanel";
import MicroBarList from "./MicroBarList";

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

// ── Auto-ajustement des grammages sur une cible macro ───────────────────
// Plutôt que de faire varier chaque aliment à la main jusqu'à tomber juste
// (essai-erreur), on répartit les aliments du jour en 3 groupes selon leur
// macro dominante (protéine/glucide/lipide, celle qui pèse le plus lourd en
// kcal dans l'aliment), puis on résout un système 3x3 : un facteur d'échelle
// par groupe, tel que la somme des 3 groupes tombe exactement sur la cible
// protéines/glucides/lipides (les calories en découlent, 4/4/9 kcal par g).
// Le detail item par item DANS un groupe garde ses proportions relatives
// (un groupe scale d'un seul facteur, pas item par item), ce qui préserve
// l'équilibre du repas tel que le coach l'a construit plutôt que de
// réinventer la diète.
type MacroGroup = "proteins" | "carbs" | "fats";

function dominantMacroGroup(food: Food): MacroGroup {
  const pKcal = (food.proteins_per_100 ?? 0) * 4;
  const cKcal = (food.carbs_per_100 ?? 0) * 4;
  const fKcal = (food.fats_per_100 ?? 0) * 9;
  if (pKcal >= cKcal && pKcal >= fKcal) return "proteins";
  if (cKcal >= fKcal) return "carbs";
  return "fats";
}

// Résolution d'un système linéaire 3x3 par la règle de Cramer — overkill
// pour un solveur générique, largement suffisant ici (3 inconnues fixes).
function solve3x3(A: number[][], b: number[]): number[] | null {
  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(A);
  if (Math.abs(d) < 1e-9) return null;
  const withCol = (col: number) => A.map((row, i) => row.map((v, j) => (j === col ? b[i] : v)));
  return [det(withCol(0)) / d, det(withCol(1)) / d, det(withCol(2)) / d];
}

const AUTO_ADJUST_MIN_SCALE = 0.2; // jamais moins d'1/5 de la quantité d'origine
const AUTO_ADJUST_MAX_SCALE = 4; // jamais plus de x4 — au delà, il manque un aliment dans le repas, pas un facteur d'échelle

/**
 * Renvoie les nouvelles quantités (localId -> grammes, arrondi à 5g près)
 * pour que les repas du jour visé collent à `targets`. `null` si le système
 * n'est pas résoluble (ex. un seul groupe macro présent) — dans ce cas
 * mieux vaut ne rien changer que produire un résultat aberrant.
 */
function autoAdjustQuantities(
  dayMeals: PlanMealRow[],
  foods: Food[],
  targets: MacroTargets
): Record<string, number> | null {
  const groups: Record<MacroGroup, { rows: PlanMealRow[]; p: number; c: number; f: number }> = {
    proteins: { rows: [], p: 0, c: 0, f: 0 },
    carbs: { rows: [], p: 0, c: 0, f: 0 },
    fats: { rows: [], p: 0, c: 0, f: 0 },
  };

  for (const m of dayMeals) {
    const food = foods.find((f) => f.id === m.foodId);
    if (!food) continue;
    const group = groups[dominantMacroGroup(food)];
    const n = calculateNutrients(food, m.quantityG);
    group.rows.push(m);
    group.p += n.proteins;
    group.c += n.carbs;
    group.f += n.fats;
  }

  const order: MacroGroup[] = ["proteins", "carbs", "fats"];
  // Ligne = équation macro (protéines puis glucides puis lipides), colonne
  // = groupe (protéines puis glucides puis lipides).
  const A: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  (["p", "c", "f"] as const).forEach((macroKey, i) => {
    order.forEach((group, j) => {
      A[i][j] = groups[group][macroKey];
    });
  });
  const b = [targets.proteins, targets.carbs, targets.fats];

  const solved = solve3x3(A, b);
  if (!solved) return null;

  const result: Record<string, number> = {};
  order.forEach((group, i) => {
    const rawScale = solved[i];
    if (groups[group].rows.length === 0) return; // rien à mettre à l'échelle dans ce groupe
    const scale = Number.isFinite(rawScale)
      ? Math.max(AUTO_ADJUST_MIN_SCALE, Math.min(AUTO_ADJUST_MAX_SCALE, rawScale))
      : 1;
    for (const row of groups[group].rows) {
      result[row.localId] = Math.max(5, Math.round((row.quantityG * scale) / 5) * 5);
    }
  });

  return result;
}

// ── Contexte nutritionnel ────────────────────────────────────────────────
// Avant de raisonner en macros : pourquoi CE total calorique pour CE client
// précis ? Un chiffre sorti d'une formule (Mifflin-St Jeor + activité) ne
// dit rien de son appétit réel, de son stress, de ses habitudes déjà en
// place — les mêmes 1800 kcal sont réalistes pour l'un et intenables pour
// l'autre. Ce panneau met ces signaux sous les yeux avant la conception,
// pas une checklist à part : des observations concrètes tirées de la fiche
// client, jamais une recommandation calculée à sa place.
function NutritionalContextPanel({ intake }: { intake: ClientIntake | null }) {
  if (!intake) {
    return (
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Contexte nutritionnel
        </p>
        <p className="text-[11px] text-[#F5EDED]/30">
          Fiche client absente, impossible de raisonner appétit/stress/habitudes sans elle.
        </p>
      </div>
    );
  }

  const signals: { label: string; value: string; flag?: boolean }[] = [];
  if (intake.stress_level != null) {
    signals.push({
      label: "Niveau de stress",
      value: `${intake.stress_level}/10${intake.stress_level >= 7 ? " (élevé)" : ""}`,
      flag: intake.stress_level >= 7,
    });
  }
  if (intake.sleep_quality != null) {
    signals.push({
      label: "Qualité du sommeil",
      value: `${intake.sleep_quality}/10${intake.sleep_quality <= 4 ? " (faible)" : ""}`,
      flag: intake.sleep_quality <= 4,
    });
  }
  if (intake.sleep_hours != null) {
    signals.push({ label: "Sommeil", value: `${intake.sleep_hours}h/nuit en moyenne`, flag: intake.sleep_hours < 6.5 });
  }
  if (intake.meals_current != null || intake.meals_ideal != null) {
    signals.push({
      label: "Nombre de repas",
      value: `${intake.meals_current ?? "?"} actuellement${intake.meals_ideal != null ? `, ${intake.meals_ideal} visés` : ""}`,
    });
  }
  if (intake.cheat_meals_per_week != null) {
    signals.push({
      label: "Écarts/semaine",
      value: `${intake.cheat_meals_per_week}${intake.cheat_meal_impact ? ` (${intake.cheat_meal_impact})` : ""}`,
    });
  }
  if (intake.known_calories != null) {
    signals.push({
      label: "Apport actuel connu",
      value: `~${intake.known_calories} kcal${intake.known_protein ? ` · P ${intake.known_protein}g` : ""}${intake.known_carbs ? ` · G ${intake.known_carbs}g` : ""}${intake.known_fat ? ` · L ${intake.known_fat}g` : ""}`,
    });
  }
  if (intake.typical_day) signals.push({ label: "Journée type", value: intake.typical_day });
  if (intake.supplement_budget != null) {
    signals.push({ label: "Budget compléments", value: `${intake.supplement_budget}€/mois` });
  }

  const highStressPoorSleep = (intake.stress_level ?? 0) >= 7 && (intake.sleep_quality ?? 10) <= 4;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
        Contexte nutritionnel
      </p>
      <p className="text-[10.5px] text-[#F5EDED]/30 mb-3 leading-relaxed">
        Ce que la cible calorique/macro (onglet Objectifs TDEE) ne dit pas à elle seule, à prendre en compte
        avant de fixer un total définitif, pas après.
      </p>
      {signals.length === 0 ? (
        <p className="text-[11px] text-[#F5EDED]/25 italic">Rien de renseigné sur ces points dans la fiche client.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mb-3">
          {signals.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[#F5EDED]/30">{s.label}</span>
              <span className={`text-xs leading-relaxed ${s.flag ? "text-amber-300" : "text-[#F5EDED]/75"}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}
      {highStressPoorSleep && (
        <p className="text-[11px] text-amber-300/90 leading-relaxed border-t border-amber-500/20 pt-2.5">
          Stress élevé + sommeil faible : risque réel d&apos;appétit dérégulé. Une marge plus généreuse qu&apos;un
          déficit agressif est souvent plus tenable ici, une décision à toi, pas une règle automatique.
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

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

interface PlanMealRow {
  localId: string;
  slotKey: string;
  foodId: string;
  foodName: string;
  quantityG: number;
  day: DayOfWeek | null;
  // Pourquoi ce choix pour ce repas précis — décision du coach, jamais
  // déduite (migration 20260807 diet_meal_reasoning_and_food_prep_notes).
  notes: string;
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
  roadmap = null,
  roadmapHref,
}: {
  foods: Food[];
  // MASTERCLASS.md Axe B : ce contrat était Promise<void> — impossible pour
  // handleSave ci-dessous de savoir si la création a réussi. En pratique le
  // formulaire (parfois des dizaines de repas saisis à la main) était
  // effacé et "Enregistré" affiché même quand la sauvegarde échouait
  // côté serveur, un vrai risque de perte de travail pour le coach.
  onCreate: (
    name: string,
    mode: DietMode,
    meals: DietPlanMealInput[],
    structure: DietStructure,
    objective?: string,
    dayNotes?: Record<string, string>,
    socialNotes?: string
  ) => Promise<{ error?: string }>;
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
  /** Trajectoire déjà posée pour ce client — affichée en phase 1 pour concevoir la diète dans son contexte réel. */
  roadmap?: RoadmapWithData | null;
  roadmapHref?: string;
}) {
  const [planName, setPlanName] = useState("");
  const [objective, setObjective] = useState("");
  const [mode, setMode] = useState<DietMode>("fixed");
  const [structure, setStructure] = useState<DietStructure>("daily");
  const [activeDay, setActiveDay] = useState<DayOfWeek>("lun");
  const [meals, setMeals] = useState<PlanMealRow[]>([]);
  const [addingToSlot, setAddingToSlot] = useState<string | null>(null);

  // MASTERCLASS.md Axe C (suite) : le fond se fermait déjà au clic, rien
  // au clavier avant ça.
  useEffect(() => {
    if (!addingToSlot) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAddingToSlot(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [addingToSlot]);

  const [search, setSearch] = useState("");
  const [qty, setQty] = useState("100");
  const [mealNotes, setMealNotes] = useState("");
  const [dayNotes, setDayNotes] = useState<Partial<Record<DayOfWeek, string>>>({});
  const [socialNotes, setSocialNotes] = useState("");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [editingPrepNotes, setEditingPrepNotes] = useState(false);
  const [prepNotesDraft, setPrepNotesDraft] = useState("");
  const [savingPrepNotes, setSavingPrepNotes] = useState(false);
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

  const watchContext = useMemo(() => buildFoodWatchContext(intake), [intake]);
  const hasWatch = hasFoodWatchContext(watchContext);

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

  const [autoAdjustError, setAutoAdjustError] = useState<string | null>(null);
  const [autoAdjustDone, setAutoAdjustDone] = useState(false);

  function handleAutoAdjust() {
    if (!targets) return;
    setAutoAdjustError(null);
    setAutoAdjustDone(false);
    const newQuantities = autoAdjustQuantities(dayMeals, foods, targets);
    if (!newQuantities) {
      setAutoAdjustError(
        "Pas assez de variété dans ce repas pour ajuster automatiquement (il faut au moins un aliment par macro dominante : protéine, glucide, lipide)."
      );
      return;
    }
    setMeals((prev) =>
      prev.map((m) => (m.localId in newQuantities ? { ...m, quantityG: newQuantities[m.localId] } : m))
    );
    setAutoAdjustDone(true);
    setTimeout(() => setAutoAdjustDone(false), 2500);
  }

  // Micronutriments projetés du plan en cours de construction — réutilise
  // exactement la même logique que le suivi réel (getMicroDeficiencyOrder),
  // juste appliquée aux repas PLANIFIÉS plutôt qu'aux logs réels.
  const microLogs = useMemo(
    () => dayMeals.map((m) => ({ foods: foods.find((f) => f.id === m.foodId) ?? null, quantity_g: m.quantityG })),
    [dayMeals, foods]
  );

  // Liste de courses du plan en cours de construction (avant même
  // d'enregistrer) — journalier : le jour affiché répété sur 7 jours ;
  // hebdomadaire : somme réelle de tous les jours déjà remplis.
  const draftShoppingItems = useMemo(() => {
    const totals = new Map<string, { name: string; category: string; grams: number }>();
    const rows = structure === "weekly" ? meals : dayMeals;
    const multiplier = structure === "weekly" ? 1 : 7;
    for (const m of rows) {
      const food = foods.find((f) => f.id === m.foodId);
      if (!food) continue;
      const existing = totals.get(food.id) ?? { name: food.name, category: food.category ?? "Divers", grams: 0 };
      existing.grams += m.quantityG * multiplier;
      totals.set(food.id, existing);
    }
    return [...totals.values()]
      .map((v) => ({ ...v, grams: Math.round(v.grams / 10) * 10 }))
      .sort((a, b) => {
        const ai = CATEGORY_ORDER.indexOf(a.category);
        const bi = CATEGORY_ORDER.indexOf(b.category);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.name.localeCompare(b.name, "fr");
      });
  }, [meals, dayMeals, foods, structure]);

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
        localId: uid(),
        slotKey: addingToSlot,
        foodId: selectedFood.id,
        foodName: selectedFood.name,
        quantityG: q,
        day: currentDay,
        notes: mealNotes.trim(),
      },
    ]);
    setAddingToSlot(null);
    setSelectedFood(null);
    setSearch("");
    setQty("100");
    setMealNotes("");
  }

  // Remplace un aliment par un autre de la même catégorie (rotation, ou
  // aliment qui ne convient plus) — une seule suggestion, jamais imposée
  // silencieusement : le nom change ici mais reste visible et annulable
  // (Annuler l'enregistrement) tant que le plan n'est pas sauvegardé.
  function swapFood(localId: string) {
    const row = meals.find((m) => m.localId === localId);
    if (!row) return;
    const current = foods.find((f) => f.id === row.foodId);
    if (!current) return;
    const namesInMeal = meals.filter((m) => m.day === row.day && m.slotKey === row.slotKey).map((m) => m.foodId);
    const next = findFoodSwapCandidate(current, foods, intake, namesInMeal);
    if (!next) return;
    setMeals((prev) => prev.map((m) => (m.localId === localId ? { ...m, foodId: next.id, foodName: next.name } : m)));
  }

  function canSwapFood(foodId: string): boolean {
    const food = foods.find((f) => f.id === foodId);
    return !!food?.category;
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
        localId: uid(),
        slotKey: m.meal_slot,
        foodId: m.food_id,
        foodName: m.foods?.name ?? foods.find((f) => f.id === m.food_id)?.name ?? "Aliment",
        quantityG: m.quantity_g,
        day: m.day_of_week,
        notes: m.notes ?? "",
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
      notes: m.notes.trim() || null,
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
    const cleanDayNotes = Object.fromEntries(
      Object.entries(dayNotes).filter(([, v]) => (v ?? "").trim() !== "")
    ) as Record<string, string>;
    const result = await onCreate(
      planName.trim(),
      mode,
      buildMealInputs(),
      structure,
      objective.trim() || undefined,
      Object.keys(cleanDayNotes).length > 0 ? cleanDayNotes : undefined,
      socialNotes.trim() || undefined
    );
    setSaving(false);
    // Échec : on garde tout le formulaire tel quel (rien de pire que de
    // perdre un plan saisi à la main parce que le serveur a renvoyé une
    // erreur) et on l'affiche clairement au lieu d'un faux "Enregistré".
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setPlanName("");
    setObjective("");
    setMeals([]);
    setDayNotes({});
    setSocialNotes("");
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
      <PhaseHeader
        id="diet-phase-contexte"
        n={1}
        title="Réflexion & contexte"
        subtitle="Pourquoi ce total calorique, pas juste combien : appétit, stress, habitudes déjà en place."
      />

      {roadmap && (
        <RoadmapContextPanel roadmap={roadmap} roadmapHref={roadmapHref} subjectLabel={subjectLabel} workTypeLabel="cette diète" />
      )}

      <NutritionalContextPanel intake={intake ?? null} />

      <PhaseHeader
        id="diet-phase-programmation"
        n={2}
        title="Programmation"
        subtitle="Structure de la semaine, nombre de repas, répartition macro visée, avant le moindre aliment."
      />

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
            placeholder="Ex. Prise de masse semaine 1" aria-label="Nom du plan"
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
          placeholder="Ex. Sèche progressive, 400 kcal sous la maintenance, protéines hautes" aria-label="Objectif"
          className={inputCls}
        />
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
          Sorties, repas en famille, contraintes sociales connues <span className="text-[#F5EDED]/25 font-normal">(optionnel)</span>
        </label>
        <textarea
          value={socialNotes}
          onChange={(e) => setSocialNotes(e.target.value)}
          rows={2}
          placeholder="Ex. Repas de famille le dimanche midi, sort au restaurant le vendredi soir avec ses amis…" aria-label="Notes sur le contexte social"
          className={`${inputCls} resize-none`}
        />
        <p className="text-[10px] text-[#F5EDED]/25 mt-1.5">
          Pour que la diète reste tenable dans sa vraie vie, pas seulement sur le papier, à prendre en compte dans
          la structure de la semaine ci-dessous.
        </p>
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

      {mode !== "flexible" && structure === "weekly" && (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Pourquoi {DAY_TABS.find((d) => d.key === activeDay)?.label} est structuré ainsi <span className="text-[#F5EDED]/25 font-normal">(optionnel)</span>
          </label>
          <textarea
            value={dayNotes[activeDay] ?? ""}
            onChange={(e) => setDayNotes((prev) => ({ ...prev, [activeDay]: e.target.value }))}
            rows={2}
            placeholder="Ex. Jour haut en glucides avant la séance jambes du lendemain matin. / Jour off, déficit plus marqué, journée sédentaire." aria-label="Notes du jour"
            className={`${inputCls} resize-none`}
          />
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

          {targets && dayMeals.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#890404]/15">
              <button
                type="button"
                onClick={handleAutoAdjust}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/50 hover:text-[#F5EDED]/80 transition-colors"
              >
                <RefreshCw size={11} /> Ajuster automatiquement les grammages sur la cible
              </button>
              <p className="text-[9px] text-[#F5EDED]/25 mt-1">
                Garde les aliments choisis, réajuste seulement les quantités par macro dominante (protéine/glucide/lipide) pour coller à l&apos;objectif.
              </p>
              {autoAdjustDone && (
                <p className="text-[10px] text-green-400 font-semibold mt-1.5">✓ Grammages ajustés</p>
              )}
              {autoAdjustError && (
                <p className="text-[10px] text-red-400 mt-1.5">{autoAdjustError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {mode !== "flexible" && (
        <PhaseHeader
          id="diet-phase-construction"
          n={3}
          title="Construction"
          subtitle="Chaque aliment ajouté porte sa raison d'être, pas juste un nom et un grammage."
        />
      )}

      {/* Meal slots for fixed modes */}
      {mode !== "flexible" && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
            Détail des repas
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
                      {slotMeals.map((m) => (
                        <div
                          key={m.localId}
                          className="flex items-center justify-between py-1 border-b border-[#890404]/10 last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-white">{m.foodName}</p>
                            <p className="text-[10px] text-[#F5EDED]/35">{m.quantityG}g</p>
                            {m.notes && <p className="text-[10px] text-[#F5EDED]/30 italic mt-0.5">{m.notes}</p>}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {canSwapFood(m.foodId) && (
                              <button
                                onClick={() => swapFood(m.localId)}
                                title="Remplacer par un autre aliment de la même catégorie (rotation)" aria-label="Remplacer par un autre aliment de la même catégorie (rotation)"
                                className="text-[#F5EDED]/20 hover:text-green-400 transition-colors p-0.5"
                              >
                                <RefreshCw size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => setMeals((prev) => prev.filter((meal) => meal.localId !== m.localId))}
                              className="text-[#F5EDED]/20 hover:text-red-500 transition-colors p-0.5"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
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

      <PhaseHeader
        id="diet-phase-livraison"
        n={4}
        title="Livraison"
        subtitle="Couverture des carences, liste de courses, bilan avant sauvegarde : ce que ce client recevra."
      />

      {mode !== "flexible" && dayMeals.length > 0 && (
        <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            Couverture des micronutriments {structure === "weekly" && currentDay ? `· ${DAY_TABS.find((d) => d.key === currentDay)?.label ?? ""}` : ""}
          </p>
          <MicroBarList logs={microLogs} />
        </div>
      )}

      {draftShoppingItems.length > 0 && (
        <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            <ShoppingCart size={12} />
            Liste de courses de ce plan
          </p>
          <p className="text-[10.5px] text-[#F5EDED]/30 mb-3 leading-relaxed">
            {structure === "weekly"
              ? "Somme réelle des jours déjà remplis."
              : "Le jour affiché, extrapolé sur 7 jours (structure journalière : mêmes repas chaque jour)."}
          </p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
            {draftShoppingItems.map((item) => (
              <div key={item.name} className="flex items-center justify-between py-1 border-b border-[#890404]/10">
                <span className="text-xs text-[#F5EDED]/70">{item.name}</span>
                <span className="text-xs font-bold text-white flex-shrink-0">{item.grams >= 1000 ? `${(item.grams / 1000).toFixed(1)}kg` : `${item.grams}g`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {draftShoppingItems.length > 0 && (
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
            Organisation des préparations de repas
          </p>
          <ul className="space-y-1.5">
            {[
              "Cuire les féculents et les protéines en grande quantité 1 à 2 fois par semaine plutôt qu'à chaque repas, la plupart se conservent 3 à 4 jours au frigo dans une boîte hermétique.",
              "Portionner tout de suite après cuisson (dans les contenants du repas) : ce qui est déjà pesé et rangé se mange, ce qui reste dans une grande casserole se perd.",
              "Congeler ce qui ne sera pas mangé sous 3-4 jours (viande cuite, poisson, plats en sauce) plutôt que de le jeter. Décongeler au frigo la veille, jamais à température ambiante.",
              "Légumes et crudités se préparent la veille pour le lendemain, pas plusieurs jours à l'avance (perte de vitamines et de texture).",
              "Un jour de préparation type : féculent + protéine de la semaine cuits ensemble, légumes lavés/coupés pour 2-3 jours, sauces/assaisonnements préparés à part pour varier le goût sans recuisiner.",
            ].map((tip) => (
              <li key={tip} className="text-[11px] text-[#F5EDED]/55 leading-relaxed flex gap-2">
                <span className="text-[#E01E1E] flex-shrink-0">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode !== "flexible" && (
        <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-3">
            <ClipboardCheck size={12} />
            Bilan avant sauvegarde
          </p>
          <div className="space-y-1.5">
            {(() => {
              const scopedMeals = structure === "weekly" ? meals : dayMeals;
              const withoutReason = scopedMeals.filter((m) => !m.notes.trim()).length;
              const emptyDays = structure === "weekly" ? DAY_TABS.filter((d) => meals.filter((m) => m.day === d.key).length === 0).length : 0;
              const items = [
                {
                  ok: !!targets,
                  okText: "Cible macro définie (onglet Objectifs TDEE).",
                  warnText: "Pas de cible macro définie, la répartition ci-dessus n'a rien à viser.",
                },
                {
                  ok: withoutReason === 0,
                  okText: "Chaque aliment porte une raison de choix.",
                  warnText: `${withoutReason} aliment${withoutReason > 1 ? "s" : ""} sans raison de choix renseignée.`,
                },
                ...(structure === "weekly"
                  ? [
                      {
                        ok: emptyDays === 0,
                        okText: "Tous les jours de la semaine sont remplis.",
                        warnText: `${emptyDays} jour${emptyDays > 1 ? "s" : ""} de la semaine encore vide${emptyDays > 1 ? "s" : ""}.`,
                      },
                    ]
                  : []),
              ];
              return items.map((item, i) => (
                <p key={i} className={`text-[11px] flex items-start gap-2 ${item.ok ? "text-[#F5EDED]/45" : "text-amber-300/85"}`}>
                  <span className="flex-shrink-0 mt-0.5">{item.ok ? "✓" : "!"}</span>
                  {item.ok ? item.okText : item.warnText}
                </p>
              ));
            })()}
          </div>
          <p className="text-[10px] text-[#F5EDED]/25 mt-3 leading-relaxed">
            Rien ici n&apos;empêche d&apos;enregistrer, un rappel, pas un blocage.
          </p>
        </div>
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
                <input aria-label="Nom du modèle"
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
          <div className="ep-modal-overlay absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setAddingToSlot(null)} />
          <div className="ep-modal-panel relative w-full sm:max-w-md bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col z-10">
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
                {hasWatch && (
                  <div className="mx-5 mt-3 mb-1 flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 flex-shrink-0">
                    <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10.5px] text-amber-300/90 leading-relaxed">
                      À surveiller pour ce client : {summarizeFoodWatchContext(watchContext)}. Détection approximative sur le nom/la catégorie, vérifie toujours toi-même.
                    </p>
                  </div>
                )}
                <div className="px-5 py-3 flex-shrink-0">
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un aliment…" aria-label="Rechercher un aliment…"
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
                    const watchHits = hasWatch ? checkFoodWatch(food, watchContext) : [];
                    return (
                      <button
                        key={food.id}
                        onClick={() => { setSelectedFood(food); setQty("100"); setMealNotes(""); setEditingPrepNotes(false); setPrepNotesDraft(food.prep_notes ?? ""); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#1f0101] rounded-lg transition-colors"
                      >
                        <p className="text-sm text-white font-medium flex items-center gap-1.5">
                          {food.name}
                          {watchHits.length > 0 && <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />}
                        </p>
                        <p className="text-[10px] text-[#F5EDED]/35">
                          {food.calories_per_100} kcal/100g · P {food.proteins_per_100}g
                          {watchHits.length > 0 && (
                            <span className="text-amber-400/80"> · {watchHits.join(", ")}</span>
                          )}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="px-5 py-4 flex flex-col gap-4">
                {(() => {
                  const hits = hasWatch ? checkFoodWatch(selectedFood, watchContext) : [];
                  if (hits.length === 0) return null;
                  return (
                    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5">
                      <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-300/90 leading-relaxed">
                        {selectedFood.name} : {hits.join(", ")}.
                      </p>
                    </div>
                  );
                })()}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                    Quantité (g)
                  </label>
                  <input aria-label="Quantité (g)"
                    autoFocus
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Pourquoi ce choix — décision propre à ce repas, ce client. */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                    Pourquoi ce choix pour ce repas <span className="text-[#F5EDED]/25 font-normal">(optionnel)</span>
                  </label>
                  <textarea
                    value={mealNotes}
                    onChange={(e) => setMealNotes(e.target.value)}
                    rows={2}
                    placeholder="Ex. Remplace le poisson qu'il déteste, pratique à emporter au travail, source de glucides avant la séance du soir…" aria-label="Notes sur le repas"
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {/* Référence partagée sur l'aliment — cuisson, association, conservation. */}
                <div className="bg-[#1f0101] border border-[#890404]/20 rounded-lg p-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
                    Préparation &amp; association (fiche partagée de l&apos;aliment)
                  </p>
                  {editingPrepNotes ? (
                    <>
                      <textarea
                        value={prepNotesDraft}
                        onChange={(e) => setPrepNotesDraft(e.target.value)}
                        rows={2}
                        placeholder="Ex. Se mange froid ou chaud, s'associe bien avec du citron et de l'aneth, se conserve 2 jours au frigo…" aria-label="Notes de préparation"
                        className="w-full bg-[#0D0000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2 text-xs text-white placeholder-[#F5EDED]/20 outline-none transition-colors resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setSavingPrepNotes(true);
                            const res = await updateFoodPrepNotes(selectedFood.id, prepNotesDraft);
                            setSavingPrepNotes(false);
                            if (!res.error) {
                              setSelectedFood({ ...selectedFood, prep_notes: prepNotesDraft.trim() || null });
                              setEditingPrepNotes(false);
                            }
                          }}
                          disabled={savingPrepNotes}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] disabled:opacity-50"
                        >
                          {savingPrepNotes ? "Enregistrement…" : "Enregistrer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPrepNotes(false)}
                          className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
                        >
                          Annuler
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-[#F5EDED]/60 italic mb-1.5">
                        {selectedFood.prep_notes || "Aucune note pour l'instant."}
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditingPrepNotes(true)}
                        className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444]"
                      >
                        {selectedFood.prep_notes ? "Modifier" : "Ajouter une note"}
                      </button>
                    </>
                  )}
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
        aria-expanded={expanded}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {plan.is_active && <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{plan.name}</p>
            {plan.objective && (
              <p className="text-[11px] text-[#F5EDED]/40 truncate">{plan.objective}</p>
            )}
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
                        <div className="min-w-0">
                          <p className="text-xs text-white">{m.foods?.name ?? "Aliment"}</p>
                          {m.notes && <p className="text-[10px] text-[#F5EDED]/30 italic">{m.notes}</p>}
                        </div>
                        <p className="text-[10px] text-[#F5EDED]/35 flex-shrink-0">{m.quantity_g}g</p>
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
