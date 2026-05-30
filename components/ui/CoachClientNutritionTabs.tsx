"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, X, CheckCircle2, Lock, Shuffle, Sliders } from "lucide-react";
import NutritionForm from "@/components/ui/NutritionForm";
import MicroBarList from "@/components/ui/MicroBarList";
import type {
  NutritionProfile,
  NutritionProfileInput,
  Food,
  FoodLogWithFood,
  DietPlanWithMeals,
  DietPlan,
  DietMode,
} from "@/utils/nutrition";
import { calculateNutrients } from "@/utils/nutrition-utils";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";

const MEAL_SLOTS = [
  { key: "breakfast", label: "Petit-déjeuner" },
  { key: "morning", label: "Collation matin" },
  { key: "lunch", label: "Déjeuner" },
  { key: "afternoon", label: "Collation après-midi" },
  { key: "preworkout", label: "Pré-entraînement" },
  { key: "postworkout", label: "Post-entraînement" },
  { key: "dinner", label: "Dîner" },
];

const MODES: { key: DietMode; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "flexible", label: "Flexible", icon: Shuffle, desc: "Le client logue librement ses repas" },
  { key: "fixed", label: "Fixe", icon: Lock, desc: "Plan strict — le client coche chaque aliment" },
  { key: "fixed_flexible", label: "Fixe Flexible", icon: Sliders, desc: "Plan avec swaps autorisés dans la même catégorie" },
];

function getDayColor(cals: number, target: number) {
  if (cals === 0) return "bg-[#F5EDED]/5 border-[#F5EDED]/10";
  const pct = target > 0 ? cals / target : 0;
  if (pct >= 0.85) return "bg-green-600/60 border-green-500/30";
  if (pct >= 0.6) return "bg-amber-500/60 border-amber-400/30";
  return "bg-red-700/60 border-red-600/30";
}

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

// ── Plan builder ──────────────────────────────────────────────────────────────

interface PlanMealRow {
  slotKey: string;
  foodId: string;
  foodName: string;
  quantityG: number;
}

