"use server";

import { createServerSupabase } from "@/lib/supabase-server";
import { requirePlatformOwner } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";

export type RoleStatus = "a_pourvoir" | "en_recrutement" | "pourvu";

// Seule vraie fonctionnalité de la page Organisation (le reste est du
// contenu de référence statique) : marquer où en est le recrutement de
// chaque poste. Table org_role_status, clé (owner_id, role_key) — voir
// supabase/migrations/20260815g_org_role_status.sql.
export async function setRoleStatus(
  roleKey: string,
  status: RoleStatus
): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.from("org_role_status").upsert(
      {
        owner_id: guard.userId,
        role_key: roleKey,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,role_key" }
    );
    if (error) {
      console.error("setRoleStatus error:", error);
      return { error: "Erreur lors de la sauvegarde." };
    }
    revalidatePath("/dashboard/coach/admin/organisation");
    return {};
  } catch (e) {
    console.error("setRoleStatus error:", e);
    return { error: "Erreur inattendue." };
  }
}
