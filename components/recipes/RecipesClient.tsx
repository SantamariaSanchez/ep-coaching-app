"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Clock, MapPin, Flame, ChevronDown, X, UtensilsCrossed,
  Plus, Heart, Trash2, Wand2, BookOpen, Lock, Sparkles, CalendarPlus, Check,
} from "lucide-react";
import { hasUnlocked, FEATURE_UNLOCK_POINTS } from "@/lib/gamification-types";
import {
  RECIPES,
  MEAL_LABELS,
  DIET_LABELS,
  PHASE_LABELS,
  SEASON_LABELS,
  TEMP_LABELS,
  ALLERGEN_LABELS,
  PRICE_LABELS,
  type Recipe,
  type MealType,
  type Diet,
  type Phase,
  type Season,
  type Temp,
  type Allergen,
} from "@/lib/recipes-data";
import type { CommunityRecipe } from "@/utils/community-recipes";
import type { CommunityRecipeInput } from "@/app/dashboard/client/recettes/actions";
import type { Food } from "@/utils/nutrition";
import { calculateNutrients } from "@/utils/nutrition-utils";
import AddRecipeForm from "@/components/recipes/AddRecipeForm";
import MealCreatorWizard from "@/components/recipes/MealCreatorWizard";
import { MACRO_PROFILE_LABELS, type MacroProfile } from "@/lib/meal-creator";
import { todayInParis } from "@/lib/dates";

// Le créateur de repas connaît le créneau food_logs (breakfast/lunch/...)
// alors que les recettes utilisent leur propre typage MealType
// (petit-dej/dejeuner/...) — correspondance directe où elle existe,
// approximation raisonnable sinon (collation → après-midi, dessert → dîner,
// le moment le plus courant pour un dessert).
const MEAL_TO_SLOT: Record<MealType, string> = {
  "petit-dej": "breakfast",
  dejeuner: "lunch",
  diner: "dinner",
  collation: "afternoon",
  "pre-training": "preworkout",
  "post-training": "postworkout",
  dessert: "dinner",
};

// Retour direct 2026-09-10 ("ameliore encore plus l'onglet [recettes]") :
// prepMinutes/price étaient déjà affichés sur chaque carte mais jamais
// filtrables, alors que "j'ai 10 minutes" ou "petit budget" sont des
// contraintes réelles aussi fréquentes que le régime ou la saison. Même
// principe de bucket que PrepTime dans le générateur (lib/meal-creator.ts),
// pour rester cohérent entre les deux écrans.
type PrepBucket = "rapide" | "moyen" | "long";
const PREP_BUCKET_LABELS: Record<PrepBucket, string> = {
  rapide: "Rapide (≤ 15 min)",
  moyen: "Moyen (≤ 30 min)",
  long: "Long (> 30 min)",
};
function prepBucketOf(minutes: number): PrepBucket {
  if (minutes <= 15) return "rapide";
  if (minutes <= 30) return "moyen";
  return "long";
}
// FilterGroup n'accepte que des options string ; le budget de la recette
// (Recipe.price: 1|2|3) est donc converti en clé "1"|"2"|"3" pour l'UI.
const BUDGET_LABELS: Record<string, string> = {
  "1": PRICE_LABELS[1],
  "2": PRICE_LABELS[2],
  "3": PRICE_LABELS[3],
};

// Classe une recette par profil macro à partir de ses totaux kcal/P/G/L —
// calculé à la volée plutôt que d'exiger un tag manuel supplémentaire à la
// création, donc toujours cohérent avec les vrais chiffres de la recette.
// Une recette peut cocher plusieurs profils (ex. riche en protéines ET
// faible en glucides à la fois).
function classifyMacroProfiles(r: { kcal: number; protein: number; carbs: number; fat: number }): MacroProfile[] {
  if (!r.kcal) return ["equilibre"];
  const proteinPct = (r.protein * 4) / r.kcal;
  const carbPct = (r.carbs * 4) / r.kcal;
  const fatPct = (r.fat * 9) / r.kcal;
  const tags: MacroProfile[] = [];
  if (proteinPct >= 0.35) tags.push("riche_proteine");
  if (carbPct >= 0.5) tags.push("riche_glucide");
  if (carbPct < 0.2) tags.push("faible_glucide");
  if (fatPct >= 0.4) tags.push("riche_lipide");
  if (tags.length === 0) tags.push("equilibre");
  return tags;
}

