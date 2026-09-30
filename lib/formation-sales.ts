import { createAdminClient } from "@/lib/supabase-admin";

// Accès aux formations d'un coach (2026-09-30) : qui a accès, et ses
// clients pour donner un accès en un clic. Appelé seulement après avoir
// vérifié que le coach connecté est le propriétaire de la formation.

export interface FormationSales {
  granted: { userId: string; name: string; email: string | null; grantedAt: string; source: string }[];
  clients: { id: string; name: string }[];
}

export async function getFormationSales(formationId: string, ownerId: string): Promise<FormationSales> {
  const admin = createAdminClient();
  const [{ data: rows }, { data: clients }] = await Promise.all([
    admin.from("formation_access").select("user_id, granted_at, source").eq("formation_id", formationId).order("granted_at", { ascending: false }),
    admin.from("profiles").select("id, full_name").eq("coach_id", ownerId).eq("role", "client").order("full_name").limit(500),
  ]);
  const list = (rows ?? []) as { user_id: string; granted_at: string; source: string }[];
  const { data: people } = list.length ? await admin.from("profiles").select("id, full_name, email").in("id", list.map((r) => r.user_id)) : { data: [] };
  const byId = new Map(((people ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((p) => [p.id, p]));
  return {
    granted: list.map((r) => ({ userId: r.user_id, name: byId.get(r.user_id)?.full_name || "Membre", email: byId.get(r.user_id)?.email ?? null, grantedAt: r.granted_at, source: r.source })),
    clients: ((clients ?? []) as { id: string; full_name: string | null }[]).map((c) => ({ id: c.id, name: c.full_name || "Client" })),
  };
}
