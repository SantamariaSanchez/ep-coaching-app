import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export interface CoachPost {
  id: string;
  author_id: string;
  coach_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function getCoachPosts(coachId: string, limit = 50): Promise<CoachPost[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("coach_posts")
      .select("*")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as CoachPost[]) ?? [];
  } catch {
    return [];
  }
}

// Nombre de lecteurs distincts par post — le coach publiait jusqu'ici sans
// aucun retour, pas même un compteur de vues. Admin : la policy RLS de
// coach_post_views ne laisse chacun voir que SES propres vues, il faut
// contourner pour l'agrégat côté coach.
export async function getCoachPostViewCounts(postIds: string[]): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("coach_post_views").select("post_id").in("post_id", postIds);
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      const pid = (row as { post_id: string }).post_id;
      counts[pid] = (counts[pid] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}

// IDs des posts déjà vus par CE lecteur — sert le badge "Nouveau" côté client.
export async function getViewedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_post_views")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds);
    return new Set((data ?? []).map((r) => (r as { post_id: string }).post_id));
  } catch {
    return new Set();
  }
}

// Idempotent (clé primaire (user_id, post_id)) — appelé au chargement de la
// page cliente, une ligne par lecteur et par post plutôt qu'un compteur brut,
// pour pouvoir un jour distinguer qui a lu quoi si besoin.
export async function recordCoachPostView(userId: string, postId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("coach_post_views").upsert(
      { user_id: userId, post_id: postId },
      { onConflict: "user_id,post_id", ignoreDuplicates: true }
    );
  } catch {
    // best-effort
  }
}