interface DisplayRecipe extends Recipe {
  isCommunity: boolean;
  authorId: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  foodsUsed: { food_id: string; grams: number }[] | null;
}

function toDisplay(r: Recipe): DisplayRecipe {
  return { ...r, isCommunity: false, authorId: null, authorName: null, authorAvatarUrl: null, foodsUsed: null };
}

function communityToDisplay(r: CommunityRecipe): DisplayRecipe {
  return {
    id: r.id,
    name: r.name,
    meal: r.meal,
    diet: r.diet,
    phases: r.phases,
    season: r.season,
    temp: r.temp,
    texture: r.texture,
    price: r.price,
    region: r.region ?? "France entière",
    prepMinutes: r.prep_minutes,
    kcal: r.kcal,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    allergens: r.allergens,
    ingredients: r.ingredients,
    steps: r.steps,
    tip: r.tip ?? "",
    isCommunity: true,
    authorId: r.author_id,
    authorName: r.author_name,
    authorAvatarUrl: r.author_avatar_url,
    foodsUsed: r.foods_used ?? null,
  };
}

// ── Filter chip ─────────────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-colors ${
        active
          ? "bg-[#E01E1E] border-[#E01E1E] text-white"
          : "bg-[#1f0101] border-[#890404]/25 text-[#F5EDED]/50 hover:border-[#890404]/50 hover:text-[#F5EDED]/75"
      }`}
    >
      {children}
    </button>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  labels,
  selected,
  toggle,
}: {
  label: string;
  options: T[];
  labels: Record<string, string>;
  selected: Set<T>;
  toggle: (v: T) => void;
}) {
  return (
    <div className="mb-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-1.5">
        {label}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {options.map((opt) => (
          <Chip key={opt} active={selected.has(opt)} onClick={() => toggle(opt)}>
            {labels[opt]}
          </Chip>
        ))}
      </div>
    </div>
  );
}

// ── Recipe card ───────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  expanded,
  onToggle,
  basePath,
  canDelete,
  onDelete,
  locked,
  recommended,
  onLogToday,
}: {
  recipe: DisplayRecipe;
  expanded: boolean;
  onToggle: () => void;
  basePath: string;
  canDelete: boolean;
  onDelete: () => void;
  locked: boolean;
  recommended: boolean;
  /** Fourni + recipe.foodsUsed non vide = bouton "Loguer aujourd'hui" affiché. */
  onLogToday?: () => Promise<{ error?: string }>;
}) {
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  async function handleLogToday() {
    if (!onLogToday || logging) return;
    setLogging(true);
    setLogError(null);
    const result = await onLogToday();
    setLogging(false);
    if (result.error) {
      setLogError(result.error);
      return;
    }
    setLogged(true);
    setTimeout(() => setLogged(false), 3000);
  }
  if (locked) {
    return (
      <div className="bg-[#1f0101] border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
          <Lock size={15} className="text-amber-400" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white/80 truncate">{recipe.name}</p>
          <p className="text-[10px] text-amber-300/70">
            Recette exclusive, débloquée à {FEATURE_UNLOCK_POINTS.exclusive_recipes} pts ou avec l&apos;abonnement
          </p>
        </div>
        <Sparkles size={14} className="text-amber-500/40 flex-shrink-0" />
      </div>
    );
  }

  const tempAccent =
    recipe.temp === "chaud" ? "#f97316" : recipe.temp === "froid" ? "#38bdf8" : "#a78bfa";

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl overflow-hidden flex flex-col h-full">
      <div style={{ height: 3, background: tempAccent, opacity: 0.6 }} />
      <button onClick={onToggle} className="w-full text-left p-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-white">{recipe.name}</p>
              {recipe.isCommunity && (
                <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#E01E1E]/15 text-[#E01E1E] border border-[#E01E1E]/25 flex-shrink-0">
                  Communauté
                </span>
              )}
              {recipe.exclusive && (
                <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 flex-shrink-0">
                  <Sparkles size={9} /> Exclusive
                </span>
              )}
              {recommended && (
                <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/25 flex-shrink-0">
                  <Sparkles size={9} /> Recommandé pour toi
                </span>
              )}
            </div>
            {recipe.isCommunity && recipe.authorName && (
              <Link
                href={`${basePath}/profile/${recipe.authorId}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-[10px] text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors"
              >
                {recipe.authorAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={recipe.authorAvatarUrl}
                    alt=""
                    className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-[#E01E1E] to-[#890404] flex-shrink-0" />
                )}
                par {recipe.authorName}
              </Link>
            )}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-[10px] text-[#F5EDED]/40 flex items-center gap-1">
                <Clock size={11} strokeWidth={1.8} /> {recipe.prepMinutes} min
              </span>
              <span className="text-[10px] text-[#F5EDED]/40 flex items-center gap-1">
                <MapPin size={11} strokeWidth={1.8} /> {recipe.region}
              </span>
              <span className="text-[10px] text-[#F5EDED]/40">{PRICE_LABELS[recipe.price]}</span>
              <span className="text-[10px] text-[#F5EDED]/40 capitalize">{TEMP_LABELS[recipe.temp]}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] font-bold text-[#E01E1E] flex items-center gap-1">
                <Flame size={11} strokeWidth={2} /> {recipe.kcal} kcal
              </span>
              <span className="text-[10px] text-[#F5EDED]/50">P {recipe.protein}g</span>
              <span className="text-[10px] text-[#F5EDED]/50">G {recipe.carbs}g</span>
              <span className="text-[10px] text-[#F5EDED]/50">L {recipe.fat}g</span>
              {classifyMacroProfiles(recipe)
                .filter((p) => p !== "equilibre")
                .map((p) => (
                  <span key={p} className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#890404]/20 text-[#F5EDED]/50 border border-[#890404]/20">
                    {MACRO_PROFILE_LABELS[p]}
                  </span>
                ))}
            </div>
          </div>
          <ChevronDown
            size={16}
            className={`text-[#F5EDED]/30 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#890404]/15 pt-3">
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            {recipe.diet.map((d) => (
              <span key={d} className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#890404]/15 text-[#F5EDED]/55">
                {DIET_LABELS[d]}
              </span>
            ))}
            {recipe.phases.map((p) => (
              <span key={p} className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-500/10 text-green-400/80 border border-green-500/20">
                {PHASE_LABELS[p]}
              </span>
            ))}
            {recipe.season.map((s) => (
              <span key={s} className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80 border border-amber-500/20">
                {SEASON_LABELS[s]}
              </span>
            ))}
            {recipe.texture.map((t) => (
              <span key={t} className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#F5EDED]/5 text-[#F5EDED]/40">
                {t}
              </span>
            ))}
          </div>

          {recipe.allergens.length > 0 && (
            <p className="text-[10px] text-[#F5EDED]/35 mb-3">
              <span className="font-bold text-[#F5EDED]/50">Allergènes : </span>
              {recipe.allergens.map((a) => ALLERGEN_LABELS[a]).join(", ")}
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">Ingrédients</p>
              <ul className="space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-xs text-[#F5EDED]/65 flex gap-2">
                    <span className="text-[#E01E1E]">•</span> {ing}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">Préparation</p>
              <ol className="space-y-1">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="text-xs text-[#F5EDED]/65 flex gap-2">
                    <span className="text-[#E01E1E] font-bold">{i + 1}.</span> {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {recipe.tip && (
            <p className="text-xs text-[#F5EDED]/45 italic mt-3 pt-3 border-t border-[#890404]/10">
              💡 {recipe.tip}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {onLogToday && recipe.foodsUsed && recipe.foodsUsed.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogToday();
                }}
                disabled={logging}
                title="Ajoute chaque ingrédient de cette recette à ton journal alimentaire d'aujourd'hui" aria-label="Ajoute chaque ingrédient de cette recette à ton journal alimentaire d'aujourd'hui"
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  logged ? "text-green-400" : "text-[#E01E1E] hover:text-[#ff4444]"
                } disabled:opacity-50`}
              >
                {logged ? <Check size={11} /> : <CalendarPlus size={11} />}
                {logged ? "Ajouté au journal" : logging ? "Ajout…" : "Loguer aujourd'hui"}
              </button>
            )}
            {logError && <p className="text-[10px] text-red-400">{logError}</p>}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-red-400 transition-colors"
              >
                <Trash2 size={11} /> Supprimer ma recette
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main client component ──────────────────────────────────────────────────

