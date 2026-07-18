import { createServerSupabase } from "@/lib/supabase-server";
import type { Allergen } from "@/lib/recipes-data";

export interface ClientIntake {
  id: string;
  client_id: string;
  date_of_birth: string | null;
  gender: "Homme" | "Femme" | "Autre" | null;
  occupation: string | null;
  work_hours: string | null;
  schedule_type: "fixe" | "variable" | null;
  goal_3_months: string | null;
  goal_12_months: string | null;
  how_coach_can_help: string | null;
  avg_daily_steps: number | null;
  wearable_device: string | null;
  stress_level: number | null;
  sleep_quality: number | null;
  sleep_hours: number | null;
  health_issues: string | null;
  injuries: string | null;
  meals_current: number | null;
  meals_ideal: number | null;
  typical_day: string | null;
  known_calories: number | null;
  known_protein: number | null;
  known_carbs: number | null;
  known_fat: number | null;
  cheat_meals_per_week: number | null;
  cheat_meal_impact: string | null;
  supplement_budget: number | null;
  disliked_foods: string | null;
  liked_foods: string | null;
  dietary_restrictions: string | null;
  diet_type: "omnivore" | "vegetarien" | "vegan" | "pescetarien" | null;
  allergens: Allergen[];
  plan_preference: "fixe" | "flexible" | null;
  calorie_preference: "lineaire" | "variable" | null;
  sessions_current: number | null;
  sessions_desired: number | null;
  session_duration: string | null;
  availability: string | null;
  cardio_preference: string | null;
  current_routine: string | null;
  exercises_that_work: string | null;
  exercises_problematic: string | null;
  preferred_split: string | null;
  disliked_equipment: string | null;
  gym_name: string | null;
  gym_link: string | null;
  additional_notes: string | null;
  updated_at: string;
}

export type ClientIntakeInput = Omit<ClientIntake, "id" | "client_id" | "updated_at">;

export async function getClientIntake(clientId: string): Promise<ClientIntake | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("client_intake")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();
    return (data as ClientIntake) ?? null;
  } catch {
    return null;
  }
}
