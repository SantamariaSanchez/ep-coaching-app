// Thème clair/sombre + accent personnalisé — persistés en localStorage
// (préférence par appareil, pas de colonne DB nécessaire). Le script
// d'initialisation (voir THEME_INIT_SCRIPT) applique la préférence avant le
// premier paint pour éviter le flash de mauvais thème.

export type ThemeMode = "dark" | "light";

export const THEME_MODE_KEY = "ep-theme-mode";
export const THEME_ACCENT_KEY = "ep-theme-accent";

export const DEFAULT_ACCENT = "#E01E1E";

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Assombrit une couleur hex d'un facteur (0-1, ex: 0.35 = 35% plus sombre). */
function darken(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
}

export interface AccentShades {
  red: string;
  darkRed: string;
  medRed: string;
  redRgb: string;
  darkRedRgb: string;
  medRedRgb: string;
}

export function deriveAccentShades(accentHex: string): AccentShades {
  const darkRed = darken(accentHex, 0.62);
  const medRed = darken(accentHex, 0.22);
  const rgb = (h: string) => {
    const v = hexToRgb(h);
    return v ? `${v[0]} ${v[1]} ${v[2]}` : "224 30 30";
  };
  return {
    red: accentHex,
    darkRed,
    medRed,
    redRgb: rgb(accentHex),
    darkRedRgb: rgb(darkRed),
    medRedRgb: rgb(medRed),
  };
}

export function applyAccentToRoot(accentHex: string) {
  const shades = deriveAccentShades(accentHex);
  const root = document.documentElement.style;
  root.setProperty("--color-ep-red", shades.red);
  root.setProperty("--color-ep-dark-red", shades.darkRed);
  root.setProperty("--color-ep-med-red", shades.medRed);
  root.setProperty("--color-ep-red-rgb", shades.redRgb);
  root.setProperty("--color-ep-dark-red-rgb", shades.darkRedRgb);
  root.setProperty("--color-ep-med-red-rgb", shades.medRedRgb);
}

// Le script tourne avant tout React, écrit en JS brut (pas de TS/JSX) et
// injecté tel quel via next/script strategy="beforeInteractive". Duplique
// volontairement une version minimale de deriveAccentShades/darken
// ci-dessus (un literal de script ne peut pas importer ce module).
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var mode = localStorage.getItem("${THEME_MODE_KEY}") || "dark";
    var accent = localStorage.getItem("${THEME_ACCENT_KEY}");
    var root = document.documentElement;
    root.setAttribute("data-theme", mode);
    if (accent) {
      function hexToRgb(hex) {
        var m = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex.trim());
        return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
      }
      function rgbToHex(r, g, b) {
        function c(n) { return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0"); }
        return "#" + c(r) + c(g) + c(b);
      }
      function darken(hex, factor) {
        var rgb = hexToRgb(hex);
        if (!rgb) return hex;
        return rgbToHex(rgb[0] * (1 - factor), rgb[1] * (1 - factor), rgb[2] * (1 - factor));
      }
      function rgbStr(hex) {
        var v = hexToRgb(hex);
        return v ? v[0] + " " + v[1] + " " + v[2] : "224 30 30";
      }
      var darkRed = darken(accent, 0.62);
      var medRed = darken(accent, 0.22);
      root.style.setProperty("--color-ep-red", accent);
      root.style.setProperty("--color-ep-dark-red", darkRed);
      root.style.setProperty("--color-ep-med-red", medRed);
      root.style.setProperty("--color-ep-red-rgb", rgbStr(accent));
      root.style.setProperty("--color-ep-dark-red-rgb", rgbStr(darkRed));
      root.style.setProperty("--color-ep-med-red-rgb", rgbStr(medRed));
    }
  } catch (e) {}
})();
`;
