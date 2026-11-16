import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { cleanVisit } from "@/lib/visit-tracking";

// Compteur de visites des pages publiques (lib/visit-tracking.ts). L'IP ne
// sert qu'à la limite de débit, elle n'est jamais enregistrée. Les robots
// déclarés ne comptent pas.
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

export async function POST(req: Request) {
  if (BOT_RE.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const limited = await enforceRateLimit(`visit:${clientIp(req)}`, 120, 60);
  if (limited) return limited;
  let body: { path?: unknown; ref?: unknown; utm?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const visit = cleanVisit(body, new URL(req.url).hostname);
  if (!visit) return new NextResponse(null, { status: 204 });
  try {
    await createAdminClient().from("page_visits").insert(visit);
  } catch {
    // une visite perdue ne doit jamais casser la page
  }
  return new NextResponse(null, { status: 204 });
}
