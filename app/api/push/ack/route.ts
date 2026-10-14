import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";

// Accusé de réception envoyé par le service worker (public/sw.js) quand une
// notification arrive sur l'appareil : on garde le retard réel de livraison,
// pour repérer un téléphone qui retient les notifs jusqu'à l'ouverture.
export async function POST(req: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    const { sentAt, endpoint } = (await req.json()) as { sentAt?: unknown; endpoint?: unknown };
    const now = Date.now();
    if (typeof sentAt !== "number" || sentAt > now + 60_000 || sentAt < now - 3 * 86400_000) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) return NextResponse.json({ ok: false }, { status: 400 });
    const delay = Math.max(0, Math.round((now - sentAt) / 1000));
    await createAdminClient()
      .from("push_subscriptions")
      .update({ last_delivered_at: new Date(now).toISOString(), last_delay_seconds: delay })
      .eq("user_id", guard.userId)
      .eq("endpoint", endpoint);
    return NextResponse.json({ ok: true, delay });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
