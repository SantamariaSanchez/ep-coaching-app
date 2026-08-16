import { ImageResponse } from "next/og";
import { getBrandFonts } from "@/lib/og-fonts";
import { BRAND_SOCIALS } from "@/lib/brand-links";
import { enforceRateLimit, clientIp, PRESETS } from "@/lib/rate-limit";

// Génère une slide de carrousel Instagram (1080x1350, ratio 4:5) à partir
// de texte passé en query string. Aucune donnée persistée : le générateur
// de contenu (components/coach/SocialGenerator.tsx) appelle cette route
// directement dans des <img src>, la même image est reconstruite à
// l'identique si l'URL est rappelée. Route publique par nécessité (une
// balise <img> ne peut pas envoyer de cookie de session côté fetch
// interne), donc protégée par un rate limit par IP plutôt qu'un guard
// d'auth — demande explicite du 2026-08-16 : respecter l'identité
// visuelle (rouge sombre), logo en haut, compte Instagram en bas.
export async function GET(request: Request) {
  const limited = await enforceRateLimit(
    `social-carousel:${clientIp(request)}`,
    PRESETS.upload.limit,
    PRESETS.upload.windowSeconds
  );
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") ?? "").slice(0, 200);
  const body = (searchParams.get("body") ?? "").slice(0, 400);
  const index = Math.max(1, Number(searchParams.get("index") ?? "1") || 1);
  const total = Math.max(index, Number(searchParams.get("total") ?? "1") || 1);
  const variant = searchParams.get("variant") === "hook" ? "hook" : "content";

  try {
    const fonts = await getBrandFonts();

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(155deg, #2b0202 0%, #150000 55%, #0D0000 100%)",
            padding: "72px 68px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 34, fontFamily: "Montserrat", fontWeight: 900, color: "#F5EDED", letterSpacing: -1 }}>
                EP
              </span>
              <span style={{ display: "flex", width: 7, height: 7, borderRadius: 999, background: "#E01E1E" }} />
              <span
                style={{
                  fontSize: 15,
                  fontFamily: "Montserrat",
                  fontWeight: 600,
                  color: "rgba(245,237,237,0.5)",
                  letterSpacing: 5,
                }}
              >
                COACHING
              </span>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 16,
                fontFamily: "Montserrat",
                fontWeight: 600,
                color: "rgba(245,237,237,0.45)",
                border: "2px solid rgba(224,30,30,0.4)",
                borderRadius: 999,
                padding: "8px 20px",
              }}
            >
              {index}/{total}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 30 }}>
            <div
              style={{
                display: "flex",
                fontSize: variant === "hook" ? 78 : 58,
                fontFamily: "Montserrat",
                fontWeight: 900,
                color: "#F5EDED",
                lineHeight: 1.08,
                letterSpacing: -2,
              }}
            >
              {title}
            </div>
            {body && (
              <div
                style={{
                  display: "flex",
                  fontSize: 30,
                  fontFamily: "Montserrat",
                  fontWeight: 600,
                  color: "rgba(245,237,237,0.65)",
                  lineHeight: 1.45,
                }}
              >
                {body}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontSize: 20, fontFamily: "Montserrat", fontWeight: 600, color: "rgba(245,237,237,0.4)" }}>
              {BRAND_SOCIALS.instagram.handle}
            </div>
            <div style={{ display: "flex", width: 44, height: 4, borderRadius: 999, background: "#E01E1E" }} />
          </div>
        </div>
      ),
      { width: 1080, height: 1350, fonts }
    );
  } catch (e) {
    console.error("social-carousel error:", e);
    return new Response("Erreur de génération de l'image", { status: 500 });
  }
}
