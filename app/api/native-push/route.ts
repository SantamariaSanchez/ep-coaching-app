import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";

// Enregistre le jeton push de l'appli native pour la personne connectée.
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { token?: unknown; platform?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const platform = body?.platform === "ios" || body?.platform === "android" ? body.platform : null;
  if (!token || token.length > 4096 || !platform) return NextResponse.json({ error: "Jeton invalide." }, { status: 400 });
  const { error } = await createAdminClient()
    .from("native_push_tokens")
    .upsert({ token, user_id: user.id, platform, last_seen_at: new Date().toISOString() }, { onConflict: "token" });
  if (error) return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
