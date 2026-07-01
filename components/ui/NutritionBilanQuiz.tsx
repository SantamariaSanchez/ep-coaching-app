"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Check, ChevronRight, ChevronLeft, Camera, Sparkles, Search, X, Plus,
} from "lucide-react";
import type { NutritionProfile, Food, FoodLogWithFood } from "@/utils/nutrition";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MealSlotDef {
  key: string;
  label: string;
  emoji: string;
}

const ALL_SLOTS: MealSlotDef[] = [
  { key: "breakfast",   label: "Petit-déjeuner",      emoji: "☀️" },
  { key: "morning",     label: "Collation matin",      emoji: "🍎" },
  { key: "lunch",       label: "Déjeuner",             emoji: "🍽️" },
  { key: "afternoon",   label: "Collation après-midi", emoji: "🥜" },
  { key: "postworkout", label: "Post-entraînement",    emoji: "💪" },
  { key: "dinner",      label: "Dîner",                emoji: "🌙" },
];

interface SelectedFood {
  food: Food;
  qty: "petit" | "moyen" | "grand" | "double";
}

// qty → grammes (pour les calculs macros)
const QTY_G: Record<string, number> = {
  petit:  70,
  moyen: 120,
  grand: 180,
  double: 250,
};
const QTY_LABELS: Record<string, string> = {
  petit:  "Petite (≈70g)",
  moyen:  "Normale (≈120g)",
  grand:  "Grande (≈180g)",
  double: "Double (≈250g)",
};

function calcMacros(food: Food, qtyKey: string) {
  const g = QTY_G[qtyKey] ?? 100;
  return {
    calories: Math.round(food.calories_per_100 * g / 100),
    proteins: Math.round(food.proteins_per_100 * g / 100),
    carbs:    Math.round(food.carbs_per_100    * g / 100),
    fats:     Math.round(food.fats_per_100     * g / 100),
  };
}

// ── LocalStorage photo helpers ─────────────────────────────────────────────────
// Photos taken during the day live in localStorage under ep-meal-{date}-{slot}.
// They're used as visual cues during the evening quiz to jog memory.

function photoKey(date: string, slot: string) {
  return `ep-meal-${date}-${slot}`;
}

export function saveMealPhoto(date: string, slot: string, dataUrl: string) {
  try { localStorage.setItem(photoKey(date, slot), dataUrl); } catch {}
}

export function loadMealPhoto(date: string, slot: string): string | null {
  try { return localStorage.getItem(photoKey(date, slot)); } catch { return null; }
}

export function clearMealPhotos(date: string) {
  ALL_SLOTS.forEach((s) => {
    try { localStorage.removeItem(photoKey(date, s.key)); } catch {}
  });
}

// ── Main Quiz Component ────────────────────────────────────────────────────────

interface Props {
  nutritionProfile: NutritionProfile | null;
  today: string;
  historyLogs: FoodLogWithFood[];
  allFoods: Food[];
  addFoodLog: (params: {
    foodId: string | null;
    mealSlot: string;
    quantityG: number;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    loggedAt: string;
  }) => Promise<{ id?: string; error?: string }>;
}

type Phase = "slots" | "meal" | "summary" | "done";

