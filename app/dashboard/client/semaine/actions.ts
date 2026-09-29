"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guards";
import { todayInParis } from "@/lib/dates";
import {
  addDaysToDate,
  formatReflectionContent,
  isValidDateStr,
  MAX_WEEKS_BACK,
  mondayOf,
  REFLECTION_FIELD_MAX,
  type ReflectionAnswers,
} from "@/lib/weekly-review-helpers";

// Les 3 questions de recul de la revue de la semaine, enregistrées dans le
// journal Mindset existant (mindset_journal_entries, prompt_key
// "bilan_semaine", déjà connu de JOURNAL_PROMPTS : lisible tel quel dans
// l'onglet Journal). Partagée par /dashboard/client/semaine et
// /dashboard/coach/moi/semaine, comme les actions d'agenda.
//
// Volontairement AUCUNE ligne check_ins : pour le fondateur, un check-in
// écrit sur son propre compte remonterait dans ses "réponses en attente"
// (getPendingReplies ne filtre pas son propre id).
export async function saveWeeklyReflection(params: {
  weekStart: string;
  answers: ReflectionAnswers;
  mood: number | null;
}): Promise<{ error?: string; id?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const today = todayInParis();
  const currentMonday = mondayOf(today);
  if (!isValidDateStr(params.weekStart) || mondayOf(params.weekStart) !== params.weekStart) {
    return { error: "Semaine invalide." };
  }
  if (params.weekStart > currentMonday || params.weekStart < addDaysToDate(currentMonday, -7 * MAX_WEEKS_BACK)) {
    return { error: "Cette semaine ne peut pas être revue." };
  }
  if (params.mood != null && !(Number.isInteger(params.mood) && params.mood >= 1 && params.mood <= 5)) {
    return { error: "Humeur invalide." };
  }

  const answers: ReflectionAnswers = {
    victory: String(params.answers?.victory ?? ""),
    blocker: String(params.answers?.blocker ?? ""),
    intention: String(params.answers?.intention ?? ""),
  };
  if (Object.values(answers).every((v) => !v.trim())) {
    return { error: "Réponds au moins à une question." };
  }
  if (Object.values(answers).some((v) => v.length > REFLECTION_FIELD_MAX)) {
    return { error: `${REFLECTION_FIELD_MAX} caractères maximum par réponse.` };
  }

  const weekEnd = addDaysToDate(params.weekStart, 6);
  const content = formatReflectionContent(params.weekStart, answers);
  // Date explicite en heure de Paris (le défaut current_date de la colonne
  // est en UTC), bornée au dimanche de la semaine revue : une revue écrite
  // le lundi pour la semaine passée reste rattachée à CETTE semaine, et
  // retrouvée par la page sans ambiguïté avec la semaine qui commence.
  const entryDate = today < weekEnd ? today : weekEnd;

  try {
    const supabase = await createServerSupabase();
    const { data: existing, error: readError } = await supabase
      .from("mindset_journal_entries")
      .select("id")
      .eq("client_id", guard.userId)
      .eq("prompt_key", "bilan_semaine")
      .gte("entry_date", params.weekStart)
      .lte("entry_date", weekEnd)
      .order("created_at", { ascending: false })
      .limit(1);
    if (readError) throw readError;

    const existingId = (existing as { id: string }[] | null)?.[0]?.id;
    let id: string | undefined;
    if (existingId) {
      // Une seule revue par semaine : la modifier plutôt qu'empiler des doublons.
      const { error } = await supabase
        .from("mindset_journal_entries")
        .update({ content, mood: params.mood })
        .eq("id", existingId)
        .eq("client_id", guard.userId);
      if (error) throw error;
      id = existingId;
    } else {
      const { data, error } = await supabase
        .from("mindset_journal_entries")
        .insert({
          client_id: guard.userId,
          prompt_key: "bilan_semaine",
          content,
          mood: params.mood,
          entry_date: entryDate,
        })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("insert vide");
      id = (data as { id: string }).id;
    }

    revalidatePath("/dashboard/client/semaine");
    revalidatePath("/dashboard/coach/moi/semaine");
    revalidatePath("/dashboard/client/mindset");
    revalidatePath("/dashboard/coach/moi/mindset");
    return { id };
  } catch (e) {
    console.error("saveWeeklyReflection error:", e);
    return { error: "Enregistrement impossible, réessaie dans un instant." };
  }
}
