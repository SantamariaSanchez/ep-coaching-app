import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, title, body, url } = await req.json();
    const supabase = createAdminClient();

    const { data } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId)
      .single();

    if (!data?.subscription) {
      return NextResponse.json({ ok: false, reason: "no subscription" });
    }

    await webpush.sendNotification(
      data.subscription as webpush.PushSubscription,
      JSON.stringify({ title, body, url })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    // Push failure is non-blocking (user may not have granted permission)
    return NextResponse.json({ ok: false });
  }
}
