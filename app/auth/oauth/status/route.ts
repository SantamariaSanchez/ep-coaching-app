import { NextResponse } from "next/server";
import { parseProvider } from "@/lib/oauth";

// Dit si un fournisseur (Google, Apple) est activé dans Supabase, sans rien
// consommer : le serveur d'authentification répond 400 « provider is not
// enabled » tant que la clé n'est pas posée. Sert aux boutons de l'appli
// native et de repli, pour afficher un message clair plutôt qu'un écran JSON.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const provider = parseProvider(searchParams.get("provider"));
  if (!provider) return NextResponse.json({ enabled: false }, { status: 400 });
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(`${origin}/auth/oauth/finish`)}`;
    const res = await fetch(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(6000) });
    // 3xx : le fournisseur répond, il est activé. 4xx : pas activé.
    // Mis en cache 5 minutes : la page d'accueil le demande à chaque visite.
    return NextResponse.json({ enabled: res.status >= 300 && res.status < 400 }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    return NextResponse.json({ enabled: false, unreachable: true });
  }
}
