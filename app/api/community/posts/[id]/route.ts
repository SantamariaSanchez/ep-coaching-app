import { NextResponse } from "next/server";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";

// Coach marks a question as answered.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfile(user.id);
  if (profile?.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
