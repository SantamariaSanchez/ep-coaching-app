import { NextResponse } from "next/server";
import { requireClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";

// Miroir côté client du signal "stagnation_unaddressed" ajouté à
// lib/coach-analytics.ts (getClientAlerts) : le cron d'escalade (voir
// app/api/cron/stagnation-escalation) notifie déjà le client une fois,
// mais une notification push seule est trop facile à ignorer/swiper. Cette
// route alimente une bannière persistante sur le tableau de bord client
// (components/client/StagnationBanner.tsx) tant qu'aucun appel n'a suivi.
export async function GET() {
  const guard = await requireClient();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("last_stagnation_escalation_at, coach_id")
    .eq("id", guard.userId)
    .maybeSingle();

  const escalatedAt = profile?.last_stagnation_escalation_at
    ? new Date(profile.last_stagnation_escalation_at)
    : null;

  // Même fenêtre que côté coach (21j) : au-delà, l'escalade est trop
  // ancienne pour rester affichée comme "toujours pas traitée".
  if (!escalatedAt || escalatedAt < new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ active: false });
  }

  const { count: bookedSince } = await admin
    .from("live_events")
    .select("id", { count: "exact", head: true })
    .eq("invited_client_id", guard.userId)
    .eq("type", "1to1")
    .neq("status", "cancelled")
    .gte("created_at", escalatedAt.toISOString());

  if (bookedSince) {
    return NextResponse.json({ active: false });
  }

  const daysSince = Math.floor((Date.now() - escalatedAt.getTime()) / (24 * 60 * 60 * 1000));
  return NextResponse.json({ active: true, daysSince, hasCoach: !!profile?.coach_id });
}
