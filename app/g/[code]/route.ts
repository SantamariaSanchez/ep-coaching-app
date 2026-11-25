import { NextResponse } from "next/server";
import { getLeadMagnetSlugByAnyKeyword } from "@/lib/lead-magnets";
import { createAdminClient } from "@/lib/supabase-admin";

// Lien court d'un guide par son numéro : ep-coaching.vercel.app/g/131.
// Pour répondre à un commentaire « 131 » sous un reel avec un lien propre,
// attribué à Instagram dans les leads. Numéro inconnu : liste des guides.
// Depuis le 25/11, chaque clic est compté (page_visits, chemin /g/131) :
// le Studio affiche combien de personnes ont ouvert le guide envoyé en DM.
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const origin = new URL(req.url).origin;
  const clean = decodeURIComponent(code).trim();
  const slug = await getLeadMagnetSlugByAnyKeyword(clean).catch(() => null);
  if (slug && !BOT_RE.test(req.headers.get("user-agent") ?? "")) {
    try {
      await createAdminClient()
        .from("page_visits")
        .insert({ path: `/g/${clean.slice(0, 12)}`, referrer_host: null, utm_source: "instagram" });
    } catch {
      // un clic perdu ne doit jamais bloquer l'accès au guide
    }
  }
  const target = slug ? `/ressources/${slug}?src=instagram` : "/ressources";
  return NextResponse.redirect(`${origin}${target}`, 307);
}
