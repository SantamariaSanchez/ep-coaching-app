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
  source: "manual" | "stripe" | "import";
}

/** Réglages du tableau : objectif du mois, taux de cotisations (en %), prix de l'offre principale. */
export interface FinanceSettings {
  monthly_goal: number | null;
  contribution_rate: number | null;
  offer_price: number | null;
}

export async function getCoachFinanceSettings(coachId: string): Promise<FinanceSettings> {
  const empty: FinanceSettings = { monthly_goal: null, contribution_rate: null, offer_price: null };
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_finance_settings")
      .select("monthly_goal, contribution_rate, offer_price")
      .eq("coach_id", coachId)
      .maybeSingle();
    if (!data) return empty;
    const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
    return { monthly_goal: num(data.monthly_goal), contribution_rate: num(data.contribution_rate), offer_price: num(data.offer_price) };
  } catch {
    return empty;
  }
}

export async function getCoachFinanceEntries(coachId: string): Promise<FinanceEntry[]> {
  try {
    // Un relevé bancaire importé ajoute vite des centaines de lignes : on lit
    // par pages de 1 000 (plafond Supabase), jusqu'à 5 000 lignes.
    const admin = createAdminClient();
    const out: FinanceEntry[] = [];
    for (let from = 0; from < 5000; from += 1000) {
      const { data } = await admin
        .from("coach_finance_entries")
        .select("id, coach_id, entry_date, kind, category, label, amount, note, created_at, source")
        .eq("coach_id", coachId)
        .order("entry_date", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + 999);
      const page = (data as FinanceEntry[]) ?? [];
      out.push(...page.map((e) => ({ ...e, amount: Number(e.amount) })));
      if (page.length < 1000) break;
    }
    return out;
  } catch {
    return [];
  }
}
