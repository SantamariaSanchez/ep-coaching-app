import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerSupabase } from "@/lib/supabase-server";
import { completeOAuthUser } from "@/lib/oauth-finish";
import { OAUTH_CTX_COOKIE, decodeCtx, oauthErrorPath } from "@/lib/oauth";

// Retour de Google / Apple (adresse déclarée dans Supabase > Authentication >
// URL Configuration) : échange du code contre une session, puis profil et
// rôle au premier passage, puis la bonne page d'arrivée.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const cookieStore = await cookies();
  const ctx = decodeCtx(cookieStore.get(OAUTH_CTX_COOKIE)?.value);
  const go = (path: string) => {
    const res = NextResponse.redirect(new URL(path, origin));
    res.cookies.delete(OAUTH_CTX_COOKIE);
    return res;
  };

  const providerError = searchParams.get("error");
  if (providerError) {
    return go(oauthErrorPath(ctx.role, providerError === "access_denied" ? "cancelled" : "failed"));
  }
  const code = searchParams.get("code");
  if (!code) return go(oauthErrorPath(ctx.role, "failed"));

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return go(oauthErrorPath(ctx.role, "failed"));

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "inconnu";
  const result = await completeOAuthUser(data.user, ctx, ip);
  if (!result.ok) {
    await supabase.auth.signOut();
    return go(oauthErrorPath(ctx.role, result.error));
  }
  return go(result.redirect);
}
