import { createAdminClient } from "@/lib/supabase-admin";

// Réseau & partenariats du coach (Axe 6, passe "masterclass" 2026-09-09) :
// CRM léger distinct de la table leads (données plateforme, captées sur
// /ressources) — ici, ce sont les contacts pro que LE COACH construit
// lui-même (partenaires, affiliés, influenceurs...), jamais une donnée
// captée automatiquement.

export type ContactCategory = "partenaire" | "affilie" | "influenceur" | "fournisseur" | "autre";
export type ContactStatus = "a_contacter" | "en_discussion" | "actif" | "inactif";

export interface NetworkContact {
  id: string;
  coach_id: string;
  name: string;
  category: ContactCategory;
  contact_info: string | null;
  status: ContactStatus;
  note: string | null;
  last_contact_date: string | null;
  created_at: string;
}

export async function getNetworkContacts(coachId: string): Promise<NetworkContact[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("coach_network_contacts")
      .select("id, coach_id, name, category, contact_info, status, note, last_contact_date, created_at")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false });
    return (data as NetworkContact[]) ?? [];
  } catch {
    return [];
  }
}
