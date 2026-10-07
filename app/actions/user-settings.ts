"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getUser } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
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

/** Déconnecte la personne de tous ses appareils (téléphone perdu, ordinateur partagé). */
export async function signOutEverywhereAction(): Promise<{ error?: string }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    console.error("signOutEverywhereAction error:", error);
    return { error: "Déconnexion impossible, réessaie." };
  }
  return {};
}
