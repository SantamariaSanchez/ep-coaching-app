import { createServerSupabase } from "@/lib/supabase-server";
import { buildFirstMonth, FIRST_MONTH_FROM_DAY, FIRST_MONTH_TO_DAY, type FirstMonth } from "@/lib/first-month";

/**
 * Bilan « Ton premier mois » (lib/first-month.ts). Ne lit rien hors de la
 * fenêtre jour 21 à jour 45 ; null en cas de panne (la carte disparaît).
 */
export async function getFirstMonth(userId: string, startDate: string | null, today: string): Promise<FirstMonth | null> {
  if (!startDate) return null;
  const start = startDate.slice(0, 10);
  const day = Math.floor((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86_400_000) + 1;
  if (!(day >= FIRST_MONTH_FROM_DAY && day <= FIRST_MONTH_TO_DAY)) return null;
  try {
    const supabase = await createServerSupabase();
    const [{ data: sessions }, { data: logs }, { data: bilans }] = await Promise.all([
      supabase.from("sessions").select("session_date, is_completed").eq("client_id", userId).gte("session_date", start).lte("session_date", today).limit(200),
      supabase.from("workout_logs").select("exercise_name, weight_kg, logged_at").eq("client_id", userId).gte("logged_at", start).lte("logged_at", today).limit(2000),
      supabase.from("daily_logs").select("log_date").eq("client_id", userId).gte("log_date", start).lte("log_date", today).limit(100),
    ]);
    return buildFirstMonth({
      startDate: start,
      today,
      sessions: sessions ?? [],
      logs: logs ?? [],
      bilanDates: ((bilans ?? []) as { log_date: string }[]).map((b) => b.log_date),
    });
  } catch {
    return null;
  }
}
