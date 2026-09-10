"use client";

import { useState } from "react";
import { Plus, Trash2, Check, AlertCircle, Loader2 } from "lucide-react";
import {
  MEAL_LABELS, DIET_LABELS, PHASE_LABELS, SEASON_LABELS, TEMP_LABELS, ALLERGEN_LABELS,
  type MealType, type Diet, type Phase, type Season, type Temp, type Allergen,
} from "@/lib/recipes-data";
import type { CommunityRecipeInput } from "@/app/dashboard/client/recettes/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

function Chip<T extends string>({
  options,
  labels,
  selected,
  toggle,
}: {
  options: T[];
  labels: Record<string, string>;
  selected: Set<T>;
  toggle: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.has(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
              active
                ? "bg-[#E01E1E] border-[#E01E1E] text-white"
                : "bg-[#150000] border-[#890404]/25 text-[#F5EDED]/50 hover:border-[#890404]/50"
            }`}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

export default function AddRecipeForm({
  onCreate,
  onDone,
}: {
  onCreate: (input: CommunityRecipeInput) => Promise<{ error?: string; id?: string }>;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [meal, setMeal] = useState<MealType>("dejeuner");
  const [diet, setDiet] = useState<Set<Diet>>(new Set(["omnivore"]));
  const [phases, setPhases] = useState<Set<Phase>>(new Set(["maintenance"]));
  const [season, setSeason] = useState<Set<Season>>(new Set(["toute-saison"]));
  const [allergens, setAllergens] = useState<Set<Allergen>>(new Set());
  const [temp, setTemp] = useState<Temp>("chaud");
  const [price, setPrice] = useState<1 | 2 | 3>(1);
  const [region, setRegion] = useState("France entière");
  const [prepMinutes, setPrepMinutes] = useState("20");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [tip, setTip] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function toggleSet<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function updateLine(list: string[], setList: (v: string[]) => void, i: number, value: string) {
    const next = [...list];
    next[i] = value;
    setList(next);
  }

  async function handleSubmit() {
    if (!name.trim() || diet.size === 0 || phases.size === 0) {
      setError("Le nom, le régime et la phase sont requis.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onCreate({
      name,
      meal,
      diet: [...diet],
      phases: [...phases],
      season: [...season],
      temp,
      texture: [],
      price,
      region,
      prep_minutes: parseInt(prepMinutes) || 20,
      kcal: parseInt(kcal) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      allergens: [...allergens],
      ingredients,
      steps,
      tip,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(onDone, 1200);
    }
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
        Ajouter ma recette
      </p>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de la recette" aria-label="Nom de la recette"
        className={inputCls}
      />

      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">Type de repas</p>
        <select value={meal} onChange={(e) => setMeal(e.target.value as MealType)} aria-label="Type de repas" className={inputCls}>
          {Object.entries(MEAL_LABELS).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">Régime(s) compatible(s)</p>
        <Chip options={Object.keys(DIET_LABELS) as Diet[]} labels={DIET_LABELS} selected={diet} toggle={(v) => toggleSet(setDiet, v)} />
      </div>

      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">Phase(s)</p>
        <Chip options={Object.keys(PHASE_LABELS) as Phase[]} labels={PHASE_LABELS} selected={phases} toggle={(v) => toggleSet(setPhases, v)} />
      </div>

      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">Saison</p>
        <Chip options={Object.keys(SEASON_LABELS) as Season[]} labels={SEASON_LABELS} selected={season} toggle={(v) => toggleSet(setSeason, v)} />
      </div>

      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">Allergènes présents</p>
        <Chip options={Object.keys(ALLERGEN_LABELS) as Allergen[]} labels={ALLERGEN_LABELS} selected={allergens} toggle={(v) => toggleSet(setAllergens, v)} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <select value={temp} onChange={(e) => setTemp(e.target.value as Temp)} aria-label="Température" className={inputCls}>
          {Object.entries(TEMP_LABELS).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
        <select value={price} onChange={(e) => setPrice(Number(e.target.value) as 1 | 2 | 3)} aria-label="Budget" className={inputCls}>
          <option value={1}>€</option>
          <option value={2}>€€</option>
          <option value={3}>€€€</option>
        </select>
        <input
          type="number"
          value={prepMinutes}
          onChange={(e) => setPrepMinutes(e.target.value)}
          placeholder="Minutes" aria-label="Minutes"
          className={inputCls}
        />
      </div>

      <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Région / localité" aria-label="Région / localité" className={inputCls} />

      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">Valeurs nutritionnelles (optionnel)</p>
        <div className="grid grid-cols-4 gap-2">
          <input type="number" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="kcal" aria-label="kcal" className={inputCls} />
          <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="Prot. (g)" aria-label="Prot. (g)" className={inputCls} />
          <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="Gluc. (g)" aria-label="Gluc. (g)" className={inputCls} />
          <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="Lip. (g)" aria-label="Lip. (g)" className={inputCls} />
        </div>
      </div>

      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">Ingrédients</p>
        <div className="space-y-1.5">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                value={ing}
                onChange={(e) => updateLine(ingredients, setIngredients, i, e.target.value)}
                placeholder={`Ingrédient ${i + 1}`}
                aria-label={`Ingrédient ${i + 1}`}
                className={inputCls}
              />
              {ingredients.length > 1 && (
                <button type="button" onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))} aria-label={`Supprimer l'ingrédient ${i + 1}`} className="text-[#F5EDED]/30 hover:text-red-400 px-1">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIngredients([...ingredients, ""])}
          className="flex items-center gap-1 text-[10px] font-bold text-[#E01E1E] mt-1.5"
        >
          <Plus size={11} /> Ajouter un ingrédient
        </button>
      </div>

      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">Préparation</p>
        <div className="space-y-1.5">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                value={s}
                onChange={(e) => updateLine(steps, setSteps, i, e.target.value)}
                placeholder={`Étape ${i + 1}`}
                aria-label={`Étape ${i + 1}`}
                className={inputCls}
              />
              {steps.length > 1 && (
                <button type="button" onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} aria-label={`Supprimer l'étape ${i + 1}`} className="text-[#F5EDED]/30 hover:text-red-400 px-1">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSteps([...steps, ""])}
          className="flex items-center gap-1 text-[10px] font-bold text-[#E01E1E] mt-1.5"
        >
          <Plus size={11} /> Ajouter une étape
        </button>
      </div>

      <textarea
        value={tip}
        onChange={(e) => setTip(e.target.value)}
        placeholder="Astuce (optionnel)" aria-label="Astuce (optionnel)"
        rows={2}
        className={`${inputCls} resize-none`}
      />

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : "Publier ma recette"}
        </button>
        <button onClick={onDone} className="text-xs text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors">
          Annuler
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
          <Check size={12} /> Recette publiée !
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
          <AlertCircle size={12} /> {error}
        </div>
      )}
    </div>
  );
}
