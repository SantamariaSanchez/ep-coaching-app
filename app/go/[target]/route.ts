import { NextResponse } from "next/server";
import { getUser, getProfile } from "@/utils/auth";

// Raccourcis de l'icône d'appli (appui long) et liens profonds simples :
// /go/note, /go/bilan, /go/agenda, /go/recherche, /go/messages. Renvoie vers
// la bonne page selon le profil (coach ou client).
export async function GET(req: Request, { params }: { params: Promise<{ target: string }> }) {
  const { target } = await params;
  const origin = new URL(req.url).origin;
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${origin}/`);
  const profile = await getProfile(user.id);
  const coach = profile?.role === "coach";
  const base = coach ? "/dashboard/coach" : "/dashboard/client";
  const me = coach ? "/dashboard/coach/moi" : "/dashboard/client";
  const map: Record<string, string> = {
    note: `${base}/notes?capture=1`,
    notes: `${base}/notes`,
    bilan: `${me}/bilan`,
    agenda: `${me}/agenda`,
    nutrition: `${me}/nutrition`,
    recherche: `${base}?recherche=1`,
    messages: `${base}/messages`,
  };
  return NextResponse.redirect(`${origin}${map[target] ?? base}`);
}
