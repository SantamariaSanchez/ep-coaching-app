import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCommunityPostsPage, type CommunityPostType } from "@/utils/community";
import { awardPoints, POINTS } from "@/lib/gamification";
import { cleanText, LIMITS, requireText } from "@/lib/sanitize";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Quota de publication : trente posts par dix minutes ne gênent personne et
  // coupent court au spam automatisé du fil communauté.
  const limited = await enforceRateLimit(
    `community-post:${user.id}`,
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

    const path = `${type}/${user.id}/${Date.now()}.${ext}`;
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
      author_id: user.id,
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
    user.id,
    type === "victory" ? POINTS.community_victory : POINTS.community_question,
    type === "victory" ? "Victoire partagée" : "Question posée",
    `community_${type}`,
    data.id
  );

  return NextResponse.json({ id: data.id });
}
