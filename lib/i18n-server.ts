import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase-admin";
import { isLocale, LOCALE_COOKIE, makeT, type Locale, type Translator } from "@/lib/i18n";

/**
 * Langue de l'interface, lue dans le cookie posé par Paramètres > Langue.
 * Sans cookie (nouvel appareil), on reprend le choix enregistré sur le compte.
 */
export async function getLocale(userId?: string): Promise<Locale> {
  try {
    const v = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(v)) return v;
  } catch {
    return "fr";
  }
  if (!userId) return "fr";
  try {
    const { data } = await createAdminClient().from("user_settings").select("locale").eq("user_id", userId).maybeSingle();
    return isLocale(data?.locale) ? data.locale : "fr";
  } catch {
    return "fr";
  }
}

export async function getT(): Promise<Translator> {
  return makeT(await getLocale());
}
