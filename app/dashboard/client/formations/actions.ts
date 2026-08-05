"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guards";
import { awardPoints, POINTS } from "@/lib/gamification";

// requireAuth() plutôt qu'un getUser() nu : les formations sont suivies par
// les clients comme par le coach, mais marquer une leçon reste une écriture,
// donc soumise à la 2FA quand le compte l'a activée.
export async function markLessonComplete(lessonId: string) {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("formation_progress")
    .upsert({ user_id: guard.userId, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" });

  if (error) return { error: error.message };

  awardPoints(guard.userId, POINTS.formation_lesson, "Leçon terminée", "formation_lesson", lessonId);

  return { success: true };
}

export async function unmarkLessonComplete(lessonId: string) {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("formation_progress")
    .delete()
    .eq("user_id", guard.userId)
    .eq("lesson_id", lessonId);

  if (error) return { error: error.message };
  return { success: true };
}
