import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  OAUTH_CTX_COOKIE, OAUTH_CTX_MAX_AGE, cleanInviteCode, encodeCtx, oauthErrorPath, parseProvider, parseRole,
} from "@/lib/oauth";

// Départ de la connexion Google / Apple (navigateur). On prépare la requête
// côté serveur (le code PKCE reste dans les cookies de ce navigateur), on
// vérifie que le fournisseur est bien activé, puis on redirige vers lui.
// Si ce n'est pas le cas : retour sur la page d'accès avec un message clair,
// jamais un écran d'erreur brut.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const role = parseRole(searchParams.get("role"));
  const provider = parseProvider(searchParams.get("provider"));
  const back = (code: Parameters<typeof oauthErrorPath>[1]) => NextResponse.redirect(new URL(oauthErrorPath(role, code), origin));
  if (!provider) return back("failed");

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/oauth/finish`,
      skipBrowserRedirect: true,
      queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
    },
  });
  if (error || !data?.url) return back("failed");

  try {
    const probe = await fetch(data.url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (probe.status < 300 || probe.status >= 400) return back("provider_disabled");
  } catch {
    return back("failed");
  }

  const res = NextResponse.redirect(data.url);
  res.cookies.set(OAUTH_CTX_COOKIE, encodeCtx({
    role,
    coach: cleanInviteCode(searchParams.get("coach")),
    ref: cleanInviteCode(searchParams.get("ref")),
  }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: OAUTH_CTX_MAX_AGE });
  return res;
}
