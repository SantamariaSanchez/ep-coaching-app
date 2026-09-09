"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Trash2, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check, Clock, Zap, Copy, BookOpen, Camera, ShoppingCart, Lightbulb, Bookmark, Flame, AlertTriangle, UtensilsCrossed, Search, ScanBarcode, CalendarDays } from "lucide-react";
import BarcodeScannerModal from "@/components/ui/BarcodeScannerModal";
import { onKeyActivate } from "@/lib/a11y";
import { buildShoppingList, FOOD_IDEAS } from "@/lib/shopping-list";
import MicroBarList from "@/components/ui/MicroBarList";
import NutritionModeSelector from "@/components/ui/NutritionModeSelector";
import SeasonModeBadge from "@/components/ui/SeasonModeBadge";
import type {
  NutritionProfile,
  Food,
  FoodLogWithFood,
  DietMode,
  DietPlanWithMeals,
  DietPlanMeal,
} from "@/utils/nutrition";
import type { CommunityRecipe } from "@/utils/community-recipes";
import type { SavedMeal } from "@/utils/saved-meals";
import type { ClientIntake } from "@/utils/client-intake";
import { buildFoodWatchContext, hasFoodWatchContext, summarizeFoodWatchContext, checkFoodWatch, type FoodWatchContext } from "@/lib/food-watch-keywords";
import { saveMealPhoto, loadMealPhoto } from "@/components/ui/NutritionBilanQuiz";
import { notifyGateRefresh } from "@/lib/gate-events";

// ── Constants ────────────────────────────────────────────────────────────────

const MEAL_SLOTS = [
  { key: "breakfast", label: "Petit-déjeuner" },
  { key: "morning", label: "Collation matin" },
  { key: "lunch", label: "Déjeuner" },
  { key: "afternoon", label: "Collation après-midi" },
  { key: "preworkout", label: "Pré-entraînement" },
  { key: "postworkout", label: "Post-entraînement" },
  { key: "dinner", label: "Dîner" },
];

const FOOD_CATEGORIES = [
  "Viande blanche",
  "Viande rouge",
  "Charcuterie",
  "Poisson",
  "Oeufs",
  "Laitier",
  "Protéine poudre",
  "Féculent",
  "Légumineuse",
  "Légume",
  "Fruit",
  "Fruit séché",
  "Oléagineux",
  "Matière grasse",
  "Sucrant",
  "Sauce",
  "Snack",
  "Divers",
];

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";

// Bornes de la table foods, appliquées en base par des contraintes CHECK
// (voir supabase/migrations/20260805k_input_hardening_constraints.sql). Les
// colonnes décrivent un aliment pour 100 g : 1000 kcal et 100 g de macro sont
// déjà des extrêmes pour 100 g de nourriture.
const FOOD_MAX_CALORIES_PER_100 = 1000;
const FOOD_MAX_MACRO_PER_100 = 100;

// Bornes de saisie de l'ajout rapide, alignées sur ce que food_logs accepte.
// Une journée entière loguée d'un coup reste largement en dessous.
const QUICK_ADD_MAX_CALORIES = 20000;
const QUICK_ADD_MAX_MACRO = 2000;

// ── Helpers ───────────────────────────────────────────────────────────────────

// L'ajout rapide saisit le total d'un repas, pas des valeurs pour 100 g. On
// en déduit une portion de référence cohérente : celle qui garde toutes les
// valeurs pour 100 g dans les bornes de la table foods. Un repas normal reste
// sur une portion de 100 g (comportement historique inchangé) ; un repas à
// 1200 kcal devient une portion de 120 g à 1000 kcal pour 100 g. Dans tous
// les cas les totaux logués restent exactement ceux saisis.
function quickAddPortion(totals: {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}) {
  const portionG = Math.ceil(
    Math.max(
      100,
      (totals.calories * 100) / FOOD_MAX_CALORIES_PER_100,
      (totals.proteins * 100) / FOOD_MAX_MACRO_PER_100,
      (totals.carbs * 100) / FOOD_MAX_MACRO_PER_100,
      (totals.fats * 100) / FOOD_MAX_MACRO_PER_100
    )
  );
  const ratio = portionG / 100;
  // Le min() est une ceinture de sécurité contre les arrondis flottants :
  // la portion garantit déjà que la valeur tient dans la borne.
  const per100 = (value: number, max: number) =>
    Math.min(max, Math.round((value / ratio) * 10) / 10);
  return {
    portionG,
    calories_per_100: per100(totals.calories, FOOD_MAX_CALORIES_PER_100),
    proteins_per_100: per100(totals.proteins, FOOD_MAX_MACRO_PER_100),
    carbs_per_100: per100(totals.carbs, FOOD_MAX_MACRO_PER_100),
    fats_per_100: per100(totals.fats, FOOD_MAX_MACRO_PER_100),
  };
}

function calcMacros(food: Food, quantityG: number) {
  const r = quantityG / 100;
  return {
    calories: Math.round(food.calories_per_100 * r * 10) / 10,
    proteins: Math.round(food.proteins_per_100 * r * 10) / 10,
    carbs: Math.round(food.carbs_per_100 * r * 10) / 10,
    fats: Math.round(food.fats_per_100 * r * 10) / 10,
  };
}

function getDayColor(cals: number, target: number) {
  if (cals === 0) return "bg-[#F5EDED]/5 border-[#F5EDED]/10";
  const pct = target > 0 ? cals / target : 0;
  if (pct >= 0.9) return "bg-green-600/60 border-green-500/30";
  if (pct >= 0.7) return "bg-amber-500/60 border-amber-400/30";
  return "bg-red-700/60 border-red-600/30";
}

function fmt(n: number) {
  return Math.round(n);
}

// ── MacroRing ─────────────────────────────────────────────────────────────────

function MacroRing({
  label,
  current,
  target,
  color,
  isCalorie,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
  isCalorie?: boolean;
}) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(current / target, 1.05) : 0;
  const offset = circ * (1 - Math.min(pct, 1));

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[76px] h-[76px]">
        <svg width="76" height="76" className="block">
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            stroke="rgba(245,237,237,0.07)"
            strokeWidth="7"
          />
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 38 38)"
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-sm font-black text-white">{fmt(current)}</span>
          <span className="text-[9px] text-[#F5EDED]/35">
            /{target}{isCalorie ? "" : "g"}
          </span>
        </div>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/45">
        {label}
      </span>
    </div>
  );
}

