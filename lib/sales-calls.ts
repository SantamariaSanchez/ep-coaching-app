import { createServerSupabase } from "@/lib/supabase-server";

export interface SalesCall {
  id: string;
  coach_id: string;
  lead_name: string;
  call_date: string; // "YYYY-MM-DD"
  show_up: boolean | null;
  closed: boolean | null;
  revenue_amount: number | null;
  notes: string | null;
  created_at: string;
}

// Tableau simple de suivi des appels de vente (voir migration
// 20260901b_sales_calls). Une ligne par coach, RLS déjà scoping sur
// coach_id = auth.uid(), donc un simple .select() suffit ici sans filtre
// explicite supplémentaire.
export async function getMySalesCalls(): Promise<SalesCall[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("sales_calls")
    .select("*")
    .order("call_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getMySalesCalls:", error.message);
    return [];
  }
  return (data as SalesCall[]) ?? [];
}
