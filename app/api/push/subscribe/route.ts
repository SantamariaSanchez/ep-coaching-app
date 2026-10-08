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

    // Un abonnement par appareil (téléphone, ordinateur...) : avant, le
    // dernier appareil activé remplaçait les autres. Les heures de silence
    // déjà réglées sont reprises pour le nouvel appareil.
    const endpoint = (subscription as { endpoint: string }).endpoint;
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, quiet_hours_start, quiet_hours_end, updated_at")
      .eq("user_id", guard.userId)
      .order("updated_at", { ascending: false });
    const rows = (existing ?? []) as { id: string; endpoint: string | null; quiet_hours_start: number | null; quiet_hours_end: number | null }[];
    const quiet = rows[0] ? { quiet_hours_start: rows[0].quiet_hours_start, quiet_hours_end: rows[0].quiet_hours_end } : {};
    await supabase.from("push_subscriptions").upsert(
      { user_id: guard.userId, subscription, endpoint, updated_at: new Date().toISOString(), ...quiet },
      { onConflict: "user_id,endpoint" }
    );
    // Au delà de 6 appareils, les plus anciens sont oubliés.
    const stale = rows.filter((r) => r.endpoint !== endpoint).slice(5).map((r) => r.id);
    if (stale.length) await supabase.from("push_subscriptions").delete().in("id", stale);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("push subscribe error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
