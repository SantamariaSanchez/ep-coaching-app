"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function updateStepGoal(dailyGoal: number): Promise<{ error?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Non authentifié." };
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
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Non authentifié." };
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
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Non authentifié." };

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
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Non authentifié." };

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
