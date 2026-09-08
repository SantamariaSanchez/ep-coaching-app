import { insertNotification } from "@/utils/insert-notification";
import { sendPushToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase-admin";
import { shouldSendPush, type NotificationPreferences } from "@/lib/notification-preferences";

export interface NotifyParams {
  type: string;
  title: string;
  body?: string;
  url?: string;
  /** Qui a déclenché la notification, pour l'affichage (prénom + badge de rôle). */
  senderId?: string;
}

// Combine la notif in-app (cloche, toujours enregistrée, jamais coupée par
// les préférences — c'est l'historique complet) et le push (silencieux si
// l'utilisateur n'a pas de souscription, hors heures de silence, OU si la
// catégorie de ce type de notification est désactivée dans ses préférences,
// voir lib/notification-preferences.ts). Fire-and-forget safe : n'importe
// jamais, donc ne doit jamais bloquer l'action qui l'appelle.
export async function notifyUser(userId: string, params: NotifyParams): Promise<void> {
  let prefs: NotificationPreferences | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("notification_preferences")
      .eq("id", userId)
      .maybeSingle();
    prefs = (data?.notification_preferences as NotificationPreferences | null) ?? null;
  } catch {
    // Lecture échouée : on ne bloque jamais une notification pour ça, le
    // push part comme si aucune catégorie n'était coupée (comportement
    // d'avant l'existence des préférences).
  }

  await Promise.allSettled([
    insertNotification({ userId, ...params }),
    shouldSendPush(prefs, params.type)
      ? sendPushToUser(userId, params.title, params.body ?? "", params.url)
      : Promise.resolve({ ok: false, reason: "category muted" as const }),
  ]);
}

export async function notifyUsers(userIds: string[], params: NotifyParams): Promise<void> {
  await Promise.allSettled(userIds.map((userId) => notifyUser(userId, params)));
}
