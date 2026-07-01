"use client";

import { useState } from "react";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import type { NutritionProfile } from "@/utils/nutrition";

// ── Types ─────────────────────────────────────────────────────────────────────

type MealCount = 1 | 2 | 3 | 4;
type QuantityLevel = "peu" | "normal" | "bien" | "trop";
type ProteinLevel = "insuff" | "correct" | "top";
type FoodQuality = "sain" | "moyen" | "junk";

interface QuizAnswers {
  mealCount: MealCount | null;
  quantity: QuantityLevel | null;
  proteins: ProteinLevel | null;
  quality: FoodQuality | null;
}

// ── Estimation logic ───────────────────────────────────────────────────────────
// Converts quiz answers + nutrition targets into absolute macro estimates,
// then distributes them across meal slots proportionally.

const CAL_MULT: Record<QuantityLevel, number> = {
  peu: 0.55,
  normal: 0.88,
  bien: 1.02,
  trop: 1.20,
};

const PROT_MULT: Record<ProteinLevel, number> = {
  insuff: 0.60,
  correct: 0.88,
  top: 1.10,
};

const JUNK_FAT_MULT: Record<FoodQuality, number> = {
  sain: 1.0,
  moyen: 1.15,
  junk: 1.35,
};

const MEAL_SLOT_DISTRIBUTIONS: Record<MealCount, { slot: string; share: number }[]> = {
  1: [{ slot: "lunch", share: 1.0 }],
  2: [
    { slot: "lunch", share: 0.45 },
    { slot: "dinner", share: 0.55 },
  ],
  3: [
    { slot: "breakfast", share: 0.25 },
    { slot: "lunch", share: 0.40 },
    { slot: "dinner", share: 0.35 },
  ],
  4: [
    { slot: "breakfast", share: 0.20 },
    { slot: "morning", share: 0.15 },
    { slot: "lunch", share: 0.32 },
    { slot: "dinner", share: 0.33 },
  ],
};

interface CompletedAnswers {
  mealCount: MealCount;
  quantity: QuantityLevel;
  proteins: ProteinLevel;
  quality: FoodQuality;
}

function estimateMacros(answers: CompletedAnswers, profile: NutritionProfile | null) {
  const baseCal = profile?.calories_target ?? 2000;
  const baseProt = profile?.proteins_target ?? 150;
  const baseFat = profile?.fats_target ?? 65;

  const totalCal = Math.round(baseCal * CAL_MULT[answers.quantity]);
  const totalProt = Math.round(baseProt * PROT_MULT[answers.proteins]);
  const totalFat = Math.round(baseFat * JUNK_FAT_MULT[answers.quality]);
  const totalCarbs = Math.max(0, Math.round((totalCal - totalProt * 4 - totalFat * 9) / 4));

  return { totalCal, totalProt, totalFat, totalCarbs };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function OptionButton<T>({
  value,
  selected,
  label,
  sublabel,
  emoji,
  onSelect,
}: {
  value: T;
  selected: boolean;
  label: string;
  sublabel?: string;
  emoji: string;
  onSelect: (v: T) => void;
}) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
        selected
          ? "bg-[#E01E1E]/15 border-[#E01E1E]/50"
          : "bg-[#1f0101] border-[#890404]/25 hover:border-[#890404]/50"
      }`}
    >
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${selected ? "text-white" : "text-[#F5EDED]/70"}`}>
          {label}
        </p>
        {sublabel && (
          <p className="text-[10px] text-[#F5EDED]/35 mt-0.5">{sublabel}</p>
        )}
      </div>
      {selected && <Check size={15} className="text-[#E01E1E] flex-shrink-0" strokeWidth={2.5} />}
    </button>
  );
}

// ── Main Quiz Component ────────────────────────────────────────────────────────

