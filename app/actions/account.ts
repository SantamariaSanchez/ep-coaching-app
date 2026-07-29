"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { getUser } from "@/utils/auth";

// Suppression définitive du compte (auth + profil). Si le compte a un
// historique important (séances, programme...) référencé sans cascade en
// base, la suppression peut échouer sur une contrainte de clé étrangère —
// dans ce cas on remonte une erreur claire plutôt que de laisser des
// données orphelines ou de planter silencieusement.
export async function deleteOwnAccount(): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      return {
        error:
          "Suppression impossible pour le moment (des données sont encore liées à ce compte). Contacte le support.",
      };
    }
    return {};
  } catch {
    return { error: "Erreur inattendue lors de la suppression." };
  }
}
