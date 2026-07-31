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
    // coach si on est client, ou l'un de ses propres clients si on est coach.
    const profile = await getProfile(user.id);
    let allowed = false;
    if (profile?.role === "client") {
      allowed = userId === profile.coach_id;
    } else if (profile?.role === "coach") {
      const admin = createAdminClient();
      const { data: target } = await admin
        .from("profiles")
        .select("coach_id")
        .eq("id", userId)
        .eq("role", "client")
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