interface Props {
  nutritionProfile: NutritionProfile | null;
  today: string;
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

const STEPS = ["repas", "quantite", "proteines", "qualite", "resultat"] as const;
type Step = (typeof STEPS)[number];

export default function NutritionBilanQuiz({ nutritionProfile, today, addFoodLog }: Props) {
  const [step, setStep] = useState<Step>("repas");
  const [answers, setAnswers] = useState<QuizAnswers>({
    mealCount: null,
    quantity: null,
    proteins: null,
    quality: null,
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ cal: number; prot: number; carbs: number; fat: number } | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  function next() {
    const nextStep = STEPS[stepIndex + 1];
    if (nextStep) setStep(nextStep);
  }

  function canNext() {
    if (step === "repas") return answers.mealCount != null;
    if (step === "quantite") return answers.quantity != null;
    if (step === "proteines") return answers.proteins != null;
    if (step === "qualite") return answers.quality != null;
    return false;
  }

  async function handleSubmit() {
    if (!answers.mealCount || !answers.quantity || !answers.proteins || !answers.quality) return;
    setLoading(true);
    setError(null);

    const { totalCal, totalProt, totalFat, totalCarbs } = estimateMacros(
      {
        mealCount: answers.mealCount!,
        quantity: answers.quantity!,
        proteins: answers.proteins!,
        quality: answers.quality!,
      },
      nutritionProfile
    );

    const distribution = MEAL_SLOT_DISTRIBUTIONS[answers.mealCount];

    const results = await Promise.all(
      distribution.map(({ slot, share }) =>
        addFoodLog({
          foodId: null,
          mealSlot: slot,
          quantityG: 100,
          calories: Math.round(totalCal * share),
          proteins: Math.round(totalProt * share),
          carbs: Math.round(totalCarbs * share),
          fats: Math.round(totalFat * share),
          loggedAt: today,
        })
      )
    );

    setLoading(false);

    const failed = results.find((r) => r.error);
    if (failed) {
      setError(failed.error ?? "Erreur lors du log.");
      return;
    }

    setSummary({ cal: totalCal, prot: totalProt, carbs: totalCarbs, fat: totalFat });
    setDone(true);
    setStep("resultat");
  }

  if (done && step === "resultat") {
    return (
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-2xl p-6 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E01E1E]/15 border border-[#E01E1E]/30 flex items-center justify-center">
            <Sparkles size={24} className="text-[#E01E1E]" strokeWidth={1.8} />
          </div>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-2">Bilan logué !</p>
        <p className="text-2xl font-black text-white mb-1">
          {summary?.cal} kcal
        </p>
        <p className="text-xs text-[#F5EDED]/40 mb-5">
          P {summary?.prot}g · G {summary?.carbs}g · L {summary?.fat}g
        </p>
        <div className="flex gap-2">
          <div className="flex-1 bg-[#150000] border border-[#890404]/20 rounded-xl p-3">
            <p className="text-[10px] text-[#F5EDED]/35 mb-0.5">Protéines</p>
            <p className="text-base font-black text-blue-300">{summary?.prot}g</p>
          </div>
          <div className="flex-1 bg-[#150000] border border-[#890404]/20 rounded-xl p-3">
            <p className="text-[10px] text-[#F5EDED]/35 mb-0.5">Glucides</p>
            <p className="text-base font-black text-amber-300">{summary?.carbs}g</p>
          </div>
          <div className="flex-1 bg-[#150000] border border-[#890404]/20 rounded-xl p-3">
            <p className="text-[10px] text-[#F5EDED]/35 mb-0.5">Lipides</p>
            <p className="text-base font-black text-rose-300">{summary?.fat}g</p>
          </div>
        </div>
        <p className="text-[10px] text-[#F5EDED]/25 mt-4">
          Estimation basée sur tes réponses — tu peux affiner via le log manuel si besoin.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/40 rounded-2xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-[#890404]/15">
        <div
          className="h-full bg-[#E01E1E] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-5">
        {step === "repas" && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
              Question 1 / 4
            </p>
            <h3 className="text-lg font-black text-white mb-4">
              Combien de repas as-tu fait aujourd&apos;hui ?
            </h3>
            <div className="flex flex-col gap-2">
              {([
                { v: 1, emoji: "1️⃣", label: "1 repas", sublabel: "Un seul grand repas" },
                { v: 2, emoji: "2️⃣", label: "2 repas", sublabel: "Ex. déjeuner + dîner" },
                { v: 3, emoji: "3️⃣", label: "3 repas", sublabel: "Petit-déj + déj + dîner" },
                { v: 4, emoji: "4️⃣", label: "4 repas ou +", sublabel: "Avec collation(s)" },
              ] as const).map(({ v, emoji, label, sublabel }) => (
                <OptionButton
                  key={v}
                  value={v as MealCount}
                  selected={answers.mealCount === v}
                  emoji={emoji}
                  label={label}
                  sublabel={sublabel}
                  onSelect={(val) => setAnswers((a) => ({ ...a, mealCount: val }))}
                />
              ))}
            </div>
          </div>
        )}

        {step === "quantite" && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
              Question 2 / 4
            </p>
            <h3 className="text-lg font-black text-white mb-4">
              Dans l&apos;ensemble, tu as mangé…
            </h3>
            <div className="flex flex-col gap-2">
              {([
                { v: "peu" as const, emoji: "🔻", label: "Très peu", sublabel: "Beaucoup moins que d'habitude" },
                { v: "normal" as const, emoji: "🎯", label: "Normal", sublabel: "Environ mes besoins" },
                { v: "bien" as const, emoji: "💪", label: "Bien", sublabel: "Légèrement au-dessus" },
                { v: "trop" as const, emoji: "🔺", label: "Trop", sublabel: "Nettement au-dessus" },
              ]).map(({ v, emoji, label, sublabel }) => (
                <OptionButton
                  key={v}
                  value={v}
                  selected={answers.quantity === v}
                  emoji={emoji}
                  label={label}
                  sublabel={sublabel}
                  onSelect={(val) => setAnswers((a) => ({ ...a, quantity: val }))}
                />
              ))}
            </div>
          </div>
        )}

        {step === "proteines" && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
              Question 3 / 4
            </p>
            <h3 className="text-lg font-black text-white mb-4">
              Tes protéines aujourd&apos;hui ?
            </h3>
            <div className="flex flex-col gap-2">
              {([
                { v: "insuff" as const, emoji: "😬", label: "Insuffisantes", sublabel: "Peu de viande, poisson, oeufs…" },
                { v: "correct" as const, emoji: "👌", label: "Correctes", sublabel: "À peu près mon objectif" },
                { v: "top" as const, emoji: "💪", label: "Au top", sublabel: "J'ai bien hit mes protéines" },
              ]).map(({ v, emoji, label, sublabel }) => (
                <OptionButton
                  key={v}
                  value={v}
                  selected={answers.proteins === v}
                  emoji={emoji}
                  label={label}
                  sublabel={sublabel}
                  onSelect={(val) => setAnswers((a) => ({ ...a, proteins: val }))}
                />
              ))}
            </div>
          </div>
        )}

        {step === "qualite" && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
              Question 4 / 4
            </p>
            <h3 className="text-lg font-black text-white mb-4">
              La qualité de tes repas ?
            </h3>
            <div className="flex flex-col gap-2">
              {([
                { v: "sain" as const, emoji: "✅", label: "Sains et équilibrés", sublabel: "Fait maison, légumes, peu de transformation" },
                { v: "moyen" as const, emoji: "😐", label: "Moyennement", sublabel: "Mix de sain et moins sain" },
                { v: "junk" as const, emoji: "🍔", label: "Plutôt fast-food", sublabel: "Restaurant, livraison, plats préparés" },
              ]).map(({ v, emoji, label, sublabel }) => (
                <OptionButton
                  key={v}
                  value={v}
                  selected={answers.quality === v}
                  emoji={emoji}
                  label={label}
                  sublabel={sublabel}
                  onSelect={(val) => setAnswers((a) => ({ ...a, quality: val }))}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 mt-3 text-center">{error}</p>
        )}

        <div className="mt-5">
          {step === "qualite" ? (
            <button
              onClick={handleSubmit}
              disabled={!canNext() || loading}
              className="w-full flex items-center justify-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-sm font-bold uppercase tracking-widest px-4 py-3.5 rounded-xl disabled:opacity-40 transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={14} />
                  Logger ma journée automatiquement
                </>
              )}
            </button>
          ) : (
            <button
              onClick={next}
              disabled={!canNext()}
              className="w-full flex items-center justify-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-sm font-bold uppercase tracking-widest px-4 py-3.5 rounded-xl disabled:opacity-40 transition-colors"
            >
              Suivant
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