function PlanBuilder({
  foods,
  onCreate,
}: {
  foods: Food[];
  onCreate: (name: string, mode: DietMode, meals: DietPlanMealInput[]) => Promise<void>;
}) {
  const [planName, setPlanName] = useState("");
  const [mode, setMode] = useState<DietMode>("fixed");
  const [meals, setMeals] = useState<PlanMealRow[]>([]);
  const [addingToSlot, setAddingToSlot] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState("100");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return foods.slice(0, 30);
    return foods
      .filter((f) => f.name.toLowerCase().includes(q) || (f.category ?? "").toLowerCase().includes(q))
      .slice(0, 30);
  }, [foods, search]);

  const planTotals = useMemo(() => {
    return meals.reduce(
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
  }, [meals, foods]);

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
      },
    ]);
    setAddingToSlot(null);
    setSelectedFood(null);
    setSearch("");
    setQty("100");
  }

  async function handleSave() {
    if (!planName.trim()) { setError("Nom du plan requis."); return; }
    setSaving(true);
    setError(null);
    const inputs: DietPlanMealInput[] = meals.map((m, i) => ({
      meal_slot: m.slotKey,
      food_id: m.foodId,
      quantity_g: m.quantityG,
      position: i,
    }));
    await onCreate(planName.trim(), mode, inputs);
    setSaving(false);
    setSuccess(true);
    setPlanName("");
    setMeals([]);
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

      {/* Mode flexible: no meals needed */}
      {mode === "flexible" && (
        <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-5 text-center">
          <p className="text-xs text-[#F5EDED]/40">
            En mode Flexible, le client logue librement ses repas — aucun plan prédéfini nécessaire.
          </p>
        </div>
      )}

      {/* Meal slots for fixed modes */}
      {mode !== "flexible" && (
        <>
          <div className="space-y-3">
            {MEAL_SLOTS.map((slot) => {
              const slotMeals = meals.filter((m) => m.slotKey === slot.key);
              return (
                <div key={slot.key} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#F5EDED]/70">
                      {slot.label}
                    </p>
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
                                      meal.quantityG === m.quantityG
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

          {/* Plan totals */}
          {meals.length > 0 && (
            <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
                Total du plan
              </p>
              <div className="flex gap-4">
                <div>
                  <p className="text-lg font-black text-[#E01E1E]">
                    {Math.round(planTotals.calories)}
                  </p>
                  <p className="text-[9px] text-[#F5EDED]/35">kcal</p>
                </div>
                <div>
                  <p className="text-base font-bold text-blue-300">
                    {Math.round(planTotals.proteins)}g
                  </p>
                  <p className="text-[9px] text-[#F5EDED]/35">Prot.</p>
                </div>
                <div>
                  <p className="text-base font-bold text-amber-300">
                    {Math.round(planTotals.carbs)}g
                  </p>
                  <p className="text-[9px] text-[#F5EDED]/35">Gluc.</p>
                </div>
                <div>
                  <p className="text-base font-bold text-rose-300">
                    {Math.round(planTotals.fats)}g
                  </p>
                  <p className="text-[9px] text-[#F5EDED]/35">Lip.</p>
                </div>
              </div>
            </div>
          )}
        </>
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
                  {filtered.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => { setSelectedFood(food); setQty("100"); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#1f0101] rounded-lg transition-colors"
                    >
                      <p className="text-sm text-white font-medium">{food.name}</p>
                      <p className="text-[10px] text-[#F5EDED]/35">
                        {food.calories_per_100} kcal/100g · P {food.proteins_per_100}g
                      </p>
                    </button>
                  ))}
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

// ── Today logs ────────────────────────────────────────────────────────────────

function TodayLogsView({
  logs,
  nutritionProfile,
}: {
  logs: FoodLogWithFood[];
  nutritionProfile: NutritionProfile | null;
}) {
  const targets = {
    calories: nutritionProfile?.calories_target ?? 0,
    proteins: nutritionProfile?.proteins_target ?? 0,
    carbs: nutritionProfile?.carbs_target ?? 0,
    fats: nutritionProfile?.fats_target ?? 0,
  };

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + (l.calories ?? 0),
      proteins: acc.proteins + (l.proteins ?? 0),
      carbs: acc.carbs + (l.carbs ?? 0),
      fats: acc.fats + (l.fats ?? 0),
    }),
    { calories: 0, proteins: 0, carbs: 0, fats: 0 }
  );

  const bySlot: Record<string, FoodLogWithFood[]> = {};
  for (const l of logs) {
    const slot = l.meal_slot ?? "other";
    if (!bySlot[slot]) bySlot[slot] = [];
    bySlot[slot].push(l);
  }

  return (
    <div className="space-y-5">
      {/* Macro summary */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Calories", v: totals.calories, t: targets.calories, unit: "kcal", color: "#E01E1E" },
            { label: "Protéines", v: totals.proteins, t: targets.proteins, unit: "g", color: "#60a5fa" },
            { label: "Glucides", v: totals.carbs, t: targets.carbs, unit: "g", color: "#fbbf24" },
            { label: "Lipides", v: totals.fats, t: targets.fats, unit: "g", color: "#fb7185" },
          ].map(({ label, v, t, unit, color }) => (
            <div key={label} className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
                {label}
              </p>
              <p className="text-lg font-black" style={{ color }}>
                {Math.round(v)}
                <span className="text-xs font-normal text-[#F5EDED]/30 ml-0.5">{unit}</span>
              </p>
              {t > 0 && (
                <p className="text-[9px] text-[#F5EDED]/25">
                  / {t}{unit}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Slots */}
      {logs.length === 0 ? (
        <p className="text-sm text-[#F5EDED]/25 italic text-center py-6">
          Aucun aliment logué aujourd&apos;hui.
        </p>
      ) : (
        MEAL_SLOTS.map((slot) => {
          const slotLogs = bySlot[slot.key] ?? [];
          if (slotLogs.length === 0) return null;
          return (
            <div key={slot.key} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-2">
                {slot.label}
              </p>
              <div className="space-y-1">
                {slotLogs.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-[#890404]/10 last:border-0">
                    <div>
                      <p className="text-xs text-white font-medium">{l.foods?.name ?? "—"}</p>
                      <p className="text-[10px] text-[#F5EDED]/35">{l.quantity_g}g</p>
                    </div>
                    <div className="text-right text-[10px] text-[#F5EDED]/40">
                      <p className="text-[#E01E1E]/70 font-bold">{Math.round(l.calories ?? 0)} kcal</p>
                      <p>P {Math.round(l.proteins ?? 0)}g · G {Math.round(l.carbs ?? 0)}g · L {Math.round(l.fats ?? 0)}g</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Micros */}
      {logs.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            Micronutriments du jour
          </p>
          <MicroBarList logs={logs} />
        </div>
      )}
    </div>
  );
}

// ── History view ──────────────────────────────────────────────────────────────

function HistoryView({
  historyLogs,
  today,
  targets,
}: {
  historyLogs: FoodLogWithFood[];
  today: string;
  targets: { calories: number };
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const dayLogs = useMemo(
    () => (selectedDate ? historyLogs.filter((l) => l.logged_at === selectedDate) : []),
    [historyLogs, selectedDate]
  );

  return (
    <div className="space-y-5">
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <div className="grid grid-cols-7 gap-1.5">
          {last30Days.map((date) => {
            const cals = calsByDate[date] ?? 0;
            const isSelected = selectedDate === date;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(isSelected ? null : date)}
                title={`${date} — ${Math.round(cals)} kcal`}
                className={`aspect-square rounded-md border text-[8px] font-bold transition-all ${getDayColor(cals, targets.calories)} ${isSelected ? "ring-2 ring-white/50 ring-offset-1 ring-offset-[#1f0101]" : ""}`}
              >
                <span className="text-white/70">{new Date(date + "T12:00:00").getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white">
              {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(selectedDate + "T12:00:00"))}
            </p>
            <button onClick={() => setSelectedDate(null)} className="text-[#F5EDED]/40 hover:text-white">
              <X size={14} />
            </button>
          </div>
          {dayLogs.length === 0 ? (
            <p className="text-xs text-[#F5EDED]/30 italic">Aucun aliment logué.</p>
          ) : (
            <>
              <div className="space-y-1 mb-4">
                {dayLogs.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-[#890404]/10 last:border-0">
                    <div>
                      <p className="text-xs text-white">{l.foods?.name ?? "—"}</p>
                      <p className="text-[10px] text-[#F5EDED]/35">{l.quantity_g}g · {l.meal_slot}</p>
                    </div>
                    <p className="text-xs text-[#E01E1E]/70 font-bold">{Math.round(l.calories ?? 0)} kcal</p>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[#890404]/15">
                <p className="text-xs font-bold text-[#F5EDED]/50">
                  Total : {Math.round(calsByDate[selectedDate] ?? 0)} kcal
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
  clientWeight: number | null;
  nutritionProfile: NutritionProfile | null;
  todayLogs: FoodLogWithFood[];
  historyLogs: FoodLogWithFood[];
  foods: Food[];
  activePlan: DietPlanWithMeals | null;
  allPlans: DietPlan[];
  today: string;
  saveNutritionProfile: (clientId: string, data: NutritionProfileInput) => Promise<{ error?: string }>;
  createDietPlan: (clientId: string, name: string, mode: DietMode, meals: DietPlanMealInput[]) => Promise<{ error?: string; id?: string }>;
  deactivateDietPlan: (clientId: string, planId: string) => Promise<{ error?: string }>;
}

type Tab = "objectifs" | "plan" | "today" | "history";

export default function CoachClientNutritionTabs({
  clientId,
  clientWeight,
  nutritionProfile,
  todayLogs,
  historyLogs,
  foods,
  activePlan,
  today,
  saveNutritionProfile,
  createDietPlan,
  deactivateDietPlan,
}: Props) {
  const [tab, setTab] = useState<Tab>("objectifs");

  const tabs: { key: Tab; label: string }[] = [
    { key: "objectifs", label: "Objectifs TDEE" },
    { key: "plan", label: "Créer un plan" },
    { key: "today", label: "Suivi du jour" },
    { key: "history", label: "Historique" },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#890404]/20 overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
              tab === key
                ? "text-[#E01E1E] border-b-2 border-[#E01E1E]"
                : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active plan badge */}
      {activePlan && tab !== "objectifs" && (
        <div className="flex items-center justify-between bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-2.5 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-green-400" />
            <p className="text-xs font-bold text-white">
              Plan actif :{" "}
              <span className="text-[#E01E1E]">{activePlan.name}</span>
              <span className="ml-2 text-[10px] text-[#F5EDED]/30 uppercase font-normal">
                {activePlan.mode}
              </span>
            </p>
          </div>
          <button
            onClick={() => deactivateDietPlan(clientId, activePlan.id)}
            className="text-[10px] text-[#F5EDED]/30 hover:text-red-400 transition-colors"
          >
            Désactiver
          </button>
        </div>
      )}

      {/* Content */}
      {tab === "objectifs" && (
        <NutritionForm
          clientId={clientId}
          existingProfile={nutritionProfile}
          clientWeight={clientWeight}
          saveNutritionProfile={saveNutritionProfile}
        />
      )}

      {tab === "plan" && (
        <PlanBuilder
          foods={foods}
          onCreate={async (name, mode, meals) => {
            await createDietPlan(clientId, name, mode, meals);
          }}
        />
      )}

      {tab === "today" && (
        <TodayLogsView logs={todayLogs} nutritionProfile={nutritionProfile} />
      )}

      {tab === "history" && (
        <HistoryView
          historyLogs={historyLogs}
          today={today}
          targets={{ calories: nutritionProfile?.calories_target ?? 0 }}
        />
      )}
    </div>
  );
}