export default function NutritionBilanQuiz({
  nutritionProfile,
  today,
  historyLogs,
  allFoods,
  addFoodLog,
}: Props) {
  // ── Phase & navigation state ────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("slots");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [currentSlotIdx, setCurrentSlotIdx] = useState(0);
  const [mealFoods, setMealFoods] = useState<Record<string, SelectedFood[]>>({});

  // ── Food search state ───────────────────────────────────────────────────────
  const [searchQ, setSearchQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Submission state ────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ cal: number; prot: number; carbs: number; fat: number } | null>(null);

  // ── Photos (from localStorage) ──────────────────────────────────────────────
  const [photos, setPhotos] = useState<Record<string, string>>({});
  useEffect(() => {
    const p: Record<string, string> = {};
    ALL_SLOTS.forEach((s) => {
      const url = loadMealPhoto(today, s.key);
      if (url) p[s.key] = url;
    });
    setPhotos(p);
  }, [today]);

  // ── Current meal ────────────────────────────────────────────────────────────
  const activeMealKeys = useMemo(
    () => selectedSlots.filter((k) => ALL_SLOTS.find((s) => s.key === k)),
    [selectedSlots]
  );
  const currentSlotKey = activeMealKeys[currentSlotIdx] ?? null;
  const currentSlot = ALL_SLOTS.find((s) => s.key === currentSlotKey) ?? null;
  const currentSelections = mealFoods[currentSlotKey ?? ""] ?? [];

  // ── History suggestions for current slot ───────────────────────────────────
  const historySuggestions = useMemo(() => {
    if (!currentSlotKey) return [];
    const counts: Record<string, { food: Food; count: number }> = {};
    for (const log of historyLogs) {
      if (log.meal_slot !== currentSlotKey || !log.foods) continue;
      const name = log.foods.name;
      if (!counts[name]) counts[name] = { food: log.foods, count: 0 };
      counts[name].count++;
    }
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((e) => e.food);
  }, [historyLogs, currentSlotKey]);

  // ── Food search results ──────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const q = searchQ.toLowerCase().trim();
    if (!q) return [];
    return allFoods
      .filter((f) => f.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [allFoods, searchQ]);

  // ── Totals for summary ───────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let cal = 0, prot = 0, carbs = 0, fat = 0;
    for (const [, foods] of Object.entries(mealFoods)) {
      for (const sf of foods) {
        const m = calcMacros(sf.food, sf.qty);
        cal += m.calories; prot += m.proteins; carbs += m.carbs; fat += m.fats;
      }
    }
    return { cal, prot, carbs, fat };
  }, [mealFoods]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function toggleSlot(key: string) {
    setSelectedSlots((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleFood(food: Food) {
    const key = currentSlotKey ?? "";
    setMealFoods((prev) => {
      const list = prev[key] ?? [];
      const exists = list.find((sf) => sf.food.id === food.id);
      if (exists) return { ...prev, [key]: list.filter((sf) => sf.food.id !== food.id) };
      return { ...prev, [key]: [...list, { food, qty: "moyen" }] };
    });
  }

  function setQty(foodId: string, qty: SelectedFood["qty"]) {
    const key = currentSlotKey ?? "";
    setMealFoods((prev) => ({
      ...prev,
      [key]: (prev[key] ?? []).map((sf) =>
        sf.food.id === foodId ? { ...sf, qty } : sf
      ),
    }));
  }

  function goNextMeal() {
    setSearchQ("");
    setShowSearch(false);
    if (currentSlotIdx < activeMealKeys.length - 1) {
      setCurrentSlotIdx((i) => i + 1);
    } else {
      setPhase("summary");
    }
  }

  function goPrevMeal() {
    setSearchQ("");
    setShowSearch(false);
    if (currentSlotIdx > 0) {
      setCurrentSlotIdx((i) => i - 1);
    } else {
      setPhase("slots");
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const entries: Array<Parameters<typeof addFoodLog>[0]> = [];
    for (const [slotKey, foods] of Object.entries(mealFoods)) {
      for (const sf of foods) {
        const g = QTY_G[sf.qty] ?? 120;
        const m = calcMacros(sf.food, sf.qty);
        entries.push({
          foodId: sf.food.id,
          mealSlot: slotKey,
          quantityG: g,
          calories: m.calories,
          proteins: m.proteins,
          carbs: m.carbs,
          fats: m.fats,
          loggedAt: today,
        });
      }
    }

    // Also add entries for meals with no foods selected (skipped = 0 cal, omit)
    const results = await Promise.all(entries.map((e) => addFoodLog(e)));
    const failed = results.find((r) => r.error);

    setSubmitting(false);

    if (failed) {
      setError(failed.error ?? "Erreur lors du log.");
      return;
    }

    setSummary({ cal: totals.cal, prot: totals.prot, carbs: totals.carbs, fat: totals.fat });
    clearMealPhotos(today);
    setPhase("done");
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  // DONE
  if (phase === "done" && summary) {
    return (
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-2xl p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#E01E1E]/15 border border-[#E01E1E]/30 flex items-center justify-center mx-auto mb-4">
          <Sparkles size={24} className="text-[#E01E1E]" strokeWidth={1.8} />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1">Journée loggée</p>
        <p className="text-3xl font-black text-white mb-1">{summary.cal} kcal</p>
        <p className="text-xs text-[#F5EDED]/40 mb-5">
          estimé sur {activeMealKeys.length} repas · {entries(mealFoods)} aliment(s)
        </p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: "Protéines", val: summary.prot, color: "text-blue-300" },
            { label: "Glucides",  val: summary.carbs, color: "text-amber-300" },
            { label: "Lipides",   val: summary.fat,   color: "text-rose-300" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-[#150000] border border-[#890404]/20 rounded-xl p-3">
              <p className="text-[9px] text-[#F5EDED]/35 mb-0.5">{label}</p>
              <p className={`text-lg font-black ${color}`}>{val}g</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#F5EDED]/25">
          Tu peux affiner dans l&apos;onglet &quot;Aujourd&apos;hui&quot; si besoin.
        </p>
      </div>
    );
  }

  // SUMMARY
  if (phase === "summary") {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1">Récap</p>
          <h3 className="text-xl font-black text-white">Vérifie avant de logger</h3>
        </div>

        {activeMealKeys.map((key) => {
          const slot = ALL_SLOTS.find((s) => s.key === key)!;
          const foods = mealFoods[key] ?? [];
          if (foods.length === 0) return null;
          const slotCal = foods.reduce((s, sf) => s + calcMacros(sf.food, sf.qty).calories, 0);
          return (
            <div key={key} className="bg-[#1f0101] border border-[#890404]/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{slot.emoji}</span> {slot.label}
                </p>
                <p className="text-[10px] text-[#F5EDED]/40">{slotCal} kcal</p>
              </div>
              <div className="space-y-1">
                {foods.map((sf) => {
                  const m = calcMacros(sf.food, sf.qty);
                  return (
                    <div key={sf.food.id} className="flex items-center justify-between">
                      <p className="text-xs text-[#F5EDED]/70 truncate flex-1">{sf.food.name}</p>
                      <p className="text-[10px] text-[#F5EDED]/35 flex-shrink-0 ml-2">
                        {QTY_G[sf.qty]}g · {m.calories} kcal
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="bg-[#E01E1E]/10 border border-[#E01E1E]/25 rounded-xl p-4">
          <div className="flex gap-4">
            <div><p className="text-2xl font-black text-[#E01E1E]">{totals.cal}</p><p className="text-[9px] text-[#F5EDED]/35">kcal</p></div>
            <div><p className="text-lg font-black text-blue-300">{totals.prot}g</p><p className="text-[9px] text-[#F5EDED]/35">Prot</p></div>
            <div><p className="text-lg font-black text-amber-300">{totals.carbs}g</p><p className="text-[9px] text-[#F5EDED]/35">Gluc</p></div>
            <div><p className="text-lg font-black text-rose-300">{totals.fat}g</p><p className="text-[9px] text-[#F5EDED]/35">Lip</p></div>
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={() => { setCurrentSlotIdx(activeMealKeys.length - 1); setPhase("meal"); }}
            className="flex items-center gap-1 px-4 py-2.5 border border-[#890404]/40 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/50 hover:text-[#F5EDED]/80"
          >
            <ChevronLeft size={13} /> Modifier
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-4 py-3.5 rounded-xl disabled:opacity-40 transition-colors"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Sparkles size={13} /> Logger ma journée</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // SLOT SELECTION
  if (phase === "slots") {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1">Étape 1</p>
          <h3 className="text-xl font-black text-white mb-1">Quels repas as-tu fait aujourd&apos;hui ?</h3>
          <p className="text-xs text-[#F5EDED]/40">Sélectionne tout ce qui s&apos;applique.</p>
        </div>

        <div className="space-y-2">
          {ALL_SLOTS.map((slot) => {
            const hasPhoto = !!photos[slot.key];
            const selected = selectedSlots.includes(slot.key);
            return (
              <button
                key={slot.key}
                onClick={() => toggleSlot(slot.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  selected
                    ? "bg-[#E01E1E]/12 border-[#E01E1E]/40"
                    : "bg-[#1f0101] border-[#890404]/25 hover:border-[#890404]/50"
                }`}
              >
                <span className="text-xl flex-shrink-0">{slot.emoji}</span>
                <span className="flex-1">
                  <span className={`text-sm font-bold ${selected ? "text-white" : "text-[#F5EDED]/65"}`}>
                    {slot.label}
                  </span>
                  {hasPhoto && (
                    <span className="ml-2 text-[9px] text-purple-400 font-bold">📸 photo</span>
                  )}
                </span>
                {selected && <Check size={15} className="text-[#E01E1E] flex-shrink-0" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => { setCurrentSlotIdx(0); setPhase("meal"); }}
          disabled={selectedSlots.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-4 py-3.5 rounded-xl disabled:opacity-40 transition-colors"
        >
          Commencer le détail <ChevronRight size={15} />
        </button>
      </div>
    );
  }

  // MEAL DETAIL
  if (phase === "meal" && currentSlot) {
    const photo = photos[currentSlotKey!];
    const mealProgress = `${currentSlotIdx + 1}/${activeMealKeys.length}`;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
              Repas {mealProgress}
            </p>
            <p className="text-[10px] text-[#F5EDED]/30">
              {currentSelections.length > 0 ? `${currentSelections.length} aliment(s)` : ""}
            </p>
          </div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <span>{currentSlot.emoji}</span>
            {currentSlot.label}
          </h3>
        </div>

        {/* Photo reminder */}
        {photo && (
          <div className="relative rounded-xl overflow-hidden">
            <img src={photo} alt={currentSlot.label} className="w-full max-h-36 object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
              <p className="text-[10px] text-white font-semibold">📸 Ta photo de ce repas</p>
            </div>
          </div>
        )}

        {/* Selected foods */}
        {currentSelections.length > 0 && (
          <div className="bg-[#150000] border border-[#890404]/20 rounded-xl p-3 space-y-2">
            {currentSelections.map((sf) => (
              <div key={sf.food.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white truncate flex-1">{sf.food.name}</p>
                  <button
                    onClick={() => toggleFood(sf.food)}
                    className="text-[#F5EDED]/25 hover:text-red-400 ml-2 flex-shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(["petit", "moyen", "grand", "double"] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQty(sf.food.id, q)}
                      className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border transition-colors ${
                        sf.qty === q
                          ? "bg-[#E01E1E]/15 border-[#E01E1E]/40 text-[#E01E1E]"
                          : "border-[#890404]/25 text-[#F5EDED]/35 hover:border-[#890404]/50"
                      }`}
                    >
                      {q === "petit" ? "Petite" : q === "moyen" ? "Normale" : q === "grand" ? "Grande" : "Double"}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-[#F5EDED]/30">
                  ≈ {QTY_G[sf.qty]}g · {calcMacros(sf.food, sf.qty).calories} kcal
                </p>
              </div>
            ))}
          </div>
        )}

        {/* History suggestions */}
        {historySuggestions.length > 0 && !showSearch && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-2 flex items-center gap-1.5">
              <span>⏱</span> Tes habitudes pour ce créneau
            </p>
            <div className="space-y-1.5">
              {historySuggestions.map((food) => {
                const selected = currentSelections.find((sf) => sf.food.id === food.id);
                return (
                  <button
                    key={food.id}
                    onClick={() => toggleFood(food)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      selected
                        ? "bg-[#E01E1E]/12 border-[#E01E1E]/35"
                        : "bg-[#1f0101] border-[#890404]/20 hover:border-[#890404]/45"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${selected ? "text-white" : "text-[#F5EDED]/70"}`}>
                        {food.name}
                      </p>
                      <p className="text-[9px] text-[#F5EDED]/30 mt-0.5">
                        {food.calories_per_100} kcal/100g · P {food.proteins_per_100}g
                      </p>
                    </div>
                    {selected
                      ? <Check size={14} className="text-[#E01E1E] flex-shrink-0" strokeWidth={2.5} />
                      : <Plus size={13} className="text-[#F5EDED]/25 flex-shrink-0" />
                    }
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        {showSearch ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 flex-1">
                Rechercher un aliment
              </p>
              <button onClick={() => { setShowSearch(false); setSearchQ(""); }} className="text-[#F5EDED]/30 hover:text-[#F5EDED]/60">
                <X size={13} />
              </button>
            </div>
            <input
              ref={searchRef}
              autoFocus
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Ex. riz complet, poulet…"
              className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/50 mb-2"
            />
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {searchResults.length === 0 && searchQ.trim() && (
                <p className="text-xs text-[#F5EDED]/30 py-4 text-center">Aucun résultat</p>
              )}
              {searchResults.map((food) => {
                const selected = currentSelections.find((sf) => sf.food.id === food.id);
                return (
                  <button
                    key={food.id}
                    onClick={() => toggleFood(food)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      selected ? "bg-[#E01E1E]/12 border-[#E01E1E]/35" : "bg-[#1f0101] border-[#890404]/20"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#F5EDED]/80 truncate">{food.name}</p>
                      <p className="text-[9px] text-[#F5EDED]/30">{food.calories_per_100} kcal/100g</p>
                    </div>
                    {selected
                      ? <Check size={14} className="text-[#E01E1E] flex-shrink-0" strokeWidth={2.5} />
                      : <Plus size={13} className="text-[#F5EDED]/25 flex-shrink-0" />
                    }
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-[#890404]/30 hover:border-[#890404]/55 rounded-xl px-4 py-2.5 text-xs text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
          >
            <Search size={13} />
            Ajouter un autre aliment
          </button>
        )}

        {/* Nav */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={goPrevMeal}
            className="flex items-center gap-1 px-4 py-2.5 border border-[#890404]/30 rounded-xl text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
          >
            <ChevronLeft size={13} /> Retour
          </button>
          <button
            onClick={goNextMeal}
            className="flex-1 flex items-center justify-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-4 py-3 rounded-xl transition-colors"
          >
            {currentSlotIdx < activeMealKeys.length - 1 ? (
              <><span>Repas suivant</span> <ChevronRight size={15} /></>
            ) : (
              <><span>Voir le récap</span> <ChevronRight size={15} /></>
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Helper: count total food entries
function entries(mealFoods: Record<string, SelectedFood[]>) {
  return Object.values(mealFoods).reduce((s, foods) => s + foods.length, 0);
}