export default function RecipesClient({
  communityRecipes,
  foods: initialFoods,
  currentUserId,
  isCoach,
  points,
  isSubscribed,
  createRecipe,
  deleteRecipe,
  createCustomFood,
  addFoodLog,
  presetDiet,
  presetAllergens,
  recommendedPhase,
  checkGenerationQuota,
}: {
  communityRecipes: CommunityRecipe[];
  foods: Food[];
  currentUserId: string;
  isCoach: boolean;
  points: number;
  isSubscribed: boolean;
  createRecipe: (input: CommunityRecipeInput) => Promise<{ error?: string; id?: string }>;
  deleteRecipe: (id: string) => Promise<{ error?: string }>;
  checkGenerationQuota?: () => Promise<{ allowed: boolean; message?: string }>;
  createCustomFood: (params: {
    name: string;
    category: string;
    calories_per_100: number;
    proteins_per_100: number;
    carbs_per_100: number;
    fats_per_100: number;
    fibers_per_100: number;
  }) => Promise<{ food?: Food; error?: string }>;
  // Fournie côté client uniquement (addFoodLog exige un compte client, voir
  // requireClient()) — active le bouton "Loguer aujourd'hui" sur les
  // recettes issues du créateur de repas (aliments réels connus).
  addFoodLog?: (params: {
    foodId: string | null;
    mealSlot: string;
    quantityG: number;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    loggedAt: string;
  }) => Promise<{ id?: string; error?: string }>;
  // Régime/allergies déjà connus via la fiche client — évite de reposer ces
  // questions dans le créateur de recette quand le coach les a déjà remplies.
  presetDiet?: Diet | null;
  presetAllergens?: Allergen[] | null;
  // Phase nutritionnelle déduite de profiles.goal (voir goalToPhase) — sert
  // à faire remonter les recettes pertinentes pour le client, jamais utilisé
  // côté coach qui parcourt le catalogue pour plusieurs clients différents.
  recommendedPhase?: Phase | null;
}) {
  const basePath = isCoach ? "/dashboard/coach" : "/dashboard/client";
  const recipesUnlocked = isCoach || hasUnlocked("exclusive_recipes", points, isSubscribed);

  // Une recette "recommandée" correspond au régime ET à la phase déduits du
  // profil du client (jamais pour le coach, qui parcourt le catalogue pour
  // plusieurs clients). Sans donnée de profil, personne n'est mis en avant :
  // le catalogue reste identique à avant.
  // MASTERCLASS (react-hooks/exhaustive-deps, 2026-08-16) : useCallback
  // plutôt qu'une fonction simple, pour que le useMemo plus bas (filtered)
  // puisse la lister honnêtement dans ses dépendances sans recalculer à
  // chaque rendu (une fonction déclarée dans le corps du composant change
  // d'identité à chaque rendu, ce que le useMemo ignorait silencieusement).
  const isRecommended = useCallback(
    (r: DisplayRecipe): boolean => {
      if (isCoach) return false;
      if (r.exclusive && !recipesUnlocked) return false;
      if (!presetDiet && !recommendedPhase) return false;
      const dietMatch = !presetDiet || r.diet.includes(presetDiet);
      const phaseMatch = !recommendedPhase || r.phases.includes(recommendedPhase);
      return dietMatch && phaseMatch;
    },
    [isCoach, recipesUnlocked, presetDiet, recommendedPhase]
  );
  const [foods, setFoods] = useState<Food[]>(initialFoods);
  const [tab, setTab] = useState<"bibliotheque" | "creer">("bibliotheque");
  const [showAddForm, setShowAddForm] = useState(false);
  const [recipes, setRecipes] = useState<DisplayRecipe[]>([
    ...communityRecipes.map(communityToDisplay),
    ...RECIPES.map(toDisplay),
  ]);

  const [search, setSearch] = useState("");
  const [meals, setMeals] = useState<Set<MealType>>(new Set());
  const [diets, setDiets] = useState<Set<Diet>>(new Set());
  const [phases, setPhases] = useState<Set<Phase>>(new Set());
  const [seasons, setSeasons] = useState<Set<Season>>(new Set());
  const [temps, setTemps] = useState<Set<Temp>>(new Set());
  const [macroProfiles, setMacroProfiles] = useState<Set<MacroProfile>>(new Set());
  const [excludedAllergens, setExcludedAllergens] = useState<Set<Allergen>>(new Set());
  const [prepBuckets, setPrepBuckets] = useState<Set<PrepBucket>>(new Set());
  // FilterGroup est générique sur T extends string (les chips affichent
  // labels[opt]) — le budget de la recette est un nombre (1|2|3), donc
  // stocké ici comme string ("1"|"2"|"3") et reconverti au moment du
  // filtre plutôt que d'élargir la contrainte du composant partagé.
  const [budgets, setBudgets] = useState<Set<"1" | "2" | "3">>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  function toggleSet<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipes.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.ingredients.some((i) => i.toLowerCase().includes(q))) return false;
      if (meals.size && !meals.has(r.meal)) return false;
      if (diets.size && !r.diet.some((d) => diets.has(d))) return false;
      if (phases.size && !r.phases.some((p) => phases.has(p))) return false;
      if (seasons.size && !r.season.some((s) => seasons.has(s) || s === "toute-saison")) return false;
      if (temps.size && !temps.has(r.temp)) return false;
      if (macroProfiles.size && !classifyMacroProfiles(r).some((p) => macroProfiles.has(p))) return false;
      if (excludedAllergens.size && r.allergens.some((a) => excludedAllergens.has(a))) return false;
      if (prepBuckets.size && !prepBuckets.has(prepBucketOf(r.prepMinutes))) return false;
      if (budgets.size && !budgets.has(String(r.price) as "1" | "2" | "3")) return false;
      return true;
    }).sort((a, b) => {
      const ra = isRecommended(a) ? 0 : 1;
      const rb = isRecommended(b) ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name, "fr");
    });
  }, [recipes, search, meals, diets, phases, seasons, temps, macroProfiles, excludedAllergens, prepBuckets, budgets, isRecommended]);

  const recommendedCount = isCoach ? 0 : filtered.filter(isRecommended).length;

  const activeFilterCount =
    meals.size + diets.size + phases.size + seasons.size + temps.size + macroProfiles.size + excludedAllergens.size + prepBuckets.size + budgets.size;

  function resetFilters() {
    setMeals(new Set());
    setDiets(new Set());
    setPhases(new Set());
    setSeasons(new Set());
    setTemps(new Set());
    setMacroProfiles(new Set());
    setExcludedAllergens(new Set());
    setPrepBuckets(new Set());
    setBudgets(new Set());
  }

  async function handleDelete(id: string) {
    const res = await deleteRecipe(id);
    if (!res.error) {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    }
  }

  // Ajoute chaque aliment réel de la recette (foodsUsed, voir lib/meal-creator)
  // au journal alimentaire d'aujourd'hui — en parallèle, un seul log par
  // ingrédient plutôt qu'une entrée "recette" agrégée : cohérent avec le
  // reste du suivi, qui logue toujours au niveau aliment.
  async function handleLogRecipeToday(recipe: DisplayRecipe): Promise<{ error?: string }> {
    if (!addFoodLog || !recipe.foodsUsed || recipe.foodsUsed.length === 0) return {};
    // MASTERCLASS.md Axe L : UTC, pas Paris — entre minuit et 1h/2h du
    // matin, ça loguait la recette sous la date d'HIER (loggedAt), donc
    // invisible dans le suivi du jour (ClientNutritionView reçoit son
    // "today" correctement calculé côté serveur via todayInParis()) — même
    // classe de bug que les doublons déjà corrigés dans le tracker.
    const today = todayInParis();
    const slot = MEAL_TO_SLOT[recipe.meal];
    const results = await Promise.all(
      recipe.foodsUsed.map(({ food_id, grams }): Promise<{ id?: string; error?: string }> => {
        const food = foods.find((f) => f.id === food_id);
        if (!food) return Promise.resolve({});
        const n = calculateNutrients(food, grams);
        return addFoodLog({
          foodId: food.id,
          mealSlot: slot,
          quantityG: grams,
          calories: n.calories,
          proteins: n.proteins,
          carbs: n.carbs,
          fats: n.fats,
          loggedAt: today,
        });
      })
    );
    // MASTERCLASS.md Axe B : un repas loggue plusieurs aliments d'un coup —
    // si l'un d'eux échoue, ce n'était pas remonté et "Loggué ✓" s'affichait
    // quand même, alors que la journée était incomplète.
    const failed = results.find((r) => r.error);
    return failed ? { error: failed.error } : {};
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-[#890404]/20 overflow-x-auto">
        {[
          { key: "bibliotheque" as const, label: "Bibliothèque", icon: BookOpen },
          { key: "creer" as const, label: "Créateur de repas", icon: Wand2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
              tab === key
                ? "text-[#E01E1E] border-b-2 border-[#E01E1E]"
                : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "creer" ? (
        <MealCreatorWizard
          foods={foods}
          createCustomFood={createCustomFood}
          onFoodCreated={(food) => setFoods((prev) => [food, ...prev])}
          presetDiet={presetDiet}
          presetAllergens={presetAllergens}
          checkGenerationQuota={checkGenerationQuota}
          onSaveRecipe={async (input) => {
            const res = await createRecipe(input);
            if (!res.error && res.id) {
              setRecipes((prev) => [
                communityToDisplay({
                  id: res.id!,
                  author_id: currentUserId,
                  author_name: "Toi",
                  author_avatar_url: null,
                  name: input.name,
                  meal: input.meal,
                  diet: input.diet,
                  phases: input.phases,
                  season: input.season,
                  temp: input.temp,
                  texture: input.texture,
                  price: input.price,
                  region: input.region,
                  prep_minutes: input.prep_minutes,
                  kcal: input.kcal,
                  protein: input.protein,
                  carbs: input.carbs,
                  fat: input.fat,
                  allergens: input.allergens,
                  ingredients: input.ingredients,
                  steps: input.steps,
                  tip: input.tip,
                  foods_used: input.foods_used ?? null,
                  created_at: new Date().toISOString(),
                }),
                ...prev,
              ]);
              // Switch to the library tab so the user sees their new recipe
              setTimeout(() => setTab("bibliotheque"), 1800);
            }
            return res;
          }}
        />
      ) : (
        <>
          {/* Add own recipe */}
          {showAddForm ? (
            <div className="mb-4">
              <AddRecipeForm
                onCreate={async (input) => {
                  const res = await createRecipe(input);
                  if (!res.error && res.id) {
                    setRecipes((prev) => [
                      communityToDisplay({
                        id: res.id!,
                        author_id: currentUserId,
                        author_name: "Toi",
                        author_avatar_url: null,
                        ...input,
                        created_at: new Date().toISOString(),
                      }),
                      ...prev,
                    ]);
                  }
                  return res;
                }}
                onDone={() => setShowAddForm(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#E01E1E] mb-4"
            >
              <Plus size={13} /> Ajouter ma recette
            </button>
          )}

          {/* Search */}
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/30" strokeWidth={1.8} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une recette ou un ingrédient..." aria-label="Rechercher une recette ou un ingrédient..."
              className="w-full bg-[#1f0101] border border-[#890404]/25 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="flex items-center justify-between w-full bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-2.5 mb-3"
          >
            <span className="text-xs font-bold text-[#F5EDED]/60">
              Filtres {activeFilterCount > 0 && `(${activeFilterCount})`}
            </span>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    resetFilters();
                  }}
                  className="text-[10px] font-bold text-[#E01E1E] flex items-center gap-1"
                >
                  <X size={11} /> Réinitialiser
                </span>
              )}
              <ChevronDown
                size={14}
                className={`text-[#F5EDED]/40 transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          {showFilters && (
            <div className="bg-[#150000] border border-[#890404]/15 rounded-xl p-4 mb-4">
              <FilterGroup label="Type de repas" options={Object.keys(MEAL_LABELS) as MealType[]} labels={MEAL_LABELS} selected={meals} toggle={(v) => toggleSet(setMeals, v)} />
              <FilterGroup label="Régime alimentaire" options={Object.keys(DIET_LABELS) as Diet[]} labels={DIET_LABELS} selected={diets} toggle={(v) => toggleSet(setDiets, v)} />
              <FilterGroup label="Phase nutritionnelle" options={Object.keys(PHASE_LABELS) as Phase[]} labels={PHASE_LABELS} selected={phases} toggle={(v) => toggleSet(setPhases, v)} />
              <FilterGroup label="Saison" options={Object.keys(SEASON_LABELS).filter((s) => s !== "toute-saison") as Season[]} labels={SEASON_LABELS} selected={seasons} toggle={(v) => toggleSet(setSeasons, v)} />
              <FilterGroup label="Température" options={Object.keys(TEMP_LABELS) as Temp[]} labels={TEMP_LABELS} selected={temps} toggle={(v) => toggleSet(setTemps, v)} />
              <FilterGroup label="Profil macro" options={Object.keys(MACRO_PROFILE_LABELS) as MacroProfile[]} labels={MACRO_PROFILE_LABELS} selected={macroProfiles} toggle={(v) => toggleSet(setMacroProfiles, v)} />
              <FilterGroup label="Exclure allergènes" options={Object.keys(ALLERGEN_LABELS) as Allergen[]} labels={ALLERGEN_LABELS} selected={excludedAllergens} toggle={(v) => toggleSet(setExcludedAllergens, v)} />
              <FilterGroup label="Temps de préparation" options={["rapide", "moyen", "long"] as PrepBucket[]} labels={PREP_BUCKET_LABELS} selected={prepBuckets} toggle={(v) => toggleSet(setPrepBuckets, v)} />
              <FilterGroup label="Budget" options={["1", "2", "3"] as ("1" | "2" | "3")[]} labels={BUDGET_LABELS} selected={budgets} toggle={(v) => toggleSet(setBudgets, v)} />
            </div>
          )}

          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-3 flex items-center gap-1.5 flex-wrap">
            {filtered.length} recette{filtered.length > 1 ? "s" : ""}
            {communityRecipes.length > 0 && (
              <span className="flex items-center gap-1 text-[#E01E1E]/70">
                <Heart size={10} /> dont {communityRecipes.length} de la communauté
              </span>
            )}
            {recommendedCount > 0 && (
              <span className="flex items-center gap-1 text-green-400/70">
                <Sparkles size={10} /> dont {recommendedCount} recommandées pour toi
              </span>
            )}
          </p>

          {filtered.length === 0 ? (
            <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
              <UtensilsCrossed size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-[#F5EDED]/35">Aucune recette ne correspond à ces filtres.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ alignItems: "start" }}>
              {filtered.map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  expanded={expandedId === r.id}
                  onToggle={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                  basePath={basePath}
                  canDelete={r.isCommunity && (r.authorId === currentUserId || isCoach)}
                  onDelete={() => handleDelete(r.id)}
                  locked={!!r.exclusive && !recipesUnlocked}
                  recommended={isRecommended(r)}
                  onLogToday={!isCoach && addFoodLog ? () => handleLogRecipeToday(r) : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
