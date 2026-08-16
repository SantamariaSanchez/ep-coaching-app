// Polices pour ImageResponse (next/og), utilisées par le générateur de
// carrousels Instagram (app/api/social-carousel/route.tsx). Satori
// n'accepte que ttf/otf/woff (voir node_modules/next/dist/docs/01-app/
// 03-api-reference/04-functions/image-response.md), alors que l'API css2
// de Google Fonts sert du woff2 par défaut aux navigateurs modernes. Le
// contournement standard : demander la feuille de style avec un
// User-Agent ancien qui ne déclare pas le support woff2, Google répond
// alors avec une URL .ttf directement utilisable.
const FONT_CACHE = new Map<string, ArrayBuffer>();
const LEGACY_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win32; x86) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.111 Safari/537.36";

async function fetchGoogleFontTtf(family: string, weight: number): Promise<ArrayBuffer> {
  const cacheKey = `${family}-${weight}`;
  const cached = FONT_CACHE.get(cacheKey);
  if (cached) return cached;

  const cssRes = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`,
    { headers: { "User-Agent": LEGACY_USER_AGENT } }
  );
  const css = await cssRes.text();
  const match = css.match(/url\((https:\/\/[^)]+\.ttf)\)/);
  if (!match) throw new Error(`Police introuvable : ${family} ${weight}`);
  const fontRes = await fetch(match[1]);
  const buffer = await fontRes.arrayBuffer();
  FONT_CACHE.set(cacheKey, buffer);
  return buffer;
}

// Deux graisses : 900 pour les titres (même effet que le logo EP sur le
// site), 600 pour le corps de texte et le handle. Mis en cache en mémoire
// de process (module scope) : sur Vercel une instance chaude sert de
// nombreuses requêtes sans jamais retélécharger, une instance froide paie
// le coût une seule fois pour ses propres requêtes suivantes.
export async function getBrandFonts() {
  const [black, semibold] = await Promise.all([
    fetchGoogleFontTtf("Montserrat", 900),
    fetchGoogleFontTtf("Montserrat", 600),
  ]);
  return [
    { name: "Montserrat", data: black, weight: 900 as const, style: "normal" as const },
    { name: "Montserrat", data: semibold, weight: 600 as const, style: "normal" as const },
  ];
}
