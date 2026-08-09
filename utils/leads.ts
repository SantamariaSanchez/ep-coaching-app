import { createAdminClient } from "@/lib/supabase-admin";

export interface Lead {
  id: string;
  lead_magnet_slug: string;
  email: string | null;
  phone: string | null;
  source: string;
  created_at: string;
}

// Donnée plateforme (pas des clients d'un coach en particulier) — lue avec
// le client admin, jamais exposée en dehors de l'écran réservé au
// propriétaire de la plateforme (voir app/dashboard/coach/admin/leads).
export async function getAllLeads(): Promise<Lead[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("leads")
      .select("id, lead_magnet_slug, email, phone, source, created_at")
      .order("created_at", { ascending: false });
    return (data as Lead[]) ?? [];
  } catch {
    return [];
  }
}
