import { createAdminClient } from "@/lib/supabase-admin";

export interface ScheduleBlock {
  id: string;
  owner_id: string;
  day_of_week: number; // 1 = lundi ... 7 = dimanche
  start_time: string; // "HH:MM:SS"
  end_time: string;
  label: string;
  color: string;
  icon: string | null;
  notes: string | null;
  // Ce qu'il y a à faire une fois dans le bloc : tâche vague, prompt Claude à
  // coller tel quel, objectif du jour ("faire 5 reels"), ou simple suggestion
  // ("écoute un podcast") — un tableau de texte libre plutôt qu'un type dédié
  // par catégorie, un seul champ couvre tous les cas.
  tasks: string[];
  // Notifie par push quand l'heure du jour atteint le début de ce bloc (voir
  // app/api/cron/schedule-block-notify). last_notified_at sert uniquement à
  // ne pas re-notifier plusieurs fois le même jour.
  notify: boolean;
  last_notified_at: string | null;
  created_at: string;
}

export const DAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// Client admin (bypass RLS) comme côté écriture (voir actions.ts) — le
// client lié aux cookies (RLS) renvoyait un tableau vide en lecture même
// pour le propriétaire du bloc, ce qui faisait disparaître les blocs
// fraîchement créés dès qu'on rafraîchissait la page.
export async function getScheduleBlocks(ownerId: string): Promise<ScheduleBlock[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("owner_id", ownerId)
      .order("day_of_week")
      .order("start_time");
    if (error) {
      console.error("getScheduleBlocks:", error.message);
      return [];
    }
    return (data as ScheduleBlock[]) ?? [];
  } catch (e) {
    console.error("getScheduleBlocks:", e);
    return [];
  }
}

/**
 * Clés des tâches de bloc cochées aujourd'hui ("{block_id}:{task_index}"),
 * voir supabase/migrations/20260815e_schedule_block_task_logs.sql.
 */
export async function getScheduleBlockTaskLog(ownerId: string, date: string): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("schedule_block_task_logs")
      .select("completed_keys")
      .eq("owner_id", ownerId)
      .eq("log_date", date)
      .maybeSingle();
    return (data as { completed_keys: string[] } | null)?.completed_keys ?? [];
  } catch {
    return [];
  }
}
