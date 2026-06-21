import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";

function initVapid() {
  if (
    process.env.VAPID_EMAIL &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY
  ) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url?: string
): Promise<{ ok: boolean; reason?: string }> {
  try {
    initVapid();
    const supabase = createAdminClient();

    const { data } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId)
      .single();

    if (!data?.subscription) {
      return { ok: false, reason: "no subscription" };
    }

    await webpush.sendNotification(
      data.subscription as webpush.PushSubscription,
      JSON.stringify({ title, body, url: url ?? "/" })
    );

    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" };
  }
}