function FoodResultButton({
  food,
  onClick,
  watchContext,
}: {
  food: Food;
  onClick: () => void;
  watchContext?: FoodWatchContext;
}) {
  const watchHits = watchContext && hasFoodWatchContext(watchContext) ? checkFoodWatch(food, watchContext) : [];
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 hover:bg-[#1f0101] rounded-lg transition-colors"
    >
      <p className="text-sm text-white font-medium leading-tight flex items-center gap-1.5">
        {food.name}
        {food.is_custom && (
          <span className="ml-1.5 text-[9px] text-[#E01E1E] uppercase font-bold">
            custom
          </span>
        )}
        {watchHits.length > 0 && <AlertTriangle size={11} className="text-amber-400 flex-shrink-0" />}
      </p>
      <p className="text-[10px] text-[#F5EDED]/35 mt-0.5">
        {food.calories_per_100} kcal/100g · P{" "}
        {food.proteins_per_100}g · G {food.carbs_per_100}g ·
        L {food.fats_per_100}g
        {watchHits.length > 0 && <span className="text-amber-400/80"> · {watchHits.join(", ")}</span>}
      </p>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  today: string;
  nutritionProfile: NutritionProfile | null;
  initialTodayLogs: FoodLogWithFood[];
  historyLogs: FoodLogWithFood[];
  initialFoods: Food[];
  recipes?: CommunityRecipe[];
  dietMode: DietMode;
  activePlan: DietPlanWithMeals | null;
  seasonMode?: "off_season" | "prep" | null;
  // Membre gratuit gérant lui-même son plan (pas de coach) — adapte les
  // libellés qui supposent normalement un coach ("Plan de ton coach", etc.).
  isOwnPlan?: boolean;
  // Fiche client — sert uniquement à signaler (jamais filtrer) les aliments
  // à vérifier pendant la recherche (allergies, aliments détestés connus).
  intake?: ClientIntake | null;
  savedMeals?: SavedMeal[];
  mostUsedGlobal?: Food[];
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
  removeFoodLog: (logId: string) => Promise<{ error?: string }>;
  createCustomFood: (params: {
    name: string;
    category: string;
    calories_per_100: number;
    proteins_per_100: number;
    carbs_per_100: number;
    fats_per_100: number;
    fibers_per_100: number;
  }) => Promise<{ food?: Food; error?: string }>;
  createSavedMeal?: (name: string, items: { foodId: string; quantityG: number }[]) => Promise<{ error?: string; id?: string }>;
  deleteSavedMeal?: (mealId: string) => Promise<{ error?: string }>;
  logMealItems?: (items: { foodId: string; quantityG: number }[], mealSlot: string, loggedAt: string) => Promise<{ error?: string; count?: number }>;
  // Changer le mode (flexible/fixe/fixe-flexible) du plan actif directement
  // depuis le suivi du jour (demande explicite 2026-08-17 : "je veux pouvoir
  // modifier mon fixe ou variable") — jusqu'ici cette capacité existait déjà
  // côté coach mais seulement dans l'onglet "Gérer", jamais ici où le
  // fixe/flexible se voit et se coche vraiment au quotidien. Optionnel :
  // absent pour un client suivi par un coach (lui seul peut changer le mode
  // de son plan).
  updatePlanMode?: (planId: string, mode: DietMode) => Promise<{ error?: string }>;
}

export default function ClientNutritionView({
  today,
  nutritionProfile,
  initialTodayLogs,
  historyLogs,
  initialFoods,
  recipes = [],
  dietMode,
  activePlan,
  seasonMode,
  isOwnPlan = false,
  intake = null,
  savedMeals: initialSavedMeals = [],
  mostUsedGlobal = [],
  addFoodLog,
  removeFoodLog,
  createCustomFood,
  createSavedMeal,
  deleteSavedMeal,
  logMealItems,
  updatePlanMode,
}: Props) {
  // ── State ──────────────────────────────────────────────────────────────────
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"today" | "history" | "courses">("today");
  const [todayLogs, setTodayLogs] = useState<FoodLogWithFood[]>(initialTodayLogs);
  const [foods, setFoods] = useState<Food[]>(initialFoods);

  // Mode du plan actif (flexible/fixe/fixe-flexible), éditable directement
  // ici (2026-08-17) via updatePlanMode — même piège prop→state que
  // todayLogs plus bas, donc même resynchronisation explicite.
  const [planMode, setPlanMode] = useState<DietMode>(activePlan?.mode ?? dietMode);
  useEffect(() => {
    setPlanMode(activePlan?.mode ?? dietMode);
  }, [activePlan?.mode, dietMode]);
  const [changingPlanMode, setChangingPlanMode] = useState(false);

  async function handleChangePlanMode(mode: DietMode) {
    if (!activePlan || !updatePlanMode) return;
    const backup = planMode;
    setPlanMode(mode);
    setChangingPlanMode(true);
    const result = await updatePlanMode(activePlan.id, mode);
    setChangingPlanMode(false);
    if (result.error) setPlanMode(backup);
  }

  // Bug remonté deux fois : cocher un aliment fonctionne, mais revient
  // décoché après être revenu sur la page (navigation, changement d'appli
  // puis retour, etc.). Le premier correctif (revalidatePath dans
  // addFoodLog/removeFoodLog) ne suffisait pas : useState(initialTodayLogs)
  // ne fixe l'état interne qu'au tout premier rendu — un nouveau
  // initialTodayLogs envoyé par le serveur après une revalidation n'est
  // JAMAIS repris automatiquement par ce useState (piège React classique
  // "prop → state" sur re-render sans remontage complet du composant).
  // Concrètement : la coche pouvait fonctionner en base (le insert
  // réussissait bien, vérifié en direct en base) tout en réaffichant un
  // état client périmé. Ce useEffect resynchronise explicitement dès que
  // le serveur envoie des logs différents (dépendance volontairement
  // limitée à initialTodayLogs, pas todayLogs, sinon boucle avec les
  // mises à jour optimistes locales) — même tradeoff déjà accepté ailleurs
  // dans ce fichier (voir plus bas, liste de courses) pour synchroniser un
  // state depuis une source externe.
  useEffect(() => {
    setTodayLogs(initialTodayLogs);
  }, [initialTodayLogs]);

  // Copie locale et modifiable de historyLogs (2026-08-18, demande
  // explicite : "je dois pouvoir logger les jours passés pas que
  // aujourd'hui"). Même piège prop→state que todayLogs ci-dessus, même
  // resynchronisation explicite. Permet d'ajouter/retirer un aliment sur un
  // jour passé (onglet Historique) sans recharger toute la page, et garde
  // le calendrier (calsByDate) à jour immédiatement après.
  const [historyLogsState, setHistoryLogsState] = useState<FoodLogWithFood[]>(historyLogs);
  useEffect(() => {
    setHistoryLogsState(historyLogs);
  }, [historyLogs]);

  // Date ciblée par la modale de recherche/ajout d'aliment — "aujourd'hui"
  // par défaut, mais réglée sur le jour choisi dans l'Historique quand la
  // modale y est ouverte, pour logger n'importe quel jour des 30 derniers
  // avec exactement la même interface (recherche, code-barres, recettes,
  // repas enregistrés) plutôt qu'une version simplifiée dupliquée.
  const [loggingDate, setLoggingDate] = useState(today);

  // todayLogs sert de vérité pour AUJOURD'HUI, historyLogsState pour tout
  // le reste des 30 derniers jours — ces trois fonctions appliquent la
  // même mise à jour optimiste au bon état selon la date visée, pour ne
  // pas dupliquer la logique dans chaque handler d'ajout.
  function addOptimisticLog(date: string, log: FoodLogWithFood) {
    if (date === today) setTodayLogs((prev) => [...prev, log]);
    else setHistoryLogsState((prev) => [...prev, log]);
  }
  function replaceOptimisticLogId(date: string, tempId: string, realId: string) {
    const apply = (prev: FoodLogWithFood[]) => prev.map((l) => (l.id === tempId ? { ...l, id: realId } : l));
    if (date === today) setTodayLogs(apply);
    else setHistoryLogsState(apply);
  }
  function removeLogById(date: string, id: string) {
    const apply = (prev: FoodLogWithFood[]) => prev.filter((l) => l.id !== id);
    if (date === today) setTodayLogs(apply);
    else setHistoryLogsState(apply);
  }
  // Variantes en lot pour les ajouts groupés (repas enregistré, "Valider le
  // repas").
  function addOptimisticLogs(date: string, logs: FoodLogWithFood[]) {
    if (date === today) setTodayLogs((prev) => [...prev, ...logs]);
    else setHistoryLogsState((prev) => [...prev, ...logs]);
  }
  function removeLogsByIds(date: string, ids: Set<string>) {
    const apply = (prev: FoodLogWithFood[]) => prev.filter((l) => !ids.has(l.id));
    if (date === today) setTodayLogs(apply);
    else setHistoryLogsState(apply);
  }

  // Deuxième filet : forcer un vrai aller-retour serveur (pas juste une
  // resynchronisation du state existant) quand l'onglet/l'appli redevient
  // visible — couvre le cas d'une appli PWA reprise en arrière-plan sans
  // rechargement complet, où sinon rien ne redéclenche le rendu serveur.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [router]);

  // Arrivée depuis une notif de rappel de repas (cron meal-reminders) :
  // ?meal=<slot> — on saute direct au repas concerné dans le plan, en
  // évidence quelques secondes, plutôt que de laisser chercher dans la
  // page. Lu une seule fois au montage : la valeur ne doit pas réapparaître
  // si le client navigue ensuite dans la page (changement d'onglet, etc.).
  const searchParams = useSearchParams();
  const [highlightSlot, setHighlightSlot] = useState<string | null>(() => searchParams.get("meal"));
  useEffect(() => {
    if (!highlightSlot) return;
    const el = document.getElementById(`diet-plan-slot-${highlightSlot}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlightSlot(null), 3000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Liste de courses — coché persiste localement (utile en cours de courses),
  // remis à zéro manuellement plutôt qu'automatiquement pour ne pas perdre
  // la progression si on ferme l'appli en plein magasin.
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ep-shopping-checked");
      if (saved) setCheckedItems(new Set(JSON.parse(saved)));
    } catch {}
  }, []);
  function toggleChecked(foodId: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(foodId)) next.delete(foodId);
      else next.add(foodId);
      try { localStorage.setItem("ep-shopping-checked", JSON.stringify([...next])); } catch {}
      return next;
    });
  }
  const shoppingList = useMemo(
    () => buildShoppingList(activePlan, historyLogsState),
    [activePlan, historyLogsState]
  );
  const shoppingByCategory = useMemo(() => {
    const map = new Map<string, typeof shoppingList.items>();
    for (const item of shoppingList.items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [shoppingList]);

  // Repas enregistrés — état local pour refléter création/suppression sans
  // recharger la page (même pattern que `foods`).
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>(initialSavedMeals);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initialSavedMeals change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  useEffect(() => {
    setSavedMeals(initialSavedMeals);
  }, [initialSavedMeals]);
  const [savingMealSlot, setSavingMealSlot] = useState<string | null>(null);
  const [savingMealName, setSavingMealName] = useState("");
  const [savingMealBusy, setSavingMealBusy] = useState(false);

  const watchContext = useMemo(() => buildFoodWatchContext(intake), [intake]);
  const hasWatch = hasFoodWatchContext(watchContext);

  // Search modal
  const [addingToSlot, setAddingToSlot] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTab, setSearchTab] = useState<"aliments" | "recettes" | "repas">("aliments");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<CommunityRecipe | null>(null);
  const [recipeServings, setRecipeServings] = useState("1");
  const [quantityInput, setQuantityInput] = useState("");
  const [addingError, setAddingError] = useState<string | null>(null);

  // Create food modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    category: "Divers",
    calories_per_100: "",
    proteins_per_100: "",
    carbs_per_100: "",
    fats_per_100: "",
    fibers_per_100: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // Créneau d'où vient la création d'aliment : quand on crée un aliment
  // parce que la recherche ne renvoyait rien, on revient automatiquement au
  // log de ce créneau avec l'aliment sélectionné, au lieu de refermer tout
  // et d'obliger à rouvrir la recherche et retaper le nom.
  const [createReturnSlot, setCreateReturnSlot] = useState<string | null>(null);
  // Item 16 (scan code-barres) : le scanner ne fait que renvoyer un code,
  // toute la suite (recherche produit, pré-remplissage, confirmation)
  // réutilise le formulaire de création d'aliment existant ci-dessus —
  // aucune nouvelle logique de sauvegarde, juste une façon différente de le
  // remplir.
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scanningProduct, setScanningProduct] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  async function handleBarcodeScanned(barcode: string) {
    setShowScannerModal(false);
    setScanningProduct(true);
    setScanError(null);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const data = await res.json();
      const product = data?.product;
      const kcal = product?.nutriments?.["energy-kcal_100g"];
      if (!product || data.status !== 1 || kcal == null) {
        setScanError("Produit introuvable dans la base OpenFoodFacts. Ajoute-le manuellement.");
        setScanningProduct(false);
        return;
      }
      setCreateForm({
        name: (product.product_name || product.generic_name || "Produit scanné").trim(),
        category: "Divers",
        calories_per_100: String(Math.round(kcal)),
        proteins_per_100: String(Math.round((product.nutriments.proteins_100g ?? 0) * 10) / 10),
        carbs_per_100: String(Math.round((product.nutriments.carbohydrates_100g ?? 0) * 10) / 10),
        fats_per_100: String(Math.round((product.nutriments.fat_100g ?? 0) * 10) / 10),
        fibers_per_100: String(Math.round((product.nutriments.fiber_100g ?? 0) * 10) / 10),
      });
      setCreateError(null);
      // addingToSlot est déjà le créneau ouvert au moment du scan (bouton
      // accessible seulement depuis la modale de recherche d'un créneau) :
      // même mécanique que openCreateFood pour enchaîner sur la quantité une
      // fois l'aliment confirmé/créé.
      setCreateReturnSlot(addingToSlot);
      setShowCreateModal(true);
    } catch {
      setScanError("Impossible de vérifier ce produit (connexion). Ajoute-le manuellement.");
    } finally {
      setScanningProduct(false);
    }
  }

  // Quick add (calories-only, for restaurants / unknown foods)
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddSlot, setQuickAddSlot] = useState<string | null>(null);
  const [quickAddForm, setQuickAddForm] = useState({
    name: "",
    calories: "",
    proteins: "",
    carbs: "",
    fats: "",
  });
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  // MASTERCLASS.md Axe C (suite) : les 4 modales de cette vue se fermaient
  // déjà au clic sur le fond, rien au clavier avant ça — un seul effet
  // couvre les 4, chacune ferme la sienne si elle est ouverte.
  useEffect(() => {
    if (!addingToSlot && !savingMealSlot && !showCreateModal && !showQuickAddModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (addingToSlot) closeModal();
      else if (savingMealSlot) setSavingMealSlot(null);
      else if (showCreateModal) setShowCreateModal(false);
      else if (showQuickAddModal) setShowQuickAddModal(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [addingToSlot, savingMealSlot, showCreateModal, showQuickAddModal]);

  // Copy yesterday
  const [copyingYesterday, setCopyingYesterday] = useState(false);

  // History — vue agenda (2026-08-18, demande explicite : "je veux une vue
  // comme un agenda... au jour à la semaine et sur le mois"). historyView
  // choisit l'échelle affichée, historySelectedDate part sur aujourd'hui
  // (jamais "aucun jour sélectionné") pour que la vue Jour ait toujours un
  // contenu à montrer, y compris pour logger un jour manqué directement.
  const [historyView, setHistoryView] = useState<"jour" | "semaine" | "mois">("mois");
  const [historySelectedDate, setHistorySelectedDate] = useState<string>(today);
  const viewedDate = historySelectedDate;

  // ── Derived ────────────────────────────────────────────────────────────────
  // Carb cycling — même profil, écart de calories les jours de repos/high,
  // absorbé en glucides (protéines/lipides stables). Persisté par date
  // plutôt que par session, pour ne pas avoir à re-sélectionner à chaque
  // ouverture de l'appli le même jour.
  const hasDayOffsets = nutritionProfile?.calories_offset_rest != null || nutritionProfile?.calories_offset_high != null;
  const [dayType, setDayType] = useState<"training" | "repos" | "high">(() => {
    if (typeof window === "undefined") return "training";
    try {
      const saved = localStorage.getItem(`ep-daytype-${today}`);
      if (saved === "repos" || saved === "high") return saved;
    } catch {}
    return "training";
  });
  function selectDayType(v: "training" | "repos" | "high") {
    setDayType(v);
    try { localStorage.setItem(`ep-daytype-${today}`, v); } catch {}
  }
  const dayOffset =
    dayType === "repos" ? nutritionProfile?.calories_offset_rest ?? 0
    : dayType === "high" ? nutritionProfile?.calories_offset_high ?? 0
    : 0;

  // Rattrapage hebdomadaire — si les jours précédents de la semaine (lundi à
  // hier) sont en dessous du cumul visé, l'objectif du jour remonte pour
  // compenser (et inversement) ; l'idée est de toujours viser la moyenne
  // hebdo plutôt que de traiter chaque jour isolément. Plafonné à ±400 kcal
  // pour qu'une très mauvaise semaine ne se traduise pas par un objectif du
  // jour absurde — au delà, mieux vaut une vraie conversation avec le coach
  // (voir le cron stagnation-escalation) qu'un chiffre qui décourage.
  // Repose sur historyLogsState (déjà chargé, 30 jours), pas de fetch en plus.
  // Le calcul reste volontairement indépendant du dayType (repos/high) :
  // ce sont deux ajustements orthogonaux qui s'additionnent, l'un anticipe
  // la journée à venir, l'autre rattrape les jours passés.
  const BANK_CAP_KCAL = 400;
  const weeklyBank = useMemo(() => {
    const dailyTarget = nutritionProfile?.calories_target;
    if (!dailyTarget) return 0;
    const todayDate = new Date(today + "T00:00:00");
    const dow = todayDate.getDay();
    const mondayDiff = dow === 0 ? -6 : 1 - dow;
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() + mondayDiff);
    const daysElapsed = Math.round((todayDate.getTime() - weekStart.getTime()) / 86400000);
    if (daysElapsed <= 0) return 0; // lundi : rien à rattraper encore cette semaine
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const actualSoFar = historyLogsState
      .filter((l) => l.logged_at >= weekStartStr && l.logged_at < today)
      .reduce((s, l) => s + (l.calories ?? 0), 0);
    const targetSoFar = dailyTarget * daysElapsed;
    return Math.max(-BANK_CAP_KCAL, Math.min(BANK_CAP_KCAL, Math.round(targetSoFar - actualSoFar)));
  }, [historyLogsState, today, nutritionProfile?.calories_target]);

  const targets = {
    calories: (nutritionProfile?.calories_target ?? 0) + dayOffset + weeklyBank,
    proteins: nutritionProfile?.proteins_target ?? 0,
    carbs: Math.max(0, (nutritionProfile?.carbs_target ?? 0) + Math.round((dayOffset + weeklyBank) / 4)),
    fats: nutritionProfile?.fats_target ?? 0,
  };

  const totals = useMemo(
    () =>
      todayLogs.reduce(
        (acc, l) => ({
          calories: acc.calories + (l.calories ?? 0),
          proteins: acc.proteins + (l.proteins ?? 0),
          carbs: acc.carbs + (l.carbs ?? 0),
          fats: acc.fats + (l.fats ?? 0),
        }),
        { calories: 0, proteins: 0, carbs: 0, fats: 0 }
      ),
    [todayLogs]
  );

  const filteredFoods = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return foods.slice(0, 40);
    return foods
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.category ?? "").toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [foods, searchQuery]);

  // Most recently logged distinct foods — surfaced first so re-logging a
  // usual meal is one tap instead of a fresh search every time.
  const recentFoods = useMemo(() => {
    const seen = new Set<string>();
    const list: Food[] = [];
    for (const log of historyLogsState) {
      if (!log.food_id || !log.foods || seen.has(log.food_id)) continue;
      seen.add(log.food_id);
      list.push(log.foods);
      if (list.length >= 10) break;
    }
    return list;
  }, [historyLogsState]);

  // Aliments les plus souvent loggués par CE client (fréquence sur
  // l'historique chargé), complétés par les plus loggués tous utilisateurs
  // confondus si l'historique perso est trop mince pour remplir la liste —
  // évite une section vide pour un nouveau client sans casser la pertinence
  // pour un client avec de l'historique.
  const mostUsedFoods = useMemo(() => {
    const counts = new Map<string, { food: Food; count: number }>();
    for (const log of historyLogsState) {
      if (!log.food_id || !log.foods) continue;
      const entry = counts.get(log.food_id);
      if (entry) entry.count += 1;
      else counts.set(log.food_id, { food: log.foods, count: 1 });
    }
    const personal = [...counts.values()]
      .filter((e) => e.count > 1)
      .sort((a, b) => b.count - a.count)
      .map((e) => e.food);
    const seen = new Set(personal.map((f) => f.id));
    const fill = mostUsedGlobal.filter((f) => !seen.has(f.id));
    return [...personal, ...fill].slice(0, 8);
  }, [historyLogsState, mostUsedGlobal]);

  // historyLogsState is ordered most-recent-first, so the first hit per food is
  // the last quantity actually eaten — used to pre-fill the quantity field.
  const lastQuantityByFood = useMemo(() => {
    const map: Record<string, number> = {};
    for (const log of historyLogsState) {
      if (!log.food_id || map[log.food_id] != null) continue;
      map[log.food_id] = log.quantity_g;
    }
    return map;
  }, [historyLogsState]);

  const yesterday = useMemo(() => {
    const d = new Date(today + "T12:00:00");
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }, [today]);

  const yesterdayLogs = useMemo(
    () => historyLogsState.filter((l) => l.logged_at === yesterday),
    [historyLogsState, yesterday]
  );

  const yesterdayCals = useMemo(
    () => yesterdayLogs.reduce((s, l) => s + (l.calories ?? 0), 0),
    [yesterdayLogs]
  );

  const calsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of historyLogsState) {
      map[l.logged_at] = (map[l.logged_at] ?? 0) + (l.calories ?? 0);
    }
    return map;
  }, [historyLogsState]);

  const last30Days = useMemo(() => {
    const days: string[] = [];
    const now = new Date(today);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  }, [today]);

  const historyDayLogs = useMemo(
    () => historyLogsState.filter((l) => l.logged_at === viewedDate),
    [historyLogsState, viewedDate]
  );

  // Semaine (lundi→dimanche) contenant le jour affiché, pour la vue
  // "Semaine" de l'agenda.
  const weekDays = useMemo(() => {
    const d = new Date(viewedDate + "T12:00:00");
    const dow = d.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const dd = new Date(monday);
      dd.setDate(monday.getDate() + i);
      days.push(dd.toISOString().split("T")[0]);
    }
    return days;
  }, [viewedDate]);

  // Navigation jour par jour, bornée à la même fenêtre de 30 jours que le
  // reste de l'historique (last30Days) — jamais dans le futur.
  const minHistoryDate = last30Days[0];
  const canGoPrevDay = viewedDate > minHistoryDate;
  const canGoNextDay = viewedDate < today;
  function shiftHistoryDay(delta: number) {
    const d = new Date(viewedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    const next = d.toISOString().split("T")[0];
    if (next < minHistoryDate || next > today) return;
    setHistorySelectedDate(next);
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openModal(slot: string, date: string = today) {
    setAddingToSlot(slot);
    setLoggingDate(date);
    setSearchQuery("");
    setSearchTab("aliments");
    setSelectedFood(null);
    setSelectedRecipe(null);
    setQuantityInput("");
    setRecipeServings("1");
    setAddingError(null);
  }

  function closeModal() {
    setAddingToSlot(null);
    setSelectedFood(null);
    setSelectedRecipe(null);
    setSearchQuery("");
    setQuantityInput("");
    setRecipeServings("1");
    setAddingError(null);
    // loggingDate n'est volontairement PAS remis à today ici : closeModal()
    // est aussi appelée par openCreateFood() en plein milieu d'un
    // enchaînement "créer un aliment depuis la recherche" (voir
    // handleCreateFood plus bas, qui rouvre le modal sur le même créneau
    // une fois l'aliment créé) — le remettre ici ferait perdre le jour
    // ciblé si ce flux avait été lancé depuis un jour passé de
    // l'Historique. openModal() le fixe de toute façon à chaque ouverture.
  }

  function selectFoodForLogging(food: Food) {
    setSelectedFood(food);
    setQuantityInput(String(lastQuantityByFood[food.id] ?? 100));
  }

  // Ouvre la création d'aliment en reprenant le terme déjà tapé dans la
  // recherche, et retient le créneau pour y revenir une fois l'aliment créé.
  function openCreateFood(prefillName: string, returnSlot: string | null) {
    setCreateForm({
      name: prefillName.trim(),
      category: "Divers",
      calories_per_100: "",
      proteins_per_100: "",
      carbs_per_100: "",
      fats_per_100: "",
      fibers_per_100: "",
    });
    setCreateError(null);
    setCreateReturnSlot(returnSlot);
    closeModal();
    setShowCreateModal(true);
  }

  async function handleAddFood() {
    if (!selectedFood || !addingToSlot || !quantityInput) return;
    const qty = parseFloat(quantityInput);
    if (isNaN(qty) || qty <= 0) return;
    const date = loggingDate;

    const macros = calcMacros(selectedFood, qty);
    const optimisticLog: FoodLogWithFood = {
      id: `optimistic-${Date.now()}`,
      client_id: "",
      food_id: selectedFood.id,
      meal_slot: addingToSlot,
      quantity_g: qty,
      logged_at: date,
      calories: macros.calories,
      proteins: macros.proteins,
      carbs: macros.carbs,
      fats: macros.fats,
      foods: selectedFood,
    };

    addOptimisticLog(date, optimisticLog);
    closeModal();

    const result = await addFoodLog({
      foodId: selectedFood.id,
      mealSlot: addingToSlot,
      quantityG: qty,
      calories: macros.calories,
      proteins: macros.proteins,
      carbs: macros.carbs,
      fats: macros.fats,
      loggedAt: date,
    });

    if (result.error) {
      removeLogById(date, optimisticLog.id);
      setAddingError(result.error);
    } else if (result.id) {
      replaceOptimisticLogId(date, optimisticLog.id, result.id);
      notifyGateRefresh();
    }
  }

  // Logue en un tap tous les aliments d'un repas enregistré dans le
  // créneau ouvert — même logique optimiste que handleAddFood, mais en lot.
  async function handleLogSavedMeal(meal: SavedMeal) {
    if (!addingToSlot || !logMealItems || meal.saved_meal_items.length === 0) return;
    const slot = addingToSlot;
    const date = loggingDate;
    const items = meal.saved_meal_items.filter((it) => it.foods);

    const optimisticLogs: FoodLogWithFood[] = items.map((it) => {
      const macros = calcMacros(it.foods!, it.quantity_g);
      return {
        id: `optimistic-${Date.now()}-${it.food_id}`,
        client_id: "",
        food_id: it.food_id,
        meal_slot: slot,
        quantity_g: it.quantity_g,
        logged_at: date,
        calories: macros.calories,
        proteins: macros.proteins,
        carbs: macros.carbs,
        fats: macros.fats,
        foods: it.foods,
      };
    });

    addOptimisticLogs(date, optimisticLogs);
    closeModal();

    const result = await logMealItems(
      items.map((it) => ({ foodId: it.food_id, quantityG: it.quantity_g })),
      slot,
      date
    );
    if (result.error) {
      removeLogsByIds(date, new Set(optimisticLogs.map((l) => l.id)));
      setAddingError(result.error);
    } else {
      notifyGateRefresh();
    }
  }

  // Un vrai bouton "Valider le repas" par créneau plutôt qu'obliger à
  // cocher chaque aliment un par un (demande explicite 2026-08-16, retour
  // direct : "je veux un vrai seul bouton pour valider tout le repas").
  // Même logique optimiste + lot que handleLogSavedMeal, appliquée aux
  // aliments du PLAN pour ce créneau plutôt qu'à un repas enregistré.
  async function handleValidateSlot(meals: DietPlanMeal[]) {
    if (!logMealItems || meals.length === 0) return;
    const slot = meals[0].meal_slot;
    const items = meals.filter((m) => m.foods);

    const optimisticLogs: FoodLogWithFood[] = items.map((m) => {
      const macros = calcMacros(m.foods!, m.quantity_g);
      return {
        id: `optimistic-${Date.now()}-${m.food_id}`,
        client_id: "",
        food_id: m.food_id,
        meal_slot: slot,
        quantity_g: m.quantity_g,
        logged_at: today,
        calories: macros.calories,
        proteins: macros.proteins,
        carbs: macros.carbs,
        fats: macros.fats,
        foods: m.foods!,
      };
    });

    setTodayLogs((prev) => [...prev, ...optimisticLogs]);

    const result = await logMealItems(
      items.map((m) => ({ foodId: m.food_id, quantityG: m.quantity_g })),
      slot,
      today
    );
    if (result.error) {
      const ids = new Set(optimisticLogs.map((l) => l.id));
      setTodayLogs((prev) => prev.filter((l) => !ids.has(l.id)));
      setAddingError(result.error);
    } else {
      notifyGateRefresh();
    }
  }

  function openSaveMealPrompt(slotKey: string) {
    setSavingMealSlot(slotKey);
    setSavingMealName("");
  }

  async function handleSaveSlotAsMeal() {
    if (!savingMealSlot || !createSavedMeal || !savingMealName.trim()) return;
    const slotLogs = todayLogs.filter((l) => l.meal_slot === savingMealSlot && l.food_id);
    if (slotLogs.length === 0) return;

    setSavingMealBusy(true);
    const name = savingMealName.trim();
    const result = await createSavedMeal(
      name,
      slotLogs.map((l) => ({ foodId: l.food_id!, quantityG: l.quantity_g }))
    );
    setSavingMealBusy(false);
    if (!result.error && result.id) {
      const newMeal: SavedMeal = {
        id: result.id,
        owner_id: "",
        name,
        created_at: new Date().toISOString(),
        saved_meal_items: slotLogs.map((l, i) => ({
          id: `local-${i}`,
          food_id: l.food_id!,
          quantity_g: l.quantity_g,
          foods: l.foods,
        })),
      };
      setSavedMeals((prev) => [newMeal, ...prev]);
      setSavingMealSlot(null);
    }
  }

  async function handleDeleteSavedMeal(mealId: string) {
    if (!deleteSavedMeal) return;
    // MASTERCLASS.md Axe B : résultat jamais vérifié — en cas d'échec
    // serveur, le repas supprimé optimistiquement ne revenait qu'au
    // prochain chargement complet de la page, un état trompeur entre
    // temps. Même filet de sécurité que handleDelete ci-dessous.
    const idx = savedMeals.findIndex((m) => m.id === mealId);
    const backup = savedMeals[idx];
    setSavedMeals((prev) => prev.filter((m) => m.id !== mealId));
    const result = await deleteSavedMeal(mealId);
    if (result?.error && backup) {
      setSavedMeals((prev) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, backup);
        return next;
      });
    }
  }

  async function handleTogglePlanItem(meal: DietPlanMeal, matchedLogId: string | undefined) {
    if (matchedLogId) {
      // Même filet de sécurité que handleDelete : sans vérifier le
      // résultat, une coche décochée optimistiquement restait décochée en
      // apparence même si la suppression serveur échouait, jusqu'au
      // prochain chargement complet.
      const idx = todayLogs.findIndex((l) => l.id === matchedLogId);
      const backup = todayLogs[idx];
      setTodayLogs((prev) => prev.filter((l) => l.id !== matchedLogId));
      const result = await removeFoodLog(matchedLogId);
      if (result.error && backup) {
        setTodayLogs((prev) => {
          const next = [...prev];
          next.splice(Math.min(idx, next.length), 0, backup);
          return next;
        });
      }
      return;
    }
    if (!meal.foods) return;
    const macros = calcMacros(meal.foods, meal.quantity_g);
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticLog: FoodLogWithFood = {
      id: optimisticId,
      client_id: "",
      food_id: meal.food_id,
      meal_slot: meal.meal_slot,
      quantity_g: meal.quantity_g,
      logged_at: today,
      calories: macros.calories,
      proteins: macros.proteins,
      carbs: macros.carbs,
      fats: macros.fats,
      foods: meal.foods,
    };
    setTodayLogs((prev) => [...prev, optimisticLog]);

    const result = await addFoodLog({
      foodId: meal.food_id,
      mealSlot: meal.meal_slot,
      quantityG: meal.quantity_g,
      calories: macros.calories,
      proteins: macros.proteins,
      carbs: macros.carbs,
      fats: macros.fats,
      loggedAt: today,
    });

    if (result.error) {
      setTodayLogs((prev) => prev.filter((l) => l.id !== optimisticId));
    } else if (result.id) {
      setTodayLogs((prev) =>
        prev.map((l) => (l.id === optimisticId ? { ...l, id: result.id! } : l))
      );
      notifyGateRefresh();
    }
  }

  async function handleDelete(logId: string) {
    return handleDeleteForDate(logId, today);
  }

  // Généralisée (2026-08-18) pour retirer un aliment logué sur n'importe
  // quel jour des 30 derniers (onglet Historique), pas seulement
  // aujourd'hui — même logique de restauration à la position d'origine en
  // cas d'échec serveur.
  async function handleDeleteForDate(logId: string, date: string) {
    const source = date === today ? todayLogs : historyLogsState;
    const idx = source.findIndex((l) => l.id === logId);
    const backup = source[idx];
    removeLogById(date, logId);
    const result = await removeFoodLog(logId);
    if (result.error && backup) {
      // Restore at original position
      const restore = (prev: FoodLogWithFood[]) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, backup);
        return next;
      };
      if (date === today) setTodayLogs(restore);
      else setHistoryLogsState(restore);
    }
  }

  async function handleAddRecipe() {
    if (!selectedRecipe || !addingToSlot) return;
    const date = loggingDate;
    const servings = parseFloat(recipeServings) || 1;
    const calories = Math.round(selectedRecipe.kcal * servings);
    const proteins = Math.round(selectedRecipe.protein * servings);
    const carbs = Math.round(selectedRecipe.carbs * servings);
    const fats = Math.round(selectedRecipe.fat * servings);

    const virtualFood: Food = {
      id: `recipe-${selectedRecipe.id}`,
      name: selectedRecipe.name,
      category: "Recette",
      calories_per_100: selectedRecipe.kcal,
      proteins_per_100: selectedRecipe.protein,
      carbs_per_100: selectedRecipe.carbs,
      fats_per_100: selectedRecipe.fat,
    };

    const optimisticLog: FoodLogWithFood = {
      id: `optimistic-recipe-${Date.now()}`,
      client_id: "",
      food_id: null,
      meal_slot: addingToSlot,
      quantity_g: Math.round(servings * 100),
      logged_at: date,
      calories,
      proteins,
      carbs,
      fats,
      foods: virtualFood,
    };

    addOptimisticLog(date, optimisticLog);
    closeModal();

    const result = await addFoodLog({
      foodId: null,
      mealSlot: addingToSlot,
      quantityG: Math.round(servings * 100),
      calories,
      proteins,
      carbs,
      fats,
      loggedAt: date,
    });

    if (result.error) {
      removeLogById(date, optimisticLog.id);
      setAddingError(result.error);
    } else if (result.id) {
      replaceOptimisticLogId(date, optimisticLog.id, result.id);
      notifyGateRefresh();
    }
  }

  async function handleCopyYesterday() {
    if (yesterdayLogs.length === 0) return;
    setCopyingYesterday(true);

    const entries = yesterdayLogs.map((log) => ({
      optimisticId: `optimistic-copy-${log.id}`,
      log,
    }));
    setTodayLogs((prev) => [
      ...prev,
      ...entries.map(({ optimisticId, log }) => ({
        ...log,
        id: optimisticId,
        logged_at: today,
      })),
    ]);

    const results = await Promise.all(
      entries.map(({ log }) =>
        addFoodLog({
          foodId: log.food_id!,
          mealSlot: log.meal_slot ?? "lunch",
          quantityG: log.quantity_g,
          calories: log.calories ?? 0,
          proteins: log.proteins ?? 0,
          carbs: log.carbs ?? 0,
          fats: log.fats ?? 0,
          loggedAt: today,
        })
      )
    );

    let failedCount = 0;
    setTodayLogs((prev) => {
      let next = [...prev];
      results.forEach((result, i) => {
        const { optimisticId } = entries[i];
        if (result.error) {
          failedCount++;
          next = next.filter((l) => l.id !== optimisticId);
        } else if (result.id) {
          next = next.map((l) => (l.id === optimisticId ? { ...l, id: result.id! } : l));
        }
      });
      return next;
    });

    // Sans ça, un aliment qui échoue (ex. supprimé depuis hier) disparaissait
    // silencieusement de l'optimistic update — rien n'indiquait que la copie
    // n'avait pas tout récupéré.
    if (failedCount > 0) {
      setAddingError(
        failedCount === entries.length
          ? "Impossible de copier les repas d'hier."
          : `${failedCount} repas sur ${entries.length} n'ont pas pu être copiés.`
      );
    }

    setCopyingYesterday(false);
  }

  function openQuickAdd(slot: string, prefillName = "") {
    setQuickAddSlot(slot);
    setQuickAddForm({ name: prefillName.trim(), calories: "", proteins: "", carbs: "", fats: "" });
    setQuickAddError(null);
    setShowQuickAddModal(true);
  }

  async function handleQuickAdd() {
    const calories = parseFloat(quickAddForm.calories) || 0;
    if (!quickAddSlot || calories <= 0) {
      setQuickAddError("Indique au moins les calories.");
      return;
    }

    const proteins = parseFloat(quickAddForm.proteins) || 0;
    const carbs = parseFloat(quickAddForm.carbs) || 0;
    const fats = parseFloat(quickAddForm.fats) || 0;

    if (calories > QUICK_ADD_MAX_CALORIES) {
      setQuickAddError(
        `Calories trop élevées (${QUICK_ADD_MAX_CALORIES} kcal maximum). Vérifie ta saisie.`
      );
      return;
    }
    if (proteins < 0 || carbs < 0 || fats < 0) {
      setQuickAddError("Les macros ne peuvent pas être négatives.");
      return;
    }
    if (Math.max(proteins, carbs, fats) > QUICK_ADD_MAX_MACRO) {
      setQuickAddError(
        `Macros trop élevées (${QUICK_ADD_MAX_MACRO} g maximum par macro). Vérifie ta saisie.`
      );
      return;
    }

    setQuickAdding(true);
    setQuickAddError(null);

    const name = quickAddForm.name.trim() || "Ajout rapide";

    // L'ajout rapide est logué comme un aliment perso jetable. On ne fige plus
    // la portion à 100 g : un repas complet dépasserait alors les bornes de la
    // table foods (1000 kcal et 100 g de macro pour 100 g) et l'insertion
    // échouait. La portion de référence suit maintenant les totaux saisis,
    // donc le log garde exactement les valeurs entrées.
    const portion = quickAddPortion({ calories, proteins, carbs, fats });

    const foodResult = await createCustomFood({
      name,
      category: "Divers",
      calories_per_100: portion.calories_per_100,
      proteins_per_100: portion.proteins_per_100,
      carbs_per_100: portion.carbs_per_100,
      fats_per_100: portion.fats_per_100,
      fibers_per_100: 0,
    });

    if (foodResult.error || !foodResult.food) {
      setQuickAdding(false);
      setQuickAddError(foodResult.error ?? "Erreur lors de la création.");
      return;
    }

    setFoods((prev) => [foodResult.food!, ...prev]);

    const date = loggingDate;
    const optimisticLog: FoodLogWithFood = {
      id: `optimistic-${Date.now()}`,
      client_id: "",
      food_id: foodResult.food.id,
      meal_slot: quickAddSlot,
      quantity_g: portion.portionG,
      logged_at: date,
      calories,
      proteins,
      carbs,
      fats,
      foods: foodResult.food,
    };
    addOptimisticLog(date, optimisticLog);

    const logResult = await addFoodLog({
      foodId: foodResult.food.id,
      mealSlot: quickAddSlot,
      quantityG: portion.portionG,
      calories,
      proteins,
      carbs,
      fats,
      loggedAt: date,
    });

    setQuickAdding(false);

    if (logResult.error) {
      removeLogById(date, optimisticLog.id);
      setQuickAddError(logResult.error);
      return;
    }
    if (logResult.id) {
      replaceOptimisticLogId(date, optimisticLog.id, logResult.id);
    }
    setShowQuickAddModal(false);
  }

  async function handleCreateFood() {
    if (!createForm.name.trim() || !createForm.calories_per_100) {
      setCreateError("Nom et calories obligatoires.");
      return;
    }
    setCreating(true);
    setCreateError(null);

    const result = await createCustomFood({
      name: createForm.name.trim(),
      category: createForm.category,
      calories_per_100: parseFloat(createForm.calories_per_100) || 0,
      proteins_per_100: parseFloat(createForm.proteins_per_100) || 0,
      carbs_per_100: parseFloat(createForm.carbs_per_100) || 0,
      fats_per_100: parseFloat(createForm.fats_per_100) || 0,
      fibers_per_100: parseFloat(createForm.fibers_per_100) || 0,
    });

    setCreating(false);

    if (result.error) {
      setCreateError(result.error);
    } else if (result.food) {
      const created = result.food;
      setFoods((prev) => [created, ...prev]);
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        category: "Divers",
        calories_per_100: "",
        proteins_per_100: "",
        carbs_per_100: "",
        fats_per_100: "",
        fibers_per_100: "",
      });
      // Création partie d'une recherche infructueuse : on enchaîne direct sur
      // la saisie de la quantité pour ce créneau plutôt que de tout refermer.
      // openModal(slot, loggingDate) et pas juste openModal(slot) : sinon le
      // jour ciblé (si ce flux a démarré depuis un jour passé de
      // l'Historique) reviendrait sur aujourd'hui par défaut.
      if (createReturnSlot) {
        const slot = createReturnSlot;
        setCreateReturnSlot(null);
        openModal(slot, loggingDate);
        selectFoodForLogging(created);
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const noTargets = !nutritionProfile;
  // Demande explicite : en diète fixe ou fixe-flexible, cocher le plan
  // suffit — ce n'est pas du tracking libre, même quand un aliment peut
  // être swappé (fixe-flexible). Le journal détaillé par repas (ajout
  // manuel, bilan rapide, copier hier) reste réservé à la diète flexible,
  // où il n'y a justement pas de plan à cocher.
  //
  // planMode (pas dietMode) : dietMode est la préférence par défaut du
  // profil nutrition, planMode priorise le mode du PLAN réellement actif
  // (voir sa définition plus haut, déjà utilisé pour activeMode ci-dessous).
  // Avec dietMode, un client dont le profil était resté sur "flexible"
  // continuait de voir le tracker libre même après qu'un plan "fixed" lui
  // soit assigné — retour direct 2026-09-09 : "je suis en diete fixe donc
  // c'est pas possible qu'il y ait en bas le truc pour tracker des aliments".
  const isFreeTracking = planMode === "flexible";

  return (
    <div className="px-6 py-8 ep-page-medium">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Nutrition
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            Mon suivi
            {seasonMode && <SeasonModeBadge mode={seasonMode} />}
          </h1>
          <p className="mt-1 text-xs text-[#F5EDED]/30">
            {new Intl.DateTimeFormat("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(today + "T12:00:00"))}
          </p>
        </div>
        <button
          onClick={() => openCreateFood("", null)}
          className="inline-flex items-center gap-1.5 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:bg-[#E01E1E]/20 text-[#E01E1E] text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors"
        >
          <Plus size={11} />
          Créer un aliment
        </button>
      </div>

      {/* Mode selector */}
      <NutritionModeSelector
        activeMode={planMode}
        onChange={activePlan && updatePlanMode ? handleChangePlanMode : undefined}
        changing={changingPlanMode}
      />

      {/* Coach's prescribed plan */}
      {activePlan && activePlan.diet_plan_meals.length > 0 && (
        <DietPlanCard
          plan={activePlan}
          todayLogs={todayLogs}
          onToggle={handleTogglePlanItem}
          onValidateSlot={logMealItems ? handleValidateSlot : undefined}
          isOwnPlan={isOwnPlan}
          highlightSlot={highlightSlot}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#890404]/20 overflow-x-auto">
        {(["today", "history", "courses"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
              activeTab === tab
                ? "text-[#E01E1E] border-b-2 border-[#E01E1E]"
                : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            {tab === "today" ? "Aujourd'hui" : tab === "history" ? "Historique alimentaire" : "Courses"}
          </button>
        ))}
      </div>

      {/* ── TODAY TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "today" && (
        <div className="space-y-4">
          {/* Type de jour — objectif calorique/glucides différent les jours
              de repos ou high, uniquement si le coach en a défini. */}
          {hasDayOffsets && !noTargets && (
            <div className="flex gap-1.5">
              {([
                { key: "training", label: "Entraînement" },
                ...(nutritionProfile?.calories_offset_rest != null ? [{ key: "repos", label: "Repos" }] : []),
                ...(nutritionProfile?.calories_offset_high != null ? [{ key: "high", label: "High" }] : []),
              ] as { key: "training" | "repos" | "high"; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => selectDayType(key)}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-colors ${
                    dayType === key
                      ? "bg-[#E01E1E]/15 border-[#E01E1E]/40 text-[#E01E1E]"
                      : "border-[#890404]/25 text-[#F5EDED]/40 hover:text-[#F5EDED]/65"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Rattrapage hebdo — toujours visible quand actif, pour que
              l'objectif du jour ne bouge jamais sans explication. */}
          {!noTargets && weeklyBank !== 0 && (
            <div className="flex items-center gap-2 bg-[#1f0101] border border-[#890404]/25 rounded-lg px-3 py-2.5">
              <Flame size={13} className={weeklyBank > 0 ? "text-[#4ade80] flex-shrink-0" : "text-[#fbbf24] flex-shrink-0"} />
              <p className="text-[11px] text-[#F5EDED]/55 leading-snug">
                {weeklyBank > 0
                  ? `Objectif ajusté : +${weeklyBank} kcal aujourd'hui pour compenser le début de semaine.`
                  : `Objectif ajusté : ${weeklyBank} kcal aujourd'hui pour rester sur la moyenne de la semaine.`}
              </p>
            </div>
          )}

          {/* Macro rings */}
          {noTargets ? (
            <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl p-5 text-center">
              <p className="text-xs text-[#F5EDED]/35 uppercase tracking-widest font-semibold">
                {isOwnPlan
                  ? "Aucun objectif défini. Utilise le calculateur ci-dessus."
                  : "Aucun objectif défini. Contacte ton coach."}
              </p>
            </div>
          ) : (
            <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
              <div className="flex justify-around">
                <MacroRing
                  label="Calories"
                  current={fmt(totals.calories)}
                  target={targets.calories}
                  color="#E01E1E"
                  isCalorie
                />
                <MacroRing
                  label="Protéines"
                  current={fmt(totals.proteins)}
                  target={targets.proteins}
                  color="#60a5fa"
                />
                <MacroRing
                  label="Glucides"
                  current={fmt(totals.carbs)}
                  target={targets.carbs}
                  color="#fbbf24"
                />
                <MacroRing
                  label="Lipides"
                  current={fmt(totals.fats)}
                  target={targets.fats}
                  color="#fb7185"
                />
              </div>
            </div>
          )}

          {/* Diète fixe/fixe-flexible : cocher le plan (DietPlanCard
              ci-dessus) suffit, ce n'est pas du tracking libre — le
              journal détaillé par repas (ajout manuel, bilan rapide,
              copier hier) n'a de sens qu'en diète flexible, où il n'y a
              justement pas de plan à cocher. Éviter de l'afficher quand
              même en fixe/fixe-flexible pour ne pas donner deux façons
              différentes (et déconnectées l'une de l'autre) de dire "j'ai
              mangé ça". */}
          {isFreeTracking && (
            <>
              {/* Bilan rapide — alternative rapide à la saisie manuelle, toujours
                  accessible (avant, elle disparaissait dès le premier aliment
                  loggé dans la journée — hors c'est le seul lien vers cette
                  page, la perdre revenait à la rendre injoignable). */}
              <a
                href="/dashboard/client/nutrition/bilan-rapide"
                className="w-full flex items-center justify-between gap-3 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:border-[#E01E1E]/60 rounded-xl px-4 py-3.5 transition-colors"
              >
                <span className="flex items-center gap-2.5 text-left">
                  <span className="text-xl">⚡</span>
                  <span>
                    <span className="block text-xs font-bold text-white">
                      {todayLogs.length === 0 ? "Bilan rapide" : "Compléter ma journée"}
                    </span>
                    <span className="block text-[10px] text-[#F5EDED]/40">
                      Je choisis mes repas et mes aliments habituels, l&apos;appli calcule tout
                    </span>
                  </span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] flex-shrink-0">
                  Commencer →
                </span>
              </a>

              {/* Copy yesterday — the single biggest friction-killer for an empty day */}
              {todayLogs.length === 0 && yesterdayLogs.length > 0 && (
                <button
                  onClick={handleCopyYesterday}
                  disabled={copyingYesterday}
                  className="w-full flex items-center justify-between gap-3 bg-[#1f0101] border border-[#890404]/40 hover:border-[#E01E1E]/50 rounded-xl px-4 py-3.5 transition-colors disabled:opacity-50"
                >
                  <span className="flex items-center gap-2.5 text-left">
                    <Copy size={14} className="text-[#E01E1E] flex-shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-white">
                        Copier la journée d&apos;hier
                      </span>
                      <span className="block text-[10px] text-[#F5EDED]/40">
                        {yesterdayLogs.length} aliment{yesterdayLogs.length > 1 ? "s" : ""} ·{" "}
                        {fmt(yesterdayCals)} kcal
                      </span>
                    </span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] flex-shrink-0">
                    {copyingYesterday ? "…" : "Copier"}
                  </span>
                </button>
              )}
            </>
          )}

          {/* Error banner — shown when optimistic add fails after modal closes */}
          {addingError && (
            <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
              <p className="text-xs text-red-400 font-semibold">{addingError}</p>
              <button
                onClick={() => setAddingError(null)}
                className="text-red-400/60 hover:text-red-400 transition-colors text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Meal slots — journal détaillé, uniquement en diète flexible (voir plus haut) */}
          {isFreeTracking && MEAL_SLOTS.map((slot) => {
            const slotLogs = todayLogs.filter((l) => l.meal_slot === slot.key);
            const slotCals = slotLogs.reduce(
              (s, l) => s + (l.calories ?? 0),
              0
            );
            return (
              <MealSlotCard
                key={slot.key}
                slotKey={slot.key}
                label={slot.label}
                logs={slotLogs}
                totalCals={slotCals}
                today={today}
                onAdd={() => openModal(slot.key)}
                onDelete={handleDelete}
                onSaveAsMeal={createSavedMeal ? () => openSaveMealPrompt(slot.key) : undefined}
              />
            );
          })}

          {/* ── Micronutriments ───────────────────────────────────────────── */}
          {todayLogs.length > 0 && (
            <div className="mt-6">
              <div className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-0.5">
                  Apports du jour
                </p>
                <h2 className="text-base font-black uppercase tracking-tight">
                  Micronutriments
                </h2>
              </div>
              <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
                <MicroBarList logs={todayLogs} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ───────────────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-5">
          {/* Vue agenda (2026-08-18) : jour / semaine / mois, demande
              explicite. "Jour" est aussi la seule vue qui permet de logger
              un aliment oublié sur un jour passé — jusqu'ici l'historique
              était en lecture seule. */}
          <div className="flex gap-1.5 bg-[#1f0101] border border-[#890404]/25 rounded-xl p-1">
            {([
              { key: "jour", label: "Jour" },
              { key: "semaine", label: "Semaine" },
              { key: "mois", label: "Mois" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setHistoryView(key)}
                className={`flex-1 text-[10.5px] font-bold uppercase tracking-widest py-2 rounded-lg transition-colors ${
                  historyView === key ? "bg-[#E01E1E]/15 text-[#E01E1E]" : "text-[#F5EDED]/35 hover:text-[#F5EDED]/60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Legend, pertinente pour Semaine et Mois (couleur = adhérence à l'objectif) */}
          {historyView !== "jour" && (
            <div className="flex items-center gap-4 text-[10px] text-[#F5EDED]/40 font-semibold uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-green-600/60 inline-block" />
                ≥ 90%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500/60 inline-block" />
                70 à 90%
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-700/60 inline-block" />
                &lt; 70%
              </span>
            </div>
          )}

          {/* ── Vue Mois : grille des 30 derniers jours ── */}
          {historyView === "mois" && (
            <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
              <div className="grid grid-cols-7 gap-1.5">
                {last30Days.map((date) => {
                  const cals = calsByDate[date] ?? 0;
                  const isSelected = viewedDate === date;
                  return (
                    <button
                      key={date}
                      onClick={() => {
                        setHistorySelectedDate(date);
                        setHistoryView("jour");
                      }}
                      title={`${date} : ${Math.round(cals)} kcal`} aria-label={`${date} : ${Math.round(cals)} kcal`}
                      className={`aspect-square rounded-md border text-[8px] font-bold transition-all ${getDayColor(
                        cals,
                        targets.calories
                      )} ${
                        isSelected ? "ring-2 ring-white/50 ring-offset-1 ring-offset-[#1f0101]" : ""
                      }`}
                    >
                      <span className="text-white/70">
                        {new Date(date + "T12:00:00").getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Vue Semaine : la semaine (lundi→dimanche) du jour affiché ── */}
          {historyView === "semaine" && (
            <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((date) => {
                  const cals = calsByDate[date] ?? 0;
                  const isSelected = viewedDate === date;
                  // Hors fenêtre = pas de données chargées pour ce jour
                  // (historyLogs ne couvre que les 30 derniers jours),
                  // même borne que la navigation Jour (shiftHistoryDay).
                  const outOfRange = date > today || date < minHistoryDate;
                  const d = new Date(date + "T12:00:00");
                  return (
                    <button
                      key={date}
                      disabled={outOfRange}
                      onClick={() => {
                        setHistorySelectedDate(date);
                        setHistoryView("jour");
                      }}
                      className={`rounded-lg border py-2.5 flex flex-col items-center gap-1 transition-all ${
                        outOfRange ? "opacity-20 cursor-default border-[#890404]/15" : getDayColor(cals, targets.calories)
                      } ${isSelected ? "ring-2 ring-white/50 ring-offset-1 ring-offset-[#1f0101]" : ""}`}
                    >
                      <span className="text-[8px] uppercase font-bold text-white/50">
                        {["dim", "lun", "mar", "mer", "jeu", "ven", "sam"][d.getDay()]}
                      </span>
                      <span className="text-sm font-black text-white">{d.getDate()}</span>
                      {!outOfRange && <span className="text-[8px] text-white/60">{Math.round(cals)} kcal</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Vue Jour : détail éditable, seule vue qui permet de logger
              un jour passé (demande explicite : "je dois pouvoir logger
              les jours passés pas que aujourd'hui") ── */}
          {historyView === "jour" && (
            <div className="space-y-3">
              <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => shiftHistoryDay(-1)}
                  disabled={!canGoPrevDay}
                  aria-label="Jour précédent"
                  className="text-[#F5EDED]/40 hover:text-[#F5EDED]/80 disabled:opacity-20 disabled:hover:text-[#F5EDED]/40 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-1.5 justify-center">
                    <CalendarDays size={12} className="text-[#E01E1E]" />
                    {viewedDate === today
                      ? "Aujourd'hui"
                      : new Intl.DateTimeFormat("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        }).format(new Date(viewedDate + "T12:00:00"))}
                  </p>
                  {viewedDate !== today && (
                    <button
                      onClick={() => setHistorySelectedDate(today)}
                      className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E] mt-0.5"
                    >
                      Revenir à aujourd&apos;hui
                    </button>
                  )}
                </div>
                <button
                  onClick={() => shiftHistoryDay(1)}
                  disabled={!canGoNextDay}
                  aria-label="Jour suivant"
                  className="text-[#F5EDED]/40 hover:text-[#F5EDED]/80 disabled:opacity-20 disabled:hover:text-[#F5EDED]/40 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {MEAL_SLOTS.map((slot) => {
                const slotLogs = historyDayLogs.filter((l) => l.meal_slot === slot.key);
                const slotCals = slotLogs.reduce((s, l) => s + (l.calories ?? 0), 0);
                return (
                  <MealSlotCard
                    key={slot.key}
                    slotKey={slot.key}
                    label={slot.label}
                    logs={slotLogs}
                    totalCals={slotCals}
                    today={viewedDate}
                    onAdd={() => openModal(slot.key, viewedDate)}
                    onDelete={(logId) => handleDeleteForDate(logId, viewedDate)}
                  />
                );
              })}

              {historyDayLogs.length > 0 && (
                <div className="px-1 text-xs font-bold text-[#F5EDED]/60 text-right">
                  Total : {fmt(calsByDate[viewedDate] ?? 0)} kcal
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── COURSES TAB ──────────────────────────────────────────────────────
          Générée depuis le plan structuré du coach s'il y en a un, sinon
          depuis les aliments réellement loggués récemment (au moins 2 fois)
          — jamais vide de sens même sans plan fixe. */}
      {activeTab === "courses" && (
        <div className="space-y-5">
          <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <ShoppingCart size={15} className="text-[#E01E1E] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#F5EDED]/55 leading-relaxed">
              {shoppingList.source === "plan"
                ? "Générée à partir de ton plan nutritionnel, pour la semaine."
                : "Générée à partir de ce que tu manges le plus souvent ces 7 derniers jours."}
            </p>
          </div>

          {shoppingList.items.length === 0 ? (
            <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-10 text-center">
              <p className="text-xs text-[#F5EDED]/35">
                Pas encore assez de données. Logue tes repas quelques jours, ou demande à ton coach un plan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...shoppingByCategory.entries()].map(([category, items]) => (
                <div key={category} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2.5">
                    {category}
                  </p>
                  <div className="space-y-1.5">
                    {items.map((item) => {
                      const checked = checkedItems.has(item.foodId);
                      return (
                        <button
                          key={item.foodId}
                          onClick={() => toggleChecked(item.foodId)}
                          className="w-full flex items-center gap-2.5 text-left"
                        >
                          <span className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            checked ? "bg-[#E01E1E] border-[#E01E1E]" : "border-[#890404]/40"
                          }`}>
                            {checked && <Check size={12} className="text-white" strokeWidth={3} />}
                          </span>
                          <span className={`text-sm flex-1 ${checked ? "text-[#F5EDED]/30 line-through" : "text-white"}`}>
                            {item.name}
                          </span>
                          <span className={`text-xs ${checked ? "text-[#F5EDED]/20" : "text-[#F5EDED]/40"}`}>
                            {item.totalGrams >= 1000 ? `${(item.totalGrams / 1000).toFixed(1)}kg` : `${item.totalGrams}g`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {checkedItems.size > 0 && (
                <button
                  onClick={() => { setCheckedItems(new Set()); try { localStorage.removeItem("ep-shopping-checked"); } catch {} }}
                  className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-red-400 transition-colors"
                >
                  Tout décocher
                </button>
              )}
            </div>
          )}

          {/* Idées de sources — pour varier en plan flexible, sans dépendre
              uniquement de ce qui a déjà été loggué. */}
          <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3 flex items-center gap-1.5">
              <Lightbulb size={12} className="text-amber-400" />
              Idées pour varier
            </p>
            <div className="space-y-3">
              {FOOD_IDEAS.map((group) => (
                <div key={group.key}>
                  <p className="text-xs font-bold text-white mb-1.5">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <span
                        key={item}
                        className="text-[10px] text-[#F5EDED]/55 bg-[#150000] border border-[#890404]/20 rounded-full px-2.5 py-1"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SEARCH MODAL ──────────────────────────────────────────────────── */}
      {addingToSlot && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="ep-modal-overlay absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="ep-modal-panel relative w-full sm:max-w-md bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col z-10">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#890404]/20 flex-shrink-0">
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                {selectedFood
                  ? selectedFood.name
                  : selectedRecipe
                  ? selectedRecipe.name
                  : MEAL_SLOTS.find((s) => s.key === addingToSlot)?.label}
              </p>
              <button
                onClick={closeModal}
                aria-label="Fermer"
                className="text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab switcher: Aliments / Recettes / Repas */}
            {!selectedFood && !selectedRecipe && (
              <div className="flex px-5 pt-2 pb-0 gap-1 flex-shrink-0">
                {(["aliments", "repas", "recettes"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setSearchTab(t); setSearchQuery(""); }}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors ${
                      searchTab === t
                        ? "bg-[#E01E1E]/15 text-[#E01E1E] border border-[#E01E1E]/30"
                        : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
                    }`}
                  >
                    {t === "aliments" && "Aliments"}
                    {t === "repas" && <span className="flex items-center gap-1"><UtensilsCrossed size={10} />Repas</span>}
                    {t === "recettes" && <span className="flex items-center gap-1"><BookOpen size={10} />Recettes</span>}
                  </button>
                ))}
              </div>
            )}

            {!selectedFood && !selectedRecipe ? (
              // ── Search / Recipe view ──
              <>
                {searchTab === "aliments" && (
                  <div className="px-5 py-3 flex-shrink-0 flex items-center gap-2">
                    <input
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher un aliment…" aria-label="Rechercher un aliment…"
                      className={inputCls}
                    />
                    {/* Item 16 : scan code-barres — pré-remplit le formulaire
                        de création d'aliment existant plutôt qu'une
                        sauvegarde séparée, voir handleBarcodeScanned. */}
                    <button
                      onClick={() => setShowScannerModal(true)}
                      disabled={scanningProduct}
                      title="Scanner un code-barres" aria-label="Scanner un code-barres"
                      className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-[#150000] border border-[#890404]/30 text-[#F5EDED]/50 hover:text-[#E01E1E] hover:border-[#E01E1E]/40 transition-colors disabled:opacity-40"
                    >
                      <ScanBarcode size={16} />
                    </button>
                  </div>
                )}
                {scanningProduct && (
                  <p className="px-5 pb-2 text-[11px] text-[#F5EDED]/40 flex-shrink-0">Recherche du produit…</p>
                )}
                {scanError && (
                  <p className="px-5 pb-2 text-[11px] text-amber-400 flex-shrink-0">{scanError}</p>
                )}

                {searchTab === "aliments" && (
                  <div className="flex-1 overflow-y-auto px-2 pb-2">
                    {hasWatch && (
                      <div className="mx-1 mt-2 mb-1 flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                        <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[10.5px] text-amber-300/90 leading-relaxed">
                          À surveiller pour toi : {summarizeFoodWatchContext(watchContext)}.
                        </p>
                      </div>
                    )}
                    {!searchQuery && recentFoods.length > 0 && (
                      <div className="mb-1">
                        <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 flex items-center gap-1.5">
                          <Clock size={10} /> Récents
                        </p>
                        {recentFoods.map((food) => (
                          <FoodResultButton key={`recent-${food.id}`} food={food} onClick={() => selectFoodForLogging(food)} watchContext={watchContext} />
                        ))}
                      </div>
                    )}
                    {!searchQuery && mostUsedFoods.length > 0 && (
                      <div className="mb-1">
                        <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 flex items-center gap-1.5">
                          <Flame size={10} /> Les plus utilisés
                        </p>
                        {mostUsedFoods.map((food) => (
                          <FoodResultButton key={`used-${food.id}`} food={food} onClick={() => selectFoodForLogging(food)} watchContext={watchContext} />
                        ))}
                      </div>
                    )}
                    {!searchQuery && (recentFoods.length > 0 || mostUsedFoods.length > 0) && (
                      <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30">Tous les aliments</p>
                    )}
                    {filteredFoods.length === 0 ? (
                      searchQuery.trim() ? (
                        // Zéro résultat sur un terme tapé : la sortie de secours
                        // est proposée ici, à l'endroit exact du blocage, avec le
                        // terme déjà repris, plutôt qu'en petit lien en bas de
                        // modale que personne ne remarque.
                        <div className="px-3 py-6 flex flex-col items-center gap-3 text-center">
                          <Search size={20} className="text-[#F5EDED]/15" strokeWidth={1.5} />
                          <p className="text-xs text-[#F5EDED]/40 leading-relaxed">
                            Aucun aliment ne correspond à
                            <span className="text-white font-bold"> « {searchQuery.trim()} »</span>.
                            <br />
                            Crée le maintenant, il restera dans ta liste.
                          </p>
                          <button
                            onClick={() => openCreateFood(searchQuery, addingToSlot)}
                            className="w-full inline-flex items-center justify-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-[11px] font-black uppercase tracking-widest px-4 py-3 rounded-xl transition-colors"
                          >
                            <Plus size={13} />
                            Créer « {searchQuery.trim()} »
                          </button>
                          <button
                            onClick={() => {
                              const slot = addingToSlot!;
                              const q = searchQuery;
                              closeModal();
                              openQuickAdd(slot, q);
                            }}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
                          >
                            <Zap size={11} />
                            Ou juste les calories
                          </button>
                        </div>
                      ) : (
                        <p className="text-center text-xs text-[#F5EDED]/30 py-8">Aucun résultat</p>
                      )
                    ) : (
                      filteredFoods.map((food) => (
                        <FoodResultButton key={food.id} food={food} onClick={() => selectFoodForLogging(food)} watchContext={watchContext} />
                      ))
                    )}
                  </div>
                )}

                {searchTab === "repas" && (
                  <div className="flex-1 overflow-y-auto px-3 pb-3 pt-2">
                    {savedMeals.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <UtensilsCrossed size={22} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
                        <p className="text-xs text-[#F5EDED]/35 leading-relaxed">
                          Aucun repas enregistré. Ajoute des aliments à un créneau, puis touche l&apos;icône{" "}
                          <Bookmark size={11} className="inline text-[#F5EDED]/40" /> à côté pour le sauvegarder et le réutiliser en un tap.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {savedMeals.map((meal) => {
                          const totalKcal = meal.saved_meal_items.reduce(
                            (s, it) => s + (it.foods ? it.foods.calories_per_100 * (it.quantity_g / 100) : 0),
                            0
                          );
                          return (
                            <div
                              key={meal.id}
                              className="flex items-center gap-3 bg-[#150000] border border-[#890404]/25 rounded-xl px-3.5 py-3"
                            >
                              <button
                                onClick={() => handleLogSavedMeal(meal)}
                                className="flex-1 min-w-0 text-left flex items-center gap-3"
                              >
                                <div className="w-8 h-8 rounded-lg bg-[#E01E1E]/10 border border-[#E01E1E]/20 flex items-center justify-center flex-shrink-0">
                                  <UtensilsCrossed size={14} className="text-[#E01E1E]" strokeWidth={1.8} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm text-white font-bold truncate">{meal.name}</p>
                                  <p className="text-[10px] text-[#F5EDED]/35">
                                    {meal.saved_meal_items.length} aliment{meal.saved_meal_items.length > 1 ? "s" : ""} · {fmt(totalKcal)} kcal
                                  </p>
                                </div>
                              </button>
                              <button
                                onClick={() => handleDeleteSavedMeal(meal.id)}
                                className="text-[#F5EDED]/20 hover:text-red-500 transition-colors flex-shrink-0 p-1"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {searchTab === "recettes" && (
                  <div className="flex-1 overflow-y-auto px-2 pb-2">
                    {(searchQuery
                      ? recipes.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      : recipes
                    ).slice(0, 40).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => { setSelectedRecipe(r); setRecipeServings("1"); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#1f0101] rounded-lg transition-colors"
                      >
                        <p className="text-sm text-white font-medium leading-tight">{r.name}</p>
                        <p className="text-[10px] text-[#F5EDED]/35 mt-0.5">
                          {r.kcal} kcal/portion · P {r.protein}g · G {r.carbs}g · L {r.fat}g
                        </p>
                      </button>
                    ))}
                    {recipes.length === 0 && (
                      <p className="text-center text-xs text-[#F5EDED]/30 py-8">Aucune recette disponible</p>
                    )}
                  </div>
                )}

                {searchTab === "aliments" && (
                  <div className="px-5 py-3 border-t border-[#890404]/20 flex-shrink-0 flex flex-col gap-1">
                    <button
                      onClick={() => {
                        const slot = addingToSlot!;
                        const q = searchQuery;
                        closeModal();
                        openQuickAdd(slot, q);
                      }}
                      className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors py-2"
                    >
                      <Zap size={11} />
                      Ajout rapide (juste les calories)
                    </button>
                    <button
                      onClick={() => openCreateFood(searchQuery, addingToSlot)}
                      className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors py-2"
                    >
                      <Plus size={11} />
                      Créer un aliment personnalisé
                    </button>
                  </div>
                )}
              </>
            ) : selectedRecipe ? (
              // ── Recipe servings view ──
              <div className="px-5 py-4 flex flex-col gap-4 overflow-y-auto flex-1">
                <div>
                  <p className="text-[10px] text-[#F5EDED]/35 mb-1">
                    {selectedRecipe.kcal} kcal/portion · P {selectedRecipe.protein}g · G {selectedRecipe.carbs}g · L {selectedRecipe.fat}g
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                    Nombre de portions
                  </label>
                  <input
                    autoFocus
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={recipeServings}
                    onChange={(e) => setRecipeServings(e.target.value)}
                    placeholder="1" aria-label="1"
                    className={inputCls}
                  />
                </div>
                {parseFloat(recipeServings) > 0 && (
                  <div className="bg-[#1f0101] border border-[#890404]/20 rounded-lg p-3">
                    <div className="flex gap-4 text-xs">
                      {(() => {
                        const s = parseFloat(recipeServings) || 1;
                        return (
                          <>
                            <div><p className="text-[#E01E1E] font-black text-base">{Math.round(selectedRecipe.kcal * s)}</p><p className="text-[#F5EDED]/40 text-[9px]">kcal</p></div>
                            <div><p className="text-blue-300 font-bold">{Math.round(selectedRecipe.protein * s)}g</p><p className="text-[#F5EDED]/40 text-[9px]">Prot</p></div>
                            <div><p className="text-amber-300 font-bold">{Math.round(selectedRecipe.carbs * s)}g</p><p className="text-[#F5EDED]/40 text-[9px]">Gluc</p></div>
                            <div><p className="text-rose-300 font-bold">{Math.round(selectedRecipe.fat * s)}g</p><p className="text-[#F5EDED]/40 text-[9px]">Lip</p></div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setSelectedRecipe(null)} className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 rounded-lg text-[#F5EDED]/60">Retour</button>
                  <button onClick={handleAddRecipe} disabled={!recipeServings || parseFloat(recipeServings) <= 0} className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest bg-[#E01E1E] text-white rounded-lg disabled:opacity-40">Ajouter</button>
                </div>
              </div>
            ) : selectedFood ? (
              // ── Quantity view ──
              <div className="px-5 py-4 flex flex-col gap-4">
                <div>
                  <p className="text-[10px] text-[#F5EDED]/35 mb-1">
                    {selectedFood.calories_per_100} kcal/100g · P{" "}
                    {selectedFood.proteins_per_100}g · G{" "}
                    {selectedFood.carbs_per_100}g · L{" "}
                    {selectedFood.fats_per_100}g
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                    Quantité (grammes)
                  </label>
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    placeholder="100" aria-label="100"
                    className={inputCls}
                  />
                </div>
                {quantityInput && parseFloat(quantityInput) > 0 && (
                  <div className="bg-[#1f0101] border border-[#890404]/20 rounded-lg p-3">
                    {(() => {
                      const m = calcMacros(
                        selectedFood!,
                        parseFloat(quantityInput)
                      );
                      return (
                        <div className="flex gap-4 text-xs">
                          <div>
                            <p className="text-[#E01E1E] font-black text-base">
                              {fmt(m.calories)}
                            </p>
                            <p className="text-[#F5EDED]/40 text-[9px]">kcal</p>
                          </div>
                          <div>
                            <p className="text-blue-300 font-bold">{fmt(m.proteins)}g</p>
                            <p className="text-[#F5EDED]/40 text-[9px]">Prot</p>
                          </div>
                          <div>
                            <p className="text-amber-300 font-bold">{fmt(m.carbs)}g</p>
                            <p className="text-[#F5EDED]/40 text-[9px]">Gluc</p>
                          </div>
                          <div>
                            <p className="text-rose-300 font-bold">{fmt(m.fats)}g</p>
                            <p className="text-[#F5EDED]/40 text-[9px]">Lip</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {addingError && (
                  <p className="text-xs text-red-400">{addingError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedFood(null)}
                    className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 rounded-lg text-[#F5EDED]/60 hover:text-[#F5EDED]/80 transition-colors"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleAddFood}
                    disabled={!quantityInput || parseFloat(quantityInput) <= 0}
                    className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-lg disabled:opacity-40 transition-colors"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── SAVE MEAL MODAL ───────────────────────────────────────────────── */}
      {savingMealSlot && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="ep-modal-overlay absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setSavingMealSlot(null)}
          />
          <div className="ep-modal-panel relative w-full sm:max-w-sm bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl p-5 z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                <Bookmark size={13} className="text-[#E01E1E]" /> Enregistrer ce repas
              </p>
              <button onClick={() => setSavingMealSlot(null)} className="text-[#F5EDED]/40 hover:text-[#F5EDED]/70">
                <X size={16} />
              </button>
            </div>
            <p className="text-[11px] text-[#F5EDED]/40 mb-3 leading-relaxed">
              Donne-lui un nom pour le retrouver et le reloguer en un tap la prochaine fois.
            </p>
            <input
              autoFocus
              value={savingMealName}
              onChange={(e) => setSavingMealName(e.target.value)}
              placeholder="Ex : Mon petit-déj habituel" aria-label="Ex : Mon petit-déj habituel"
              className={inputCls}
            />
            <button
              onClick={handleSaveSlotAsMeal}
              disabled={savingMealBusy || !savingMealName.trim()}
              className="w-full mt-4 py-2.5 text-xs font-bold uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              {savingMealBusy ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {/* ── BARCODE SCANNER MODAL (item 16) ─────────────────────────────────── */}
      {showScannerModal && (
        <BarcodeScannerModal
          onScan={handleBarcodeScanned}
          onClose={() => setShowScannerModal(false)}
        />
      )}

      {/* ── CREATE FOOD MODAL ─────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="ep-modal-overlay absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="ep-modal-panel relative w-full sm:max-w-md bg-[#150000] border border-[#890404]/40 rounded-t-2xl sm:rounded-2xl p-5 z-10">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-white">
                Créer un aliment
              </p>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                  Nom *
                </label>
                <input
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ex. Riz basmati précuit" aria-label="Nom de l'aliment"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                  Catégorie
                </label>
                <select aria-label="Catégorie"
                  value={createForm.category}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, category: e.target.value }))
                  }
                  className={inputCls}
                >
                  {FOOD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "calories_per_100", label: "Calories/100g *" },
                  { key: "proteins_per_100", label: "Protéines/100g" },
                  { key: "carbs_per_100", label: "Glucides/100g" },
                  { key: "fats_per_100", label: "Lipides/100g" },
                  { key: "fibers_per_100", label: "Fibres/100g" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                      {label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={createForm[key as keyof typeof createForm]}
                      onChange={(e) =>
                        setCreateForm((p) => ({
                          ...p,
                          [key]: e.target.value,
                        }))
                      }
                      placeholder="0" aria-label="0"
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </div>

            {createError && (
              <p className="text-xs text-red-400 mt-3">{createError}</p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 rounded-lg text-[#F5EDED]/60 hover:text-[#F5EDED]/80 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateFood}
                disabled={creating}
                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {creating ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK ADD MODAL (calories-only, for restaurants / unknown foods) ── */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="ep-modal-overlay absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowQuickAddModal(false)}
          />
          <div className="ep-modal-panel relative w-full sm:max-w-md bg-[#150000] border border-amber-500/30 rounded-t-2xl sm:rounded-2xl p-5 z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-1.5">
                <Zap size={12} className="text-amber-400" />
                Ajout rapide
              </p>
              <button
                onClick={() => setShowQuickAddModal(false)}
                className="text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[10px] text-[#F5EDED]/35 mb-5">
              Au resto, pas le temps de chercher l&apos;aliment exact ? Indique juste les calories
              (et les macros si tu les connais), ça compte direct dans ton suivi.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                  Nom (optionnel)
                </label>
                <input
                  value={quickAddForm.name}
                  onChange={(e) =>
                    setQuickAddForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ex. Repas au restaurant" aria-label="Nom du repas"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "calories", label: "Calories *" },
                  { key: "proteins", label: "Protéines (g)" },
                  { key: "carbs", label: "Glucides (g)" },
                  { key: "fats", label: "Lipides (g)" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
                      {label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={quickAddForm[key as keyof typeof quickAddForm]}
                      onChange={(e) =>
                        setQuickAddForm((p) => ({ ...p, [key]: e.target.value }))
                      }
                      placeholder="0" aria-label="0"
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </div>

            {quickAddError && (
              <p className="text-xs text-red-400 mt-3">{quickAddError}</p>
            )}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowQuickAddModal(false)}
                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 rounded-lg text-[#F5EDED]/60 hover:text-[#F5EDED]/80 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleQuickAdd}
                disabled={quickAdding}
                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest bg-amber-500 hover:bg-amber-400 text-black rounded-lg disabled:opacity-50 transition-colors"
              >
                {quickAdding ? "Ajout…" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DietPlanCard ──────────────────────────────────────────────────────────────

function DietPlanCard({
  plan,
  todayLogs,
  onToggle,
  onValidateSlot,
  isOwnPlan = false,
  highlightSlot = null,
}: {
  plan: DietPlanWithMeals;
  todayLogs: FoodLogWithFood[];
  onToggle: (meal: DietPlanMeal, matchedLogId: string | undefined) => void;
  onValidateSlot?: (meals: DietPlanMeal[]) => void | Promise<void>;
  isOwnPlan?: boolean;
  highlightSlot?: string | null;
}) {
  const [validatingSlot, setValidatingSlot] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const checkable = plan.mode === "fixed" || plan.mode === "fixed_flexible";
  const isWeekly = plan.structure === "weekly";
  const hasHighDay = useMemo(() => plan.diet_plan_meals.some((m) => m.day_of_week === "high"), [plan.diet_plan_meals]);
  const [useHighDay, setUseHighDay] = useState(false);

  const todayDow = useMemo(() => {
    const map = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"] as const;
    return map[new Date().getDay()];
  }, []);

  const activeDay = isWeekly ? (useHighDay ? "high" : todayDow) : null;

  const dayMeals = useMemo(
    () => (isWeekly ? plan.diet_plan_meals.filter((m) => m.day_of_week === activeDay) : plan.diet_plan_meals),
    [plan.diet_plan_meals, isWeekly, activeDay]
  );

  const bySlot = useMemo(() => {
    const map: Record<string, typeof plan.diet_plan_meals> = {};
    for (const m of dayMeals) {
      const key = m.meal_slot;
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [dayMeals, plan]);

  // Match each plan item to an unclaimed log of the same food/slot/quantity logged today.
  // quantity_g est une colonne `numeric` côté DB des deux côtés (diet_plan_meals
  // ET food_logs) : selon le chemin de sérialisation, l'une peut revenir en
  // JS `number` et l'autre en `string` ("150" !== 150), et une comparaison
  // stricte fait alors échouer TOUS les matchs — la coche ne s'affiche
  // jamais, et retaper dessus rajoute un nouveau log au lieu de retirer
  // l'existant (retour direct 2026-09-09 : "le truc pour cocher ne
  // fonctionne toujours pas"). Number(...) des deux côtés + tolérance
  // (au lieu d'une égalité stricte) : robuste au type ET à un éventuel
  // écart d'arrondi flottant, sans risque (personne ne distingue 0.01g).
  const QUANTITY_MATCH_EPSILON = 0.01;
  const checkedMap = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    const used = new Set<string>();
    for (const m of dayMeals) {
      const match = todayLogs.find(
        (l) =>
          !used.has(l.id) &&
          l.food_id === m.food_id &&
          l.meal_slot === m.meal_slot &&
          Math.abs(Number(l.quantity_g) - Number(m.quantity_g)) < QUANTITY_MATCH_EPSILON
      );
      if (match) {
        map[m.id] = match.id;
        used.add(match.id);
      }
    }
    return map;
  }, [dayMeals, todayLogs]);

  const doneCount = Object.values(checkedMap).filter(Boolean).length;

  return (
    <div className="bg-[#1f0101] border border-[#E01E1E]/30 rounded-xl overflow-hidden mb-6">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
        onKeyDown={onKeyActivate(() => setExpanded((e) => !e))}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#E01E1E]/70 mb-0.5">
            {isOwnPlan ? "Mon plan" : "Plan de ton coach"}
            {checkable && dayMeals.length > 0 && (
              <span className="ml-2 text-[#F5EDED]/30 font-normal">
                {doneCount}/{dayMeals.length} cochés
              </span>
            )}
          </p>
          <p className="text-sm font-black text-white">{plan.name}</p>
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-[#F5EDED]/30" />
        ) : (
          <ChevronDown size={14} className="text-[#F5EDED]/30" />
        )}
      </div>

      {expanded && hasHighDay && (
        <div className="px-4 pt-3 flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setUseHighDay((v) => !v); }}
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border transition-colors ${
              useHighDay
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                : "border-[#890404]/25 text-[#F5EDED]/35"
            }`}
          >
            🔥 Aujourd&apos;hui = jour high
          </button>
        </div>
      )}

      {expanded && dayMeals.length === 0 && isWeekly && (
        <p className="px-4 pt-3 text-[10px] text-[#F5EDED]/25 italic">
          Aucun repas prévu pour aujourd&apos;hui dans ce plan, jour libre ou off.
        </p>
      )}

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#890404]/15 pt-3">
          {MEAL_SLOTS.filter((slot) => bySlot[slot.key]?.length).map((slot) => {
            const uncheckedMeals = checkable
              ? bySlot[slot.key].filter((m) => !checkedMap[m.id])
              : [];
            const isValidating = validatingSlot === slot.key;
            return (
            <div
              key={slot.key}
              id={`diet-plan-slot-${slot.key}`}
              className={
                highlightSlot === slot.key
                  ? "-mx-2 px-2 py-1.5 rounded-xl border border-[#E01E1E]/40 animate-pulse-glow"
                  : undefined
              }
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40">
                  {slot.label}
                </p>
                {/* Bouton unique pour valider tout le repas d'un coup
                    (demande explicite 2026-08-16) plutôt que de forcer à
                    cocher chaque aliment un par un — n'apparaît que s'il
                    reste au moins un aliment non loggué sur ce créneau. */}
                {onValidateSlot && uncheckedMeals.length > 0 && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setValidatingSlot(slot.key);
                      await onValidateSlot(uncheckedMeals);
                      setValidatingSlot(null);
                    }}
                    disabled={isValidating}
                    className="flex-shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#4ade80] hover:text-[#6ee7a0] disabled:opacity-50 transition-colors"
                  >
                    <Check size={11} strokeWidth={3} />
                    {isValidating ? "Validation…" : "Valider le repas"}
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {bySlot[slot.key].map((m) => {
                  const matchedLogId = checkedMap[m.id];
                  const isChecked = !!matchedLogId;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 py-1.5 ${
                        checkable ? "cursor-pointer" : ""
                      }`}
                      onClick={
                        checkable ? () => onToggle(m, matchedLogId) : undefined
                      }
                    >
                      {checkable && (
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isChecked
                              ? "bg-[#E01E1E] border-[#E01E1E]"
                              : "border-[#890404]/40 bg-transparent"
                          }`}
                        >
                          {isChecked && <Check size={12} className="text-white" strokeWidth={3} />}
                        </span>
                      )}
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <p
                          className={`text-xs font-medium truncate ${
                            isChecked ? "text-[#F5EDED]/40 line-through" : "text-white"
                          }`}
                        >
                          {m.foods?.name ?? "Aliment"}
                        </p>
                        <p className="text-[10px] text-[#F5EDED]/35 flex-shrink-0 ml-2">
                          {m.quantity_g}g
                          {m.foods
                            ? ` · ${fmt(calcMacros(m.foods, m.quantity_g).calories)} kcal`
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MealSlotCard ──────────────────────────────────────────────────────────────

function MealSlotCard({
  slotKey,
  label,
  logs,
  totalCals,
  today,
  onAdd,
  onDelete,
  onSaveAsMeal,
}: {
  slotKey: string;
  label: string;
  logs: FoodLogWithFood[];
  totalCals: number;
  today: string;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onSaveAsMeal?: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [hasPhoto, setHasPhoto] = useState(() => !!loadMealPhoto(today, slotKey));

  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Compress by drawing on canvas (max 400px wide)
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 400 / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.6);
        saveMealPhoto(today, slotKey, compressed);
        setHasPhoto(true);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
        onKeyDown={onKeyActivate(() => setExpanded((e) => !e))}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              {label}
              {hasPhoto && <span className="text-purple-400 text-[9px] font-bold">📸</span>}
            </p>
            {logs.length > 0 && (
              <p className="text-[10px] text-[#F5EDED]/35">
                {fmt(totalCals)} kcal · {logs.length} aliment
                {logs.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onSaveAsMeal && logs.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSaveAsMeal();
              }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#F5EDED]/25 hover:text-[#E01E1E] transition-colors"
              title="Enregistrer ce repas pour le réutiliser en un tap" aria-label="Enregistrer ce repas pour le réutiliser en un tap"
            >
              <Bookmark size={13} />
            </button>
          )}
          {/* Quick photo capture */}
          <label
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer ${
              hasPhoto ? "text-purple-400" : "text-[#F5EDED]/20 hover:text-[#F5EDED]/50"
            }`}
            title="Prendre une photo pour t'aider à loguer ce soir"
          >
            <Camera size={13} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoCapture}
            />
          </label>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors px-2 py-1"
          >
            <Plus size={11} />
            Ajouter
          </button>
          {expanded ? (
            <ChevronUp size={14} className="text-[#F5EDED]/30" />
          ) : (
            <ChevronDown size={14} className="text-[#F5EDED]/30" />
          )}
        </div>
      </div>

      {expanded && logs.length > 0 && (
        <div className="px-4 pb-3 space-y-1 border-t border-[#890404]/15">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between py-2 border-b border-[#890404]/10 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium truncate">
                  {log.foods?.name ?? "Aliment"}
                </p>
                <p className="text-[10px] text-[#F5EDED]/35">
                  {log.quantity_g}g ·{" "}
                  <span className="text-[#E01E1E]/70">
                    {fmt(log.calories ?? 0)} kcal
                  </span>{" "}
                  · P {fmt(log.proteins ?? 0)}g · G {fmt(log.carbs ?? 0)}g · L{" "}
                  {fmt(log.fats ?? 0)}g
                </p>
              </div>
              <button
                onClick={() => onDelete(log.id)}
                className="text-[#F5EDED]/20 hover:text-red-500 transition-colors ml-3 flex-shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
