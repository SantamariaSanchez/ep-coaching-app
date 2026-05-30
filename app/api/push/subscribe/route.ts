import { NextResponse } from "next/server";
import webpush from "web-push";
import { createServerSupabase } from "@/lib/supabase-server";
import { getUser } from "@/utils/auth";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { subscription } = await req.json();
    const supabase = await createServerSupabase();

    await supabase.from("push_subscriptions").upsert(
      { user_id: user.id, subscription },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("push subscribe error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
