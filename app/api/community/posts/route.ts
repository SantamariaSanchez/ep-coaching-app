import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { getCommunityPostsPage, type CommunityPostType } from "@/utils/community";
import { awardPoints, POINTS } from "@/lib/gamification";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const cursor = searchParams.get("cursor");

  if (type !== "victory" && type !== "question") {
    return NextResponse.json({ error: "Type invalide." }, { status: 400 });
  }

  const page = await getCommunityPostsPage(type as CommunityPostType, cursor);
  return NextResponse.json(page);
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const type = formData.get("type");
  const content = (formData.get("content") as string | null)?.trim();
  const image = formData.get("image");

  if (type !== "victory" && type !== "question") {
    return NextResponse.json({ error: "Type invalide." }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Le contenu est requis." }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  let image_url: string | null = null;

  if (image instanceof File && image.size > 0) {
    const ext = image.name.split(".").pop() ?? "jpg";
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
