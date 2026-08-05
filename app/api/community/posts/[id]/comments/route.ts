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

  return NextResponse.json({ id: data.id });
}
