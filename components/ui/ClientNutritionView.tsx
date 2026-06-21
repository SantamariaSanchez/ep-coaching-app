"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import MicroBarList from "@/components/ui/MicroBarList";
import NutritionModeSelector from "@/components/ui/NutritionModeSelector";
import type {
  NutritionProfile,
  Food,
  FoodLogWithFood,
  DietMode,
  DietPlanWithMeals,
} from "@/utils/nutrition";

// ── Constants ────────────────────────────────────────────────────────────────

const MEAL_SLOTS = [
  { key: "breakfast", label: "Petit-déjeuner" },
  { key: "morning", label: "Collation matin" },
  { key: "lunch", label: "Déjeuner" },
  { key: "afternoon", label: "Collation après-midi" },
  { key: "preworkout", label: "Pré-entraînement" },
  { key: "postworkout", label: "Post-entraînement" },
  { key: "dinner", label: "Dîner" },
];

const FOOD_CATEGORIES = [
  "Viande blanche",
  "Viande rouge",
  "Charcuterie",
  "Poisson",
  "Oeufs",
  "Laitier",
  "Protéine poudre",
  "Féculent",
  "Légumineuse",
  "Légume",
  "Fruit",
  "Fruit séché",
  "Oléagineux",
  "Matière grasse",
  "Sucrant",
  "Sauce",
  "Snack",
  "Divers",
];

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcMacros(food: Food, quantityG: number) {
  const r = quantityG / 100;
  return {
    calories: Math.round(food.calories_per_100 * r * 10) / 10,
    proteins: Math.round(food.proteins_per_100 * r * 10) / 10,
    carbs: Math.round(food.carbs_per_100 * r * 10) / 10,
    fats: Math.round(food.fats_per_100 * r * 10) / 10,
  };
}

function getDayColor(cals: number, target: number) {
  if (cals === 0) return "bg-[#F5EDED]/5 border-[#F5EDED]/10";
  const pct = target > 0 ? cals / target : 0;
  if (pct >= 0.9) return "bg-green-600/60 border-green-500/30";
  if (pct >= 0.7) return "bg-amber-500/60 border-amber-400/30";
  return "bg-red-700/60 border-red-600/30";
}

function fmt(n: number) {
  return Math.round(n);
}

// ── MacroRing ─────────────────────────────────────────────────────────────────

function MacroRing({
  label,
  current,
  target,
  color,
  isCalorie,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
  isCalorie?: boolean;
}) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(current / target, 1.05) : 0;
  const offset = circ * (1 - Math.min(pct, 1));

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[76px] h-[76px]">
        <svg width="76" height="76" className="block">
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            stroke="rgba(245,237,237,0.07)"
            strokeWidth="7"
          />
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 38 38)"
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-sm font-black text-white">{fmt(current)}</span>
          <span className="text-[9px] text-[#F5EDED]/35">
            /{target}{isCalorie ? "" : "g"}
          </span>
        </div>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/45">
        {label}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  today: string;
  nutritionProfile: NutritionProfile | null;
  initialTodayLogs: FoodLogWithFood[];
  historyLogs: FoodLogWithFood[];
  initialFoods: Food[];
  dietMode: DietMode;
  activePlan: DietPlanWithMeals | null;
  addFoodLog: (params: {
    foodId: string;
    mealSlot: string;
    quantityG: number;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    loggedAt: string;
  }) => Promise<{ id?: string; error?: string }>;
  removeFoodLog: (logId: string) => Promise<{ error?: string }>;
  createCustomFood: (params: {
    name: string;
    category: string;
    calories_per_100: number;
    proteins_per_100: number;
    carbs_per_100: number;
    fats_per_100: number;
    fibers_per_100: number;
  }) => Promise<{ food?: Food; error?: string }>;
}

