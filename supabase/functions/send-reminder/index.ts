import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_EMAIL   = Deno.env.get("VAPID_EMAIL")!;

serve(async (req: Request) => {
  try {
    const { client_id, label } = await req.json();

    if (!client_id || !label) {
      return new Response("Missing client_id or label", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: sub } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", client_id)
      .single();

    if (!sub?.subscription) {
      return new Response("No subscription found", { status: 404 });
    }

    // @ts-expect-error — Deno ESM import
    const webpush = await import("https://esm.sh/web-push@3.6.6");

    webpush.default.setVapidDetails(
      `mailto:${VAPID_EMAIL}`,
      VAPID_PUBLIC,
      VAPID_PRIVATE
    );

    await webpush.default.sendNotification(
      sub.subscription,
      JSON.stringify({
        title: "⏰ EP Coaching",
        body: label,
        url: "/dashboard/client",
      })
    );

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("send-reminder error:", err);
    return new Response(String(err), { status: 500 });
  }
});
