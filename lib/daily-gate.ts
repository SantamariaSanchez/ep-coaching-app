import { createServerSupabase } from "@/lib/supabase-server";
import { todayInParis } from "@/lib/dates";
import { MEAL_SLOT_TIMES, MEAL_SLOT_LABELS, timeToMinutes, parisNow } from "@/lib/meal-slots";

// Bilan en 2 temps + repas obligatoires (demande explicite, 2026-08-15) :
// tant que le bilan du matin (poids + sommeil) n'est pas fait, ou qu'un
// repas dû n'est pas loggué, ou que le bilan du soir n'est pas fait après
// l'heure de coucher, l'appli entière est bloquée derrière un overlay
// (voir components/ui/DailyGateOverlay.tsx). Priorité stricte matin ->
// repas -> soir : un seul écran affiché à la fois, jamais un empilement de
// contraintes qui noierait l'utilisateur.
//
// Règle de sécurité absolue : toute erreur ici (base injoignable, colonne
// manquante si la migration n'a pas encore tourné, etc.) doit renvoyer
// { active: null } — un incident technique ne doit JAMAIS transformer ce
// garde-fou en panne totale de l'appli pour tout le monde. Même principe
// déjà appliqué dans lib/rate-limit.ts.

export interface PendingMeal {
  slot: string;
  label: string;
}

export type GateReason = "morning" | "meal" | "evening";

export interface DailyGateStatus {
  active: GateReason | null;
  pendingMeal?: PendingMeal;
}

const OPEN: DailyGateStatus = { active: null };

async function getPendingMeal(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
  today: string
): Promise<PendingMeal | null> {
  const { data: plan } = await supabase
    .from("diet_plans")
    .select("structure, diet_plan_meals(meal_slot, day_of_week)")
    .eq("client_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (!plan) return null;

  const { minutes: nowMinutes, dow } = parisNow();
  const meals = (plan as unknown as { structure: string; diet_plan_meals: { meal_slot: string; day_of_week: string | null }[] });
  const todaysMeals =
    meals.structure === "weekly"
      ? meals.diet_plan_meals.filter((m) => m.day_of_week === dow)
      : meals.diet_plan_meals;
  const todaysSlots = [...new Set(todaysMeals.map((m) => m.meal_slot))];

  const dueSlots = todaysSlots
    .filter((slot) => nowMinutes >= timeToMinutes(MEAL_SLOT_TIMES[slot] ?? "12:00"))
    .sort((a, b) => timeToMinutes(MEAL_SLOT_TIMES[a] ?? "12:00") - timeToMinutes(MEAL_SLOT_TIMES[b] ?? "12:00"));
  if (dueSlots.length === 0) return null;

  const { data: logs } = await supabase
    .from("food_logs")
    .select("meal_slot")
    .eq("client_id", userId)
    .eq("logged_at", today);
  const logged = new Set((logs ?? []).map((l) => l.meal_slot as string));

  // Le premier créneau dû non loggué seulement — jamais tous d'un coup, pour
  // ne pas écraser l'utilisateur si plusieurs repas ont été loupés d'affilée.
  for (const slot of dueSlots) {
    if (!logged.has(slot)) return { slot, label: MEAL_SLOT_LABELS[slot] ?? slot };
  }
  return null;
}

export interface SleepSchedule {
  targetBedtime: string | null;
  targetWakeTime: string | null;
}

// Petit select dédié plutôt que passer par getProfile()/PROFILE_FIELDS
// (utils/auth.ts) — voir le commentaire là-bas : tant que la migration
// 20260815a_sleep_schedule.sql n'a pas tourné en base, cette requête
// échoue proprement et rend { null, null } au lieu de faire planter tout
// ce qui dépend de getProfile() ailleurs dans l'appli.
export async function getSleepSchedule(userId: string): Promise<SleepSchedule> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("target_bedtime, target_wake_time")
      .eq("id", userId)
      .maybeSingle();
    return {
      targetBedtime: (data?.target_bedtime as string | null) ?? null,
      targetWakeTime: (data?.target_wake_time as string | null) ?? null,
    };
  } catch {
    return { targetBedtime: null, targetWakeTime: null };
  }
}

export async function getDailyGateStatus(userId: string): Promise<DailyGateStatus> {
  try {
    const supabase = await createServerSupabase();
    const today = todayInParis();

    const [logRes, profileRes] = await Promise.all([
      supabase
        .from("daily_logs")
        .select("weight_morning, sleep_hours, sleep_rating, steps, digestion, stress, hunger")
        .eq("client_id", userId)
        .eq("log_date", today)
        .maybeSingle(),
      supabase.from("profiles").select("target_bedtime").eq("id", userId).maybeSingle(),
    ]);

    const log = logRes.data;

    // Matin : poids + sommeil, priorité absolue sur tout le reste — voir
    // components/ui/DailyBilanForm.tsx (carte SleepCard).
    const morningDone =
      !!log && log.weight_morning != null && log.sleep_hours != null && log.sleep_rating != null;
    if (!morningDone) return { active: "morning" };

    const pendingMeal = await getPendingMeal(supabase, userId, today);
    if (pendingMeal) return { active: "meal", pendingMeal };

    const targetBedtime = profileRes.data?.target_bedtime as string | null | undefined;
    if (targetBedtime) {
      const dueAt = timeToMinutes(targetBedtime.slice(0, 5)) - 15;
      const { minutes: nowMinutes } = parisNow();
      // Fenêtre soir : à partir de (coucher visé - 15 min) jusqu'à minuit.
      // Ne gère volontairement pas un coucher visé après minuit (cas rare,
      // non demandé) ni la période entre minuit et le réveil — le bilan du
      // matin du lendemain reprend la main dès l'ouverture suivante.
      const eveningDue = dueAt >= 0 && nowMinutes >= dueAt;
      if (eveningDue) {
        const eveningDone =
          !!log && log.steps != null && log.digestion != null && log.stress != null && log.hunger != null;
        if (!eveningDone) return { active: "evening" };
      }
    }

    return OPEN;
  } catch {
    return OPEN;
  }
}
