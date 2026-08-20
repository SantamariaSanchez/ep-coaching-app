import { createAdminClient } from "@/lib/supabase-admin";

// Axe 4 (VISION.md) : journal revenus/dépenses personnel du coach.
export interface FinanceEntry {
  id: string;
  coach_id: string;
  entry_date: string;
  kind: "revenu" | "depense";
  category: string;
  label: string;
  amount: number;
  note: string | null;
  created_at: string;
  /** "stripe" = importée auto (lib/coach-finance-stripe-import.ts), "manual" = saisie par le coach. */
  source: "manual" | "stripe";
}

export async function getCoachFinanceEntries(coachId: string): Promise<FinanceEntry[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_finance_entries")
      .select("id, coach_id, entry_date, kind, category, label, amount, note, created_at, source")
      .eq("coach_id", coachId)
      .order("entry_date", { ascending: false })
      .limit(500);
    return (data as FinanceEntry[]) ?? [];
  } catch {
    return [];
  }
}
