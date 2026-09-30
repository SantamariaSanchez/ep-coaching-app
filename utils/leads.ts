import { createAdminClient } from "@/lib/supabase-admin";

export type LeadStatus = "nouveau" | "contacte" | "interesse" | "converti" | "perdu";

export interface Lead {
  id: string;
  lead_magnet_slug: string;
  email: string | null;
  phone: string | null;
  source: string;
  created_at: string;
  /** Email de qualification envoyé par l'agent Setter (lib/lead-qualification.ts), ou null si pas encore/pas d'email. */
  qualification_sent_at: string | null;
  /** Pipeline de suivi manuel (20260909b_leads_pipeline.sql) — "nouveau" par défaut tant que le coach n'a rien changé. */
  status: LeadStatus;
  coach_note: string | null;
  status_updated_at: string | null;
  /** Origine réelle (20260930i_leads_origin.sql, lib/lead-origin.ts) — null pour les leads plus anciens ou sans signal. */
  origin_platform: string | null;
  origin_script_id: string | null;
  origin_referrer: string | null;
}

// Donnée plateforme (pas des clients d'un coach en particulier) — lue avec
// le client admin, jamais exposée en dehors de l'écran réservé au
// propriétaire de la plateforme (voir app/dashboard/coach/admin/leads).
export async function getAllLeads(): Promise<Lead[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("leads")
      .select("id, lead_magnet_slug, email, phone, source, created_at, qualification_sent_at, status, coach_note, status_updated_at, origin_platform, origin_script_id, origin_referrer")
      .order("created_at", { ascending: false });
    // Bug réel trouvé le 2026-08-31 : cette erreur n'était jamais vérifiée,
    // donc une colonne manquante (qualification_sent_at, voir migration
    // 20260831_leads_qualification_sent_at) échouait silencieusement et la
    // page Leads affichait "0 lead" en permanence malgré des leads réels en
    // base, sans la moindre trace dans les logs.
    if (error) {
      console.error("getAllLeads:", error.message);
      return [];
    }
    return (data as Lead[]) ?? [];
  } catch (e) {
    console.error("getAllLeads:", e);
    return [];
  }
}
