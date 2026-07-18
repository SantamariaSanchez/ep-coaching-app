import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { MICRO_KEYS, type MicroKey } from "@/lib/micro-references";
export { calculateNutrients, getMicroDeficiencyOrder } from "@/utils/nutrition-utils";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface NutritionProfile {
  id: string;
  client_id: string;
  calories_target: number | null;
  proteins_target: number | null;
  carbs_target: number | null;
  fats_target: number | null;
  // Carb cycling — écart de calories (absorbé en glucides, protéines/lipides
  // stables) les jours de repos / les jours "high". null = pas de variation,
  // même objectif tous les jours.
  calories_offset_rest: number | null;
  calories_offset_high: number | null;
  tdee: number | null;
  bmr: number | null;
  phase: "deficit" | "maintenance" | "surplus" | null;
  gender: "Homme" | "Femme" | null;
  height: number | null;
  age: number | null;
  training_type: string | null;
  sessions_per_week: number | null;
  session_duration: number | null;
  steps_per_day: number | null;
  activity_level: number | null;
  updated_at: string;
}

export interface NutritionProfileInput {
  calories_target: number;
  proteins_target: number;
  carbs_target: number;
  fats_target: number;
  calories_offset_rest?: number | null;
  calories_offset_high?: number | null;
  tdee: number;
  bmr: number;
  phase: string;
  gender: string;
  height: number;
  age: number;
  training_type: string;
  sessions_per_week: number;
  session_duration: number;
  steps_per_day: number;
  activity_level: number;
}

export type MicroValues = Record<MicroKey, number>;

export interface Food {
  id: string;
  name: string;
  category: string | null;
  calories_per_100: number;
  proteins_per_100: number;
  carbs_per_100: number;
  fats_per_100: number;
  fibers_per_100?: number;
  is_custom?: boolean;
  created_by?: string | null;
  // micros (per 100g, default 0)
  vitamin_d?: number;
  vitamin_c?: number;
  vitamin_a?: number;
  vitamin_e?: number;
  vitamin_k?: number;
  vitamin_b1?: number;
  vitamin_b2?: number;
  vitamin_b3?: number;
  vitamin_b6?: number;
  vitamin_b9?: number;
  vitamin_b12?: number;
  calcium?: number;
  iron?: number;
  magnesium?: number;
  zinc?: number;
  potassium?: number;
  sodium?: number;
  phosphorus?: number;
  selenium?: number;
  iodine?: number;
  omega3?: number;
  omega6?: number;
  copper?: number;
  manganese?: number;
}

export interface FoodLog {
  id: string;
  client_id: string;
  food_id: string | null;
  meal_slot: string | null;
  quantity_g: number;
  logged_at: string;
  calories: number | null;
  proteins: number | null;
  carbs: number | null;
  fats: number | null;
  // micros (nullable, populated when food has micro data)
  vitamin_d?: number | null;
  vitamin_c?: number | null;
  vitamin_a?: number | null;
  vitamin_e?: number | null;
  vitamin_k?: number | null;
  vitamin_b1?: number | null;
  vitamin_b2?: number | null;
  vitamin_b3?: number | null;
  vitamin_b6?: number | null;
  vitamin_b9?: number | null;
  vitamin_b12?: number | null;
  calcium?: number | null;
  iron?: number | null;
  magnesium?: number | null;
  zinc?: number | null;
  potassium?: number | null;
  sodium?: number | null;
  phosphorus?: number | null;
  selenium?: number | null;
  iodine?: number | null;
  omega3?: number | null;
  omega6?: number | null;
  copper?: number | null;
  manganese?: number | null;
}

export interface FoodLogWithFood extends FoodLog {
  foods: Food | null;
}

// ── Diet Plan ─────────────────────────────────────────────────────────────────

export type DietMode = "flexible" | "fixed" | "fixed_flexible";
export type DietStructure = "daily" | "weekly";
export type DayOfWeek = "lun" | "mar" | "mer" | "jeu" | "ven" | "sam" | "dim" | "high";

