"use client";

import { useState } from "react";
import { Save, Check, Target } from "lucide-react";
import type { ClientIntake, ClientIntakeInput } from "@/utils/client-intake";
import { ALLERGEN_LABELS, DIET_LABELS, type Allergen, type Diet } from "@/lib/recipes-data";

const inputClass =
  "w-full bg-[#150000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none transition-colors";
const labelClass = "block text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

function Section({ title }: { title: string }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest text-[#E01E1E] mt-8 mb-4 first:mt-0 border-b border-[#890404]/15 pb-2">
      {title}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function emptyIntake(): ClientIntakeInput {
  return {
    date_of_birth: null,
    gender: null,
    height_cm: null,
    occupation: null,
    work_hours: null,
    schedule_type: null,
    goal_3_months: null,
    goal_12_months: null,
    how_coach_can_help: null,
    avg_daily_steps: null,
    wearable_device: null,
    stress_level: null,
    sleep_quality: null,
    sleep_hours: null,
    health_issues: null,
    injuries: null,
    meals_current: null,
    meals_ideal: null,
    typical_day: null,
    known_calories: null,
    known_protein: null,
    known_carbs: null,
    known_fat: null,
    cheat_meals_per_week: null,
    cheat_meal_impact: null,
    supplement_budget: null,
    disliked_foods: null,
    liked_foods: null,
    dietary_restrictions: null,
    diet_type: null,
    allergens: [],
    plan_preference: null,
    calorie_preference: null,
    sessions_current: null,
    sessions_desired: null,
    session_duration: null,
    availability: null,
    cardio_preference: null,
    current_routine: null,
    exercises_that_work: null,
    exercises_problematic: null,
    preferred_split: null,
    disliked_equipment: null,
    gym_name: null,
    gym_link: null,
    additional_notes: null,
    resting_heart_rate: null,
    cycle_length_days: null,
    hormonal_contraceptive: null,
    known_nutrition_text: null,
    gym_photo_paths: [],
    physique_photo_paths: [],
  };
}

export default function ClientIntakeForm({
  clientId,
  existingIntake,
  saveClientIntake,
  stepGoal,
  updateClientStepGoal,
  isSelf = false,
}: {
  clientId: string;
  existingIntake: ClientIntake | null;
  saveClientIntake: (clientId: string, data: ClientIntakeInput) => Promise<{ error?: string }>;
  stepGoal?: number;
  updateClientStepGoal?: (clientId: string, dailyGoal: number) => Promise<{ error?: string }>;
  // Un coach remplit aussi cette fiche pour lui-même (son propre suivi
  // perso) — les textes qui parlent de "la fiche client"/"le client"
  // n'ont alors aucun sens, ce prop bascule sur un phrasé à la 1re personne.
  isSelf?: boolean;
}) {
  const [form, setForm] = useState<ClientIntakeInput>(existingIntake ?? emptyIntake());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [goalInput, setGoalInput] = useState(String(stepGoal ?? 8000));
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);

  async function handleSaveGoal() {
    if (!updateClientStepGoal) return;
    const goal = parseInt(goalInput, 10);
    if (!goal || goal <= 0) return;
    setGoalSaving(true);
    setGoalSaved(false);
    const res = await updateClientStepGoal(clientId, goal);
    setGoalSaving(false);
    if (!res.error) {
      setGoalSaved(true);
      setTimeout(() => setGoalSaved(false), 2000);
    }
  }

  function set<K extends keyof ClientIntakeInput>(key: K, value: ClientIntakeInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function toggleAllergen(a: Allergen) {
    setForm((f) => {
      const has = f.allergens.includes(a);
      return { ...f, allergens: has ? f.allergens.filter((x) => x !== a) : [...f.allergens, a] };
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await saveClientIntake(clientId, form);
    setSaving(false);
    if (res.error) {
      // La table client_intake vient d'une migration récente — si elle n'a
      // pas encore été exécutée dans Supabase, l'erreur Postgres brute
      // ("relation ... does not exist") ne dit rien d'actionnable au coach.
      const looksLikeMissingTable = /relation .* does not exist|schema cache/i.test(res.error);
      setError(
        looksLikeMissingTable
          ? `${isSelf ? "Ta fiche n'est" : "La fiche client n'est"} pas encore activée côté base de données — la migration SQL doit être exécutée dans Supabase avant de pouvoir enregistrer. Rien n'a été perdu, réessaie une fois que c'est fait.`
          : res.error
      );
    } else {
      setSaved(true);
    }
  }

  const txt = (key: keyof ClientIntakeInput) => (form[key] as string | null) ?? "";
  const num = (key: keyof ClientIntakeInput) => (form[key] == null ? "" : String(form[key]));

  return (
    <div className="space-y-1">
      <p className="text-xs text-[#F5EDED]/40 leading-relaxed mb-2">
        Toutes les infos du questionnaire d&apos;onboarding, à remplir une fois pour toutes. Elles servent
        ensuite de référence partout dans l&apos;appli (créateur de recette, programme, nutrition...) sans
        avoir à reposer les mêmes questions à chaque fois.
      </p>

      <Section title="Informations générales" />
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Date de naissance">
          <input type="date" value={txt("date_of_birth")} onChange={(e) => set("date_of_birth", e.target.value || null)} className={inputClass} />
        </Field>
        <Field label="Sexe biologique">
          <select value={txt("gender")} onChange={(e) => set("gender", (e.target.value || null) as ClientIntakeInput["gender"])} className={inputClass}>
            <option value="">—</option>
            <option value="Homme">Homme</option>
            <option value="Femme">Femme</option>
            <option value="Autre">Autre</option>
          </select>
        </Field>
        <Field label="Taille (cm)">
          <input type="number" value={num("height_cm")} onChange={(e) => set("height_cm", e.target.value ? parseFloat(e.target.value) : null)} className={inputClass} />
        </Field>
        <Field label="Métier">
          <input value={txt("occupation")} onChange={(e) => set("occupation", e.target.value || null)} className={inputClass} />
        </Field>
        <Field label="Horaires de travail type">
          <input value={txt("work_hours")} onChange={(e) => set("work_hours", e.target.value || null)} className={inputClass} />
        </Field>
        <Field label="Emploi du temps">
          <select value={txt("schedule_type")} onChange={(e) => set("schedule_type", (e.target.value || null) as ClientIntakeInput["schedule_type"])} className={inputClass}>
            <option value="">—</option>
            <option value="fixe">Fixe</option>
            <option value="variable">Variable</option>
          </select>
        </Field>
      </div>

      <Section title="Objectifs" />
      <div className="space-y-3">
        <Field label="Objectif à 3 mois">
          <textarea rows={2} value={txt("goal_3_months")} onChange={(e) => set("goal_3_months", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
        <Field label="Objectif à 12 mois">
          <textarea rows={2} value={txt("goal_12_months")} onChange={(e) => set("goal_12_months", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
        <Field label="Comment le coach peut aider">
          <textarea rows={2} value={txt("how_coach_can_help")} onChange={(e) => set("how_coach_can_help", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
      </div>

      <Section title="Santé et récupération" />

      {updateClientStepGoal && (
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={13} className="text-[#E01E1E]" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-white">
              Objectif de pas imposé au client
            </p>
          </div>
          <p className="text-[11px] text-[#F5EDED]/40 mb-3 leading-relaxed">
            Ce chiffre est celui affiché dans l&apos;app du client, dans &quot;Pas &amp; routine&quot;. Le client ne peut
            plus le modifier lui-même — seul toi, le coach, le règles ici.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className={`${inputClass} w-32`}
            />
            <span className="text-[10px] text-[#F5EDED]/30">pas / jour</span>
            <button
              type="button"
              onClick={handleSaveGoal}
              disabled={goalSaving}
              className="ml-auto bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors"
            >
              {goalSaving ? "…" : goalSaved ? "✓ Enregistré" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nombre de pas moyen/jour (info onboarding, historique)">
          <input type="number" value={num("avg_daily_steps")} onChange={(e) => set("avg_daily_steps", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
        </Field>
        <Field label="Montre / bague connectée">
          <input value={txt("wearable_device")} onChange={(e) => set("wearable_device", e.target.value || null)} className={inputClass} />
        </Field>
        <Field label="Niveau de stress (1-10)">
          <input type="number" min={1} max={10} value={num("stress_level")} onChange={(e) => set("stress_level", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
        </Field>
        <Field label="Qualité du sommeil (1-10)">
          <input type="number" min={1} max={10} value={num("sleep_quality")} onChange={(e) => set("sleep_quality", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
        </Field>
        <Field label="Heures de sommeil/nuit">
          <input type="number" step="0.5" value={num("sleep_hours")} onChange={(e) => set("sleep_hours", e.target.value ? parseFloat(e.target.value) : null)} className={inputClass} />
        </Field>
        <div />
        <Field label="Problèmes de santé">
          <textarea rows={2} value={txt("health_issues")} onChange={(e) => set("health_issues", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
        <Field label="Blessures / douleurs">
          <textarea rows={2} value={txt("injuries")} onChange={(e) => set("injuries", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
      </div>

      <Section title="Nutrition" />
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Repas actuels/jour">
          <input type="number" value={num("meals_current")} onChange={(e) => set("meals_current", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
        </Field>
        <Field label="Repas idéaux/jour">
          <input type="number" value={num("meals_ideal")} onChange={(e) => set("meals_ideal", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Journée alimentaire type">
          <textarea rows={3} value={txt("typical_day")} onChange={(e) => set("typical_day", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3">
        <Field label="Kcal connues">
          <input type="number" value={num("known_calories")} onChange={(e) => set("known_calories", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
        </Field>
        <Field label="Prot. (g)">
          <input type="number" value={num("known_protein")} onChange={(e) => set("known_protein", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
        </Field>
        <Field label="Gluc./Lip. (g)">
          <div className="flex gap-1.5">
            <input type="number" placeholder="G" value={num("known_carbs")} onChange={(e) => set("known_carbs", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
            <input type="number" placeholder="L" value={num("known_fat")} onChange={(e) => set("known_fat", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
          </div>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <Field label="Cheat meals/semaine">
          <input type="number" value={num("cheat_meals_per_week")} onChange={(e) => set("cheat_meals_per_week", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
        </Field>
        <Field label="Budget compléments (€/mois)">
          <input type="number" value={num("supplement_budget")} onChange={(e) => set("supplement_budget", e.target.value ? parseFloat(e.target.value) : null)} className={inputClass} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Impact des cheat meals (digestion, perf...)">
          <textarea rows={2} value={txt("cheat_meal_impact")} onChange={(e) => set("cheat_meal_impact", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <Field label="Aliments détestés">
          <textarea rows={2} value={txt("disliked_foods")} onChange={(e) => set("disliked_foods", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
        <Field label="Aliments adorés">
          <textarea rows={2} value={txt("liked_foods")} onChange={(e) => set("liked_foods", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Restrictions alimentaires (détails libres)">
          <textarea rows={2} value={txt("dietary_restrictions")} onChange={(e) => set("dietary_restrictions", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
      </div>

      <div className="mt-3">
        <label className={labelClass}>Régime alimentaire (utilisé partout dans l&apos;appli — recettes, plans...)</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {(Object.keys(DIET_LABELS) as Diet[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => set("diet_type", form.diet_type === d ? null : d)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                form.diet_type === d
                  ? "bg-[#E01E1E] border-[#E01E1E] text-white"
                  : "bg-[#150000] border-[#890404]/25 text-[#F5EDED]/50 hover:border-[#890404]/50"
              }`}
            >
              {DIET_LABELS[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <label className={labelClass}>Allergies (utilisées partout dans l&apos;appli)</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {(Object.keys(ALLERGEN_LABELS) as Allergen[]).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAllergen(a)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                form.allergens.includes(a)
                  ? "bg-[#E01E1E] border-[#E01E1E] text-white"
                  : "bg-[#150000] border-[#890404]/25 text-[#F5EDED]/50 hover:border-[#890404]/50"
              }`}
            >
              {ALLERGEN_LABELS[a]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <Field label="Préférence de plan">
          <select value={txt("plan_preference")} onChange={(e) => set("plan_preference", (e.target.value || null) as ClientIntakeInput["plan_preference"])} className={inputClass}>
            <option value="">—</option>
            <option value="fixe">Plan fixe</option>
            <option value="flexible">Macros flexibles</option>
          </select>
        </Field>
        <Field label="Apport calorique">
          <select value={txt("calorie_preference")} onChange={(e) => set("calorie_preference", (e.target.value || null) as ClientIntakeInput["calorie_preference"])} className={inputClass}>
            <option value="">—</option>
            <option value="lineaire">Linéaire chaque jour</option>
            <option value="variable">Varie selon les jours</option>
          </select>
        </Field>
      </div>

      <Section title="Entraînement" />
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Séances actuelles/semaine">
          <input type="number" value={num("sessions_current")} onChange={(e) => set("sessions_current", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
        </Field>
        <Field label="Séances voulues/semaine">
          <input type="number" value={num("sessions_desired")} onChange={(e) => set("sessions_desired", e.target.value ? parseInt(e.target.value) : null)} className={inputClass} />
        </Field>
        <Field label="Durée moyenne souhaitée">
          <input value={txt("session_duration")} onChange={(e) => set("session_duration", e.target.value || null)} className={inputClass} />
        </Field>
        <Field label="Disponibilités (jours/horaires)">
          <input value={txt("availability")} onChange={(e) => set("availability", e.target.value || null)} className={inputClass} />
        </Field>
        <Field label="Cardio préféré">
          <input value={txt("cardio_preference")} onChange={(e) => set("cardio_preference", e.target.value || null)} className={inputClass} />
        </Field>
        <Field label="Split préféré">
          <input value={txt("preferred_split")} onChange={(e) => set("preferred_split", e.target.value || null)} className={inputClass} />
        </Field>
      </div>
      <div className="space-y-3 mt-3">
        <Field label="Routine actuelle">
          <textarea rows={2} value={txt("current_routine")} onChange={(e) => set("current_routine", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
        <Field label="Mouvements qui marchent bien">
          <textarea rows={2} value={txt("exercises_that_work")} onChange={(e) => set("exercises_that_work", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
        <Field label="Mouvements qui posent problème / à éviter">
          <textarea rows={2} value={txt("exercises_problematic")} onChange={(e) => set("exercises_problematic", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
        <Field label="Machines/exercices détestés">
          <textarea rows={2} value={txt("disliked_equipment")} onChange={(e) => set("disliked_equipment", e.target.value || null)} className={`${inputClass} resize-none`} />
        </Field>
      </div>

      <Section title="Salle de sport" />
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nom de la salle">
          <input value={txt("gym_name")} onChange={(e) => set("gym_name", e.target.value || null)} className={inputClass} />
        </Field>
        <Field label="Lien de la salle">
          <input value={txt("gym_link")} onChange={(e) => set("gym_link", e.target.value || null)} className={inputClass} />
        </Field>
      </div>

      <Section title="Autre" />
      <Field label="Notes libres">
        <textarea rows={3} value={txt("additional_notes")} onChange={(e) => set("additional_notes", e.target.value || null)} className={`${inputClass} resize-none`} />
      </Field>

      <div className="sticky bottom-0 mt-8 pt-4 pb-1 bg-gradient-to-t from-[#0a0000] via-[#0a0000]/95 to-transparent">
        {error && (
          <div className="bg-red-950/80 border border-red-500/40 rounded-xl px-4 py-3 mb-3">
            <p className="text-xs text-red-300 font-semibold leading-relaxed">⚠ {error}</p>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest py-3.5 rounded-xl transition-colors"
        >
          {saving ? "Enregistrement…" : saved ? <><Check size={14} /> Enregistré</> : <><Save size={14} /> {isSelf ? "Enregistrer ma fiche" : "Enregistrer la fiche client"}</>}
        </button>
      </div>
    </div>
  );
}
