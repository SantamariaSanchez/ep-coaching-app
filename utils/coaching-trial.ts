import { createAdminClient } from "@/lib/supabase-admin";

// Item 43 : lecture ciblée de trial_ends_at, comme utils/referrals.ts —
// pas ajouté à PROFILE_FIELDS/getProfile pour ne pas alourdir le fetch de
// profil utilisé partout dans l'appli avec une colonne que seul le
// dashboard client consulte.
export async function getTrialDaysLeft(userId: string): Promise<number | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("trial_ends_at")
      .eq("id", userId)
      .maybeSingle();
    const endsAt = (data as { trial_ends_at: string | null } | null)?.trial_ends_at;
    if (!endsAt) return null;
    const days = Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000);
    return days > 0 ? days : null;
  } catch {
    return null;
  }
}
