"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Sparkles, Check, Loader2, Search, X,
} from "lucide-react";
import {
  MEAL_LABELS, DIET_LABELS, PHASE_LABELS, TEMP_LABELS, ALLERGEN_LABELS,
  type MealType, type Diet, type Phase, type Temp, type Allergen,
} from "@/lib/recipes-data";
import {
  buildFoodGroups, FOOD_GROUP_LABELS, TIME_LABELS, generateRecipe,
  MACRO_PROFILE_LABELS, MACRO_PROFILE_DESC,
  type FoodGroupKey, type MealCreatorAnswers, type GeneratedRecipe, type PrepTime, type MacroProfile,
} from "@/lib/meal-creator";
import type { Food } from "@/utils/nutrition";
import type { CommunityRecipeInput } from "@/app/dashboard/client/recettes/actions";

const FOOD_GROUP_ORDER: FoodGroupKey[] = ["proteine", "glucide", "legume", "matiere_grasse"];

type StepKey = "meal" | "diet" | "phase" | "macroProfile" | "allergens" | "aliments" | "temp" | "time" | "result";
const STEP_ORDER: StepKey[] = ["meal", "diet", "phase", "macroProfile", "allergens", "aliments", "temp", "time", "result"];

function OptionGrid<T extends string>({
  options,
  labels,
  value,
  onSelect,
}: {
  options: T[];
  labels: Record<string, string>;
  value: T | null;
  onSelect: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`text-left px-4 py-3.5 rounded-xl border text-sm font-bold transition-all ${
              active
                ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-white"
                : "bg-[#1f0101] border-[#890404]/25 text-[#F5EDED]/55 hover:border-[#890404]/50"
            }`}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

function MultiChips<T extends string>({
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
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.has(opt);
        return (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-colors ${
              active
                ? "bg-[#E01E1E] border-[#E01E1E] text-white"
                : "bg-[#1f0101] border-[#890404]/25 text-[#F5EDED]/50 hover:border-[#890404]/50"
            }`}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

function FoodGroupPicker({
  label,
  hint,
  options,
  selected,
  toggle,
  search,
  setSearch,
}: {
  label: string;
  hint: string;
  options: { name: string }[];
  selected: Set<string>;
  toggle: (name: string) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const query = search.trim().toLowerCase();
  const filtered = query ? options.filter((o) => o.name.toLowerCase().includes(query)) : options;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-black text-white">{label}</h3>
        {selected.size > 0 && (
          <span className="text-[10px] font-bold text-[#E01E1E]">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
        )}
      </div>
      <p className="text-[11px] text-[#F5EDED]/35 mb-2">{hint}</p>
      <div className="relative mb-2">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un aliment..."
          className="w-full bg-[#1f0101] border border-[#890404]/25 rounded-lg pl-8 pr-8 py-2 text-xs text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#890404]/60"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#F5EDED]/30 hover:text-[#F5EDED]/60"
          >
            <X size={13} />
          </button>
        )}
      </div>
      <div className="max-h-44 overflow-y-auto pr-1 grid grid-cols-2 gap-2 rounded-lg">
        {filtered.map(({ name }) => {
          const active = selected.has(name);
          return (
            <button
              key={name}
              onClick={() => toggle(name)}
              className={`text-left px-3 py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                active
                  ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-white"
                  : "bg-[#1f0101] border-[#890404]/25 text-[#F5EDED]/55 hover:border-[#890404]/50"
              }`}
            >
              {active && <Check size={11} className="text-[#E01E1E] flex-shrink-0" />}
              <span className="truncate">{name}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-2 text-xs text-[#F5EDED]/30 italic py-2">
            {query ? "Aucun résultat pour cette recherche." : "Aucune option compatible avec ton régime/allergies."}
          </p>
        )}
      </div>
    </div>
  );
}

export default function MealCreatorWizard({
  foods,
  onSaveRecipe,
}: {
  foods: Food[];
  onSaveRecipe?: (input: CommunityRecipeInput) => Promise<{ error?: string; id?: string }>;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [meal, setMeal] = useState<MealType | null>(null);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [macroProfile, setMacroProfile] = useState<MacroProfile | null>(null);
  const [allergens, setAllergens] = useState<Set<Allergen>>(new Set());
  const [choices, setChoices] = useState<Record<FoodGroupKey, Set<string>>>({
    proteine: new Set(), glucide: new Set(), legume: new Set(), matiere_grasse: new Set(),
  });
  const [foodSearch, setFoodSearch] = useState<Record<FoodGroupKey, string>>({
    proteine: "", glucide: "", legume: "", matiere_grasse: "",
  });
  const [temp, setTemp] = useState<Temp | null>(null);
  const [prepTime, setPrepTime] = useState<PrepTime | null>(null);

  const [result, setResult] = useState<GeneratedRecipe | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  const step = STEP_ORDER[stepIdx];

  function toggleAllergen(a: Allergen) {
    setAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }

  function toggleFood(group: FoodGroupKey, name: string) {
    setChoices((prev) => {
      const next = new Set(prev[group]);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { ...prev, [group]: next };
    });
  }

  function go(next: number, dir: 1 | -1) {
    setDirection(dir);
    setStepIdx(next);
  }

  function canAdvance(): boolean {
    if (step === "meal") return !!meal;
    if (step === "diet") return !!diet;
    if (step === "phase") return !!phase;
    if (step === "macroProfile") return !!macroProfile;
    if (step === "allergens") return true;
    if (step === "aliments") return choices.proteine.size > 0;
    if (step === "temp") return !!temp;
    if (step === "time") return !!prepTime;
    return true;
  }

  function handleNext() {
    if (step === "time") {
      // Generate on the way into "result"
      const answers: MealCreatorAnswers = {
        meal: meal!,
        diet: diet!,
        phase: phase!,
        macroProfile: macroProfile!,
        allergens: [...allergens],
        temp: temp!,
        prepTime: prepTime!,
        choices: {
          proteine: [...choices.proteine],
          glucide: [...choices.glucide],
          legume: [...choices.legume],
          matiere_grasse: [...choices.matiere_grasse],
        },
      };
      setResult(generateRecipe(answers, foods));
    }
    go(stepIdx + 1, 1);
  }

  function handleRestart() {
    setStepIdx(0);
    setMeal(null);
    setDiet(null);
    setPhase(null);
    setMacroProfile(null);
    setAllergens(new Set());
    setChoices({ proteine: new Set(), glucide: new Set(), legume: new Set(), matiere_grasse: new Set() });
    setFoodSearch({ proteine: "", glucide: "", legume: "", matiere_grasse: "" });
    setTemp(null);
    setPrepTime(null);
    setResult(null);
    setSaveStatus("idle");
  }

  const foodGroups = useMemo(() => buildFoodGroups(foods), [foods]);

  const foodGroupOptions = useMemo(() => {
    if (!diet) return {} as Record<FoodGroupKey, { name: string; disabled: boolean }[]>;
    const out: Record<FoodGroupKey, { name: string; disabled: boolean }[]> = {
      proteine: [], glucide: [], legume: [], matiere_grasse: [],
    };
    for (const key of FOOD_GROUP_ORDER) {
      out[key] = foodGroups[key]
        .filter((f) => f.diet.includes(diet))
        .map((f) => ({
          name: f.name,
          disabled: f.allergens.some((a) => allergens.has(a)),
        }))
        .filter((f) => !f.disabled);
    }
    return out;
  }, [diet, allergens, foodGroups]);

  async function handleSave() {
    if (!result || !onSaveRecipe) return;
    setSaveStatus("saving");
    const input: CommunityRecipeInput = {
      name: result.name,
      meal: meal!,
      diet: [diet!],
      phases: [phase!],
      season: ["toute-saison"],
      temp: temp!,
      texture: [],
      price: 1,
      region: "France entière",
      prep_minutes: result.prepMinutes,
      kcal: result.kcal,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      allergens: result.allergens,
      ingredients: result.ingredients,
      steps: result.steps,
      tip: result.tip,
    };
    const res = await onSaveRecipe(input);
    if (res.error) {
      setSaveStatus("error");
      setSaveError(res.error);
    } else {
      setSaveStatus("saved");
    }
  }

  const progress = ((stepIdx + 1) / STEP_ORDER.length) * 100;

  return (
    <div className="bg-[#150000] border border-[#890404]/20 rounded-2xl p-5 md:p-8 max-w-xl mx-auto">
      {step !== "result" && (
        <div className="h-1 bg-[#890404]/15 rounded-full mb-7 overflow-hidden">
          <div className="h-full bg-[#E01E1E] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 30 : -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -30 : 30 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === "meal" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Quel repas tu veux créer ?</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">On part de là pour calibrer les calories.</p>
              <OptionGrid options={Object.keys(MEAL_LABELS) as MealType[]} labels={MEAL_LABELS} value={meal} onSelect={setMeal} />
            </div>
          )}

          {step === "diet" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Ton régime alimentaire ?</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">Pour ne te proposer que des aliments compatibles.</p>
              <OptionGrid options={Object.keys(DIET_LABELS) as Diet[]} labels={DIET_LABELS} value={diet} onSelect={setDiet} />
            </div>
          )}

          {step === "phase" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Ta phase actuelle ?</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">On ajuste les calories et les portions en fonction.</p>
              <OptionGrid options={Object.keys(PHASE_LABELS) as Phase[]} labels={PHASE_LABELS} value={phase} onSelect={setPhase} />
            </div>
          )}

          {step === "macroProfile" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Quel profil de macros ?</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">Pour varier — plus riche en glucides, en protéines, ou équilibré.</p>
              <div className="flex flex-col gap-2.5">
                {(Object.keys(MACRO_PROFILE_LABELS) as MacroProfile[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setMacroProfile(p)}
                    className={`text-left px-4 py-3.5 rounded-xl border transition-all ${
                      macroProfile === p
                        ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-white"
                        : "bg-[#1f0101] border-[#890404]/25 text-[#F5EDED]/55 hover:border-[#890404]/50"
                    }`}
                  >
                    <span className="block text-sm font-bold">{MACRO_PROFILE_LABELS[p]}</span>
                    <span className="block text-[10px] text-[#F5EDED]/35 mt-0.5">{MACRO_PROFILE_DESC[p]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "allergens" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Des allergies à éviter ?</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">Optionnel, laisse vide si aucune.</p>
              <MultiChips options={Object.keys(ALLERGEN_LABELS) as Allergen[]} labels={ALLERGEN_LABELS} selected={allergens} toggle={toggleAllergen} />
            </div>
          )}

          {step === "aliments" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Choisis tes aliments</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">
                Sélectionne autant d&apos;aliments que tu veux par catégorie (protéine obligatoire, le reste est optionnel).
              </p>
              <div className="flex flex-col gap-6 max-h-[26rem] overflow-y-auto pr-1 -mr-1">
                {FOOD_GROUP_ORDER.map((key) => (
                  <FoodGroupPicker
                    key={key}
                    label={FOOD_GROUP_LABELS[key] + (key === "proteine" ? "" : " (optionnel)")}
                    hint={key === "proteine" ? "La base de ta recette." : "Choisis-en un ou plusieurs, ou passe."}
                    options={foodGroupOptions[key] ?? []}
                    selected={choices[key]}
                    toggle={(name) => toggleFood(key, name)}
                    search={foodSearch[key]}
                    setSearch={(v) => setFoodSearch((prev) => ({ ...prev, [key]: v }))}
                  />
                ))}
              </div>
            </div>
          )}

          {step === "temp" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Chaud ou froid ?</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">Pour orienter la préparation.</p>
              <OptionGrid options={Object.keys(TEMP_LABELS) as Temp[]} labels={TEMP_LABELS} value={temp} onSelect={setTemp} />
            </div>
          )}

          {step === "time" && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Combien de temps tu as ?</h2>
              <p className="text-xs text-[#F5EDED]/40 mb-5">Dernière question avant ta recette.</p>
              <div className="flex flex-col gap-2.5">
                {(Object.keys(TIME_LABELS) as PrepTime[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPrepTime(t)}
                    className={`text-left px-4 py-3.5 rounded-xl border text-sm font-bold transition-all ${
                      prepTime === t
                        ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-white"
                        : "bg-[#1f0101] border-[#890404]/25 text-[#F5EDED]/55 hover:border-[#890404]/50"
                    }`}
                  >
                    {TIME_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "result" && (
            <div>
              {!result ? (
                <div className="text-center py-10">
                  <p className="text-sm text-[#F5EDED]/40">
                    Aucune combinaison trouvée, essaie avec d&apos;autres choix.
                  </p>
                  <button onClick={handleRestart} className="mt-4 text-xs font-bold text-[#E01E1E]">
                    Recommencer
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-[#E01E1E]" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E]">
                      Ta recette sur mesure
                    </p>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-3">{result.name}</h2>
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    <span className="text-xs font-bold text-[#E01E1E]">{result.kcal} kcal</span>
                    <span className="text-xs text-[#F5EDED]/50">P {result.protein}g</span>
                    <span className="text-xs text-[#F5EDED]/50">G {result.carbs}g</span>
                    <span className="text-xs text-[#F5EDED]/50">L {result.fat}g</span>
                    <span className="text-xs text-[#F5EDED]/40">· {result.prepMinutes} min</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">
                        Ingrédients
                      </p>
                      <ul className="space-y-1">
                        {result.ingredients.map((ing, i) => (
                          <li key={i} className="text-xs text-[#F5EDED]/65 flex gap-2">
                            <span className="text-[#E01E1E]">•</span> {ing}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">
                        Préparation
                      </p>
                      <ol className="space-y-1">
                        {result.steps.map((s, i) => (
                          <li key={i} className="text-xs text-[#F5EDED]/65 flex gap-2">
                            <span className="text-[#E01E1E] font-bold">{i + 1}.</span> {s}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {result.allergens.length > 0 && (
                    <p className="text-[10px] text-[#F5EDED]/35 mb-3">
                      <span className="font-bold text-[#F5EDED]/50">Allergènes : </span>
                      {result.allergens.map((a) => ALLERGEN_LABELS[a]).join(", ")}
                    </p>
                  )}

                  <p className="text-xs text-[#F5EDED]/45 italic mb-5 pt-3 border-t border-[#890404]/10">
                    💡 {result.tip}
                  </p>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={handleRestart}
                      className="flex-1 text-xs font-bold uppercase tracking-widest text-[#F5EDED]/50 border border-[#890404]/25 hover:border-[#890404]/50 rounded-lg px-4 py-2.5"
                    >
                      Recommencer
                    </button>
                    {onSaveRecipe && (
                      <button
                        onClick={handleSave}
                        disabled={saveStatus === "saving" || saveStatus === "saved"}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-60 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
                      >
                        {saveStatus === "saving" ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : saveStatus === "saved" ? (
                          <>
                            <Check size={13} /> Enregistrée
                          </>
                        ) : (
                          "Enregistrer dans Recettes"
                        )}
                      </button>
                    )}
                  </div>
                  {saveStatus === "error" && (
                    <p className="text-[11px] text-red-400 font-semibold mt-2">⚠ {saveError}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step !== "result" && (
        <div className="flex gap-2 mt-7">
          {stepIdx > 0 && (
            <button
              onClick={() => go(stepIdx - 1, -1)}
              className="w-12 h-12 flex items-center justify-center rounded-xl border border-[#890404]/25 text-[#F5EDED]/40 flex-shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="flex-1 flex items-center justify-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white text-sm font-bold uppercase tracking-widest h-12 rounded-xl transition-colors"
          >
            {step === "time" ? "Créer ma recette" : "Suivant"} <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
