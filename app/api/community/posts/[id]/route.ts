import { NextResponse } from "next/server";
import { getProfile } from "@/utils/auth";
import { requireAuth, requireCoach } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

// Coach marks a question as answered.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(`community-post-patch:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return limited;

  const { id: postId } = await params;
  const body = await request.json();
  const status = body.status === "answered" ? "answered" : "open";

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("community_posts")
    .update({ status })
    .eq("id", postId);

  if (error) return NextResponse.json({ error: "Erreur." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Author deletes their own post. Coach can delete any post.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(`community-post-delete:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return limited;

  const { id: postId } = await params;
  const supabase = await createServerSupabase();

  const { data: post } = await supabase
    .from("community_posts")
    .select("author_id")
    .eq("id", postId)
    .single();

  if (!post) return NextResponse.json({ error: "Post introuvable." }, { status: 404 });

  const profile = await getProfile(guard.userId);
  const isOwner = post.author_id === guard.userId;
  // Modération réservée au fondateur, même dans le mur partagé — un coach
  // tiers ne peut supprimer que ses propres posts, pas ceux des autres.
  const isModerator = profile?.is_platform_owner === true;

  if (!isOwner && !isModerator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId);

  if (error) return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
