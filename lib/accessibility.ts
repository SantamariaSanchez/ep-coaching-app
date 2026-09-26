// Réglages d'accessibilité propres à l'appareil (taille du texte, mouvement
// réduit). Stockés en localStorage plutôt qu'en base : ce sont des besoins
// liés à l'écran utilisé (un téléphone tenu à bout de bras n'a pas les mêmes
// besoins qu'un ordinateur), et les lire côté serveur via un cookie ferait
// sortir toute l'appli du prérendu statique (voir le guide Next
// "preventing-flash-before-hydration"). Appliqués sur <html> par un script
// inline dans <head>, avant le premier rendu, pour éviter tout flash.

export type TextScale = "normal" | "large" | "xlarge";

export interface AccessibilitySettings {
  textScale: TextScale;
  reduceMotion: boolean;
}

export const ACCESSIBILITY_STORAGE_KEY = "ep-a11y";
export const ACCESSIBILITY_CHANGE_EVENT = "ep-a11y-change";

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  textScale: "normal",
  reduceMotion: false,
};

export const TEXT_SCALE_OPTIONS: { value: TextScale; label: string; hint: string }[] = [
  { value: "normal", label: "Normal", hint: "Taille par défaut" },
  { value: "large", label: "Grand", hint: "+12 %" },
  { value: "xlarge", label: "Très grand", hint: "+25 %" },
];

function isTextScale(v: unknown): v is TextScale {
  return v === "normal" || v === "large" || v === "xlarge";
}

export function readAccessibility(): AccessibilitySettings {
  if (typeof window === "undefined") return DEFAULT_ACCESSIBILITY;
  try {
    const raw = window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (!raw) return DEFAULT_ACCESSIBILITY;
    const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>;
    return {
      textScale: isTextScale(parsed.textScale) ? parsed.textScale : "normal",
      reduceMotion: parsed.reduceMotion === true,
    };
  } catch {
    return DEFAULT_ACCESSIBILITY;
  }
}

export function applyAccessibility(settings: AccessibilitySettings) {
  const root = document.documentElement;
  if (settings.textScale === "normal") root.removeAttribute("data-text-scale");
  else root.setAttribute("data-text-scale", settings.textScale);
  if (settings.reduceMotion) root.setAttribute("data-reduce-motion", "true");
  else root.removeAttribute("data-reduce-motion");
}

export function saveAccessibility(settings: AccessibilitySettings) {
  try {
    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Navigation privée ou stockage bloqué : le réglage s'applique quand
    // même à la session en cours, il ne sera juste pas retenu.
  }
  applyAccessibility(settings);
  window.dispatchEvent(new CustomEvent(ACCESSIBILITY_CHANGE_EVENT, { detail: settings }));
}

// Même logique que readAccessibility + applyAccessibility, en ES5 minifié
// pour tourner en synchrone dans <head> avant l'hydratation.
export const ACCESSIBILITY_INIT_SCRIPT = `(function(){try{var r=localStorage.getItem("${ACCESSIBILITY_STORAGE_KEY}");if(!r)return;var s=JSON.parse(r),d=document.documentElement;if(s.textScale==="large"||s.textScale==="xlarge")d.setAttribute("data-text-scale",s.textScale);if(s.reduceMotion===true)d.setAttribute("data-reduce-motion","true")}catch(e){}})()`;
