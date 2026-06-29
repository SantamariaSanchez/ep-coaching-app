"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { getUser } from "@/utils/auth";
import { awardPoints, POINTS } from "@/lib/gamification";

export async function markLessonComplete(lessonId: string) {
  const user = await getUser();
  if (!user) return { error: "Non authentifié" };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("formation_progress")
    .upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id" });

  if (error) return { error: error.message };

  awardPoints(user.id, POINTS.formation_lesson, "Leçon terminée", "formation_lesson", lessonId);

  return { success: true };
}

export async function unmarkLessonComplete(lessonId: string) {
  const user = await getUser();
  if (!user) return { error: "Non authentifié" };

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("formation_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId);

  if (error) return { error: error.message };
  return { success: true };
}
