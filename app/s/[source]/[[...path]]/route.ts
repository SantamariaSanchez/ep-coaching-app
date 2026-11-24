import { NextResponse } from "next/server";
import { AUDIT_CLICK_PATH, SOURCES, auditRedirect, isAuditLink, sourceRedirect } from "@/lib/source-links";
import { createAdminClient } from "@/lib/supabase-admin";

// Liens de bio et de mail suivis : voir lib/source-links.ts.
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;

export async function GET(req: Request, { params }: { params: Promise<{ source: string; path?: string[] }> }) {
  const { source, path } = await params;
  const origin = new URL(req.url).origin;

  // /s/<réseau>/audit : on compte le clic puis on part sur Calendly.
  if (isAuditLink(path ?? [])) {
    const target = auditRedirect(source);
    if (target) {
      if (!BOT_RE.test(req.headers.get("user-agent") ?? "")) {
        try {
          await createAdminClient()
            .from("page_visits")
            .insert({ path: AUDIT_CLICK_PATH, referrer_host: null, utm_source: SOURCES[source.toLowerCase()] });
        } catch {
          // un clic perdu ne doit jamais bloquer la réservation
        }
      }
      return NextResponse.redirect(target, 307);
    }
  }

  return NextResponse.redirect(`${origin}${sourceRedirect(source, path ?? []) ?? "/"}`, 307);
}
