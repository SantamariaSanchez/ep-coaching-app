import { createAdminClient } from "@/lib/supabase-admin";

// Bibliothèques communes (salles, exercices, aliments) : tout coach peut y
// ajouter, mais seul l'auteur d'une fiche ou le fondateur peut la modifier
// ou la supprimer (décision du fondateur 2026-10-20). Avant, n'importe quel
// coach tiers pouvait effacer ou réécrire les fiches de tout le monde.
export async function canEditSharedEntry(
  userId: string,
  table: "gyms" | "exercise_library" | "foods",
  id: string
): Promise<boolean> {
  const admin = createAdminClient();
  const [{ data: me }, { data: row }] = await Promise.all([
    admin.from("profiles").select("is_platform_owner").eq("id", userId).maybeSingle(),
    admin.from(table).select("created_by").eq("id", id).maybeSingle(),
  ]);
  if ((me as { is_platform_owner?: boolean | null } | null)?.is_platform_owner) return true;
  const createdBy = (row as { created_by?: string | null } | null)?.created_by ?? null;
  return !!createdBy && createdBy === userId;
}

export const SHARED_EDIT_DENIED = "Seul l'auteur de cette fiche (ou EP Coaching) peut la modifier.";
