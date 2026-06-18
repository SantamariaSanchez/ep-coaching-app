import { createAdminClient } from "@/lib/supabase-admin";

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body?: string;
  url?: string;
}

/** Insert a notification row for a given user. Fire-and-forget safe. */
export async function insertNotification({
  userId,
  type,
  title,
  body,
  url,
}: NotificationPayload): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    url: url ?? null,
  });
}

/** Returns the first profile with role='coach'. Used to notify the coach. */
export async function getCoachUserId(): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "coach")
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}
