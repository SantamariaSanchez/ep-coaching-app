import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { getProfile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ ok: false }, { status: 403 });

  // Cette route fait sonner le telephone de quelqu'un d'autre : sans quota,
  // elle devient un outil de harcelement par notifications.
  const limited = await enforceRateLimit(
    `push-send:${guard.userId}`,
    60,
    600,
    "Trop de notifications envoyées. Réessaie dans un instant."
  );
  if (limited) return limited;

  try {
    const { userId, title, body, url } = await req.json();
    if (typeof userId !== "string") return NextResponse.json({ ok: false }, { status: 400 });

    // On ne peut notifier que son propre interlocuteur de messagerie : son
    // coach (qu'on soit client, ou coach soi-même suivi par un autre coach —
    // double rôle), ou l'un de ses propres clients si on est coach.
    const profile = await getProfile(guard.userId);
    let allowed = !!profile?.coach_id && userId === profile.coach_id;
    if (!allowed && profile?.role === "coach") {
      const admin = createAdminClient();
      const { data: target } = await admin
        .from("profiles")
        .select("coach_id")
        .eq("id", userId)
        .maybeSingle();
      allowed = target?.coach_id === guard.userId;
    }
    if (!allowed) return NextResponse.json({ ok: false }, { status: 403 });

    const result = await sendPushToUser(userId, title, body, url);
    return NextResponse.json({ ok: result.ok, reason: result.reason });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
