"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getProfile, isSubscribed } from "@/utils/auth";
import { requireClient, requireCoach, requireAuth } from "@/lib/auth-guards";
import { awardPoints, POINTS } from "@/lib/gamification";
import { revalidatePath, updateTag } from "next/cache";
import type { Food, NutritionProfileInput, DietMode, DietStructure } from "@/utils/nutrition";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";
import { getCoachForClient, alreadyNotifiedToday } from "@/utils/insert-notification";
import { notifyUser } from "@/lib/notify";

// Self-serve nutrition targets — only available to free-tier community
// members. They set and adjust their own targets, no coach review.
export async function saveOwnNutritionProfile(
  clientId: string,
  data: NutritionProfileInput
): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };
  if (guard.userId !== clientId) return { error: "Accès refusé." };

  const supabase = await createServerSupabase();

  const fields = {
    calories_target: data.calories_target,
    proteins_target: data.proteins_target,
    carbs_target: data.carbs_target,
    fats_target: data.fats_target,
    calories_offset_rest: data.calories_offset_rest ?? null,
    calories_offset_high: data.calories_offset_high ?? null,
    tdee: data.tdee,
    bmr: data.bmr,
    phase: data.phase,
    gender: data.gender,
    height: data.height,
    age: data.age,
    training_type: data.training_type,
    sessions_per_week: data.sessions_per_week,
    session_duration: data.session_duration,
    steps_per_day: data.steps_per_day,
    activity_level: data.activity_level,
    updated_at: new Date().toISOString(),
  };

  // Explicit select-then-update-or-insert instead of upsert(onConflict): see
  // the coach-side saveNutritionProfile action for why.
  const { data: existingRows } = await supabase
    .from("nutrition_profiles")
    .select("id")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false });

  let error;
  if (existingRows && existingRows.length > 0) {
    ({ error } = await supabase
      .from("nutrition_profiles")
      .update(fields)
      .eq("id", existingRows[0].id));
    if (existingRows.length > 1) {
      await supabase
        .from("nutrition_profiles")
        .delete()
        .in("id", existingRows.slice(1).map((r) => r.id));
    }
  } else {
    ({ error } = await supabase
      .from("nutrition_profiles")
      .insert({ client_id: clientId, ...fields }));
  }

  if (error) {
    console.error("saveOwnNutritionProfile error:", error);
    return { error: "Erreur lors de la sauvegarde." };
  }

  revalidatePath(`/dashboard/client/nutrition`);
  return {};
}

// Réservé aux clients coachés — un membre gratuit sans coach dédié ne
// notifierait que le fondateur par défaut, pour potentiellement des
// milliers de comptes.
async function notifyCoachIfDayWellLogged(clientId: string, logDate: string): Promise<void> {
  const profile = await getProfile(clientId);
  if (!isSubscribed(profile)) return;

  const coach = await getCoachForClient(clientId);
  if (!coach) return;

  if (await alreadyNotifiedToday(coach.id, "nutrition_day_logged", clientId)) return;

  const admin = createAdminClient();
  const [{ data: logs }, { data: nutritionProfile }] = await Promise.all([
    admin.from("food_logs").select("calories").eq("client_id", clientId).eq("logged_at", logDate),
    admin.from("nutrition_profiles").select("calories_target").eq("client_id", clientId).maybeSingle(),
  ]);

  const target = (nutritionProfile as { calories_target: number | null } | null)?.calories_target;
  if (!target || target <= 0) return;

  const totalCalories = (logs ?? []).reduce((sum, l) => sum + ((l as { calories: number }).calories ?? 0), 0);
  // Repas suffisamment remplis pour que ce soit une vraie journée loguée,
  // pas juste une collation isolée — pas besoin d'atteindre pile l'objectif.
  if (totalCalories < target * 0.7) return;

  const clientName = profile?.full_name ?? "Un client";
  await notifyUser(coach.id, {
    type: "nutrition_day_logged",
    title: "🥗 Journée nutrition bien loguée",
    body: `${clientName} a logué ${Math.round(totalCalories)} kcal aujourd'hui, proche de son objectif.`,
    url: `/dashboard/coach/clients/${clientId}/nutrition`,
    senderId: clientId,
  });
}

