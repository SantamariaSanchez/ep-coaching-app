import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCommunityPostsPage, type CommunityPostType } from "@/utils/community";
import { awardPoints, POINTS } from "@/lib/gamification";
import { cleanText, LIMITS, requireText } from "@/lib/sanitize";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { notifyUser } from "@/lib/notify";

export async function GET(request: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  // Le curseur est une date ISO renvoyée par notre propre pagination : on le
  // borne pour ne pas laisser passer une valeur arbitrairement longue.
  const cursor = cleanText(searchParams.get("cursor"), 64);

  if (type !== "victory" && type !== "question") {
    return NextResponse.json({ error: "Type invalide." }, { status: 400 });
  }

  const page = await getCommunityPostsPage(type as CommunityPostType, cursor);
  return NextResponse.json(page);
}

export async function POST(request: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  // Quota de publication : trente posts par dix minutes ne gênent personne et
  // coupent court au spam automatisé du fil communauté.
  const limited = await enforceRateLimit(
    `community-post:${guard.userId}`,
    PRESETS.publish.limit,
    PRESETS.publish.windowSeconds,
    "Tu publies trop vite. Réessaie dans un instant."
  );
  if (limited) return limited;

  const formData = await request.formData();
  const type = formData.get("type");
  const image = formData.get("image");

  if (type !== "victory" && type !== "question") {
    return NextResponse.json({ error: "Type invalide." }, { status: 400 });
  }

  const parsed = requireText(formData.get("content"), LIMITS.post, "Le contenu");
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const content = parsed.value;

  const supabase = await createServerSupabase();
  let image_url: string | null = null;

  if (image instanceof File && image.size > 0) {
    const ALLOWED_TYPES: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const MAX_SIZE = 8 * 1024 * 1024; // 8MB, aligné sur la limite du bucket "community-photos"
    const ext = ALLOWED_TYPES[image.type];
    if (!ext) {
      return NextResponse.json({ error: "Seules les images (jpg, png, webp, gif) sont acceptées." }, { status: 400 });
    }
    if (image.size > MAX_SIZE) {
      return NextResponse.json({ error: "Photo trop volumineuse (8MB max)." }, { status: 400 });
    }

    const path = `${type}/${guard.userId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("community-photos")
      .upload(path, image, { contentType: image.type });

    if (!uploadError) {
      const { data: pub } = supabase.storage.from("community-photos").getPublicUrl(path);
      image_url = pub.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      author_id: guard.userId,
      type,
      content,
      image_url,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Erreur lors de la publication." }, { status: 500 });
  }

  awardPoints(
    guard.userId,
    type === "victory" ? POINTS.community_victory : POINTS.community_question,
    type === "victory" ? "Victoire partagée" : "Question posée",
    `community_${type}`,
    data.id
  );

  // Rien ne prévenait le coach qu'un client venait de publier — un fil
  // "Victoires" ne prend vie que si quelqu'un réagit vite, et le coach ne
  // tombait dessus qu'en visitant l'onglet par hasard (0 victoire postée à
  // ce jour malgré 12 clients actifs). Coach uniquement : un post d'un
  // autre coach sur le mur partagé n'a pas de destinataire naturel.
  if (guard.role === "client") {
    const { data: author } = await supabase
      .from("profiles")
      .select("coach_id, full_name")
      .eq("id", guard.userId)
      .single();
    if (author?.coach_id) {
      notifyUser(author.coach_id, {
        type: `community_${type}`,
        title:
          type === "victory"
            ? `🏆 ${author.full_name ?? "Un membre"} a partagé une victoire`
            : `❓ ${author.full_name ?? "Un membre"} a posé une question`,
        body: content.slice(0, 140),
        url: `/dashboard/coach/communaute/${type === "victory" ? "victoires" : "questions"}`,
        senderId: guard.userId,
      });
    }
  }

  return NextResponse.json({ id: data.id });
}
