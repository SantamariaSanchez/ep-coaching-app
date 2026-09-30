import { NextResponse } from "next/server";
import { captureLead } from "@/lib/lead-capture";
import { enforceRateLimit, clientIp, PRESETS } from "@/lib/rate-limit";

// Capture d'un lead depuis le site vitrine (ep-site, statique sur GitHub
// Pages, aucun code serveur possible) : la personne choisit un guide gratuit
// et laisse son email, le lead entre dans le CRM exactement comme depuis la
// page /ressources (voir lib/lead-capture.ts), puis le site l'envoie sur le
// guide. Même garde-fous que /api/newsletter/subscribe : CORS limité aux
// deux origines connues, limite de débit par IP, champ piège anti-bot.
const ALLOWED_ORIGINS = new Set(["https://santamariasanchez.github.io", "https://ep-coaching.vercel.app"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9-]{3,100}$/;

function corsHeaders(origin: string | null) {
  const headers = new Headers();
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return headers;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request) {
  const headers = corsHeaders(req.headers.get("origin"));

  const limited = await enforceRateLimit(`public-lead:${clientIp(req)}`, PRESETS.email.limit, PRESETS.email.windowSeconds);
  if (limited) {
    for (const [key, value] of headers) limited.headers.set(key, value);
    return limited;
  }

  let body: { slug?: string; email?: string; website?: string; referrer?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400, headers });
  }

  // Champ piège : jamais visible, rempli seulement par un robot.
  if (body.website) return NextResponse.json({ ok: true }, { headers });

  const email = (body.email ?? "").trim().toLowerCase();
  const slug = (body.slug ?? "").trim();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400, headers });
  if (!SLUG_RE.test(slug)) return NextResponse.json({ ok: false, error: "invalid_slug" }, { status: 400, headers });

  // Le referrer du site (Instagram, LinkedIn...) dit d'où venait vraiment le
  // visiteur ; à défaut, le lead est crédité au site lui-même.
  const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 120) : null;
  const res = await captureLead({
    slug,
    email,
    phone: null,
    origin: referrer ? { referrer } : { platform: "site" },
    source: "site_vitrine",
  });
  if (res.error) return NextResponse.json({ ok: false, error: res.error }, { status: 400, headers });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
  return NextResponse.json({ ok: true, url: `${appUrl}/ressources/${encodeURIComponent(slug)}` }, { headers });
}
