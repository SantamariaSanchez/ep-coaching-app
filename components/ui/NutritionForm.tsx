"use client";

import { useState, useMemo } from "react";
import Card from "./Card";
import type { NutritionProfile, NutritionProfileInput } from "@/utils/nutrition";
import { AlertCircle, Check, FlameKindling } from "lucide-react";

const TRAINING_TYPES = [
  { label: "Musculation", kcal_per_hour: 45 },
  { label: "Cardio léger", kcal_per_hour: 200 },
  { label: "Cardio modéré", kcal_per_hour: 350 },
  { label: "Cardio intense", kcal_per_hour: 500 },
];

const ACTIVITY_LEVELS = [
  { label: "Sédentaire", value: 300 },
  { label: "Léger", value: 500 },
  { label: "Modéré", value: 700 },
  { label: "Actif", value: 900 },
];

const PHASE_ADJUSTMENTS: Record<string, { label: string; value: number }[]> = {
  deficit: [
    { label: "−300 kcal", value: -300 },
    { label: "−400 kcal", value: -400 },
    { label: "−500 kcal", value: -500 },
  ],
  maintenance: [{ label: "0 kcal", value: 0 }],
  surplus: [
    { label: "+200 kcal", value: 200 },
    { label: "+300 kcal", value: 300 },
    { label: "+400 kcal", value: 400 },
  ],
};

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

const labelCls =
  "text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block";

