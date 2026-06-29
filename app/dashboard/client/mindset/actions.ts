"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { requireClient } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import type { QuizResult } from "@/lib/mindset-content";

export async function saveMindsetQuiz(result: QuizResult): Promise<{ error?: string }> {
  const guard = await requireClient();
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
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function toggleHabitLog(
  habitKey: string,
  date: string,
  checked: boolean
): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    if (checked) {
      const { error } = await supabase
        .from("mindset_habit_logs")
        .insert({ client_id: guard.userId, habit_key: habitKey, logged_at: date });
      if (error) return { error: "Erreur lors de l'enregistrement." };
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
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function addJournalEntry(params: {
  promptKey: string | null;
  content: string;
  mood: number | null;
}): Promise<{ error?: string; id?: string }> {
  const guard = await requireClient();
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
    return { id: data.id };
  } catch {
    return { error: "Erreur inattendue." };
  }
}

export async function deleteJournalEntry(entryId: string): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    await supabase
      .from("mindset_journal_entries")
      .delete()
      .eq("id", entryId)
      .eq("client_id", guard.userId);

    revalidatePath("/dashboard/client/mindset");
    return {};
  } catch {
    return { error: "Erreur inattendue." };
  }
}
