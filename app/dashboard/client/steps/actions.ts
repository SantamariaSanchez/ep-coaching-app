"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";

// Les pas sont suivis côté client (/dashboard/client/steps) comme côté coach
// pour lui-même (/dashboard/coach/moi/steps), d'où requireAuth() plutôt qu'un
// guard de rôle. Le guard applique aussi la 2FA quand le compte l'a activée,
// ce que l'ancien getUser() maison ne faisait pas.
export async function updateStepGoal(dailyGoal: number): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const userId = guard.userId;
  if (dailyGoal <= 0) return { error: "Objectif invalide." };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("step_settings")
      .upsert({ client_id: userId, daily_goal: dailyGoal, updated_at: new Date().toISOString() });
    if (error) return { error: "Erreur lors de la sauvegarde." };
    revalidatePath("/dashboard/client/steps");
    revalidatePath("/dashboard/coach/moi/steps");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function addRoutineItem(
  label: string,
  timeLabel: string
): Promise<{ error?: string; id?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const userId = guard.userId;
  if (!label.trim()) return { error: "Le libellé est requis." };

  try {
    const supabase = await createServerSupabase();
    const { count } = await supabase
      .from("step_routine_items")
      .select("id", { count: "exact", head: true })
      .eq("client_id", userId);

    const { data, error } = await supabase
      .from("step_routine_items")
      .insert({ client_id: userId, label: label.trim(), time_label: timeLabel.trim() || null, position: count ?? 0 })
      .select("id")
      .single();

    if (error) return { error: "Erreur lors de l'ajout." };
    revalidatePath("/dashboard/client/steps");
    revalidatePath("/dashboard/coach/moi/steps");
    return { id: data.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteRoutineItem(id: string): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const userId = guard.userId;

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("step_routine_items")
      .delete()
      .eq("id", id)
      .eq("client_id", userId);
    if (error) return { error: "Erreur lors de la suppression." };
    revalidatePath("/dashboard/client/steps");
    revalidatePath("/dashboard/coach/moi/steps");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function logSteps(
  logDate: string,
  stepsActual: number,
  completedItems: string[]
): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  const userId = guard.userId;

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("step_logs")
      .upsert(
        { client_id: userId, log_date: logDate, steps_actual: Math.max(0, stepsActual), completed_items: completedItems },
        { onConflict: "client_id,log_date" }
      );
    if (error) return { error: "Erreur lors de l'enregistrement." };
    revalidatePath("/dashboard/client/steps");
    revalidatePath("/dashboard/coach/moi/steps");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

// Transforme une habitude de routine en rappel push quotidien, en un tap —
// même table et même cron que "Mes rappels" (app/api/cron/send-reminders),
// aucune nouvelle infra. Client uniquement : "Mes rappels" n'existe pas côté
// coach (voir app/dashboard/client/reminders).
export async function createReminderFromRoutine(label: string, time: string): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!label.trim() || !time) return { error: "Rappel invalide." };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("reminders").insert({
      client_id: guard.userId,
      label: `🚶 ${label.trim()}`,
      time,
      days: ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"],
    });
    if (error) return { error: "Erreur lors de la création du rappel." };
    revalidatePath("/dashboard/client/reminders");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