export interface DietPlan {
  id: string;
  client_id: string;
  name: string;
  mode: DietMode;
  structure: DietStructure;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface DietPlanMeal {
  id: string;
  plan_id: string;
  meal_slot: string;
  food_id: string;
  quantity_g: number;
  position: number;
  day_of_week: DayOfWeek | null;
  foods?: Food;
}

export interface DietPlanWithMeals extends DietPlan {
  diet_plan_meals: DietPlanMeal[];
}

// ── Nutrient Calculation ──────────────────────────────────────────────────────

export interface NutrientCalculation {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  micros: Partial<MicroValues>;
}

export interface MicroStat {
  key: MicroKey;
  name: string;
  consumed: number;
  target: number;
  unit: string;
  pct: number;
  hasData: boolean;
}

// ── DB queries ────────────────────────────────────────────────────────────────

export async function getNutritionProfile(
  clientId: string
): Promise<NutritionProfile | null> {
  try {
    const supabase = await createServerSupabase();
    // .order + .limit(1) instead of .maybeSingle(): if a stray duplicate row
    // ever exists for this client, always return the most recently saved one
    // instead of erroring out (maybeSingle throws on >1 rows).
    const { data } = await supabase
      .from("nutrition_profiles")
      .select("*")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(1);
    return (data?.[0] as NutritionProfile) ?? null;
  } catch {
    return null;
  }
}

export async function getTodayLogs(
  clientId: string,
  date?: string
): Promise<FoodLogWithFood[]> {
  try {
    const supabase = await createServerSupabase();
    const day = date ?? new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("food_logs")
      .select("*, foods(*)")
      .eq("client_id", clientId)
      .eq("logged_at", day)
      .order("id");
    return (data as FoodLogWithFood[]) ?? [];
  } catch {
    return [];
  }
}

export async function getLast30DaysLogs(
  clientId: string
): Promise<FoodLogWithFood[]> {
  try {
    const supabase = await createServerSupabase();
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    const { data } = await supabase
      .from("food_logs")
      .select("*, foods(*)")
      .eq("client_id", clientId)
      .gte("logged_at", thirtyDaysAgo.toISOString().split("T")[0])
      .order("logged_at", { ascending: false })
      .order("id");
    return (data as FoodLogWithFood[]) ?? [];
  } catch {
    return [];
  }
}

export async function getLast7DaysLogs(
  clientId: string
): Promise<FoodLogWithFood[]> {
  try {
    const supabase = await createServerSupabase();
    const today = new Date();
    const sixDaysAgo = new Date(today);
    sixDaysAgo.setDate(today.getDate() - 6);
    const { data } = await supabase
      .from("food_logs")
      .select("*, foods(*)")
      .eq("client_id", clientId)
      .gte("logged_at", sixDaysAgo.toISOString().split("T")[0])
      .order("logged_at", { ascending: false });
    return (data as FoodLogWithFood[]) ?? [];
  } catch {
    return [];
  }
}

export async function getAllFoods(): Promise<Food[]> {
  try {
    // Shared reference content (not user-scoped) — read via the admin
    // client so display never depends on RLS being configured a particular
    // way on this table.
    const supabase = createAdminClient();
    const { data } = await supabase.from("foods").select("*").order("name");
    return (data as Food[]) ?? [];
  } catch {
    return [];
  }
}

// ── Diet plan queries ─────────────────────────────────────────────────────────

export async function getActiveDietPlan(
  clientId: string
): Promise<DietPlanWithMeals | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("diet_plans")
      .select("*, diet_plan_meals(*, foods(*))")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .maybeSingle();
    return (data as DietPlanWithMeals) ?? null;
  } catch {
    return null;
  }
}

export async function getAllDietPlans(
  clientId: string
): Promise<DietPlan[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    return (data as DietPlan[]) ?? [];
  } catch {
    return [];
  }
}

export async function getAllDietPlansWithMeals(
  clientId: string
): Promise<DietPlanWithMeals[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("diet_plans")
      .select("*, diet_plan_meals(*, foods(*))")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    return (data as DietPlanWithMeals[]) ?? [];
  } catch {
    return [];
  }
}

// ── Adherence ─────────────────────────────────────────────────────────────────

export async function calculateWeeklyAdherence(
  clientId: string,
  caloriesTarget: number
): Promise<number> {
  try {
    const supabase = await createServerSupabase();
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const { data } = await supabase
      .from("food_logs")
      .select("logged_at, calories")
      .eq("client_id", clientId)
      .gte("logged_at", sevenDaysAgo.toISOString().split("T")[0])
      .order("logged_at");

    if (!data || data.length === 0) return 0;

    const byDay: Record<string, number> = {};
    for (const l of data) {
      byDay[l.logged_at] = (byDay[l.logged_at] ?? 0) + (l.calories ?? 0);
    }

    const days = Object.values(byDay);
    if (days.length === 0) return 0;

    const adherentDays = days.filter(
      (cal) => caloriesTarget > 0 && cal / caloriesTarget >= 0.85
    ).length;

    return Math.round((adherentDays / 7) * 100);
  } catch {
    return 0;
  }
}
