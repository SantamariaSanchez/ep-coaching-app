import { EN } from "@/lib/i18n-en";
import { isLocale, type Locale } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase-admin";

// Notifications dans la langue de la personne qui les REÇOIT (2026-10-08).
// Une notification part souvent d'une action de quelqu'un d'autre (le coach
// valide un plan, un cron tourne la nuit) : la langue de la requête en cours
// ne dit rien de celle du destinataire. On la lit donc sur son compte :
// son choix explicite (Paramètres > Langue), sinon la dernière langue dans
// laquelle l'appli s'est affichée chez lui (langue du téléphone, retenue par
// components/i18n/LocaleSync.tsx), sinon le français.
//
// Les textes restent écrits en français dans le code : la traduction se fait
// ici, au dernier moment, avec le même dictionnaire que l'interface. Les
// textes qui contiennent un prénom ou un chiffre sont retrouvés grâce aux
// clés à variables du dictionnaire (« Bilan quotidien de {name} »). Un texte
// sans traduction part tel quel, en français, jamais une clé technique.

const CACHE_MS = 5 * 60 * 1000;
const localeCache = new Map<string, { locale: Locale; at: number }>();

export async function recipientLocale(userId: string): Promise<Locale> {
  const hit = localeCache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.locale;
  let locale: Locale = "fr";
  try {
    const { data } = await createAdminClient()
      .from("user_settings")
      .select("locale, ui_locale")
      .eq("user_id", userId)
      .maybeSingle();
    if (isLocale(data?.locale)) locale = data.locale;
    else if (isLocale(data?.ui_locale)) locale = data.ui_locale;
  } catch {
    // Lecture impossible : la notification part en français plutôt que pas du tout.
  }
  localeCache.set(userId, { locale, at: Date.now() });
  return locale;
}

interface Template {
  re: RegExp;
  names: string[];
  en: string;
}

let templates: Template[] | null = null;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Clés à variables du dictionnaire, transformées une seule fois en motifs.
// Les plus précises d'abord (plus de texte fixe), et jamais un motif presque
// vide qui avalerait n'importe quelle phrase.
function getTemplates(): Template[] {
  if (templates) return templates;
  const list: (Template & { weight: number })[] = [];
  for (const [fr, en] of Object.entries(EN)) {
    if (!/\{\w+\}/.test(fr)) continue;
    const parts = fr.split(/\{(\w+)\}/);
    const literals = parts.filter((_, i) => i % 2 === 0);
    const weight = literals.join("").replace(/\s/g, "").length;
    if (weight < 4) continue;
    const names = parts.filter((_, i) => i % 2 === 1);
    const source = parts.map((p, i) => (i % 2 === 0 ? escapeRe(p) : "(.*?)")).join("");
    list.push({ re: new RegExp(`^${source}$`, "s"), names, en, weight });
  }
  list.sort((a, b) => b.weight - a.weight);
  templates = list;
  return templates;
}

/** Traduit un texte de notification écrit en français vers `locale`. */
export function translateNotificationText(locale: Locale, text: string): string {
  if (locale === "fr" || !text) return text;
  const exact = EN[text];
  if (exact) return exact;
  for (const tpl of getTemplates()) {
    const m = tpl.re.exec(text);
    if (!m) continue;
    let out = tpl.en;
    tpl.names.forEach((name, i) => {
      // Une valeur elle-même traduisible (« demain », un libellé connu) suit.
      const value = m[i + 1];
      out = out.split(`{${name}}`).join(EN[value.trim()] ? value.replace(value.trim(), EN[value.trim()]) : value);
    });
    return out;
  }
  return text;
}

/** Titre et texte d'une notification, dans la langue du destinataire. */
export async function localizeForRecipient(
  userId: string,
  title: string,
  body: string
): Promise<{ title: string; body: string }> {
  const locale = await recipientLocale(userId);
  if (locale === "fr") return { title, body };
  return {
    title: translateNotificationText(locale, title),
    body: translateNotificationText(locale, body),
  };
}
