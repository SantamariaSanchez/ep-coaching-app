import { createAdminClient } from "@/lib/supabase-admin";

// Rattache la bibliothèque "Contraintes & populations spécifiques"
// (lib/medical-constraints.ts) au suivi réel d'un client précis, plutôt
// que de rester une bibliothèque qu'il faut penser à aller consulter à
// part. Voir components/ui/ClientMedicalConstraintsPanel.tsx pour l'UI.

export interface ClientMedicalConstraint {
  id: string;
  client_id: string;
  constraint_slug: string;
  note: string | null;
  created_at: string;
}

export interface RecoveryLog {
  id: string;
  client_id: string;
  log_date: string;
  zone: string;
  load_note: string | null;
  pain: number;
  note: string | null;
  created_at: string;
}

export async function getClientConstraints(clientId: string): Promise<ClientMedicalConstraint[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("client_medical_constraints")
      .select("id, client_id, constraint_slug, note, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    return (data as ClientMedicalConstraint[]) ?? [];
  } catch {
    return [];
  }
}

export async function getRecoveryLogs(clientId: string, limit = 20): Promise<RecoveryLog[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("client_recovery_logs")
      .select("id, client_id, log_date, zone, load_note, pain, note, created_at")
      .eq("client_id", clientId)
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as RecoveryLog[]) ?? [];
  } catch {
    return [];
  }
}
