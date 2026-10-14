// Couleurs de thème : les couleurs de l'appli sont des variables CSS
// (var(--ep-accent)...) définies dans app/globals.css. L'apparence se choisit
// en deux temps (recommandation de Clara : « laisse la personne choisir
// vraiment son app ») : le fond (sombre ou clair) et la couleur (rouge,
// rose, bleu, vert, violet, orange). Les anciens codes concaténaient une
// opacité hexadécimale à une couleur (`${color}33`), ce qui ne marche pas
// avec une variable : withAlpha gère les deux cas.

export function withAlpha(color: string | null | undefined, alphaHex: string): string {
  if (!color) return "transparent";
  const alpha = Math.round((parseInt(alphaHex, 16) / 255) * 1000) / 1000;
  const v = color.match(/^var\(--ep-([a-z0-9-]+)\)$/);
  if (v) return `rgba(var(--ep-${v[1]}-rgb),${alpha})`;
  if (/^#[0-9a-f]{6}$/i.test(color)) return color + alphaHex;
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    const [r, g, b] = color.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
}

export type Mode = "sombre" | "claire";
export type Accent = "rouge" | "rose" | "bleu" | "vert" | "violet" | "orange";
export type Appearance = { mode: Mode; accent: Accent };

export const MODES: { key: Mode; label: string }[] = [
  { key: "sombre", label: "Sombre" },
  { key: "claire", label: "Clair" },
];

/** [couleur sur fond sombre, couleur sur fond clair, fond sombre, fond clair] */
export const ACCENTS: { key: Accent; label: string; dark: string; light: string; bgDark: string; bgLight: string }[] = [
  { key: "rouge", label: "Rouge", dark: "#E01E1E", light: "#D7262E", bgDark: "#0D0000", bgLight: "#F7F3F2" },
  { key: "rose", label: "Rose", dark: "#EC4899", light: "#D64F7F", bgDark: "#0D0008", bgLight: "#FDF5F6" },
  { key: "bleu", label: "Bleu", dark: "#2F7BF6", light: "#1F63D6", bgDark: "#00040D", bgLight: "#F4F6FA" },
  { key: "vert", label: "Vert", dark: "#19B36B", light: "#138A52", bgDark: "#000D05", bgLight: "#F3F7F4" },
  { key: "violet", label: "Violet", dark: "#8B5CF6", light: "#6D3FD9", bgDark: "#06000D", bgLight: "#F6F4FB" },
  { key: "orange", label: "Orange", dark: "#F97316", light: "#D9600C", bgDark: "#0D0500", bgLight: "#FAF5F1" },
];

export const DEFAULT_APPEARANCE: Appearance = { mode: "sombre", accent: "rouge" };
export const APPEARANCE_STORAGE_KEY = "ep-appearance";
/** Ancienne clé (sombre / claire / douce), relue pour ne perdre aucun choix. */
export const AMBIANCE_STORAGE_KEY = "ep-ambiance";

const isMode = (v: unknown): v is Mode => v === "sombre" || v === "claire";
const isAccent = (v: unknown): v is Accent => ACCENTS.some((a) => a.key === v);

/** « claire:bleu » → { mode, accent }. Accepte aussi les anciennes valeurs. */
export function parseAppearance(raw: string | null | undefined): Appearance | null {
  if (!raw) return null;
  if (raw === "douce") return { mode: "claire", accent: "rose" };
  if (raw === "claire" || raw === "sombre") return { mode: raw, accent: "rouge" };
  const [m, a] = raw.split(":");
  return isMode(m) && isAccent(a) ? { mode: m, accent: a } : null;
}

export const serializeAppearance = (a: Appearance) => `${a.mode}:${a.accent}`;

/** Fond « rose poudré » historique : clair + rose. */
function themeAttr(a: Appearance): string | null {
  if (a.mode === "sombre") return null;
  return a.accent === "rose" ? "douce" : "claire";
}

export function appearanceThemeColor(a: Appearance): string {
  const acc = ACCENTS.find((x) => x.key === a.accent) ?? ACCENTS[0];
  return a.mode === "sombre" ? acc.bgDark : acc.bgLight;
}

// Posé dans <head> avant l'affichage : l'apparence choisie s'applique dès la
// première image, sans flash noir puis clair.
export const AMBIANCE_INIT_SCRIPT = `(function(){try{var A=${JSON.stringify(
  Object.fromEntries(ACCENTS.map((a) => [a.key, [a.bgDark, a.bgLight]])),
)};var r=localStorage.getItem("${APPEARANCE_STORAGE_KEY}")||"",o=localStorage.getItem("${AMBIANCE_STORAGE_KEY}");var m="sombre",c="rouge";if(r.indexOf(":")>0){m=r.split(":")[0];c=r.split(":")[1]}else if(o==="claire"){m="claire"}else if(o==="douce"){m="claire";c="rose"}if(!A[c])c="rouge";var h=document.documentElement;if(m==="claire")h.setAttribute("data-theme",c==="rose"?"douce":"claire");if(c!=="rouge")h.setAttribute("data-accent",c);var col=A[c][m==="claire"?1:0];var t=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<t.length;i++)t[i].setAttribute("content",col)}catch(e){}})()`;

/** Applique une apparence tout de suite et la retient sur cet appareil. */
export function applyAppearance(a: Appearance): void {
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, serializeAppearance(a));
    localStorage.removeItem(AMBIANCE_STORAGE_KEY);
  } catch {}
  const html = document.documentElement;
  const theme = themeAttr(a);
  if (theme) html.setAttribute("data-theme", theme);
  else html.removeAttribute("data-theme");
  if (a.accent === "rouge") html.removeAttribute("data-accent");
  else html.setAttribute("data-accent", a.accent);
  const color = appearanceThemeColor(a);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
}

export function currentAppearance(): Appearance {
  if (typeof document === "undefined") return DEFAULT_APPEARANCE;
  const html = document.documentElement;
  const theme = html.getAttribute("data-theme");
  const accent = html.getAttribute("data-accent");
  return {
    mode: theme === "claire" || theme === "douce" ? "claire" : "sombre",
    accent: isAccent(accent) ? accent : theme === "douce" ? "rose" : "rouge",
  };
}
