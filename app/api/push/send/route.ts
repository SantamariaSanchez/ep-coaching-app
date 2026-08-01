import { NextResponse } from "next/server";
import { getUser, getProfile } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const { userId, title, body, url } = await req.json();
    if (typeof userId !== "string") return NextResponse.json({ ok: false }, { status: 400 });

    // On ne peut notifier que son propre interlocuteur de messagerie : son
    // coach (qu'on soit client, ou coach soi-même suivi par un autre coach —
    // double rôle), ou l'un de ses propres clients si on est coach.
    const profile = await getProfile(user.id);
    let allowed = !!profile?.coach_id && userId === profile.coach_id;
    if (!allowed && profile?.role === "coach") {
      const admin = createAdminClient();
      const { data: target } = await admin
        .from("profiles")
        .select("coach_id")
        .eq("id", userId)
        .maybeSingle();
      allowed = target?.coach_id === user.id;
    }
    if (!allowed) return NextResponse.json({ ok: false }, { status: 403 });

    const result = await sendPushToUser(userId, title, body, url);
    return NextResponse.json({ ok: result.ok, reason: result.reason });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
