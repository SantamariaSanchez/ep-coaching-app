"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { requireOwnClientOrSelf } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import type { DietMode, DietStructure, DayOfWeek } from "@/utils/nutrition";
import { notifyUser } from "@/lib/notify";

export interface MacroTargetsInput {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

// Réajuste automatiquement les grammages du plan actif d'un client quand
// ses objectifs caloriques/macros changent (appelé depuis saveNutritionProfile,
// uniquement si les cibles ont réellement bougé) — sans ça, un coach qui
// ajoute 20g de glucides à l'objectif devait ensuite rouvrir le plan et
// retoucher chaque aliment glucidique à la main.
//
// Heuristique : chaque aliment est rescalé selon SON propre profil macro,
// pas d'un facteur unique appliqué à tout le plan. Un aliment presque
// exclusivement protéiné (blanc de poulet) suit le ratio protéines
// demandé ; un féculent suit le ratio glucides ; un aliment mixte suit une
// moyenne pondérée par la part de calories que chaque macro représente
// pour LUI. C'est ce qui fait qu'ajouter des glucides à l'objectif fait
// grossir le riz du plan sans gonfler le poulet.
export async function rescaleActiveDietPlanToTargets(
  clientId: string,
  targets: MacroTargetsInput
): Promise<{ rescaled: boolean; planId?: string }> {
  // Exportée d'un fichier "use server" = appelable directement côté client
  // avec n'importe quel clientId — même garde que les autres actions de ce
  // fichier, pas seulement un appel interne de confiance depuis saveNutritionProfile.
  const guard = await requireOwnClientOrSelf(clientId);
  if (!guard.ok) return { rescaled: false };

  const supabase = createAdminClient();

  const { data: plan } = await supabase
    .from("diet_plans")
    .select("id")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .maybeSingle();

  if (!plan) return { rescaled: false };

  const { data: meals } = await supabase
    .from("diet_plan_meals")
    .select("id, quantity_g, variant_group, foods(calories_per_100, proteins_per_100, carbs_per_100, fats_per_100)")
    .eq("plan_id", plan.id);

  if (!meals || meals.length === 0) return { rescaled: false };

  type MealRow = {
    id: string;
    quantity_g: number;
    variant_group: number | null;
    foods: { calories_per_100: number | null; proteins_per_100: number | null; carbs_per_100: number | null; fats_per_100: number | null } | null;
  };
  // Option principale seulement (voir le commentaire sur variant_group dans
  // DietPlanMealInput plus bas, déjà écrit mais jamais appliqué ici) : sans
  // ce filtre, une variante alternative (2e choix d'un créneau) entrait dans
  // le calcul des totaux comme si elle était mangée EN PLUS de l'option
  // principale, faussant le ratio de rescale appliqué à TOUT le plan — et
  // contrairement à handleAutoAdjust (DietPlanManager.tsx, même bug corrigé
  // là-bas), ce rescale se déclenche automatiquement à chaque changement de
  // cible macro (voir saveNutritionProfile), pas seulement sur un clic.
  const rows = (meals as unknown as MealRow[]).filter((m) => !m.variant_group || m.variant_group === 1);

  let totalCal = 0, totalP = 0, totalC = 0, totalF = 0;
  for (const row of rows) {
    if (!row.foods) continue;
    const r = row.quantity_g / 100;
    totalCal += (row.foods.calories_per_100 ?? 0) * r;
    totalP += (row.foods.proteins_per_100 ?? 0) * r;
    totalC += (row.foods.carbs_per_100 ?? 0) * r;
    totalF += (row.foods.fats_per_100 ?? 0) * r;
  }

  // Rien à comparer (plan vide de macros, ex : que de l'eau/épices) — pas
  // de ratio calculable, on n'invente pas un facteur.
  if (totalCal <= 0) return { rescaled: false };

  const rCal = targets.calories / totalCal;
  const rP = totalP > 0 ? targets.proteins / totalP : rCal;
  const rC = totalC > 0 ? targets.carbs / totalC : rCal;
  const rF = totalF > 0 ? targets.fats / totalF : rCal;

  const updates: { id: string; quantity_g: number }[] = [];
  for (const row of rows) {
    if (!row.foods) continue;
    const pk = (row.foods.proteins_per_100 ?? 0) * 4;
    const ck = (row.foods.carbs_per_100 ?? 0) * 4;
    const fk = (row.foods.fats_per_100 ?? 0) * 9;
    const totalK = pk + ck + fk;
    // Aliment sans macro identifiable (arôme, assaisonnement à 0 kcal) :
    // on le laisse suivre l'évolution calorique globale plutôt que de le
    // figer arbitrairement.
    const scale = totalK > 0 ? (pk / totalK) * rP + (ck / totalK) * rC + (fk / totalK) * rF : rCal;
    // Bornes de sécurité : jamais 0g (un aliment qui "disparaît" tout seul
    // serait plus déroutant qu'utile) ni un grammage qui explose si une
    // cible est modifiée dans l'absurde.
    const nextQuantity = Math.min(2000, Math.max(1, Math.round(row.quantity_g * scale)));
    if (nextQuantity !== row.quantity_g) {
      updates.push({ id: row.id, quantity_g: nextQuantity });
    }
  }

  if (updates.length === 0) return { rescaled: false, planId: plan.id };

  // Résultats vérifiés (audit nutrition 2026-09-16) : jusqu'ici jamais lus,
  // un échec sur une ligne (rare, mais possible) passait inaperçu et
  // laissait ce seul aliment avec un grammage périmé après un changement
  // de cibles, sans aucune trace pour le diagnostiquer.
  const results = await Promise.all(
    updates.map((u) =>
      supabase.from("diet_plan_meals").update({ quantity_g: u.quantity_g }).eq("id", u.id)
    )
  );
  for (const r of results) {
    if (r.error) console.error("rescaleActiveDietPlanToTargets update error:", r.error);
  }

  revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
  revalidatePath(`/dashboard/client/nutrition`);
  revalidatePath(`/dashboard/coach/moi/nutrition`);

  return { rescaled: true, planId: plan.id };
}

export interface DietPlanMealInput {
  meal_slot: string;
  food_id: string;
  quantity_g: number;
  position: number;
  day_of_week?: DayOfWeek | null;
  // Pourquoi ce choix pour ce repas précis — décision du coach (migration
  // 20260807 diet_meal_reasoning_and_food_prep_notes), jamais déduite.
  notes?: string | null;
  // NULL/1 = repas principal. >=2 = variante alternative interchangeable
  // pour ce créneau (migration 20260903_diet_plan_meals_variant_group),
  // exclue des totaux macro pour ne jamais compter les 2 options ensemble.
  variant_group?: number | null;
}

// Colonne `objective` ajoutée par la migration 20260806, exécutée à la main
// dans le SQL Editor : tant qu'elle n'est pas passée, on recrée le plan sans
// elle plutôt que de casser la création de plan en production.
function isUnknownColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return /does not exist|could not find the .* column/i.test(error.message ?? "");
}

