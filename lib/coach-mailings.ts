import { createAdminClient } from "@/lib/supabase-admin";

export interface CoachMailing {
  id: string;
  subject: string;
  recipient_count: number;
  status: "sent" | "failed";
  created_at: string;
}

export async function getCoachMailingHistory(coachId: string): Promise<CoachMailing[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_mailings")
      .select("id, subject, recipient_count, status, created_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as CoachMailing[]) ?? [];
  } catch {
    return [];
  }
}
