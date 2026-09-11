import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { notifyUser } from "@/lib/notify";

// Réagir ("Bravo") à un post, façon "j'aime" à un tap : un seul type de
// réaction, toggle (réagir/annuler), zéro point de gamification accordé
// (voir migration 20260911_community_post_reactions.sql pour le pourquoi).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(
    `community-reaction:${guard.userId}`,
    PRESETS.write.limit,
    PRESETS.write.windowSeconds
  );
  if (limited) return limited;

  const { id: postId } = await params;
  const supabase = await createServerSupabase();

  const { data: post } = await supabase
    .from("community_posts")
    .select("id, author_id, type, content")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "Post introuvable." }, { status: 404 });

  const { data: existing } = await supabase
    .from("community_post_reactions")
    .select("post_id")
    .eq("post_id", postId)
    .eq("author_id", guard.userId)
    .maybeSingle();

  let reacted: boolean;

  if (existing) {
    const { error } = await supabase
      .from("community_post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("author_id", guard.userId);
    if (error) return NextResponse.json({ error: "Erreur." }, { status: 500 });
    reacted = false;
  } else {
    const { error } = await supabase
      .from("community_post_reactions")
      .insert({ post_id: postId, author_id: guard.userId });
    if (error) return NextResponse.json({ error: "Erreur." }, { status: 500 });
    reacted = true;

    // Prévenir l'auteur, jamais soi-même (on peut réagir à son propre post,
    // mais ça n'a rien à annoncer).
    if (post.author_id !== guard.userId) {
      const { data: reactor } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", guard.userId)
        .maybeSingle();
      notifyUser(post.author_id, {
        type: `community_reaction_${post.type}`,
        title: `👏 ${reactor?.full_name ?? "Quelqu'un"} a réagi à ${
          post.type === "victory" ? "ta victoire" : "ta question"
        }`,
        body: post.content.slice(0, 140),
        senderId: guard.userId,
      });
    }
  }

  const { count } = await supabase
    .from("community_post_reactions")
    .select("post_id", { count: "exact", head: true })
    .eq("post_id", postId);

  return NextResponse.json({ reacted, count: count ?? 0 });
}
