"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { getProfile } from "@/utils/auth";
import { requireAuth } from "@/lib/auth-guards";
import { notifyAdmin } from "@/lib/admin-notify";

// Suppression définitive du compte (auth + profil). Si le compte a un
// historique important (séances, programme...) référencé sans cascade en
// base, la suppression peut échouer sur une contrainte de clé étrangère —
// dans ce cas on remonte une erreur claire plutôt que de laisser des
// données orphelines ou de planter silencieusement.
// C'est l'action la plus destructrice de l'app, et elle ne passait par
// aucun guard : un simple contrôle "utilisateur connecté". Elle exige
// désormais requireAuth(), donc une session forte (code à 6 chiffres validé)
// dès que le compte a activé la double authentification.
export async function deleteOwnAccount(): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  try {
    const profile = await getProfile(guard.userId);
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(guard.userId);
    if (error) {
      return {
        error:
          "Suppression impossible pour le moment (des données sont encore liées à ce compte). Contacte le support.",
      };
    }
    notifyAdmin("Suppression de compte (auto)", [
      `<strong>${profile?.full_name ?? "Utilisateur"}</strong> (${profile?.email ?? guard.userId})`,
      `Rôle : ${profile?.role ?? "inconnu"}`,
    ]).catch(() => {});
    return {};
  } catch (e) {
    console.error("deleteOwnAccount error:", e);
    return { error: "Erreur inattendue lors de la suppression." };
  }
}