export async function addFoodLog(params: {
  foodId: string | null;
  mealSlot: string;
  quantityG: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  loggedAt: string;
  // Retour direct 2026-09-10 ("nutrition, corrige pour que ce soit vraiment
  // utilisable") : doublons confirmés en base espacés de PLUSIEURS HEURES
  // (15h49, 16h05, 19h54, 21h32, même trio d'aliments à chaque fois) — pas
  // un double-tap rapide (déjà couvert par pendingToggleKeysRef côté
  // client), donc un vrai trou serveur. logMealItems ("Valider le repas")
  // a déjà ce garde-fou depuis le 17/08 (Axe W) ; handleTogglePlanItem
  // (cocher un item un par un) ne l'avait jamais, alors qu'il partage
  // exactement le même risque : si l'état "coché" affiché au client rate
  // ne serait-ce qu'une fois (cache pas encore invalidé, tuile revenue au
  // premier plan avant un resync complet...), retaper crée un doublon pur
  // et simple, sans aucun filet. `dedupeIfPlanItem: true` n'est posé QUE
  // par le cocher-un-item-du-plan — jamais par la recherche libre ou
  // l'ajout d'une recette, où reloguer deux fois le même aliment/quantité
  // le même jour est un vrai usage légitime (deux collations identiques).
  dedupeIfPlanItem?: boolean;
}): Promise<{ id?: string; error?: string }> {
  try {
    // Bug remonté en direct (2026-08-15) : cocher un aliment du plan (ou en
    // logger un via la recherche) ne faisait RIEN pour un coach agissant sur
    // sa propre nutrition ("Moi > Nutrition", ClientNutritionView réutilisé
    // tel quel par CoachMoiNutritionTabs) dès lors que ce coach n'a pas lui
    // même de coach_id renseigné (le cas du fondateur, mais aussi de tout
    // coach non suivi par un autre coach) — requireClient() rejette
    // spécifiquement ce cas (role="coach" ET coach_id vide). Résultat concret :
    // l'insert échouait silencieusement, l'optimistic update revenait en
    // arrière, et le verrou quotidien (lib/daily-gate.ts) restait bloqué sur
    // "meal" indéfiniment puisque food_logs ne recevait jamais la ligne
    // attendue. Cette action n'accepte aucun clientId externe — elle écrit
    // toujours sur guard.userId — donc l'ouvrir à tout compte authentifié ne
    // relâche aucune frontière de sécurité, contrairement à un guard qui
    // accepterait un id de client tiers.
    const guard = await requireAuth();
    if (!guard.ok) return { error: guard.error };

    const supabase = await createServerSupabase();

    // Même garde-fou que logMealItems (Axe W) : si un item identique de CE
    // créneau/jour existe déjà, on renvoie son id tel quel au lieu d'en
    // recréer un — cocher un item du plan est une intention idempotente
    // ("cet aliment est mangé"), jamais "ajoute-le encore une fois".
    if (params.dedupeIfPlanItem) {
      const { data: existing } = await supabase
        .from("food_logs")
        .select("id")
        .eq("client_id", guard.userId)
        .eq("food_id", params.foodId)
        .eq("meal_slot", params.mealSlot)
        .eq("quantity_g", params.quantityG)
        .eq("logged_at", params.loggedAt)
        .limit(1)
        .maybeSingle();
      if (existing?.id) return { id: existing.id };
    }

    const { data, error } = await supabase
      .from("food_logs")
      .insert({
        client_id: guard.userId,
        food_id: params.foodId,
        meal_slot: params.mealSlot,
        quantity_g: params.quantityG,
        logged_at: params.loggedAt,
        calories: params.calories,
        proteins: params.proteins,
        carbs: params.carbs,
        fats: params.fats,
      })
      .select("id")
      .single();

    if (error) {
      console.error("food_log insert error:", error);
      return { error: error.message ?? "Erreur lors de l'ajout." };
    }
    if (!data) return { error: "Erreur lors de l'ajout (pas de data)." };

    awardPoints(guard.userId, POINTS.nutrition_log_day, "Nutrition loguée", "nutrition_log_day", params.loggedAt);

    // Notifie le coach une fois que la journée est bien remplie plutôt qu'à
    // chaque aliment ajouté (sinon un client qui logue 6 fois par jour
    // enverrait 6 notifications) — fire-and-forget, ne doit jamais faire
    // échouer l'ajout.
    notifyCoachIfDayWellLogged(guard.userId, params.loggedAt).catch(() => {});

    // Bug remonté : cocher un aliment fonctionnait (l'insert réussissait)
    // mais revenait "décoché" après avoir navigué ailleurs puis être
    // revenu. Cause : contrairement à presque toutes les autres mutations
    // de ce fichier, addFoodLog/removeFoodLog ne revalidaient jamais la
    // page — la mise à jour optimiste côté client masquait le problème sur
    // la vue courante, mais le cache client de Next (réutilisé lors d'une
    // navigation arrière/avant, voir doc client cache) resservait le
    // rendu serveur d'avant l'ajout. Cette action est partagée par deux
    // routes (client ET "Moi" coach, même composant ClientNutritionView),
    // donc les deux doivent être invalidées.
    revalidatePath("/dashboard/client/nutrition");
    revalidatePath("/dashboard/coach/moi/nutrition");

    return { id: data.id };
  } catch (e) {
    // MASTERCLASS.md Axe D : ce catch avalait toute exception inattendue
    // sans laisser de trace — un "ça ne marche pas" remonté par un client
    // n'aurait laissé aucune piste dans les logs serveur pour diagnostiquer.
    console.error("addFoodLog error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function removeFoodLog(
  logId: string
): Promise<{ error?: string }> {
  try {
    // Même correctif que addFoodLog ci-dessus, même raisonnement (pas de
    // clientId externe, la suppression est déjà bornée à guard.userId via le
    // .eq("client_id", ...) plus bas).
    const guard = await requireAuth();
    if (!guard.ok) return { error: guard.error };

    const supabase = await createServerSupabase();
    await supabase
      .from("food_logs")
      .delete()
      .eq("id", logId)
      .eq("client_id", guard.userId);

    // Même correctif que addFoodLog ci-dessus.
    revalidatePath("/dashboard/client/nutrition");
    revalidatePath("/dashboard/coach/moi/nutrition");

    return {};
  } catch (e) {
    console.error("removeFoodLog error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function createCustomFood(params: {
  name: string;
  category: string;
  calories_per_100: number;
  proteins_per_100: number;
  carbs_per_100: number;
  fats_per_100: number;
  fibers_per_100: number;
}): Promise<{ food?: Food; error?: string }> {
  try {
    // Même correctif que addFoodLog : cette action ne fait qu'enregistrer
    // created_by = guard.userId, aucun clientId externe à protéger.
    const guard = await requireAuth();
    if (!guard.ok) return { error: guard.error };

    // Revalidation serveur du nom : la validation côté client ne protège que
    // le parcours normal dans l'interface.
    const name = (params.name ?? "").trim();
    if (!name) return { error: "Le nom de l'aliment est obligatoire." };
    if (name.length > 200) {
      return { error: "Le nom de l'aliment est trop long (200 caractères maximum)." };
    }

    // Admin client — bypasses RLS regardless of how the foods table was set
    // up, since this is shared reference content.
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("foods")
      .insert({
        ...params,
        name,
        is_custom: true,
        created_by: guard.userId,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("createCustomFood error:", error);
      // 23514 = violation d'une contrainte CHECK : les valeurs saisies sortent
      // des bornes de la table foods. Message explicite plutôt qu'une erreur
      // générique qui laisse la personne sans piste.
      if (error?.code === "23514") {
        return {
          error:
            "Valeurs hors bornes : pour 100 g, les calories doivent rester sous 1000 kcal et chaque macro sous 100 g.",
        };
      }
      return { error: "Erreur lors de la création." };
    }
    updateTag("foods");
    return { food: data as Food };
  } catch (e) {
    console.error("createCustomFood error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Note de préparation partagée sur un aliment (cuisson, association, astuce
// de conservation) — référence commune entre coachs, comme setup_notes sur
// exercise_library. N'importe quel coach peut l'enrichir, pas seulement
// celui qui a créé l'aliment (même logique que la bibliothèque d'exercices).
export async function updateFoodPrepNotes(
  foodId: string,
  prepNotes: string
): Promise<{ error?: string }> {
  const guard = await requireCoach();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("foods")
      .update({ prep_notes: prepNotes.trim() || null })
      .eq("id", foodId);
    if (error) return { error: "Erreur lors de l'enregistrement." };
    updateTag("foods");
    return {};
  } catch (e) {
    console.error("updateFoodPrepNotes error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Self-serve diet plans — free-tier community members build and manage
// their own plans, no coach involved. Paying clients' plans stay coach-only.
async function guardFreeMember(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { ok: false, error: guard.error };
  const profile = await getProfile(guard.userId);
  if (isSubscribed(profile)) {
    return { ok: false, error: "Ton plan est géré par ton coach." };
  }
  return { ok: true, userId: guard.userId };
}

export async function createOwnDietPlan(
  name: string,
  mode: DietMode,
  meals: DietPlanMealInput[],
  structure: DietStructure = "daily"
): Promise<{ error?: string; id?: string }> {
  const guard = await guardFreeMember();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();

    await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("client_id", guard.userId)
      .eq("is_active", true);

    const { data: plan, error: planError } = await supabase
      .from("diet_plans")
      .insert({
        client_id: guard.userId,
        name,
        mode,
        structure,
        is_active: true,
        created_by: guard.userId,
      })
      .select("id")
      .single();

    if (planError || !plan) return { error: "Erreur lors de la création du plan." };

    if (meals.length > 0) {
      const { error: mealsError } = await supabase
        .from("diet_plan_meals")
        .insert(meals.map((m) => ({ ...m, plan_id: plan.id })));
      if (mealsError) return { error: "Erreur lors de l'ajout des repas." };
    }

    revalidatePath("/dashboard/client/nutrition");
    return { id: plan.id };
  } catch (e) {
    console.error("createOwnDietPlan error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function activateOwnDietPlan(planId: string): Promise<{ error?: string }> {
  const guard = await guardFreeMember();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("client_id", guard.userId)
      .eq("is_active", true);
    await supabase
      .from("diet_plans")
      .update({ is_active: true })
      .eq("id", planId)
      .eq("client_id", guard.userId);

    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch (e) {
    console.error("activateOwnDietPlan error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deactivateOwnDietPlan(planId: string): Promise<{ error?: string }> {
  const guard = await guardFreeMember();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("id", planId)
      .eq("client_id", guard.userId);

    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch (e) {
    console.error("deactivateOwnDietPlan error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function setOwnSeasonMode(mode: "off_season" | "prep"): Promise<{ error?: string }> {
  const guard = await guardFreeMember();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("profiles")
      .update({ season_mode: mode })
      .eq("id", guard.userId);
    if (error) return { error: "Erreur lors de la sauvegarde." };

    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch (e) {
    console.error("setOwnSeasonMode error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteOwnDietPlan(planId: string): Promise<{ error?: string }> {
  const guard = await guardFreeMember();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("diet_plans")
      .delete()
      .eq("id", planId)
      .eq("client_id", guard.userId);
    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch (e) {
    console.error("deleteOwnDietPlan error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Changer uniquement le mode (flexible/fixe/fixe-flexible) d'un plan libre
// existant, sans le reconstruire — équivalent de updateDietPlanMode (coach)
// mais pour un membre gratuit qui gère son propre plan. Demande explicite
// 2026-08-17 : "je veux pouvoir modifier mon fixe ou variable" — cette
// capacité existait déjà côté coach (badge sur l'onglet "Gérer") mais
// nulle part pour un membre en libre-service, ni exposée directement dans
// le suivi du jour de ClientNutritionView (voir aussi le nouveau prop
// updatePlanMode côté coach/moi, qui réutilise updateDietPlanMode existant
// via bind).
export async function updateOwnDietPlanMode(planId: string, mode: DietMode): Promise<{ error?: string }> {
  const guard = await guardFreeMember();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("diet_plans")
      .update({ mode })
      .eq("id", planId)
      .eq("client_id", guard.userId);
    if (error) return { error: "Erreur lors du changement de mode." };

    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch (e) {
    console.error("updateOwnDietPlanMode error:", e);
    return { error: "Erreur inattendue." };
  }
}

// ── Repas enregistrés — logger un repas complet en un tap au lieu de
// rechercher/ajouter chaque aliment un par un ────────────────────────────
// requireAuth(), pas requireClient() : même correctif que addFoodLog/
// logMealItems plus haut (écrit uniquement sur guard.userId, jamais un
// clientId externe). Un coach loggue aussi SES PROPRES repas depuis "Ma
// nutrition" (app/dashboard/coach/moi/nutrition) — avec requireClient(),
// ces deux actions y étaient invisibles/impossibles, ce qui les laissait
// jamais câblées sur cette page (retour direct 2026-09-09 : "dans repas et
// recette y'a rien alors que ça devrait avoir chaque repas de ma diète").

export async function createSavedMeal(
  name: string,
  items: { foodId: string; quantityG: number }[]
): Promise<{ error?: string; id?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!name.trim() || items.length === 0) return { error: "Nom et au moins un aliment requis." };

  try {
    const supabase = await createServerSupabase();
    const { data: meal, error } = await supabase
      .from("saved_meals")
      .insert({ owner_id: guard.userId, name: name.trim() })
      .select("id")
      .single();
    if (error || !meal) return { error: "Erreur lors de la sauvegarde du repas." };

    const { error: itemsError } = await supabase.from("saved_meal_items").insert(
      items.map((it) => ({ saved_meal_id: meal.id, food_id: it.foodId, quantity_g: it.quantityG }))
    );
    if (itemsError) return { error: "Erreur lors de la sauvegarde des aliments du repas." };

    revalidatePath("/dashboard/client/nutrition");
    revalidatePath("/dashboard/coach/moi/nutrition");
    return { id: meal.id };
  } catch (e) {
    console.error("createSavedMeal error:", e);
    return { error: "Erreur inattendue." };
  }
}

const MEAL_SLOT_LABELS: Record<string, string> = {
  breakfast: "Petit-déjeuner",
  morning: "Collation matin",
  lunch: "Déjeuner",
  afternoon: "Collation après-midi",
  preworkout: "Pré-entraînement",
  postworkout: "Post-entraînement",
  dinner: "Dîner",
};

const WEEKDAY_LABELS: Record<string, string> = {
  lun: "lundi", mar: "mardi", mer: "mercredi", jeu: "jeudi",
  ven: "vendredi", sam: "samedi", dim: "dimanche", high: "jour high",
};

// Retour direct 2026-09-09 : "dans repas et recette y'a rien alors que
// dans repas y'a censé avoir chaque repas de ma diète avec juste le nom du
// repas, sans avoir besoin de tout relogger à chaque fois". Plutôt que de
// forcer à enregistrer chaque repas à la main un par un (le seul chemin
// existant, via "Enregistrer ce repas" une fois le repas déjà loggué),
// importe d'un coup tous les repas d'un plan fixe/fixe-flexible comme
// autant de "repas enregistrés" réutilisables en un tap. Un groupe
// (jour de semaine, créneau, variante) = un repas complet — la variante
// (variant_group, "pain OU flocons d'avoine" pour le même créneau) donne
// naturellement 2 repas enregistrés distincts plutôt que d'exiger une UI
// de sélection dédiée dans la grille du plan.
export async function importPlanMealsAsSavedMeals(planId: string): Promise<{ error?: string; imported?: number }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();

    // Le plan doit appartenir à l'appelant — jamais importer les repas d'un
    // plan tiers via un id deviné/copié.
    const { data: plan } = await supabase
      .from("diet_plans")
      .select("id, client_id")
      .eq("id", planId)
      .maybeSingle();
    if (!plan || plan.client_id !== guard.userId) return { error: "Plan introuvable." };

    const { data: meals } = await supabase
      .from("diet_plan_meals")
      .select("meal_slot, food_id, quantity_g, day_of_week, variant_group")
      .eq("plan_id", planId);
    if (!meals || meals.length === 0) return { error: "Ce plan n'a aucun repas à importer." };

    type MealRow = { meal_slot: string; food_id: string; quantity_g: number; day_of_week: string | null; variant_group: number | null };
    const groups = new Map<string, MealRow[]>();
    for (const m of meals as MealRow[]) {
      const key = `${m.day_of_week ?? "_"}|${m.meal_slot}|${m.variant_group ?? 1}`;
      const group = groups.get(key);
      if (group) group.push(m);
      else groups.set(key, [m]);
    }

    // Jamais re-créer un repas déjà importé (même nom) si le plan a déjà
    // été importé une première fois puis juste complété/modifié depuis.
    const { data: existing } = await supabase.from("saved_meals").select("name").eq("owner_id", guard.userId);
    const existingNames = new Set((existing ?? []).map((e) => e.name as string));

    let imported = 0;
    for (const [key, items] of groups) {
      const [dayKey, slotKey, variantKey] = key.split("|");
      const dayLabel = dayKey !== "_" ? WEEKDAY_LABELS[dayKey] ?? dayKey : null;
      const slotLabel = MEAL_SLOT_LABELS[slotKey] ?? slotKey;
      const variantSuffix = Number(variantKey) > 1 ? ` (option ${variantKey})` : "";
      const name = ([slotLabel, dayLabel].filter(Boolean).join(" · ") + variantSuffix).slice(0, 200);
      if (existingNames.has(name)) continue;

      const { data: savedMeal, error } = await supabase
        .from("saved_meals")
        .insert({ owner_id: guard.userId, name })
        .select("id")
        .single();
      if (error || !savedMeal) continue;

      await supabase.from("saved_meal_items").insert(
        items.map((it) => ({ saved_meal_id: savedMeal.id, food_id: it.food_id, quantity_g: it.quantity_g }))
      );
      imported++;
    }

    revalidatePath("/dashboard/client/nutrition");
    revalidatePath("/dashboard/coach/moi/nutrition");
    return { imported };
  } catch (e) {
    console.error("importPlanMealsAsSavedMeals error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteSavedMeal(mealId: string): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    await supabase.from("saved_meals").delete().eq("id", mealId).eq("owner_id", guard.userId);
    revalidatePath("/dashboard/client/nutrition");
    revalidatePath("/dashboard/coach/moi/nutrition");
    return {};
  } catch (e) {
    console.error("deleteSavedMeal error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Logue en une fois tous les aliments d'un repas enregistré (ou du plan
// actif) dans un créneau donné — le calcul des macros est refait ici à
// partir des données aliment officielles plutôt que de faire confiance à
// des valeurs recalculées côté client pour un lot entier.
export async function logMealItems(
  items: { foodId: string; quantityG: number }[],
  mealSlot: string,
  loggedAt: string
): Promise<{ error?: string; count?: number; insertedLogs?: { id: string; foodId: string; quantityG: number }[] }> {
  // Même correctif que addFoodLog : pas de clientId externe, écrit
  // uniquement sur guard.userId.
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (items.length === 0) return { error: "Repas vide." };

  try {
    const admin = createAdminClient();
    const { data: foodsData } = await admin
      .from("foods")
      .select("id, calories_per_100, proteins_per_100, carbs_per_100, fats_per_100")
      .in("id", items.map((it) => it.foodId));
    const byId = new Map(
      ((foodsData ?? []) as { id: string; calories_per_100: number; proteins_per_100: number; carbs_per_100: number; fats_per_100: number }[]).map(
        (f) => [f.id, f]
      )
    );

    // MASTERCLASS.md Axe W : garde-fou en profondeur contre les doublons
    // (voir le correctif revalidatePath plus bas pour la vraie cause déjà
    // corrigée) — "Valider le repas" représente une intention idempotente
    // ("logue les items de CE créneau que je n'ai pas encore loggués"), donc
    // on ignore silencieusement tout item déjà présent identique (même
    // aliment/créneau/quantité/jour) plutôt que d'insérer un doublon, même
    // si un futur bug de cache fait réafficher un item déjà loggué comme
    // non coché.
    const { data: existing } = await admin
      .from("food_logs")
      .select("id, food_id, quantity_g")
      .eq("client_id", guard.userId)
      .eq("meal_slot", mealSlot)
      .eq("logged_at", loggedAt);
    const existingRows = (existing ?? []) as { id: string; food_id: string | null; quantity_g: number }[];
    const existingByKey = new Map(existingRows.map((l) => [`${l.food_id}:${l.quantity_g}`, l.id]));

    const newItems = items.filter((it) => !existingByKey.has(`${it.foodId}:${it.quantityG}`));

    // Retour direct 2026-09-10 : l'appelant (handleValidateSlot) a besoin
    // du VRAI id de chaque item, y compris ceux déjà présents avant cet
    // appel — sans ça, ses entrées optimistes (id "optimistic-...") ne
    // sont jamais réconciliées et restent affichées indéfiniment comme
    // "en vol", contrairement à handleTogglePlanItem qui le fait déjà pour
    // un item logué seul.
    const alreadyLogged: { id: string; foodId: string; quantityG: number }[] = items
      .filter((it) => existingByKey.has(`${it.foodId}:${it.quantityG}`))
      .map((it) => ({ id: existingByKey.get(`${it.foodId}:${it.quantityG}`)!, foodId: it.foodId, quantityG: it.quantityG }));

    // Tout était déjà loggué (doublon évité) : ce n'est pas une erreur, le
    // repas est déjà à l'état voulu, silencieusement.
    if (newItems.length === 0) return { count: 0, insertedLogs: alreadyLogged };

    const rows = newItems
      .map((it) => {
        const food = byId.get(it.foodId);
        if (!food) return null;
        const ratio = it.quantityG / 100;
        return {
          client_id: guard.userId,
          food_id: it.foodId,
          meal_slot: mealSlot,
          quantity_g: it.quantityG,
          logged_at: loggedAt,
          calories: Math.round(food.calories_per_100 * ratio),
          proteins: Math.round(food.proteins_per_100 * ratio * 10) / 10,
          carbs: Math.round(food.carbs_per_100 * ratio * 10) / 10,
          fats: Math.round(food.fats_per_100 * ratio * 10) / 10,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // Ici, en revanche, il restait de vrais nouveaux items mais aucun n'a pu
    // être résolu en aliment connu — ça, c'est une vraie erreur de données.
    if (rows.length === 0) return { error: "Aucun aliment valide dans ce repas." };

    const { data: inserted, error } = await admin.from("food_logs").insert(rows).select("id, food_id, quantity_g");
    if (error) return { error: "Erreur lors de l'ajout." };
    const insertedLogs: { id: string; foodId: string; quantityG: number }[] = [
      ...alreadyLogged,
      ...((inserted ?? []) as { id: string; food_id: string; quantity_g: number }[]).map((r) => ({
        id: r.id,
        foodId: r.food_id,
        quantityG: r.quantity_g,
      })),
    ];

    awardPoints(guard.userId, POINTS.nutrition_log_day, "Nutrition loguée", "nutrition_log_day", loggedAt);
    // MASTERCLASS.md Axe W : contrairement à addFoodLog/removeFoodLog (voir
    // plus haut, corrigé le 2026-08-15), cette fonction ne revalidait que la
    // route client, jamais /dashboard/coach/moi/nutrition qui réutilise le
    // même composant pour le suivi personnel d'un coach. Conséquence vérifiée
    // en base : un coach qui validait un repas via "Valider le repas" sur SA
    // PROPRE page voyait la case revenir décochée dès qu'il revenait sur la
    // page (cache jamais invalidé côté serveur pour cette route), revalidait
    // en revalidant le même repas, créant de vrais doublons dans food_logs
    // (39 groupes de doublons retrouvés et nettoyés le 2026-08-17, tous sur
    // les 14-15/08, tous sur le même compte).
    revalidatePath("/dashboard/client/nutrition");
    revalidatePath("/dashboard/coach/moi/nutrition");
    return { count: rows.length, insertedLogs };
  } catch (e) {
    console.error("logMealItems error:", e);
    return { error: "Erreur inattendue." };
  }
}

// ── Compléments alimentaires ─────────────────────────────────────────────

export async function addOwnSupplement(input: {
  name: string;
  dosage?: string;
  timing?: string;
  notes?: string;
}): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };
  if (!input.name.trim()) return { error: "Le nom est requis." };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("client_supplements").insert({
      client_id: guard.userId,
      name: input.name.trim(),
      dosage: input.dosage?.trim() || null,
      timing: input.timing?.trim() || null,
      notes: input.notes?.trim() || null,
    });
    if (error) return { error: "Erreur lors de l'ajout." };
    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch (e) {
    console.error("addOwnSupplement error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function setOwnSupplementStatus(
  supplementId: string,
  status: "active" | "stopped"
): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("client_supplements")
      .update({ status })
      .eq("id", supplementId)
      .eq("client_id", guard.userId);
    if (error) return { error: "Erreur lors de la mise à jour." };
    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch (e) {
    console.error("setOwnSupplementStatus error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteOwnSupplement(supplementId: string): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("client_supplements")
      .delete()
      .eq("id", supplementId)
      .eq("client_id", guard.userId);
    if (error) return { error: "Erreur lors de la suppression." };
    revalidatePath("/dashboard/client/nutrition");
    return {};
  } catch (e) {
    console.error("deleteOwnSupplement error:", e);
    return { error: "Erreur inattendue." };
  }
}
