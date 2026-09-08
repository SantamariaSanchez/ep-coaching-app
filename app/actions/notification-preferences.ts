"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  MUTABLE_CATEGORIES,
  type NotificationCategory,
  type NotificationPreferences,
} from "@/lib/notification-preferences";

// Même pattern que app/actions/quiet-hours.ts : une action, un update ciblé,
// pas de flot d'écriture séparé par catégorie.
export async function setNotificationCategoryMuted(
  category: NotificationCategory,
  muted: boolean
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  if (!(MUTABLE_CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Catégorie invalide." };
  }

  const supabase = await createServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", guard.userId)
    .maybeSingle();

  const prefs: NotificationPreferences = { ...(profile?.notification_preferences ?? {}) };
  if (muted) prefs[category] = true;
  else delete prefs[category];

  const { error } = await supabase
    .from("profiles")
    .update({ notification_preferences: prefs })
    .eq("id", guard.userId);
  if (error) return { error: "Erreur lors de l'enregistrement." };

  revalidatePath("/dashboard/client/parametres");
  revalidatePath("/dashboard/coach/parametres");
  return { success: true };
}