export default function ClientNutritionView({
  today,
  nutritionProfile,
  initialTodayLogs,
  historyLogs,
  initialFoods,
  dietMode,
  activePlan,
  addFoodLog,
  removeFoodLog,
  createCustomFood,
}: Props) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [todayLogs, setTodayLogs] = useState<FoodLogWithFood[]>(initialTodayLogs);
  const [foods, setFoods] = useState<Food[]>(initialFoods);

  // Search modal
  const [addingToSlot, setAddingToSlot] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantityInput, setQuantityInput] = useState("");
  const [addingError, setAddingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create food modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    category: "Divers",
    calories_per_100: "",
    proteins_per_100: "",
    carbs_per_100: "",
    fats_per_100: "",
    fibers_per_100: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // History
  const [historySelectedDate, setHistorySelectedDate] = useState<string | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const targets = {
    calories: nutritionProfile?.calories_target ?? 0,
    proteins: nutritionProfile?.proteins_target ?? 0,
    carbs: nutritionProfile?.carbs_target ?? 0,
    fats: nutritionProfile?.fats_target ?? 0,
  };

  const totals = useMemo(
    () =>
      todayLogs.reduce(
        (acc, l) => ({
          calories: acc.calories + (l.calories ?? 0),
          proteins: acc.proteins + (l.proteins ?? 0),
          carbs: acc.carbs + (l.carbs ?? 0),
          fats: acc.fats + (l.fats ?? 0),
        }),
        { calories: 0, proteins: 0, carbs: 0, fats: 0 }
      ),
    [todayLogs]
  );

  const filteredFoods = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return foods.slice(0, 40);
    return foods
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.category ?? "").toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [foods, searchQuery]);

  const calsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of historyLogs) {
      map[l.logged_at] = (map[l.logged_at] ?? 0) + (l.calories ?? 0);
    }
    return map;
  }, [historyLogs]);

  const last30Days = useMemo(() => {
    const days: string[] = [];
    const now = new Date(today);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  }, [today]);

  const historyDayLogs = useMemo(() => {
    if (!historySelectedDate) return [];
    return historyLogs.filter((l) => l.logged_at === historySelectedDate);
  }, [historyLogs, historySelectedDate]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openModal(slot: string) {
    setAddingToSlot(slot);
    setSearchQuery("");
    setSelectedFood(null);
    setQuantityInput("");
    setAddingError(null);
  }

  function closeModal() {
    setAddingToSlot(null);
    setSelectedFood(null);
    setSearchQuery("");
    setQuantityInput("");
    setAddingError(null);
  }

  async function handleAddFood() {
    if (!selectedFood || !addingToSlot || !quantityInput) return;
    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty <= 0) return;

    const macros = calcMacros(selectedFood, qty);
    const optimisticLog: FoodLogWithFood = {
      id: `optimistic-${Date.now()}`,
      client_id: "",
      food_id: selectedFood.id,
      meal_slot: addingToSlot,
      quantity_g: qty,
      logged_at: today,
      calories: macros.calories,
      proteins: macros.proteins,
      carbs: macros.carbs,
      fats: macros.fats,
      foods: selectedFood,
    };

    setTodayLogs((prev) => [...prev, optimisticLog]);
    closeModal();
    setIsSubmitting(true);

    const result = await addFoodLog({
      foodId: selectedFood.id,
      mealSlot: addingToSlot,
      quantityG: qty,
      calories: macros.calories,
      proteins: macros.proteins,
      carbs: macros.carbs,
      fats: macros.fats,
      loggedAt: today,
    });

    setIsSubmitting(false);

    if (result.error) {
      setTodayLogs((prev) =>
        prev.filter((l) => l.id !== optimisticLog.id)
      );
      setAddingError(result.error);
    } else if (result.id) {
      setTodayLogs((prev) =>
        prev.map((l) =>
          l.id === optimisticLog.id ? { ...l, id: result.id! } : l
        )
      );
    }
  }

  async function handleDelete(logId: string) {
    const idx = todayLogs.findIndex((l) => l.id === logId);
    const backup = todayLogs[idx];
    setTodayLogs((prev) => prev.filter((l) => l.id !== logId));
    const result = await removeFoodLog(logId);
    if (result.error && backup) {
      // Restore at original position
      setTodayLogs((prev) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, backup);
        return next;
      });
    }
  }

  async function handleCreateFood() {
    if (!createForm.name.trim() || !createForm.calories_per_100) {
      setCreateError("Nom et calories obligatoires.");
      return;
    }
    setCreating(true);
    setCreateError(null);

    const result = await createCustomFood({
      name: createForm.name.trim(),
      category: createForm.category,
      calories_per_100: parseFloat(createForm.calories_per_100) || 0,
      proteins_per_100: parseFloat(createForm.proteins_per_100) || 0,
      carbs_per_100: parseFloat(createForm.carbs_per_100) || 0,
      fats_per_100: parseFloat(createForm.fats_per_100) || 0,
      fibers_per_100: parseFloat(createForm.fibers_per_100) || 0,
    });

    setCreating(false);

    if (result.error) {
      setCreateError(result.error);
    } else if (result.food) {
      setFoods((prev) => [result.food!, ...prev]);
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        category: "Divers",
        calories_per_100: "",
        proteins_per_100: "",
        carbs_per_100: "",
        fats_per_100: "",
        fibers_per_100: "",
      });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const noTargets = !nutritionProfile;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Nutrition
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Mon suivi
          </h1>
          <p className="mt-1 text-xs text-[#F5EDED]/30">
            {new Intl.DateTimeFormat("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(today + "T12:00:00"))}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:bg-[#E01E1E]/20 text-[#E01E1E] text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={11} />
          Créer un aliment
        </button>
      </div>

      {/* Mode selector */}
      <NutritionModeSelector activeMode={dietMode} />

      {/* Coach's prescribed plan */}
      {activePlan && activePlan.diet_plan_meals.length > 0 && (
        <DietPlanCard plan={activePlan} />
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#890404]/20">
        {(["today", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px ${
              activeTab === tab
                ? "text-[#E01E1E] border-b-2 border-[#E01E1E]"
                : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            {tab === "today" ? "Aujourd'hui" : "Historique"}
          </button>
        ))}
      </div>

      {/* ── TODAY TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "today" && (
        <div className="space-y-4">
          {/* Macro rings */}
          {noTargets ? (
            <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl p-5 text-center">
              <p className="text-xs text-[#F5EDED]/35 uppercase tracking-widest font-semibold">
                Aucun objectif défini — contacte ton coach
              </p>
            </div>
          ) : (
            <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
              <div className="flex justify-around">
                <MacroRing
                  label="Calories"
                  current={fmt(totals.calories)}
                  target={targets.calories}
                  color="#E01E1E"
                  isCalorie
                />
                <MacroRing
                  label="Protéines"
                  current={fmt(totals.proteins)}
                  target={targets.proteins}
                  color="#60a5fa"
                />
                <MacroRing
                  label="Glucides"
                  current={fmt(totals.carbs)}
                  target={targets.carbs}
                  color="#fbbf24"
                />
                <MacroRing
                  label="Lipides"
                  current={fmt(totals.fats)}
                  target={targets.fats}
                  color="#fb7185"
                />
              </div>
            </div>
          )}

          {/* Error banner — shown when optimistic add fails after modal closes */}
          {addingError && (
            <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
              <p className="text-xs text-red-400 font-semibold">{addingError}</p>
              <button
                onClick={() => setAddingError(null)}
                className="text-red-400/60 hover:text-red-400 transition-colors text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Meal slots */}
          {MEAL_SLOTS.map((slot) => {
            const slotLogs = todayLogs.filter((l) => l.meal_slot === slot.key);
            const slotCals = slotLogs.reduce(
              (s, l) => s + (l.calories ?? 0),
              0
            );
            return (
              <MealSlotCard
                key={slot.key}
                label={slot.label}
                logs={slotLogs}
                totalCals={slotCals}
                onAdd={() => openModal(slot.key)}
                onDelete={handleDelete}
              />
            );
          })}

          {/* ── Micronutriments ───────────────────────────────────────────── */}
          {todayLogs.length > 0 && (
            <div className="mt-6">
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-0.5">
                  Apports du jour
                </p>
                <h2 className="text-base font-black uppercase tracking-tight">
                  Micronutriments
                </h2>
              </div>
              <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
                <MicroBarList logs={todayLogs} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ───────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-5">
          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-[#F5EDED]/40 font-semibold uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-600/60 inline-block" />
              ≥ 90%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500/60 inline-block" />
              70–90%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-700/60 inline-block" />
              &lt; 70%
            </span>
          </div>

          {/* Calendar grid */}
          <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
            <div className="grid grid-cols-7 gap-1.5">
              {last30Days.map((date) => {
                const cals = calsByDate[date] ?? 0;
                const isSelected = historySelectedDate === date;
                return (
                  <button
                    key={date}
                    onClick={() =>
                      setHistorySelectedDate(
                        isSelected ? null : date
                      )
                    }
                    title={`${date} — ${Math.round(cals)} kcal`}
                    className={`aspect-square rounded-md border text-[8px] font-bold transition-all ${getDayColor(
                      cals,
                      targets.calories
                    )} ${
                      isSelected ? "ring-2 ring-white/50 ring-offset-1 ring-offset-[#1f0101]" : ""
                    }`}
                  >
                    <span className="text-white/70">
                      {new Date(date + "T12:00:00").getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day detail */}
          {historySelectedDate && (
            <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-white">
                  {new Intl.DateTimeFormat("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(new Date(historySelectedDate + "T12:00:00"))}
                </p>
                <button
                  onClick={() => setHistorySelectedDate(null)}
                  className="text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
                >
                  <X size={14} />
                </button>
              </div>

              {historyDayLogs.length === 0 ? (
                <p className="text-xs text-[#F5EDED]/30 italic">
                  Aucun aliment logué ce jour.
                </p>
              ) : (
                <div className="space-y-1">
                  {historyDayLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-1.5 border-b border-[#890404]/10 last:border-0"
                    >
                      <div>
                        <p className="text-xs text-white font-medium">
                          {log.foods?.name ?? "Aliment"}
                        </p>
                        <p className="text-[10px] text-[#F5EDED]/35">
                          {log.quantity_g}g · {fmt(log.calories ?? 0)} kcal
                        </p>
                      </div>
                      <div className="text-right text-[9px] text-[#F5EDED]/35">
                        <p>P {fmt(log.proteins ?? 0)}g</p>
                        <p>G {fmt(log.carbs ?? 0)}g · L {fmt(log.fats ?? 0)}g</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 text-xs font-bold text-[#F5EDED]/60">
                    Total : {fmt(calsByDate[historySelectedDate] ?? 0)} kcal
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SEARCH MODAL ──────────────────────────────────────────────────── */}
      {addingToSlot && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full sm:max-w-md bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col z-10">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#890404]/20 flex-shrink-0">
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                {selectedFood
                  ? selectedFood.name
                  : MEAL_SLOTS.find((s) => s.key === addingToSlot)?.label}
              </p>
              <button
                onClick={closeModal}
                className="text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
              >
                <X size={16} />
              </button>
            </div>

            {!selectedFood ? (
              // ── Search view ──
              <>
                <div className="px-5 py-3 flex-shrink-0">
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un aliment…"
                    className={inputCls}
                  />
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2">
                  {filteredFoods.length === 0 ? (
                    <p className="text-center text-xs text-[#F5EDED]/30 py-8">
                      Aucun résultat
                    </p>
                  ) : (
                    filteredFoods.map((food) => (
                      <button
                        key={food.id}
                        onClick={() => {
                          setSelectedFood(food);
                          setQuantityInput("100");
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#1f0101] rounded-lg transition-colors"
                      >
                        <p className="text-sm text-white font-medium leading-tight">
                          {food.name}
                          {food.is_custom && (
                            <span className="ml-1.5 text-[9px] text-[#E01E1E] uppercase font-bold">
                              custom
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-[#F5EDED]/35 mt-0.5">
                          {food.calories_per_100} kcal/100g · P{" "}
                          {food.proteins_per_100}g · G {food.carbs_per_100}g ·
                          L {food.fats_per_100}g
                        </p>
                      </button>
                    ))
                  )}
                </div>
                <div className="px-5 py-4 border-t border-[#890404]/20 flex-shrink-0">
                  <button
                    onClick={() => {
                      closeModal();
                      setShowCreateModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors py-2"
                  >
                    <Plus size={11} />
                    Créer un aliment personnalisé
                  </button>
                </div>
              </>
            ) : (
              // ── Quantity view ──
              <div className="px-5 py-4 flex flex-col gap-4">
                <div>
                  <p className="text-[10px] text-[#F5EDED]/35 mb-1">
                    {selectedFood.calories_per_100} kcal/100g · P{" "}
                    {selectedFood.proteins_per_100}g · G{" "}
                    {selectedFood.carbs_per_100}g · L{" "}
                    {selectedFood.fats_per_100}g
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                    Quantité (grammes)
                  </label>
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    placeholder="100"
                    className={inputCls}
                  />
                </div>
                {quantityInput && parseFloat(quantityInput) > 0 && (
                  <div className="bg-[#1f0101] border border-[#890404]/20 rounded-lg p-3">
                    {(() => {
                      const m = calcMacros(
                        selectedFood,
                        parseFloat(quantityInput)
                      );
                      return (
                        <div className="flex gap-4 text-xs">
                          <div>
                            <p className="text-[#E01E1E] font-black text-base">
                              {fmt(m.calories)}
                            </p>
                            <p className="text-[#F5EDED]/40 text-[9px]">kcal</p>
                          </div>
                          <div>
                            <p className="text-blue-300 font-bold">{fmt(m.proteins)}g</p>
                            <p className="text-[#F5EDED]/40 text-[9px]">Prot</p>
                          </div>
                          <div>
                            <p className="text-amber-300 font-bold">{fmt(m.carbs)}g</p>
                            <p className="text-[#F5EDED]/40 text-[9px]">Gluc</p>
                          </div>
                          <div>
                            <p className="text-rose-300 font-bold">{fmt(m.fats)}g</p>
                            <p className="text-[#F5EDED]/40 text-[9px]">Lip</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {addingError && (
                  <p className="text-xs text-red-400">{addingError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedFood(null)}
                    className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 rounded-lg text-[#F5EDED]/60 hover:text-[#F5EDED]/80 transition-colors"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleAddFood}
                    disabled={!quantityInput || parseFloat(quantityInput) <= 0}
                    className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-lg disabled:opacity-40 transition-colors"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE FOOD MODAL ─────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full sm:max-w-md bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl p-5 z-10">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                Créer un aliment
              </p>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                  Nom *
                </label>
                <input
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ex. Riz basmati précuit"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                  Catégorie
                </label>
                <select
                  value={createForm.category}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, category: e.target.value }))
                  }
                  className={inputCls}
                >
                  {FOOD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "calories_per_100", label: "Calories/100g *" },
                  { key: "proteins_per_100", label: "Protéines/100g" },
                  { key: "carbs_per_100", label: "Glucides/100g" },
                  { key: "fats_per_100", label: "Lipides/100g" },
                  { key: "fibers_per_100", label: "Fibres/100g" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                      {label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={createForm[key as keyof typeof createForm]}
                      onChange={(e) =>
                        setCreateForm((p) => ({
                          ...p,
                          [key]: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </div>

            {createError && (
              <p className="text-xs text-red-400 mt-3">{createError}</p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 rounded-lg text-[#F5EDED]/60 hover:text-[#F5EDED]/80 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateFood}
                disabled={creating}
                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {creating ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DietPlanCard ──────────────────────────────────────────────────────────────

function DietPlanCard({ plan }: { plan: DietPlanWithMeals }) {
  const [expanded, setExpanded] = useState(true);

  const bySlot = useMemo(() => {
    const map: Record<string, typeof plan.diet_plan_meals> = {};
    for (const m of plan.diet_plan_meals) {
      const key = m.meal_slot;
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [plan.diet_plan_meals]);

  return (
    <div className="bg-[#1f0101] border border-[#E01E1E]/30 rounded-xl overflow-hidden mb-6">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#E01E1E]/70 mb-0.5">
            Plan de ton coach
          </p>
          <p className="text-sm font-black text-white">{plan.name}</p>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-[#F5EDED]/30" />
        ) : (
          <ChevronDown size={14} className="text-[#F5EDED]/30" />
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#890404]/15 pt-3">
          {MEAL_SLOTS.filter((slot) => bySlot[slot.key]?.length).map((slot) => (
            <div key={slot.key}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5">
                {slot.label}
              </p>
              <div className="space-y-1">
                {bySlot[slot.key].map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-1"
                  >
                    <p className="text-xs text-white font-medium">
                      {m.foods?.name ?? "Aliment"}
                    </p>
                    <p className="text-[10px] text-[#F5EDED]/35">
                      {m.quantity_g}g
                      {m.foods
                        ? ` · ${fmt(calcMacros(m.foods, m.quantity_g).calories)} kcal`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MealSlotCard ──────────────────────────────────────────────────────────────

function MealSlotCard({
  label,
  logs,
  totalCals,
  onAdd,
  onDelete,
}: {
  label: string;
  logs: FoodLogWithFood[];
  totalCals: number;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white">
              {label}
            </p>
            {logs.length > 0 && (
              <p className="text-[10px] text-[#F5EDED]/35">
                {fmt(totalCals)} kcal · {logs.length} aliment
                {logs.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors px-2 py-1"
          >
            <Plus size={11} />
            Ajouter
          </button>
          {expanded ? (
            <ChevronUp size={14} className="text-[#F5EDED]/30" />
          ) : (
            <ChevronDown size={14} className="text-[#F5EDED]/30" />
          )}
        </div>
      </div>

      {expanded && logs.length > 0 && (
        <div className="px-4 pb-3 space-y-1 border-t border-[#890404]/15">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between py-2 border-b border-[#890404]/10 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium truncate">
                  {log.foods?.name ?? "Aliment"}
                </p>
                <p className="text-[10px] text-[#F5EDED]/35">
                  {log.quantity_g}g ·{" "}
                  <span className="text-[#E01E1E]/70">
                    {fmt(log.calories ?? 0)} kcal
                  </span>{" "}
                  · P {fmt(log.proteins ?? 0)}g · G {fmt(log.carbs ?? 0)}g · L{" "}
                  {fmt(log.fats ?? 0)}g
                </p>
              </div>
              <button
                onClick={() => onDelete(log.id)}
                className="text-[#F5EDED]/20 hover:text-red-500 transition-colors ml-3 flex-shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
