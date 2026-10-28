import { NextResponse } from "next/server";
import { NATIVE_DEEP_LINK } from "@/lib/oauth";

// Appli native : Google / Apple ont renvoyé le navigateur système ici (adresse
// déclarée dans Supabase). On le renvoie vers l'appli par lien profond, avec
// le code à échanger (la vue de l'appli garde le verrou PKCE).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const target = new URL(NATIVE_DEEP_LINK);
  if (code) target.searchParams.set("code", code);
  if (error) target.searchParams.set("error", error);
  for (const k of ["role", "coach", "ref"]) {
    const v = searchParams.get(k);
    if (v) target.searchParams.set(k, v);
  }
  const link = target.toString();
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=${link.replace(/"/g, "&quot;")}"><title>Retour dans EP Coaching</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 24px"><p><a href="${link.replace(/"/g, "&quot;")}">Retourner dans l&apos;appli EP Coaching</a></p></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
