"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import type { Food, DietPlanWithMeals, DietMode, DietStructure, DayOfWeek } from "@/utils/nutrition";
import { calculateNutrients } from "@/utils/nutrition-utils";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";

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
  { key: "fixed", label: "Fixe", icon: Lock, desc: "Plan strict — coche chaque aliment au fil de la journée" },
  { key: "fixed_flexible", label: "Fixe Flexible", icon: Sliders, desc: "Plan avec swaps autorisés dans la même catégorie" },
];

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
}: {
  foods: Food[];
  onCreate: (name: string, mode: DietMode, meals: DietPlanMealInput[], structure: DietStructure) => Promise<void>;
}) {
  const [planName, setPlanName] = useState("");
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

  const currentDay = structure === "weekly" ? activeDay : null;

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

  async function handleSave() {
    if (!planName.trim()) { setError("Nom du plan requis."); return; }
    setSaving(true);
    setError(null);
    const inputs: DietPlanMealInput[] = meals.map((m, i) => ({
      meal_slot: m.slotKey,
      food_id: m.foodId,
      quantity_g: m.quantityG,
      position: i,
      day_of_week: m.day,
    }));
    await onCreate(planName.trim(), mode, inputs, structure);
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
              ? "Construis chaque jour séparément — utile pour des jours \"on\"/\"off\" ou un jour de recharge glucidique."
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
            En mode Flexible, tu logues librement tes repas — aucun plan prédéfini nécessaire.
          </p>
        </div>
      )}

      {/* Meal slots for fixed modes */}
      {mode !== "flexible" && (
        <>
          <div className="space-y-3">
            {MEAL_SLOTS.map((slot) => {
              const slotMeals = dayMeals.filter((m) => m.slotKey === slot.key);
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

          {/* Plan totals */}
          {meals.length > 0 && (
            <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
                {structure === "weekly" ? `Total — ${DAY_TABS.find((d) => d.key === activeDay)?.label}` : "Total du plan"}
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
  }, [visibleMeals]);

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
            <p className="text-[10px] text-[#F5EDED]/25 italic">Plan flexible — aucun aliment prédéfini.</p>
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
