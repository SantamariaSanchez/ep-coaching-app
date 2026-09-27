"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChefHat, ClipboardList, Search, ScanBarcode, Sparkles, Zap } from "lucide-react";
import Sheet from "@/components/nutrition/Sheet";
import BarcodeScannerModal from "@/components/ui/BarcodeScannerModal";
import { FAMILY_LABELS, macrosFor, normalize, planTotals, searchFoods, slotLabel, type Family, type PlanItem, type SearchContext, type SearchFilter } from "@/lib/nutrition-engine";
import type { Food } from "@/utils/nutrition";
import type { SavedMeal } from "@/utils/saved-meals";

export interface TrackerRecipe {
  id: string;
  name: string;
  meal: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "appli" | "communaute";
}

export interface PlanMealOption {
  key: string;
  label: string;
  items: PlanItem[];
}

type Tab = "aliments" | "plan" | "recettes" | "repas" | "rapide";

const FILTERS: { key: SearchFilter; label: string }[] = [
  { key: "tout", label: "Tout" },
  { key: "plan", label: "Du plan" },
  { key: "recents", label: "Récents" },
  ...(["proteine", "laitier", "poudre", "feculent", "legume", "fruit", "gras", "legumineuse", "sucre"] as Family[]).map((f) => ({ key: f, label: FAMILY_LABELS[f] })),
];

const MEAL_FOR_SLOT: Record<string, string> = {
  breakfast: "petit-dej",
  morning: "collation",
  lunch: "dejeuner",
  afternoon: "collation",
  preworkout: "collation",
  postworkout: "dejeuner",
  dinner: "diner",
};

const RECIPE_MEALS = [
  { key: "", label: "Toutes" },
  { key: "petit-dej", label: "Petit-déj" },
  { key: "dejeuner", label: "Déjeuner" },
  { key: "diner", label: "Dîner" },
  { key: "collation", label: "Collation" },
];

const chip = (active: boolean) =>
  `shrink-0 px-3 py-1.5 rounded-full border text-[11px] font-bold whitespace-nowrap transition-colors ${
    active ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-[#ff6b6b]" : "border-[#890404]/30 text-[#F5EDED]/55"
  }`;

const input =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60";

