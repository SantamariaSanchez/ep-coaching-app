import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCommunityComments } from "@/utils/community";
import { LIMITS, requireText } from "@/lib/sanitize";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const { id: postId } = await params;
  const comments = await getCommunityComments(postId);
  return NextResponse.json({ comments });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const { id: postId } = await params;

  const limited = await enforceRateLimit(
    `community-comment:${guard.userId}`,
    PRESETS.publish.limit,
    PRESETS.publish.windowSeconds,
    "Tu commentes trop vite. Réessaie dans un instant."
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const parsed = requireText(
    (body as { content?: unknown })?.content,
    LIMITS.comment,
    "Le commentaire"
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const content = parsed.value;

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("community_comments")
    .insert({ post_id: postId, author_id: guard.userId, content })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Erreur lors de l'envoi." }, { status: 500 });
  }

  // Le statut "répondu" ne bougeait que sur un clic manuel dédié — un coach
  // qui répond juste par un commentaire (le geste naturel) laissait la
  // question "open" indéfiniment, invisible ensuite dans le compteur de
  // rappel. Répondre EST la donnée ; pas besoin d'un second geste explicite.
  //
  // CORRIGÉ 2026-08-19 (audit "Communauté", même bug que app/api/community/
  // posts/[id]/route.ts PATCH) : `guard.role === "coach"` seul laissait
  // n'importe quel coach déclencher une tentative de marquage sur la
  // question d'un client qui n'est pas le sien. La RLS (auth.uid()=
  // author_id OR is_own_coach(author_id) OR is_platform_owner()) empêchait
  // bien l'écriture réelle, mais silencieusement (0 ligne filtrée, pas
  // d'erreur SQL) — `autoAnswered` répondait quand même `true` sans que
  // rien n'ait changé. Vérifie maintenant que ce coach est bien celui de
  // l'auteur (ou le propriétaire de la plateforme) avant même de tenter
  // l'update, pour que la réponse reflète ce qui s'est réellement passé.
  let autoAnswered = false;
  if (guard.role === "coach") {
    const { data: post } = await supabase
      .from("community_posts")
      .select("type, status, author_id")
      .eq("id", postId)
      .single();
    if (post?.type === "question" && post.status === "open") {
      const [{ data: profile }, { data: authorProfile }] = await Promise.all([
        supabase.from("profiles").select("is_platform_owner").eq("id", guard.userId).maybeSingle(),
        supabase.from("profiles").select("coach_id").eq("id", post.author_id).maybeSingle(),
      ]);
      const canAnswer = profile?.is_platform_owner === true || authorProfile?.coach_id === guard.userId;
      if (canAnswer) {
        const { error: statusError } = await supabase
          .from("community_posts")
          .update({ status: "answered" })
          .eq("id", postId);
        autoAnswered = !statusError;
      }
    }
  }

  return NextResponse.json({ id: data.id, autoAnswered });
}
