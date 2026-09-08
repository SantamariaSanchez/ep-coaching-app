import { NextResponse } from "next/server";

// Point d'entrée public unique pour l'inscription à la newsletter Brevo
// (liste "Newsletter EP Coaching", id 6, déjà existante et déjà utilisée
// par le composeur de mailing coach, voir lib/brevo-mailing.ts). Centralisé
// ici plutôt que dupliqué : ep-site (statique, GitHub Pages, aucun code
// serveur possible) ET la page d'accueil/ressources de cette app appellent
// tous les deux ce même endpoint, jamais de clé Brevo côté navigateur.
//
// CORS : ep-site est hébergé sur santamariasanchez.github.io/EPCoaching
// (pas de domaine personnalisé, voir absence de CNAME dans le repo) — l'origine
// CORS ne porte que le sous-domaine github.io, jamais le chemin /EPCoaching,
// donc elle est identique quel que soit le nom du repo. Renommé le 2026-09-08
// suite au changement de compte GitHub (ex emmanuelpeccoux.github.io).
const ALLOWED_ORIGINS = new Set([
  "https://santamariasanchez.github.io",
  "https://ep-coaching.vercel.app",
]);

const NEWSLETTER_LIST_ID = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  let body: { email?: string; source?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400, headers });
  }

  // Honeypot : champ "website" jamais affiché ni rempli par un humain, un
  // bot generique de remplissage de formulaire le remplit lui.
  if (body.website) {
    return NextResponse.json({ ok: true }, { headers });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400, headers });
  }

  const source = body.source === "site" || body.source === "ressources" ? body.source : "app";

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        email,
        attributes: { SOURCE_INSCRIPTION: source },
        listIds: [NEWSLETTER_LIST_ID],
        updateEnabled: true,
      }),
    });

    // Brevo renvoie 400 "duplicate_parameter" si le contact existe déjà
    // sans que updateEnabled ait pu s'appliquer sur d'anciens comptes très
    // rares : dans tous les cas, un contact déjà inscrit reste un succès
    // du point de vue de la personne qui remplit le formulaire.
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (!text.includes("duplicate_parameter") && !text.includes("Contact already exist")) {
        console.error("newsletter/subscribe brevo error", res.status, text);
        return NextResponse.json({ ok: false, error: "brevo_error" }, { status: 502, headers });
      }
    }

    return NextResponse.json({ ok: true }, { headers });
  } catch (err) {
    console.error("newsletter/subscribe", err);
    return NextResponse.json({ ok: false, error: "network_error" }, { status: 502, headers });
  }
}
