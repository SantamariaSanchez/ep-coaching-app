"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getUser } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

// Réglages du compte (table user_settings) : langue et baisse automatique
// du stock de courses. Ceux propres à un appareil sont dans
// lib/device-settings.ts.

export interface UserSettings {
  locale: Locale;
  pantryAuto: boolean;
}

export async function getUserSettingsAction(): Promise<UserSettings> {
  const user = await getUser();
  const fallback: UserSettings = { locale: "fr", pantryAuto: true };
  if (!user) return fallback;
  const { data } = await createAdminClient()
    .from("user_settings")
    .select("locale, pantry_auto")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return fallback;
  return { locale: isLocale(data.locale) ? data.locale : "fr", pantryAuto: data.pantry_auto !== false };
}

async function upsert(userId: string, patch: Record<string, unknown>) {
  return createAdminClient()
    .from("user_settings")
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}

/** Change la langue : cookie (lu au rendu) + compte (suit la personne sur ses autres appareils). */
export async function setLocaleAction(locale: string): Promise<{ error?: string }> {
  if (!isLocale(locale)) return { error: "Langue inconnue." };
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const { error } = await upsert(user.id, { locale });
  if (error) console.error("setLocaleAction error:", error);
  revalidatePath("/", "layout");
  return {};
}

export async function setPantryAutoAction(enabled: boolean): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };
  const { error } = await upsert(user.id, { pantry_auto: !!enabled });
  if (error) {
    console.error("setPantryAutoAction error:", error);
    return { error: "Enregistrement impossible, réessaie." };
  }
  return {};
}

/**
 * Retient la langue dans laquelle l'appli s'affiche sur l'appareil de la
 * personne (son choix, sinon la langue du téléphone). Sert uniquement aux
 * notifications envoyées sans elle (voir lib/notification-i18n.ts) : ne
 * remplace jamais un choix explicite, rangé à part dans `locale`.
 */
export async function rememberUiLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const user = await getUser();
  if (!user) return;
  const { error } = await upsert(user.id, { ui_locale: locale });
  if (error) console.error("rememberUiLocaleAction error:", error);
}

/** Fuseau horaire de l'appareil (envoyé tout seul au lancement de l'appli). */
export async function setTimezoneAction(tz: string): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };
  if (typeof tz !== "string" || tz.length > 64) return { error: "Fuseau invalide." };
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    return { error: "Fuseau invalide." };
  }
  const { error } = await upsert(user.id, { timezone: tz });
  if (error) console.error("setTimezoneAction error:", error);
  return {};
}
