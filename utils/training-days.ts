import { createServerSupabase } from "@/lib/supabase-server";
import type { Db } from "@/lib/db-types";
import type { TrainingDay } from "@/lib/diet-day";

/**
 * Jours de séance du programme actif (jour de semaine + nom de la séance),
 * sans les exercices : la nutrition s'en sert seulement pour dire « jour
 * entraînement » ou « jour repos » quand la diète change selon le jour.
 */
export async function getTrainingDays(clientId: string, db?: Db): Promise<TrainingDay[]> {
  try {
    const supabase = db ?? (await createServerSupabase());
    const { data: program } = await supabase
      .from("programs")
      .select("id")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!program) return [];
    const { data: days } = await supabase.from("program_days").select("day_label, weekday").eq("program_id", (program as { id: string }).id);
    return ((days ?? []) as { day_label: string | null; weekday: number | null }[])
      .filter((d) => d.weekday != null && d.weekday >= 1 && d.weekday <= 7)
      .map((d) => ({ weekday: d.weekday as number, label: d.day_label ?? "Séance" }));
  } catch {
    return [];
  }
}
