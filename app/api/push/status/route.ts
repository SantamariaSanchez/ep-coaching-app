import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";

// État de livraison des notifications pour CET appareil (son abonnement
// push) : dernier envoi, dernière arrivée et retard mesuré.
export async function POST(req: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ ok: false }, { status: 403 });
  try {
    const { endpoint } = (await req.json()) as { endpoint?: unknown };
    if (typeof endpoint !== "string") return NextResponse.json({ ok: false }, { status: 400 });
    const { data } = await createAdminClient()
      .from("push_subscriptions")
      .select("last_sent_at, last_delivered_at, last_delay_seconds")
      .eq("user_id", guard.userId)
      .eq("endpoint", endpoint)
      .maybeSingle();
    return NextResponse.json({ ok: true, known: !!data, ...(data ?? {}) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
