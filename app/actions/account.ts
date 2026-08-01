"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { getUser, getProfile } from "@/utils/auth";
import { notifyAdmin } from "@/lib/admin-notify";

// Suppression définitive du compte (auth + profil). Si le compte a un
// historique important (séances, programme...) référencé sans cascade en
// base, la suppression peut échouer sur une contrainte de clé étrangère —
// dans ce cas on remonte une erreur claire plutôt que de laisser des
// données orphelines ou de planter silencieusement.
export async function deleteOwnAccount(): Promise<{ error?: string }> {
  const user = await getUser();
  if (!user) return { error: "Non authentifié." };

  try {
    const profile = await getProfile(user.id);
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      return {
        error:
          "Suppression impossible pour le moment (des données sont encore liées à ce compte). Contacte le support.",
      };
    }
    notifyAdmin("Suppression de compte (auto)", [
      `<strong>${profile?.full_name ?? "Utilisateur"}</strong> (${profile?.email ?? user.id})`,
      `Rôle : ${profile?.role ?? "inconnu"}`,
    ]).catch(() => {});
    return {};
  } catch {
    return { error: "Erreur inattendue lors de la suppression." };
  }
}
