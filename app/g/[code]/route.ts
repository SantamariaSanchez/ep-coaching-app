import { NextResponse } from "next/server";
import { getLeadMagnetSlugByAnyKeyword } from "@/lib/lead-magnets";

// Lien court d'un guide par son numéro : ep-coaching.vercel.app/g/131.
// Pour répondre à un commentaire « 131 » sous un reel avec un lien propre,
// attribué à Instagram dans les leads. Numéro inconnu : liste des guides.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const origin = new URL(req.url).origin;
  const slug = await getLeadMagnetSlugByAnyKeyword(decodeURIComponent(code).trim()).catch(() => null);
  const target = slug ? `/ressources/${slug}?src=instagram` : "/ressources";
  return NextResponse.redirect(`${origin}${target}`, 307);
}
