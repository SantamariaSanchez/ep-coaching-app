"use server";

import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import { getProfile } from "@/utils/auth";
import { requireAuth } from "@/lib/auth-guards";
import { notifyAdmin } from "@/lib/admin-notify";

// Retour direct (audit Paramètres, 2026-09-23) : aucun moyen de changer son
// adresse email depuis l'app — une lacune vérifiée, pas une supposition.
// Passe par le client Supabase LIÉ À LA SESSION (pas createAdminClient) pour
// déclencher le flux standard de Supabase Auth : email de confirmation
// envoyé à la nouvelle adresse avant que le changement soit effectif, donc
// personne ne peut détourner un compte juste en volant une session déjà
// ouverte. requireAuth() exige en plus une session forte (2FA validée) si
// le compte l'a activée, même garde que deleteOwnAccount ci-dessous.
export async function requestEmailChange(newEmail: string): Promise<{ error?: string; success?: boolean }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };

  const trimmed = newEmail.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { error: "Adresse email invalide." };
  }

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    if (error) {
      return {
        error: /already|existe|registered/i.test(error.message)
          ? "Cette adresse est déjà utilisée par un autre compte."
          : "Erreur lors de la demande de changement d'email.",
      };
    }
    return { success: true };
  } catch (e) {
    console.error("requestEmailChange error:", e);
    return { error: "Erreur inattendue." };
  }
}

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
