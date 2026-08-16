import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import webpush from "web-push";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit } from "@/lib/rate-limit";

function initVapid() {
  if (process.env.VAPID_EMAIL && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(process.env.VAPID_EMAIL, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  }
}

export async function POST(req: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(
    `push-subscribe:${guard.userId}`,
    30,
    600
  );
  if (limited) return limited;

  try {
    initVapid();
    const { subscription } = await req.json();

    // La colonne est en jsonb : sans contrôle de forme, n'importe quel objet
    // (ou n'importe quel volume) pouvait y être stocké.
    if (
      !subscription ||
      typeof subscription !== "object" ||
      typeof (subscription as { endpoint?: unknown }).endpoint !== "string" ||
      (subscription as { endpoint: string }).endpoint.length > 2000 ||
      !/^https:\/\//.test((subscription as { endpoint: string }).endpoint)
    ) {
      return NextResponse.json({ error: "Abonnement invalide." }, { status: 400 });
    }

    const supabase = await createServerSupabase();

    await supabase.from("push_subscriptions").upsert(
      { user_id: guard.userId, subscription },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("push subscribe error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
