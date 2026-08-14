"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { getCoachForClient } from "@/utils/insert-notification";
import { notifyUser } from "@/lib/notify";
import { HABITS, type QuizResult } from "@/lib/mindset-content";

export async function saveMindsetQuiz(result: QuizResult): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const fields = {
      profile_type: result.profile_type,
      environment: result.environment,
      main_obstacle: result.main_obstacle,
      motivation_score: result.motivation_score,
      body_image_score: result.body_image_score,
      stress_score: result.stress_score,
      discipline_score: result.discipline_score,
      quiz_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: existingRows } = await supabase
      .from("mindset_profiles")
      .select("id")
      .eq("client_id", guard.userId)
      .order("updated_at", { ascending: false });

    let error;
    if (existingRows && existingRows.length > 0) {
      ({ error } = await supabase
        .from("mindset_profiles")
        .update(fields)
        .eq("id", existingRows[0].id));
      if (existingRows.length > 1) {
        await supabase
          .from("mindset_profiles")
          .delete()
          .in("id", existingRows.slice(1).map((r) => r.id));
      }
    } else {
      ({ error } = await supabase
        .from("mindset_profiles")
        .insert({ client_id: guard.userId, ...fields }));
    }

    if (error) return { error: "Erreur lors de la sauvegarde." };

    revalidatePath("/dashboard/client/mindset");
    revalidatePath("/dashboard/coach/moi/mindset");
    revalidatePath(`/dashboard/coach/clients/${guard.userId}`);

    // Le coach n'avait aujourd'hui aucune visibilité sur le profil mindset
    // de son client — ce complète/refait le quiz devient le déclencheur
    // naturel pour aller y jeter un œil. Fire-and-forget, jamais bloquant.
    (async () => {
      const coach = await getCoachForClient(guard.userId);
      if (!coach) return;
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", guard.userId).maybeSingle();
      const clientName = (profile as { full_name: string | null } | null)?.full_name ?? "Un client";
      await notifyUser(coach.id, {
        type: "mindset_quiz_completed",
        title: "🧠 Quiz mindset complété",
        body: `${clientName} vient de compléter son quiz mindset.`,
        url: `/dashboard/coach/clients/${guard.userId}`,
        senderId: guard.userId,
      });
    })().catch(() => {});

    return {};
  } catch (e) {
    console.error("saveMindsetQuiz error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function toggleHabitLog(
  habitKey: string,
  date: string,
  checked: boolean
): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    if (checked) {
      const { error } = await supabase
        .from("mindset_habit_logs")
        .insert({ client_id: guard.userId, habit_key: habitKey, logged_at: date });
      if (error) return { error: "Erreur lors de l'enregistrement." };
      // Fire-and-forget — une série qui franchit un palier (7/30/100 jours)
      // mérite un petit coup de pouce, jamais bloquant pour la coche elle-même.
      checkHabitStreakMilestone(guard.userId, habitKey, date).catch(() => {});
    } else {
      const { error } = await supabase
        .from("mindset_habit_logs")
        .delete()
        .eq("client_id", guard.userId)
        .eq("habit_key", habitKey)
        .eq("logged_at", date);
      if (error) return { error: "Erreur lors de la suppression." };
    }

    revalidatePath("/dashboard/client/mindset");
    revalidatePath("/dashboard/coach/moi/mindset");
    return {};
  } catch (e) {
    console.error("toggleHabitLog error:", e);
    return { error: "Erreur inattendue." };
  }
}

const STREAK_MILESTONES = [7, 30, 100];

// Même algorithme que côté client (components/ui/MindsetView.tsx) : une
// série cassée par un seul jour manquant, jamais un simple comptage brut.
async function checkHabitStreakMilestone(clientId: string, habitKey: string, date: string): Promise<void> {
  const supabase = await createServerSupabase();
  const since = new Date(date);
  since.setDate(since.getDate() - Math.max(...STREAK_MILESTONES));
  const { data } = await supabase
    .from("mindset_habit_logs")
    .select("logged_at")
    .eq("client_id", clientId)
    .eq("habit_key", habitKey)
    .gte("logged_at", since.toISOString().split("T")[0]);

  const dates = new Set((data as { logged_at: string }[] | null)?.map((l) => l.logged_at) ?? []);
  let streak = 0;
  const cursor = new Date(date + "T12:00:00");
  while (dates.has(cursor.toISOString().split("T")[0])) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  if (!STREAK_MILESTONES.includes(streak)) return;

  // Réutilisé par la page "moi" du coach (voir app/dashboard/coach/moi/mindset)
  // — sans ce détour, sa propre notif de série le renvoyait vers l'espace client.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", clientId).maybeSingle();
  const url = (profile as { role: string } | null)?.role === "coach" ? "/dashboard/coach/moi/mindset" : "/dashboard/client/mindset";

  const habitLabel = HABITS.find((h) => h.key === habitKey)?.label ?? "cette habitude";
  await notifyUser(clientId, {
    type: "mindset_streak_milestone",
    title: `🔥 ${streak} jours d'affilée`,
    body: `"${habitLabel}" tenue ${streak} jours de suite, continue comme ça.`,
    url,
  });
}

export async function addJournalEntry(params: {
  promptKey: string | null;
  content: string;
  mood: number | null;
}): Promise<{ error?: string; id?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!params.content.trim()) return { error: "Le contenu ne peut pas être vide." };

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("mindset_journal_entries")
      .insert({
        client_id: guard.userId,
        prompt_key: params.promptKey,
        content: params.content.trim(),
        mood: params.mood,
      })
      .select("id")
      .single();

    if (error || !data) return { error: "Erreur lors de l'enregistrement." };

    revalidatePath("/dashboard/client/mindset");
    revalidatePath("/dashboard/coach/moi/mindset");
    return { id: data.id };
  } catch (e) {
    console.error("addJournalEntry error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteJournalEntry(entryId: string): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    await supabase
      .from("mindset_journal_entries")
      .delete()
      .eq("id", entryId)
      .eq("client_id", guard.userId);

    revalidatePath("/dashboard/client/mindset");
    revalidatePath("/dashboard/coach/moi/mindset");
    return {};
  } catch (e) {
    console.error("deleteJournalEntry error:", e);
    return { error: "Erreur inattendue." };
  }
}
