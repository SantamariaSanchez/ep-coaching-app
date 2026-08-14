"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { getProfile, isSubscribed } from "@/utils/auth";
import { getCoachForClient, alreadyNotifiedToday } from "@/utils/insert-notification";
import { notifyUser } from "@/lib/notify";

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
  } catch (e) {
    console.error("updateStepGoal error:", e);
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
  } catch (e) {
    console.error("addRoutineItem error:", e);
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
  } catch (e) {
    console.error("deleteRoutineItem error:", e);
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

    // Fire-and-forget — un client qui remonte au-dessus de son objectif (ex.
    // en éditant son chiffre plus tard dans la journée) ne doit pas relancer
    // une notification, d'où le garde-fou "une fois par jour".
    notifyCoachIfGoalReached(userId, logDate, stepsActual).catch(() => {});

    return {};
  } catch (e) {
    console.error("logSteps error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Réservé aux clients coachés — voir la même remarque dans
// app/dashboard/client/nutrition/actions.ts. Un coach qui logue ses propres
// pas (page Moi > Pas) n'a normalement pas de coach_id, donc getCoachForClient
// renvoie null et ce garde ne fait rien : pas d'auto-notification.
async function notifyCoachIfGoalReached(clientId: string, logDate: string, stepsActual: number): Promise<void> {
  const profile = await getProfile(clientId);
  if (!isSubscribed(profile)) return;

  const coach = await getCoachForClient(clientId);
  if (!coach) return;

  if (await alreadyNotifiedToday(coach.id, "steps_goal_reached", clientId)) return;

  const supabase = await createServerSupabase();
  const { data: settings } = await supabase
    .from("step_settings")
    .select("daily_goal")
    .eq("client_id", clientId)
    .maybeSingle();

  const goal = (settings as { daily_goal: number | null } | null)?.daily_goal;
  if (!goal || goal <= 0 || stepsActual < goal) return;

  const clientName = profile?.full_name ?? "Un client";
  await notifyUser(coach.id, {
    type: "steps_goal_reached",
    title: "🚶 Objectif pas atteint",
    body: `${clientName} a atteint son objectif de pas le ${logDate} (${stepsActual.toLocaleString("fr-FR")} pas).`,
    // Pas de vue pas-à-pas dédiée côté coach pour l'instant (le suivi des
    // pas est aujourd'hui self-serve côté client) — on renvoie vers la
    // fiche client, la destination la plus utile disponible.
    url: `/dashboard/coach/clients/${clientId}`,
    senderId: clientId,
  });
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
  } catch (e) {
    console.error("createReminderFromRoutine error:", e);
    return { error: "Erreur inattendue." };
  }
}