export default function NutritionForm({
  clientId,
  existingProfile,
  clientWeight,
  saveNutritionProfile,
}: {
  clientId: string;
  existingProfile: NutritionProfile | null;
  clientWeight: number | null;
  saveNutritionProfile: (
    clientId: string,
    data: NutritionProfileInput
  ) => Promise<{ error?: string }>;
}) {
  const [form, setForm] = useState({
    gender: "Homme" as "Homme" | "Femme",
    weight: clientWeight ? String(clientWeight) : "",
    height: "",
    age: "",
    trainingType: "Musculation",
    sessionsPerWeek: "",
    sessionDuration: "",
    stepsPerDay: "",
    activityLevel: "500",
    phase: existingProfile?.phase ?? "maintenance",
    adjustment: existingProfile?.phase === "deficit"
      ? "-300"
      : existingProfile?.phase === "surplus"
      ? "200"
      : "0",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "phase") {
        const adj = PHASE_ADJUSTMENTS[value as string];
        if (adj) next.adjustment = String(adj[0].value);
      }
      return next;
    });
  }

  const calc = useMemo(() => {
    const w = parseFloat(form.weight);
    const h = parseFloat(form.height);
    const a = parseFloat(form.age);
    if (!w || !h || !a || w <= 0 || h <= 0 || a <= 0) return null;

    const bmr =
      form.gender === "Homme"
        ? 10 * w + 6.25 * h - 5 * a + 5
        : 10 * w + 6.25 * h - 5 * a - 161;

    const kcalPerHour =
      TRAINING_TYPES.find((t) => t.label === form.trainingType)
        ?.kcal_per_hour ?? 45;
    const sessions = parseFloat(form.sessionsPerWeek) || 0;
    const duration = parseFloat(form.sessionDuration) || 0;
    const eat = kcalPerHour * (duration / 60) * sessions / 7;

    const steps = parseFloat(form.stepsPerDay) || 0;
    const neatSteps = steps * 0.04;
    const neatActivity = parseFloat(form.activityLevel) || 0;
    const neat = neatSteps + neatActivity;

    const tef = 0.1 * (bmr + eat + neat);
    const tdee = bmr + eat + neat + tef;

    const adj = parseFloat(form.adjustment) || 0;
    const caloriesTarget = tdee + adj;

    const proteinsG = 2.0 * w;
    const fatsG = 1.0 * w;
    const proteinsKcal = proteinsG * 4;
    const fatsKcal = fatsG * 9;
    const carbsG = Math.max(0, (caloriesTarget - proteinsKcal - fatsKcal) / 4);

    return {
      bmr: Math.round(bmr),
      eat: Math.round(eat),
      neat: Math.round(neat),
      tef: Math.round(tef),
      tdee: Math.round(tdee),
      caloriesTarget: Math.round(caloriesTarget),
      proteinsG: Math.round(proteinsG),
      fatsG: Math.round(fatsG),
      carbsG: Math.round(carbsG),
    };
  }, [form]);

  async function handleSave() {
    if (!calc) {
      setError("Remplis tous les champs obligatoires (poids, taille, âge).");
      return;
    }
    setError(null);
    setSaving(true);
    const result = await saveNutritionProfile(clientId, {
      calories_target: calc.caloriesTarget,
      proteins_target: calc.proteinsG,
      carbs_target: calc.carbsG,
      fats_target: calc.fatsG,
      tdee: calc.tdee,
      bmr: calc.bmr,
      phase: form.phase,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="space-y-5">
      {/* Current targets banner */}
      {existingProfile && (
        <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
          <p className={labelCls}>Objectifs actuels</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Calories", value: existingProfile.calories_target, unit: "kcal" },
              { label: "Protéines", value: existingProfile.proteins_target, unit: "g" },
              { label: "Glucides", value: existingProfile.carbs_target, unit: "g" },
              { label: "Lipides", value: existingProfile.fats_target, unit: "g" },
            ].map(({ label, value, unit }) => (
              <div key={label}>
                <p className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest font-semibold">
                  {label}
                </p>
                <p className="text-2xl font-black text-white">
                  {value ?? "—"}
                  <span className="text-xs font-normal text-[#F5EDED]/40 ml-1">{unit}</span>
                </p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#F5EDED]/25 mt-3">
            Phase :{" "}
            <span className="text-[#E01E1E] font-semibold capitalize">
              {existingProfile.phase ?? "—"}
            </span>{" "}
            · TDEE :{" "}
            <span className="text-white font-semibold">
              {existingProfile.tdee ?? "—"} kcal
            </span>
          </p>
        </div>
      )}

      {/* Section: Données de base */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className={labelCls + " mb-4"}>Données de base</p>

        {/* Gender */}
        <div className="mb-4">
          <label className={labelCls}>Sexe</label>
          <div className="flex gap-2">
            {(["Homme", "Femme"] as const).map((g) => (
              <button
                key={g}
                onClick={() => set("gender", g)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg border transition-colors ${
                  form.gender === g
                    ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]"
                    : "border-[#890404]/30 text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Poids (kg)</label>
            <input
              type="number"
              value={form.weight}
              onChange={(e) => set("weight", e.target.value)}
              placeholder="80"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Taille (cm)</label>
            <input
              type="number"
              value={form.height}
              onChange={(e) => set("height", e.target.value)}
              placeholder="175"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Âge</label>
            <input
              type="number"
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
              placeholder="30"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Section: Activité sportive */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className={labelCls + " mb-4"}>Activité sportive</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Type d&apos;entraînement</label>
            <select
              value={form.trainingType}
              onChange={(e) => set("trainingType", e.target.value)}
              className={inputCls}
            >
              {TRAINING_TYPES.map((t) => (
                <option key={t.label} value={t.label}>
                  {t.label} ({t.kcal_per_hour} kcal/h)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Séances / semaine</label>
            <input
              type="number"
              min="0"
              max="14"
              value={form.sessionsPerWeek}
              onChange={(e) => set("sessionsPerWeek", e.target.value)}
              placeholder="4"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Durée séance (min)</label>
            <input
              type="number"
              min="0"
              value={form.sessionDuration}
              onChange={(e) => set("sessionDuration", e.target.value)}
              placeholder="60"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Section: Activité quotidienne */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className={labelCls + " mb-4"}>Activité quotidienne</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Pas par jour</label>
            <input
              type="number"
              min="0"
              value={form.stepsPerDay}
              onChange={(e) => set("stepsPerDay", e.target.value)}
              placeholder="8000"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Niveau d&apos;activité hors sport</label>
            <select
              value={form.activityLevel}
              onChange={(e) => set("activityLevel", e.target.value)}
              className={inputCls}
            >
              {ACTIVITY_LEVELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label} (+{a.value} kcal NEAT)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section: Objectif */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className={labelCls + " mb-4"}>Objectif</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(["deficit", "maintenance", "surplus"] as const).map((p) => (
            <button
              key={p}
              onClick={() => set("phase", p)}
              className={`py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg border transition-colors ${
                form.phase === p
                  ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]"
                  : "border-[#890404]/30 text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
              }`}
            >
              {p === "deficit" ? "Déficit" : p === "maintenance" ? "Maintenance" : "Surplus"}
            </button>
          ))}
        </div>
        <div>
          <label className={labelCls}>Ajustement calorique</label>
          <select
            value={form.adjustment}
            onChange={(e) => set("adjustment", e.target.value)}
            disabled={form.phase === "maintenance"}
            className={inputCls + " disabled:opacity-50"}
          >
            {(PHASE_ADJUSTMENTS[form.phase] ?? []).map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {calc ? (
        <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FlameKindling size={14} className="text-[#E01E1E]" />
            <p className={labelCls + " mb-0"}>Résultats calculés</p>
          </div>

          {/* TDEE breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 pb-5 border-b border-[#890404]/20">
            {[
              { label: "BMR", value: calc.bmr },
              { label: "EAT", value: calc.eat },
              { label: "NEAT", value: calc.neat },
              { label: "TEF", value: calc.tef },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2.5"
              >
                <p className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest font-semibold">
                  {label}
                </p>
                <p className="text-xl font-black text-white">
                  {value}
                  <span className="text-[10px] text-[#F5EDED]/40 ml-1">kcal</span>
                </p>
              </div>
            ))}
          </div>

          {/* Targets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#890404]/15 border border-[#890404]/30 rounded-lg px-3 py-2.5 sm:col-span-4">
              <p className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest font-semibold">
                TDEE total
              </p>
              <p className="text-3xl font-black text-[#E01E1E]">
                {calc.tdee}
                <span className="text-sm text-[#F5EDED]/40 ml-1 font-normal">kcal/j</span>
              </p>
            </div>
            {[
              { label: "Objectif calorique", value: calc.caloriesTarget, unit: "kcal", color: "text-white" },
              { label: "Protéines", value: calc.proteinsG, unit: "g", color: "text-blue-300" },
              { label: "Glucides", value: calc.carbsG, unit: "g", color: "text-amber-300" },
              { label: "Lipides", value: calc.fatsG, unit: "g", color: "text-rose-300" },
            ].map(({ label, value, unit, color }) => (
              <div
                key={label}
                className="bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2.5"
              >
                <p className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest font-semibold">
                  {label}
                </p>
                <p className={`text-2xl font-black ${color}`}>
                  {value}
                  <span className="text-[10px] text-[#F5EDED]/40 ml-1 font-normal">{unit}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl p-8 text-center">
          <p className="text-xs text-[#F5EDED]/30 font-semibold uppercase tracking-widest">
            Remplis poids, taille et âge pour voir le calcul
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-3">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={!calc || saving || saved}
          className={`inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg transition-colors ${
            saved
              ? "bg-green-800/60 border border-green-600/30"
              : "bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50"
          }`}
        >
          {saved ? (
            <>
              <Check size={13} />
              Sauvegardé
            </>
          ) : saving ? (
            "Sauvegarde…"
          ) : (
            "Sauvegarder les objectifs"
          )}
        </button>
      </div>
    </div>
  );
}
