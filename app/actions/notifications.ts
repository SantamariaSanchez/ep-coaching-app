"use server"

import { requireAuth } from "@/lib/auth-guards"
import { sendPushToUser } from "@/lib/push"
import { createAdminClient } from "@/lib/supabase-admin"
import { localParts, safeTimeZone } from "@/lib/schedule-time"

// Server actions de test des notifications (Paramètres), appelées depuis le
// navigateur et limitées au compte connecté. Les emails/notifs coach <->
// client (correction, photo update, demande de guide) ne sont plus ici :
// exportés comme server actions, ils restaient appelables depuis n'importe
// quel navigateur avec un destinataire choisi — voir
// lib/coach-client-notify.ts.

// Nouveau (retour direct 2026-09-09, "ajoute des fonctionnalités auxquelles
// on n'a pas encore pensé" sur Paramètres) : aucun moyen de vérifier que les
// notifications push arrivent VRAIMENT (son, vibration, bannière) sans
// attendre qu'un vrai événement se déclenche — pertinent en particulier
// après l'historique "réveil sans son" (voir schedule-block-notify). Un
// simple aller-retour sur soi-même, jamais vers un autre compte.
export async function sendTestPush(): Promise<{ ok: boolean; reason?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { ok: false, reason: guard.error };
  return sendPushToUser(
    guard.userId,
    "🔔 Notification de test",
    "Si tu vois ceci avec un son ou une vibration, tes notifications push fonctionnent.",
    "/dashboard/coach/parametres"
  );
}

// Test « écran verrouillé » (2026-10-08, retour direct : « les notifs
// n'arrivent que quand j'ouvre l'appli »). Le serveur envoie pile à l'heure,
// c'est le téléphone qui retient la notif tant que Chrome est endormi par
// l'économie de batterie. Un test immédiat ne prouve rien (l'appli est
// ouverte) : on programme une notif dans 2 minutes, via le même circuit que
// l'agenda (bloc ponctuel notifié par le cron), pour verrouiller le
// téléphone et vérifier qu'elle arrive vraiment, appli fermée.
export async function scheduleLockedTestPush(): Promise<{ ok: boolean; at?: string; error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { ok: false, error: guard.error };
  const admin = createAdminClient();
  const { data: settings } = await admin.from("user_settings").select("timezone").eq("user_id", guard.userId).maybeSingle();
  const tz = safeTimeZone((settings as { timezone?: string | null } | null)?.timezone ?? null);
  // Cron à la minute (migration 20261013b) : 2 minutes de marge pour que la
  // personne ait le temps de verrouiller son téléphone.
  const target = new Date(Date.now() + 2 * 60000);
  target.setUTCSeconds(0, 0);
  const local = localParts(target, tz);
  const [h, m] = local.time.split(":").map(Number);
  const end = `${String(Math.min(23, h + (m + 5 >= 60 ? 1 : 0))).padStart(2, "0")}:${String((m + 5) % 60).padStart(2, "0")}`;
  const { error } = await admin.from("schedule_blocks").insert({
    owner_id: guard.userId,
    day_of_week: local.isoDow,
    specific_date: local.date,
    start_time: `${local.time}:00`,
    end_time: `${end}:00`,
    label: "Test de notification, appli fermée",
    icon: "pause",
    notify: true,
  });
  if (error) {
    console.error("scheduleLockedTestPush error:", error);
    return { ok: false, error: "Impossible de programmer le test." };
  }
  return { ok: true, at: local.time };
}
