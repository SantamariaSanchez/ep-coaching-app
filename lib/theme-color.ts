// Couleurs de thème (2026-10-13) : les couleurs de l'appli sont des
// variables CSS (var(--ep-accent)...) définies par ambiance dans
// app/globals.css (sombre, claire, douce). Les anciens codes concaténaient
// une opacité hexadécimale à une couleur (`${color}33`), ce qui ne marche
// pas avec une variable : withAlpha gère les deux cas.

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

export type Ambiance = "sombre" | "claire" | "douce";

export const AMBIANCES: { key: Ambiance; label: string; hint: string; swatch: [string, string, string] }[] = [
  { key: "claire", label: "Claire", hint: "Fond clair, lisible partout, même en plein soleil.", swatch: ["#F7F3F2", "#FFFFFF", "#D7262E"] },
  { key: "douce", label: "Douce", hint: "Rose poudré, ambiance plus chaleureuse.", swatch: ["#FDF5F6", "#FFFFFF", "#D64F7F"] },
  { key: "sombre", label: "Sombre", hint: "Noir et rouge, l'ambiance d'origine.", swatch: ["#0D0000", "#1F0101", "#E01E1E"] },
];

export const AMBIANCE_STORAGE_KEY = "ep-ambiance";

/** Couleur de la barre du téléphone selon l'ambiance. */
export const AMBIANCE_THEME_COLOR: Record<Ambiance, string> = { sombre: "#0D0000", claire: "#F7F3F2", douce: "#FDF5F6" };

// Posé dans <head> avant l'affichage : l'ambiance choisie s'applique dès la
// première image, sans flash noir puis clair.
export const AMBIANCE_INIT_SCRIPT = `(function(){try{var a=localStorage.getItem("${AMBIANCE_STORAGE_KEY}");if(a==="claire"||a==="douce"){document.documentElement.setAttribute("data-theme",a);var c=a==="douce"?"#FDF5F6":"#F7F3F2";var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++)m[i].setAttribute("content",c)}}catch(e){}})()`;

/** Applique une ambiance tout de suite et la retient sur cet appareil. */
export function applyAmbiance(a: Ambiance): void {
  try {
    localStorage.setItem(AMBIANCE_STORAGE_KEY, a);
  } catch {}
  const html = document.documentElement;
  if (a === "sombre") html.removeAttribute("data-theme");
  else html.setAttribute("data-theme", a);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", AMBIANCE_THEME_COLOR[a]));
}

export function currentAmbiance(): Ambiance {
  if (typeof document === "undefined") return "sombre";
  const t = document.documentElement.getAttribute("data-theme");
  return t === "claire" || t === "douce" ? t : "sombre";
}