export async function createDietPlan(
  clientId: string,
  name: string,
  mode: DietMode,
  meals: DietPlanMealInput[],
  structure: DietStructure = "daily",
  objective?: string | null,
  // Décisions de conception propres à ce plan (migration 20260807e) :
  // pourquoi chaque jour est structuré ainsi, contraintes sociales connues.
  // Optionnels : les parcours self-serve (client) n'en fournissent pas.
  dayNotes?: Record<string, string> | null,
  socialNotes?: string | null
): Promise<{ error?: string; id?: string }> {
  try {
    const guard = await requireOwnClientOrSelf(clientId);
    if (!guard.ok) return { error: guard.error };

    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

    // Deactivate previous plans — best-effort, ne bloque jamais la création
    // du nouveau plan (le vrai but de cet appel), juste tracée si elle
    // échoue au lieu de disparaître en silence (audit nutrition 2026-09-16).
    const { error: deactivateError } = await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("client_id", clientId)
      .eq("is_active", true);
    if (deactivateError) console.error("createDietPlan (deactivate previous) error:", deactivateError);

    const baseRow = {
      client_id: clientId,
      name,
      mode,
      structure,
      is_active: true,
      created_by: guard.userId,
    };

    // Create new plan
    let { data: plan, error: planError } = await supabase
      .from("diet_plans")
      .insert({
        ...baseRow,
        objective: objective?.trim() || null,
        day_notes: dayNotes && Object.keys(dayNotes).length > 0 ? dayNotes : null,
        social_notes: socialNotes?.trim() || null,
      })
      .select("id")
      .single();

    if (planError && isUnknownColumnError(planError)) {
      ({ data: plan, error: planError } = await supabase
        .from("diet_plans")
        .insert(baseRow)
        .select("id")
        .single());
    }

    if (planError || !plan) return { error: "Erreur lors de la création du plan." };

    // Insert meals
    if (meals.length > 0) {
      const { error: mealsError } = await supabase
        .from("diet_plan_meals")
        .insert(meals.map((m) => ({ ...m, plan_id: plan.id })));

      if (mealsError) return { error: "Erreur lors de l'ajout des repas." };
    }

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);
    revalidatePath(`/dashboard/coach/moi/nutrition`);

    // Uniquement quand c'est le coach qui agit — un client en self-serve
    // (mode gratuit, requireOwnClientOrSelf l'autorise aussi) qui crée son
    // propre plan n'a pas besoin d'être notifié de sa propre action.
    if (guard.userId !== clientId) {
      notifyUser(clientId, {
        type: "diet_plan_created",
        title: "🥗 Nouveau plan nutritionnel",
        body: `Ton coach vient de te préparer un plan : « ${name} ».`,
        url: "/dashboard/client/nutrition",
        senderId: guard.userId,
      }).catch(() => {});
    }

    return { id: plan.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// Changer uniquement le mode (Flexible/Fixe/Fixe Flexible) d'un plan
// existant, sans toucher aux repas déjà saisis — jusqu'ici, le seul moyen
// de changer de mode était de reconstruire tout le plan depuis zéro dans
// "Nouveau plan" (le bâtisseur ne pré-remplit jamais un plan existant).
export async function updateDietPlanMode(
  clientId: string,
  planId: string,
  mode: DietMode
): Promise<{ error?: string }> {
  try {
    const guard = await requireOwnClientOrSelf(clientId);
    if (!guard.ok) return { error: guard.error };

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("diet_plans")
      .update({ mode })
      .eq("id", planId)
      .eq("client_id", clientId);
    if (error) return { error: "Erreur lors du changement de mode." };

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);
    revalidatePath(`/dashboard/coach/moi/nutrition`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deactivateDietPlan(
  clientId: string,
  planId: string
): Promise<{ error?: string }> {
  try {
    const guard = await requireOwnClientOrSelf(clientId);
    if (!guard.ok) return { error: guard.error };

    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
    // Résultat vérifié (audit nutrition 2026-09-16) : jamais lu jusqu'ici,
    // un échec serveur renvoyait quand même {} (succès affiché au coach,
    // plan resté actif en base).
    const { error } = await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("id", planId)
      .eq("client_id", clientId);
    if (error) {
      console.error("deactivateDietPlan error:", error);
      return { error: "Erreur lors de la désactivation." };
    }

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);
    revalidatePath(`/dashboard/coach/moi/nutrition`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function activateDietPlan(
  clientId: string,
  planId: string
): Promise<{ error?: string }> {
  try {
    const guard = await requireOwnClientOrSelf(clientId);
    if (!guard.ok) return { error: guard.error };

    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes

    // Les deux résultats sont désormais vérifiés (audit nutrition
    // 2026-09-16) : "Activer" pouvait échouer entièrement côté serveur (le
    // 2e update, celui qui compte vraiment) tout en renvoyant {} — succès
    // affiché au coach, plan resté inactif.
    // Only one active plan per client at a time
    const { error: deactivateError } = await supabase
      .from("diet_plans")
      .update({ is_active: false })
      .eq("client_id", clientId)
      .eq("is_active", true);
    if (deactivateError) {
      console.error("activateDietPlan (deactivate) error:", deactivateError);
      return { error: "Erreur lors de l'activation." };
    }

    const { error } = await supabase
      .from("diet_plans")
      .update({ is_active: true })
      .eq("id", planId)
      .eq("client_id", clientId);
    if (error) {
      console.error("activateDietPlan error:", error);
      return { error: "Erreur lors de l'activation." };
    }

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);
    revalidatePath(`/dashboard/coach/moi/nutrition`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteDietPlan(
  clientId: string,
  planId: string
): Promise<{ error?: string }> {
  try {
    const guard = await requireOwnClientOrSelf(clientId);
    if (!guard.ok) return { error: guard.error };

    const supabase = createAdminClient(); // admin bypasses RLS for cross-user writes
    const { error } = await supabase
      .from("diet_plans")
      .delete()
      .eq("id", planId)
      .eq("client_id", clientId);
    if (error) return { error: "Erreur lors de la suppression." };

    revalidatePath(`/dashboard/coach/clients/${clientId}/nutrition`);
    revalidatePath(`/dashboard/client/nutrition`);
    revalidatePath(`/dashboard/coach/moi/nutrition`);
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
