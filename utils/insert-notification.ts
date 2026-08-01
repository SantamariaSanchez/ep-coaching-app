import { createAdminClient } from "@/lib/supabase-admin";

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
