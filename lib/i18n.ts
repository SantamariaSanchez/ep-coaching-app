// Traduction (2026-10-07) : retour direct du fondateur, « mettre l'appli en
// français ou en anglais, c'est hyper important ». Sans dépendance : la phrase
// française sert de clé, `t("Aujourd'hui")` renvoie « Today » en anglais.
// Un texte pas encore traduit reste en français plutôt que d'afficher une clé
// technique, ce qui permet de traduire l'appli écran par écran.
//
// Variables : `t("{n} articles", { n: 3 })`.
// Fichier partagé serveur/client, sans import serveur.
import { EN } from "@/lib/i18n-en";

export type Locale = "fr" | "en";
export const LOCALES: { value: Locale; label: string; native: string }[] = [
  { value: "fr", label: "Français", native: "Français" },
  { value: "en", label: "Anglais", native: "English" },
];
export const LOCALE_COOKIE = "ep-locale";

export function isLocale(v: unknown): v is Locale {
  return v === "fr" || v === "en";
}

export type Translator = (fr: string, vars?: Record<string, string | number>) => string;

export function makeT(locale: Locale): Translator {
  return (fr, vars) => {
    let out = locale === "en" ? (EN[fr] ?? fr) : fr;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
    return out;
  };
}

/** Format de date et de nombre selon la langue. */
export function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-GB" : "fr-FR";
}