export default function AddFoodSheet({
  slot,
  date,
  foods,
  ctx,
  defaultGrams,
  planMealsToday,
  planMealsOther,
  recipes,
  savedMeals,
  busy,
  error,
  onAddFoods,
  onAddPortion,
  onCreateFood,
  onClose,
}: {
  slot: string;
  date: string;
  foods: Food[];
  ctx: SearchContext;
  defaultGrams: (food: Food) => number;
  planMealsToday: PlanMealOption[];
  planMealsOther: PlanMealOption[];
  recipes: TrackerRecipe[];
  savedMeals: SavedMeal[];
  busy: boolean;
  error: string | null;
  onAddFoods: (items: { food: Food; grams: number; planMealId?: string | null }[]) => void;
  onAddPortion: (input: { name: string; kind: "recette" | "rapide"; kcal: number; protein: number; carbs: number; fat: number; servings: number }) => void;
  onCreateFood: (food: Omit<Food, "id">) => Promise<Food | null>;
  onClose: () => void;
}) {
  const hasPlan = planMealsToday.length + planMealsOther.length > 0;
  const [tab, setTab] = useState<Tab>("aliments");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("tout");
  const [picked, setPicked] = useState<Food | null>(null);
  const [qty, setQty] = useState("");
  const [recipeQuery, setRecipeQuery] = useState("");
  const [recipeMeal, setRecipeMeal] = useState(MEAL_FOR_SLOT[slot] ?? "");
  const [recipe, setRecipe] = useState<TrackerRecipe | null>(null);
  const [servings, setServings] = useState(1);
  const [quick, setQuick] = useState({ name: "", kcal: "", p: "", c: "", f: "" });
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const results = useMemo(() => searchFoods(foods, query, ctx, filter, 40), [foods, query, ctx, filter]);

  const recipeResults = useMemo(() => {
    const q = normalize(recipeQuery);
    return recipes
      .filter((r) => (!recipeMeal || r.meal === recipeMeal) && (!q || normalize(r.name).includes(q)))
      .sort((a, b) => b.protein / Math.max(1, b.kcal) - a.protein / Math.max(1, a.kcal))
      .slice(0, 60);
  }, [recipes, recipeQuery, recipeMeal]);

  function pick(f: Food) {
    setPicked(f);
    setQty(String(defaultGrams(f)));
  }

  async function handleScan(code: string) {
    setScanning(false);
    setScanMsg("Recherche du produit...");
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      const data = await res.json();
      const p = data?.product;
      const kcal = p?.nutriments?.["energy-kcal_100g"];
      if (!p || data.status !== 1 || kcal == null) {
        setScanMsg("Produit introuvable. Ajoute-le en ajout rapide.");
        setTab("rapide");
        return;
      }
      const created = await onCreateFood({
        name: String(p.product_name || p.generic_name || "Produit scanné").trim().slice(0, 200),
        category: "Divers",
        calories_per_100: Math.min(1000, Math.round(kcal)),
        proteins_per_100: Math.min(100, Math.round((p.nutriments.proteins_100g ?? 0) * 10) / 10),
        carbs_per_100: Math.min(100, Math.round((p.nutriments.carbohydrates_100g ?? 0) * 10) / 10),
        fats_per_100: Math.min(100, Math.round((p.nutriments.fat_100g ?? 0) * 10) / 10),
        fibers_per_100: Math.min(100, Math.round((p.nutriments.fiber_100g ?? 0) * 10) / 10),
      });
      setScanMsg(null);
      if (created) pick(created);
      else setScanMsg("Impossible d'enregistrer ce produit.");
    } catch {
      setScanMsg("Pas de connexion pour vérifier ce produit.");
    }
  }

  const g = Math.max(0, Number(qty.replace(",", ".")) || 0);
  const tabs: { key: Tab; label: string; icon: typeof Search }[] = [
    { key: "aliments", label: "Aliments", icon: Search },
    ...(hasPlan ? [{ key: "plan" as Tab, label: "Plan", icon: ClipboardList }] : []),
    { key: "recettes", label: "Recettes", icon: ChefHat },
    ...(savedMeals.length ? [{ key: "repas" as Tab, label: "Mes repas", icon: BookOpen }] : []),
    { key: "rapide", label: "Rapide", icon: Zap },
  ];

  const dayLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));

  // Étape 2 d'un aliment : la quantité.
  if (picked) {
    const m = macrosFor(picked, g);
    return (
      <Sheet
        title={picked.name}
        subtitle={`${slotLabel(slot)} · ${dayLabel}`}
        onClose={onClose}
        footer={
          <div className="flex gap-2">
            <button type="button" onClick={() => setPicked(null)} className="px-4 py-3 rounded-xl border border-[#890404]/40 text-[#F5EDED]/70 text-xs font-bold uppercase tracking-widest">
              Retour
            </button>
            <button
              type="button"
              disabled={busy || g <= 0}
              onClick={() => onAddFoods([{ food: picked, grams: g }])}
              className="flex-1 px-4 py-3 rounded-xl bg-[#E01E1E] text-white text-xs font-black uppercase tracking-widest disabled:opacity-40"
            >
              {busy ? "..." : `Ajouter ${g} g`}
            </button>
          </div>
        }
      >
        <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" autoFocus aria-label="Quantité en grammes" className={`${input} text-center text-2xl font-black`} />
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {[...new Set([defaultGrams(picked), 30, 50, 100, 150, 200, 250])].map((v) => (
            <button key={v} type="button" onClick={() => setQty(String(v))} className={chip(g === v)}>
              {v} g
            </button>
          ))}
        </div>
        <p className="text-sm text-[#F5EDED]/70 mt-4">
          <b className="text-white">{Math.round(m.calories)} kcal</b> · P {Math.round(m.proteins)} g · G {Math.round(m.carbs)} g · L {Math.round(m.fats)} g
        </p>
        {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
      </Sheet>
    );
  }

  return (
    <Sheet title={`Ajouter au ${slotLabel(slot).toLowerCase()}`} subtitle={dayLabel} onClose={onClose}>
      {scanning && <BarcodeScannerModal onScan={handleScan} onClose={() => setScanning(false)} />}
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-3 no-scrollbar">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`${chip(tab === key)} inline-flex items-center gap-1.5`}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-300 mb-2">{error}</p>}

      {tab === "aliments" && (
        <>
          <div className="flex gap-2 mb-2.5">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/30" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Riz, poulet, skyr..." aria-label="Chercher un aliment" autoFocus className={`${input} pl-9`} />
            </div>
            <button type="button" onClick={() => setScanning(true)} aria-label="Scanner un code-barres" className="px-3 rounded-lg border border-[#890404]/35 text-[#F5EDED]/70">
              <ScanBarcode size={18} />
            </button>
          </div>
          {scanMsg && <p className="text-xs text-[#F5EDED]/60 mb-2">{scanMsg}</p>}
          <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-2.5 no-scrollbar">
            {FILTERS.filter((f) => f.key !== "plan" || ctx.planIds.size > 0).map((f) => (
              <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={chip(filter === f.key)}>
                {f.label}
              </button>
            ))}
          </div>
          {!query && filter === "tout" && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5 flex items-center gap-1.5">
              <Sparkles size={11} /> Ton plan, tes récents et tes habitudes d&apos;abord
            </p>
          )}
          <div className="space-y-0.5">
            {results.map((f) => {
              const tag = ctx.slotPlanIds?.has(f.id) ? "Plan de ce repas" : ctx.planIds.has(f.id) ? "Dans ton plan" : ctx.recentIds.includes(f.id) ? "Récent" : null;
              return (
                <button key={f.id} type="button" onClick={() => pick(f)} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#1f0101] transition-colors">
                  <p className="text-sm text-white font-medium leading-tight">
                    {f.name}
                    {tag && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-[#ff6b6b]">{tag}</span>}
                  </p>
                  <p className="text-[10.5px] text-[#F5EDED]/40 mt-0.5">
                    {Math.round(f.calories_per_100)} kcal/100 g · P {f.proteins_per_100} · G {f.carbs_per_100} · L {f.fats_per_100}
                  </p>
                </button>
              );
            })}
            {results.length === 0 && (
              <div className="py-4 text-center">
                <p className="text-sm text-[#F5EDED]/50">Aucun aliment trouvé.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuick((q) => ({ ...q, name: query }));
                    setTab("rapide");
                  }}
                  className="mt-2 text-xs font-bold text-[#ff6b6b] underline"
                >
                  Ajouter « {query} » en ajout rapide
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "plan" && (
        <div className="space-y-2">
          {[
            { title: "Repas du plan aujourd'hui", list: planMealsToday },
            { title: "Autres repas du plan", list: planMealsOther },
          ]
            .filter((s) => s.list.length > 0)
            .map((s) => (
              <div key={s.title}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5 mt-1">{s.title}</p>
                {s.list.map((meal) => {
                  const t = planTotals(meal.items);
                  return (
                    <button
                      key={meal.key}
                      type="button"
                      disabled={busy}
                      onClick={() => onAddFoods(meal.items.map((i) => ({ food: i.food, grams: i.grams, planMealId: i.planMealId })))}
                      className="w-full text-left rounded-xl border border-[#890404]/25 bg-black/25 px-3 py-2.5 mb-1.5 hover:border-[#E01E1E]/40 disabled:opacity-50"
                    >
                      <p className="text-sm font-bold text-white">{meal.label}</p>
                      <p className="text-[11px] text-[#F5EDED]/45 mt-0.5 line-clamp-2">{meal.items.map((i) => `${i.food.name} ${i.grams} g`).join(", ")}</p>
                      <p className="text-[10.5px] text-[#F5EDED]/60 mt-1">
                        {Math.round(t.calories)} kcal · P {Math.round(t.proteins)} · G {Math.round(t.carbs)} · L {Math.round(t.fats)}
                      </p>
                    </button>
                  );
                })}
              </div>
            ))}
        </div>
      )}

      {tab === "recettes" &&
        (recipe ? (
          <div>
            <p className="text-base font-black text-white">{recipe.name}</p>
            <p className="text-xs text-[#F5EDED]/50 mt-1">
              Par portion : {recipe.kcal} kcal · P {recipe.protein} · G {recipe.carbs} · L {recipe.fat}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mt-4 mb-1.5">Portions</p>
            <div className="flex gap-1.5">
              {[0.5, 1, 1.5, 2].map((v) => (
                <button key={v} type="button" onClick={() => setServings(v)} className={chip(servings === v)}>
                  {String(v).replace(".", ",")}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setRecipe(null)} className="px-4 py-3 rounded-xl border border-[#890404]/40 text-[#F5EDED]/70 text-xs font-bold uppercase tracking-widest">
                Retour
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onAddPortion({ name: recipe.name, kind: "recette", kcal: recipe.kcal, protein: recipe.protein, carbs: recipe.carbs, fat: recipe.fat, servings })}
                className="flex-1 px-4 py-3 rounded-xl bg-[#E01E1E] text-white text-xs font-black uppercase tracking-widest disabled:opacity-40"
              >
                {busy ? "..." : `Ajouter · ${Math.round(recipe.kcal * servings)} kcal`}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/30" />
              <input value={recipeQuery} onChange={(e) => setRecipeQuery(e.target.value)} placeholder="Chercher une recette" aria-label="Chercher une recette" className={`${input} pl-9`} />
            </div>
            <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-2.5 no-scrollbar">
              {RECIPE_MEALS.map((m) => (
                <button key={m.key} type="button" onClick={() => setRecipeMeal(m.key)} className={chip(recipeMeal === m.key)}>
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[#F5EDED]/35 mb-1.5">Les plus riches en protéines d&apos;abord.</p>
            <div className="space-y-0.5">
              {recipeResults.map((r) => (
                <button key={`${r.source}-${r.id}`} type="button" onClick={() => { setRecipe(r); setServings(1); }} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#1f0101]">
                  <p className="text-sm text-white font-medium leading-tight">
                    {r.name}
                    {r.source === "communaute" && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-[#F5EDED]/40">Communauté</span>}
                  </p>
                  <p className="text-[10.5px] text-[#F5EDED]/40 mt-0.5">
                    {r.kcal} kcal · P {r.protein} · G {r.carbs} · L {r.fat}
                  </p>
                </button>
              ))}
              {recipeResults.length === 0 && <p className="text-sm text-[#F5EDED]/50 py-4 text-center">Aucune recette.</p>}
            </div>
          </>
        ))}

      {tab === "repas" && (
        <div className="space-y-1.5">
          {savedMeals.map((meal) => {
            const items = meal.saved_meal_items.filter((i) => i.foods);
            const kcal = items.reduce((s, i) => s + macrosFor(i.foods!, i.quantity_g).calories, 0);
            return (
              <button
                key={meal.id}
                type="button"
                disabled={busy || items.length === 0}
                onClick={() => onAddFoods(items.map((i) => ({ food: i.foods!, grams: i.quantity_g })))}
                className="w-full text-left rounded-xl border border-[#890404]/25 bg-black/25 px-3 py-2.5 hover:border-[#E01E1E]/40 disabled:opacity-50"
              >
                <p className="text-sm font-bold text-white">{meal.name}</p>
                <p className="text-[11px] text-[#F5EDED]/45 mt-0.5 line-clamp-2">{items.map((i) => `${i.foods!.name} ${i.quantity_g} g`).join(", ")}</p>
                <p className="text-[10.5px] text-[#F5EDED]/60 mt-1">{Math.round(kcal)} kcal</p>
              </button>
            );
          })}
        </div>
      )}

      {tab === "rapide" && (
        <div className="space-y-2.5">
          <p className="text-xs text-[#F5EDED]/50">Restaurant, plat sans étiquette : entre le total du repas, il est gardé pour la prochaine fois.</p>
          <input value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} placeholder="Nom (ex : burger resto)" aria-label="Nom" className={input} />
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["kcal", "Calories (kcal)"],
                ["p", "Protéines (g)"],
                ["c", "Glucides (g)"],
                ["f", "Lipides (g)"],
              ] as const
            ).map(([k, label]) => (
              <input key={k} value={quick[k]} onChange={(e) => setQuick({ ...quick, [k]: e.target.value })} inputMode="decimal" placeholder={label} aria-label={label} className={input} />
            ))}
          </div>
          <button
            type="button"
            disabled={busy || !quick.name.trim() || !(Number(quick.kcal) > 0)}
            onClick={() =>
              onAddPortion({
                name: quick.name,
                kind: "rapide",
                kcal: Number(quick.kcal),
                protein: Number(quick.p) || 0,
                carbs: Number(quick.c) || 0,
                fat: Number(quick.f) || 0,
                servings: 1,
              })
            }
            className="w-full px-4 py-3 rounded-xl bg-[#E01E1E] text-white text-xs font-black uppercase tracking-widest disabled:opacity-40"
          >
            {busy ? "..." : "Ajouter"}
          </button>
        </div>
      )}
    </Sheet>
  );
}
