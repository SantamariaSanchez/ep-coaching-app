import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Food, DietMode, DietStructure, DayOfWeek } from "@/utils/nutrition";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";

// ── Modèles de diète réutilisables ───────────────────────────────────────────
// Même forme que diet_plans/diet_plan_meals (utils/nutrition.ts), détachée de
// tout client — même logique que program-templates.ts côté entraînement.
// Un modèle de diète reste "figé" une fois créé, exactement comme un plan de
// diète client (pas d'édition ligne à ligne, on recrée une nouvelle version) :
// cohérent avec le fonctionnement existant de DietPlanManager/PlansListView.

export interface DietPlanTemplateMeal {
  id: string;
  template_id: string;
  meal_slot: string;
  food_id: string;
  quantity_g: number;
  position: number;
  day_of_week: DayOfWeek | null;
  notes?: string | null;
  foods?: Food;
  // Voir DietPlanMealInput (diet-plan-actions.ts) : NULL/1 = option
  // principale, >=2 = variante alternative du même créneau.
  variant_group?: number | null;
}

export interface DietPlanTemplate {
  id: string;
  coach_id: string;
  name: string;
  mode: DietMode;
  structure: DietStructure;
  objective: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DietPlanTemplateWithMeals extends DietPlanTemplate {
  diet_plan_template_meals: DietPlanTemplateMeal[];
}

export async function getCoachDietTemplates(coachId: string): Promise<DietPlanTemplateWithMeals[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("diet_plan_templates")
      .select("*, diet_plan_template_meals(*, foods(*))")
      .eq("coach_id", coachId)
      .order("updated_at", { ascending: false });
    return (data as DietPlanTemplateWithMeals[]) ?? [];
  } catch {
    return [];
  }
}

export async function getDietPlanTemplateById(
  templateId: string,
  coachId: string,
  supabaseOverride?: SupabaseClient
): Promise<DietPlanTemplateWithMeals | null> {
  try {
    const supabase = supabaseOverride ?? (await createServerSupabase());
    const { data } = await supabase
      .from("diet_plan_templates")
      .select("*, diet_plan_template_meals(*, foods(*))")
      .eq("id", templateId)
      .eq("coach_id", coachId)
      .maybeSingle();
    return (data as DietPlanTemplateWithMeals) ?? null;
  } catch {
    return null;
  }
}

export async function createDietPlanTemplate(
  supabase: SupabaseClient,
  coachId: string,
  name: string,
  mode: DietMode,
  meals: DietPlanMealInput[],
  structure: DietStructure = "daily",
  objective?: string | null,
  notes?: string | null
): Promise<{ id?: string; error?: string }> {
  try {
    const { data: template, error: templateError } = await supabase
      .from("diet_plan_templates")
      .insert({
        coach_id: coachId,
        name,
        mode,
        structure,
        objective: objective || null,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (templateError || !template) return { error: "Erreur lors de la création du modèle." };

    if (meals.length > 0) {
      const { error: mealsError } = await supabase
        .from("diet_plan_template_meals")
        .insert(meals.map((m) => ({ ...m, template_id: template.id })));
      if (mealsError) return { error: "Erreur lors de l'ajout des repas." };
    }

    return { id: template.id };
  } catch (err) {
    console.error("createDietPlanTemplate error:", err);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteDietPlanTemplate(
  supabase: SupabaseClient,
  templateId: string,
  coachId: string
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("diet_plan_templates")
    .delete()
    .eq("id", templateId)
    .eq("coach_id", coachId);
  if (error) return { error: "Erreur lors de la suppression du modèle." };
  return {};
}

// Convertit les repas d'un modèle en entrées prêtes pour createDietPlan —
// l'application d'un modèle à un client passe par le même chemin de code
// que la création manuelle d'un plan, aucune logique dupliquée.
export function dietTemplateToMealInputs(template: DietPlanTemplateWithMeals): DietPlanMealInput[] {
  return template.diet_plan_template_meals.map((m) => ({
    meal_slot: m.meal_slot,
    food_id: m.food_id,
    quantity_g: m.quantity_g,
    position: m.position,
    day_of_week: m.day_of_week,
    notes: m.notes,
    variant_group: m.variant_group ?? null,
  }));
}
