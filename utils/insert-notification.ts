import { createAdminClient } from "@/lib/supabase-admin";
import { startOfTodayInParis } from "@/lib/dates";

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body?: string;
  url?: string;
  /** Qui a déclenché la notification — affiché (prénom + badge de rôle)
   * dans la cloche de notifications. Absent = notification système. */
  senderId?: string;
}

/** Insert a notification row for a given user. Fire-and-forget safe. */
export async function insertNotification({
  userId,
  type,
  title,
  body,
  url,
  senderId,
}: NotificationPayload): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    url: url ?? null,
    sender_id: senderId ?? null,
  });
}

/**
 * True si une notification de ce type, envoyée par ce senderId, a déjà été
 * créée aujourd'hui pour userId. Utilisé pour les triggers déclenchés par
 * des actions répétées dans la journée (log nutrition, pas...) — sans ce
 * garde-fou, chaque appel enverrait une nouvelle notification/push et
 * noierait vite le coach sous les doublons du même événement.
 */
export async function alreadyNotifiedToday(
  userId: string,
  type: string,
  senderId?: string
): Promise<boolean> {
  const supabase = createAdminClient();
  // MASTERCLASS.md Axe L : minuit UTC, pas minuit Paris — voir
  // lib/dates.ts, startOfTodayInParis().
  const todayStart = startOfTodayInParis();

  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", todayStart.toISOString());
  if (senderId) query = query.eq("sender_id", senderId);

  const { count } = await query;
  return (count ?? 0) > 0;
}

/**
 * Returns the coach ASSIGNED to a given client — jamais "un" coach au
 * hasard : en multi-coach, notifier le mauvais coach serait une vraie
 * fuite (il verrait qu'un client qui n'est pas le sien vient d'agir).
 */
export async function getCoachForClient(
  clientId: string
): Promise<{ id: string; email: string | null } | null> {
  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from("profiles")
    .select("coach_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client?.coach_id) return null;

  const { data: coach } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", client.coach_id)
    .maybeSingle();
  return (coach as { id: string; email: string | null } | null) ?? null;
}
