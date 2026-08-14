"use client";

import { useState, useMemo, useEffect } from "react";
import type { NutritionProfile, NutritionProfileInput } from "@/utils/nutrition";
import type { DailyLog } from "@/utils/daily-logs";
import { computeObservedTdee } from "@/lib/tdee-suggestion";
import { AlertCircle, Check, FlameKindling, TrendingUp } from "lucide-react";

const TRAINING_TYPES = [
  { label: "Musculation", kcal_per_hour: 45 },
  { label: "Cardio léger", kcal_per_hour: 200 },
  { label: "Cardio modéré", kcal_per_hour: 350 },
  { label: "Cardio intense", kcal_per_hour: 500 },
];

// Activité professionnelle uniquement — volontairement indépendante des pas
// quotidiens (déjà comptés séparément juste en dessous). Avant cette
// correction, les deux termes se chevauchaient (marcher = pas ET "niveau
// d'activité"), ce qui gonflait artificiellement le TDEE de toute personne
// remplissant les deux champs.
const ACTIVITY_LEVELS = [
  { label: "Assis (bureau)", value: 0 },
  { label: "Debout / déplacements", value: 150 },
  { label: "Physique (manutention, chantier)", value: 350 },
  { label: "Très physique", value: 600 },
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
  recentDailyLogs = [],
  saveNutritionProfile,
}: {
  clientId: string;
  existingProfile: NutritionProfile | null;
  clientWeight: number | null;
  /** Bilans des ~21 derniers jours — sert à comparer le TDEE formule vs réel */
  recentDailyLogs?: DailyLog[];
  saveNutritionProfile: (
    clientId: string,
    data: NutritionProfileInput
  ) => Promise<{ error?: string }>;
}) {
  const lsKey = `ep-tdee-${clientId}`;

  const [form, setForm] = useState(() => {
    return {
      gender: (existingProfile?.gender ?? "Homme") as "Homme" | "Femme",
      // La valeur sauvegardée par le coach (override) prime sur le dernier
      // poids loggé par le client — sinon toute correction manuelle était
      // écrasée au rechargement suivant.
      weight: existingProfile?.weight != null ? String(existingProfile.weight) : clientWeight ? String(clientWeight) : "",
      height: existingProfile?.height != null ? String(existingProfile.height) : "",
      age: existingProfile?.age != null ? String(existingProfile.age) : "",
      trainingType: existingProfile?.training_type ?? "Musculation",
      sessionsPerWeek: existingProfile?.sessions_per_week != null ? String(existingProfile.sessions_per_week) : "",
      sessionDuration: existingProfile?.session_duration != null ? String(existingProfile.session_duration) : "",
      stepsPerDay: existingProfile?.steps_per_day != null ? String(existingProfile.steps_per_day) : "",
      activityLevel: existingProfile?.activity_level != null ? String(existingProfile.activity_level) : "0",
      phase: existingProfile?.phase ?? "maintenance",
      adjustment: existingProfile?.phase === "deficit"
        ? "-300"
        : existingProfile?.phase === "surplus"
        ? "200"
        : "0",
      offsetRest: existingProfile?.calories_offset_rest != null ? String(existingProfile.calories_offset_rest) : "",
      offsetHigh: existingProfile?.calories_offset_high != null ? String(existingProfile.calories_offset_high) : "",
    };
  });

  // Restore saved inputs from localStorage on mount (only as a fallback when
  // no profile is saved in the DB yet — DB values always take priority)
  useEffect(() => {
    if (existingProfile) return;
    try {
      const saved = localStorage.getItem(lsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lsKey]);

  // Persist inputs to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(lsKey, JSON.stringify(form));
    } catch {}
  }, [form, lsKey]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Objectifs enregistrés — décorrélés du calcul TDEE ────────────────────
  // Le TDEE (ci-dessous, "calc") reste affiché comme repère de maintenance,
  // mais ce n'est plus lui qui verrouille les valeurs sauvegardées. Tant que
  // le coach n'a rien tapé manuellement, les champs suivent le calcul en
  // direct (zéro friction pour une première configuration). Dès qu'il tape
  // une valeur, le calcul arrête de les écraser — modifier calories/macros
  // devient un geste direct et rapide, plus besoin de bidouiller poids/âge
  // pour forcer un chiffre rond.
  const [targetsTouched, setTargetsTouched] = useState(
    existingProfile?.calories_target != null
  );
  const [manualTargets, setManualTargets] = useState({
    calories: existingProfile?.calories_target != null ? String(existingProfile.calories_target) : "",
    proteins: existingProfile?.proteins_target != null ? String(existingProfile.proteins_target) : "",
    carbs: existingProfile?.carbs_target != null ? String(existingProfile.carbs_target) : "",
    fats: existingProfile?.fats_target != null ? String(existingProfile.fats_target) : "",
  });

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

  const effectiveTargets = targetsTouched
    ? manualTargets
    : calc
    ? {
        calories: String(calc.caloriesTarget),
        proteins: String(calc.proteinsG),
        carbs: String(calc.carbsG),
        fats: String(calc.fatsG),
      }
    : manualTargets;

  function setTarget(key: keyof typeof manualTargets, value: string) {
    setManualTargets({ ...effectiveTargets, [key]: value });
    setTargetsTouched(true);
  }

  function resetTargetsToCalc() {
    if (!calc) return;
    setManualTargets({
      calories: String(calc.caloriesTarget),
      proteins: String(calc.proteinsG),
      carbs: String(calc.carbsG),
      fats: String(calc.fatsG),
    });
    setTargetsTouched(false);
  }

  // Compare le TDEE formule (ci-dessus, jamais mis à jour tout seul) au TDEE
  // observé réellement à partir du bilan quotidien — poids qui dérive
  // + calories loggées. N'affiche une suggestion que si l'écart est assez
  // grand pour valoir la peine (bruit habituel sinon).
  const observed = useMemo(() => computeObservedTdee(recentDailyLogs), [recentDailyLogs]);
  const tdeeGap = observed && calc ? observed.tdee - calc.tdee : 0;
  const showSuggestion = observed && calc && Math.abs(tdeeGap) >= 150;

  function applySuggestion() {
    if (!observed || !calc) return;
    const currentAdj = parseFloat(form.adjustment) || 0;
    set("adjustment", String(Math.round(currentAdj + tdeeGap)));
  }

  async function handleSave() {
    if (!calc) {
      setError("Remplis tous les champs obligatoires (poids, taille, âge).");
      return;
    }
    const caloriesTarget = parseInt(effectiveTargets.calories, 10);
    const proteinsTarget = parseInt(effectiveTargets.proteins, 10);
    const carbsTarget = parseInt(effectiveTargets.carbs, 10);
    const fatsTarget = parseInt(effectiveTargets.fats, 10);
    if (!caloriesTarget || !proteinsTarget || !carbsTarget || !fatsTarget) {
      setError("Calories et macros doivent être renseignées et supérieures à 0.");
      return;
    }
    setError(null);
    setSaving(true);
    const result = await saveNutritionProfile(clientId, {
      calories_target: caloriesTarget,
      proteins_target: proteinsTarget,
      carbs_target: carbsTarget,
      fats_target: fatsTarget,
      calories_offset_rest: form.offsetRest ? parseInt(form.offsetRest) : null,
      calories_offset_high: form.offsetHigh ? parseInt(form.offsetHigh) : null,
      tdee: calc.tdee,
      bmr: calc.bmr,
      phase: form.phase,
      gender: form.gender,
      weight: parseFloat(form.weight) || null,
      height: parseFloat(form.height) || 0,
      age: parseFloat(form.age) || 0,
      training_type: form.trainingType,
      sessions_per_week: parseFloat(form.sessionsPerWeek) || 0,
      session_duration: parseFloat(form.sessionDuration) || 0,
      steps_per_day: parseFloat(form.stepsPerDay) || 0,
      activity_level: parseFloat(form.activityLevel) || 0,
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
                  {value ?? "-"}
                  <span className="text-xs font-normal text-[#F5EDED]/40 ml-1">{unit}</span>
                </p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#F5EDED]/25 mt-3">
            Phase :{" "}
            <span className="text-[#E01E1E] font-semibold capitalize">
              {existingProfile.phase ?? "-"}
            </span>{" "}
            · TDEE :{" "}
            <span className="text-white font-semibold">
              {existingProfile.tdee ?? "-"} kcal
            </span>
          </p>
        </div>
      )}

      {/* TDEE observé vs formule — le TDEE ci-dessus est une estimation
          théorique (Mifflin-St Jeor) qui ne bouge jamais toute seule ;
          celui-ci vient du poids et des calories réellement loggés dans le
          bilan quotidien sur les ~3 dernières semaines. */}
      {showSuggestion && observed && (
        <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl p-4">
          <div className="flex items-start gap-2.5">
            <TrendingUp size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-400 mb-1">
                Écart entre TDEE formule et TDEE réel observé
              </p>
              <p className="text-[11px] text-[#F5EDED]/55 leading-relaxed">
                Sur les {observed.days} derniers jours, {observed.weightChangeKg >= 0 ? "+" : ""}
                {observed.weightChangeKg}kg pour ~{observed.avgCalories} kcal/jour loggés →
                TDEE réel estimé à ~{observed.tdee} kcal, contre {calc?.tdee} kcal côté formule
                ({tdeeGap > 0 ? "+" : ""}{tdeeGap} kcal).
              </p>
              <button
                onClick={applySuggestion}
                className="mt-2.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors underline"
              >
                Ajuster l&apos;objectif en conséquence
              </button>
            </div>
          </div>
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
              placeholder="80" aria-label="80"
              className={inputCls}
            />
            {clientWeight != null && String(clientWeight) !== form.weight && (
              <button
                type="button"
                onClick={() => set("weight", String(clientWeight))}
                className="text-[9px] font-semibold text-[#F5EDED]/30 hover:text-[#F5EDED]/60 mt-1"
              >
                Dernier pesé : {clientWeight}kg, utiliser
              </button>
            )}
          </div>
          <div>
            <label className={labelCls}>Taille (cm)</label>
            <input
              type="number"
              value={form.height}
              onChange={(e) => set("height", e.target.value)}
              placeholder="175" aria-label="175"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Âge</label>
            <input
              type="number"
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
              placeholder="30" aria-label="30"
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
              placeholder="4" aria-label="4"
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
              placeholder="60" aria-label="60"
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
              placeholder="8000" aria-label="8000"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Activité professionnelle</label>
            <select
              value={form.activityLevel}
              onChange={(e) => set("activityLevel", e.target.value)}
              className={inputCls}
            >
              {ACTIVITY_LEVELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label} (+{a.value} kcal)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[#F5EDED]/25 mt-1.5">
              Indépendant de tes pas quotidiens, déjà comptés ci-contre.
            </p>
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

      {/* Section: Carb cycling — objectif de base ci-dessus = jour
          d'entraînement par défaut. Écarts optionnels pour repos/high day,
          absorbés en glucides (protéines/lipides stables). */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className={labelCls + " mb-1"}>Jours de repos / high day (optionnel)</p>
        <p className="text-[10px] text-[#F5EDED]/30 mb-4">
          L&apos;objectif ci-dessus est celui des jours d&apos;entraînement. Défini un écart pour
          les jours de repos ou les journées &laquo;&nbsp;high&nbsp;&raquo;. L&apos;écart est absorbé en
          glucides, protéines et lipides restent stables.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Jour de repos (kcal)</label>
            <input
              type="number"
              value={form.offsetRest}
              onChange={(e) => set("offsetRest", e.target.value)}
              placeholder="Ex. -200" aria-label="Ex. -200"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Jour high (kcal)</label>
            <input
              type="number"
              value={form.offsetHigh}
              onChange={(e) => set("offsetHigh", e.target.value)}
              placeholder="Ex. +400" aria-label="Ex. +400"
              className={inputCls}
            />
          </div>
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

          {/* TDEE — repère de maintenance, jamais modifié directement */}
          <div className="bg-[#890404]/15 border border-[#890404]/30 rounded-lg px-3 py-2.5 mb-4">
            <p className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest font-semibold">
              TDEE total (repère de maintenance)
            </p>
            <p className="text-3xl font-black text-[#E01E1E]">
              {calc.tdee}
              <span className="text-sm text-[#F5EDED]/40 ml-1 font-normal">kcal/j</span>
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl p-8 text-center">
          <p className="text-xs text-[#F5EDED]/30 font-semibold uppercase tracking-widest">
            Remplis poids, taille et âge pour voir le calcul
          </p>
        </div>
      )}

      {/* Objectifs à enregistrer — décorrélés du TDEE, éditables librement.
          Pré-remplis depuis le calcul tant que le coach n'a rien tapé, mais
          modifiables à tout moment sans que le calcul ne les écrase. */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <p className={labelCls + " mb-0"}>Objectifs à enregistrer</p>
          {calc && targetsTouched && (
            <button
              type="button"
              onClick={resetTargetsToCalc}
              className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/60 transition-colors"
            >
              Recalculer depuis le TDEE
            </button>
          )}
        </div>
        <p className="text-[10px] text-[#F5EDED]/30 mb-4">
          Modifiable librement, indépendamment du calcul TDEE ci-dessus (qui reste un repère de
          maintenance). Pré-rempli par le calcul tant que rien n&apos;est tapé ici.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              { key: "calories" as const, label: "Objectif calorique", unit: "kcal", color: "text-white" },
              { key: "proteins" as const, label: "Protéines", unit: "g", color: "text-blue-300" },
              { key: "carbs" as const, label: "Glucides", unit: "g", color: "text-amber-300" },
              { key: "fats" as const, label: "Lipides", unit: "g", color: "text-rose-300" },
            ]
          ).map(({ key, label, unit, color }) => (
            <div key={key} className="bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2.5">
              <label className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest font-semibold block mb-1">
                {label}
              </label>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  value={effectiveTargets[key]}
                  onChange={(e) => setTarget(key, e.target.value)}
                  className={`w-full bg-transparent text-2xl font-black ${color} focus:outline-none`}
                />
                <span className="text-[10px] text-[#F5EDED]/40 font-normal">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

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
