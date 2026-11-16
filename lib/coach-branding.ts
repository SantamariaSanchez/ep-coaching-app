// Marque personnalisée d'un coach Premium (200 €/mois) : son nom, sa couleur
// et son logo remplacent ceux d'EP Coaching dans l'appli de ses clients.
// Fichier pur, client et serveur.

export interface CoachBrand {
  name: string | null;
  color: string | null;
  logoUrl: string | null;
}

const HEX = /^#?([0-9a-f]{6})$/i;

/** « #aabbcc » en minuscules, ou null si la couleur n'est pas valide. */
export function normalizeHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.trim().match(HEX);
  return m ? `#${m[1].toLowerCase()}` : null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex)!.slice(1);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Mélange vers le blanc (0 = couleur, 1 = blanc). */
function lighten([r, g, b]: [number, number, number], t: number): [number, number, number] {
  return [r, g, b].map((c) => Math.round(c + (255 - c) * t)) as [number, number, number];
}

const toHex = (rgb: [number, number, number]) => `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;

/** Luminance relative (WCAG), 0 à 1. */
export function luminance(hex: string): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/**
 * Variables CSS à poser pour la couleur du coach. Une couleur trop sombre
 * disparaîtrait sur le fond sombre de l'appli : elle est éclaircie jusqu'à
 * rester lisible.
 */
export function brandCssVars(color: string | null): string | null {
  const hex = normalizeHex(color);
  if (!hex) return null;
  let rgb = hexToRgb(hex);
  for (let i = 0; i < 6 && luminance(toHex(rgb)) < 0.08; i++) rgb = lighten(rgb, 0.18);
  const hi = lighten(rgb, 0.25);
  const hi2 = lighten(rgb, 0.4);
  // !important : les thèmes (html[data-theme], html[data-accent]) ont un
  // sélecteur plus fort ; la couleur du coach doit passer devant.
  return [
    `--ep-accent: ${toHex(rgb)} !important;`,
    `--ep-accent-rgb: ${rgb.join(", ")} !important;`,
    `--ep-accent-hi: ${toHex(hi)} !important;`,
    `--ep-accent-hi-rgb: ${hi.join(", ")} !important;`,
    `--ep-accent-hi2: ${toHex(hi2)} !important;`,
    `--ep-accent-hi2-rgb: ${hi2.join(", ")} !important;`,
  ].join(" ");
}

export function cleanBrandName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/\s+/g, " ").trim().slice(0, 40);
  return s || null;
}

export const LOGO_MAX_BYTES = 1_048_576;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export function isAllowedLogo(type: string, size: number): boolean {
  return (LOGO_TYPES as readonly string[]).includes(type) && size > 0 && size <= LOGO_MAX_BYTES;
}

export function hasBrand(b: CoachBrand | null | undefined): boolean {
  return !!b && !!(b.name || normalizeHex(b.color) || b.logoUrl);
}
