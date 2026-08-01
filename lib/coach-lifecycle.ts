import { createAdminClient } from "@/lib/supabase-admin";

// Quand un coach tiers n'a plus d'abonnement plateforme actif (résiliation,
// échec de paiement répété, désactivation manuelle), lui et tous ceux qui
// lui étaient rattachés (clients classiques ou coachs eux-mêmes suivis par
// lui — double rôle) repassent en membres libres, sans coach. Jamais de
// blocage d'accès pour ces personnes : elles gardent tout leur historique et
// peuvent choisir un nouveau coach (voir la bannière sur /dashboard/client).
export async function detachClientsFromCoach(coachId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ coach_id: null, subscription_status: "free" })
    .eq("coach_id", coachId);
}
