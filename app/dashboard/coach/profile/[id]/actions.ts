"use server";

import { requirePlatformOwner } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyAdmin } from "@/lib/admin-notify";

// Pouvoirs de modération réservés au fondateur (is_platform_owner), jamais
// aux coachs tiers — voir la section modération de la Communauté/Membres.

// "Déconnecter" un utilisateur = invalider sa session en cours. L'admin API
// Supabase n'expose pas de révocation directe par user id (seulement par
// jwt) ; on utilise donc un bannissement court, qui fait échouer la
// prochaine requête authentifiée (proxy.ts revalide via supabase.auth.getUser()
// à chaque navigation) et expire de lui-même — ce n'est pas un blocage
// permanent du compte, juste un "kick" qui force une reconnexion.
export async function disconnectUser(
  targetUserId: string
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };
  if (targetUserId === guard.userId) {
    return { error: "Tu ne peux pas te déconnecter toi-même depuis cet écran." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(targetUserId, {
      ban_duration: "60s",
    });
    if (error) return { error: "Erreur lors de la déconnexion." };
    return { success: true };
  } catch (e) {
    console.error("disconnectUser error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Suppression définitive du compte d'un tiers, réservée au fondateur —
// pendant opposé de deleteOwnAccount (app/actions/account.ts), qui ne
// permet de supprimer que son propre compte.
export async function deleteUserAccountAdmin(
  targetUserId: string
): Promise<{ error?: string; success?: boolean }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };
  if (targetUserId === guard.userId) {
    return { error: "Utilise \"Supprimer mon compte\" dans tes propres paramètres." };
  }

  try {
    const admin = createAdminClient();
    const { data: target } = await admin
      .from("profiles")
      .select("full_name, email, role")
      .eq("id", targetUserId)
      .maybeSingle();

    const { error } = await admin.auth.admin.deleteUser(targetUserId);
    if (error) {
      return {
        error: "Suppression impossible pour le moment (des données sont encore liées à ce compte).",
      };
    }
    notifyAdmin("Suppression de compte (admin)", [
      `<strong>${target?.full_name ?? "Utilisateur"}</strong> (${target?.email ?? targetUserId})`,
      `Rôle : ${target?.role ?? "inconnu"}`,
    ]).catch(() => {});
    return { success: true };
  } catch (e) {
    console.error("deleteUserAccountAdmin error:", e);
    return { error: "Erreur inattendue." };
  }
}
