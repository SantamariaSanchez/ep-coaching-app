import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServerSupabase } from "@/lib/supabase-server";
import { completeOAuthUser } from "@/lib/oauth-finish";
import { cleanInviteCode, parseRole } from "@/lib/oauth";

// Appli native : la session vient d'être posée dans la vue de l'appli (échange
// du code après le retour du navigateur système). Il reste à créer le profil
// au premier passage et à dire où aller. Même logique que /auth/oauth/finish.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { role?: string; coach?: string; ref?: string };
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ ok: false, error: "failed" }, { status: 401 });
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "inconnu";
  const result = await completeOAuthUser(
    data.user,
    { role: parseRole(body.role), coach: cleanInviteCode(body.coach), ref: cleanInviteCode(body.ref) },
    ip,
  );
  if (!result.ok && result.error === "not_coach") await supabase.auth.signOut();
  return NextResponse.json(result);
}
