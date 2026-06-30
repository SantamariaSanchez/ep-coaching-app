"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Clock, MapPin, Flame, ChevronDown, X, UtensilsCrossed,
  Plus, Heart, Trash2, Wand2, BookOpen, Lock, Sparkles,
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
import AddRecipeForm from "@/components/recipes/AddRecipeForm";
import MealCreatorWizard from "@/components/recipes/MealCreatorWizard";

interface DisplayRecipe extends Recipe {
  isCommunity: boolean;
  authorId: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
}

function toDisplay(r: Recipe): DisplayRecipe {
  return { ...r, isCommunity: false, authorId: null, authorName: null, authorAvatarUrl: null };
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
}: {
  recipe: DisplayRecipe;
  expanded: boolean;
  onToggle: () => void;
  basePath: string;
  canDelete: boolean;
  onDelete: () => void;
  locked: boolean;
}) {
  if (locked) {
    return (
      <div className="bg-[#1f0101] border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
          <Lock size={15} className="text-amber-400" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white/80 truncate">{recipe.name}</p>
          <p className="text-[10px] text-amber-300/70">
            Recette exclusive — débloquée à {FEATURE_UNLOCK_POINTS.exclusive_recipes} pts ou avec l&apos;abonnement
          </p>
        </div>
        <Sparkles size={14} className="text-amber-500/40 flex-shrink-0" />
      </div>
    );
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4">
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
            </div>
            {recipe.isCommunity && recipe.authorName && (
              <Link
                href={`${basePath}/profile/${recipe.authorId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors"
              >
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

          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-red-400 transition-colors mt-3"
            >
              <Trash2 size={11} /> Supprimer ma recette
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main client component ──────────────────────────────────────────────────

export default function RecipesClient({
  communityRecipes,
  foods,
  currentUserId,
  isCoach,
  points,
  isSubscribed,
  createRecipe,
  deleteRecipe,
}: {
  communityRecipes: CommunityRecipe[];
  foods: Food[];
  currentUserId: string;
  isCoach: boolean;
  points: number;
  isSubscribed: boolean;
  createRecipe: (input: CommunityRecipeInput) => Promise<{ error?: string; id?: string }>;
  deleteRecipe: (id: string) => Promise<{ error?: string }>;
}) {
  const basePath = isCoach ? "/dashboard/coach" : "/dashboard/client";
  const recipesUnlocked = isCoach || hasUnlocked("exclusive_recipes", points, isSubscribed);
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
  const [excludedAllergens, setExcludedAllergens] = useState<Set<Allergen>>(new Set());
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
      if (excludedAllergens.size && r.allergens.some((a) => excludedAllergens.has(a))) return false;
      return true;
    });
  }, [recipes, search, meals, diets, phases, seasons, temps, excludedAllergens]);

  const activeFilterCount =
    meals.size + diets.size + phases.size + seasons.size + temps.size + excludedAllergens.size;

  function resetFilters() {
    setMeals(new Set());
    setDiets(new Set());
    setPhases(new Set());
    setSeasons(new Set());
    setTemps(new Set());
    setExcludedAllergens(new Set());
  }

  async function handleDelete(id: string) {
    const res = await deleteRecipe(id);
    if (!res.error) {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    }
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
          onSaveRecipe={async (input) => {
            const res = await createRecipe(input);
            if (!res.error && res.id) {
              // Optimistically surface it in the library too
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
                  created_at: new Date().toISOString(),
                }),
                ...prev,
              ]);
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
              placeholder="Rechercher une recette ou un ingrédient..."
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
              <FilterGroup label="Exclure allergènes" options={Object.keys(ALLERGEN_LABELS) as Allergen[]} labels={ALLERGEN_LABELS} selected={excludedAllergens} toggle={(v) => toggleSet(setExcludedAllergens, v)} />
            </div>
          )}

          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-3 flex items-center gap-1.5">
            {filtered.length} recette{filtered.length > 1 ? "s" : ""}
            {communityRecipes.length > 0 && (
              <span className="flex items-center gap-1 text-[#E01E1E]/70">
                <Heart size={10} /> dont {communityRecipes.length} de la communauté
              </span>
            )}
          </p>

          {filtered.length === 0 ? (
            <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
              <UtensilsCrossed size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-[#F5EDED]/35">Aucune recette ne correspond à ces filtres.</p>
            </div>
          ) : (
            <div className="space-y-2">
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
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
