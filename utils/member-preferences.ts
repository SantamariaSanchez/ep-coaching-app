import { createAdminClient } from "@/lib/supabase-admin";
import type { MemberPreferences } from "@/lib/personalization";

// Client admin (bypass RLS) — même raison que getClientIntake : on veut une
// lecture fiable côté serveur, indépendamment du cookie/session en cours.
export async function getMemberPreferences(userId: string): Promise<MemberPreferences | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("member_preferences")
      .select("experience_level, primary_goal, training_frequency, tracks_nutrition, biggest_obstacle")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("getMemberPreferences:", error.message);
      return null;
    }
    return (data as MemberPreferences) ?? null;
  } catch (e) {
    console.error("getMemberPreferences:", e);
    return null;
  }
}
