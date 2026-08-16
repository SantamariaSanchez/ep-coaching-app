import { createAdminClient } from "@/lib/supabase-admin";

// Item 41 (chantier 50 idées) : lecture des stats de parrainage d'un
// utilisateur. Requête ciblée (pas via getProfile/PROFILE_FIELDS) pour ne
// pas alourdir le fetch de profil déjà utilisé partout dans l'appli avec
// des colonnes que seule cette page consulte.
export interface ReferralStats {
  code: string | null;
  referredCount: number;
  // Nombre de filleuls devenus clients payants, effectivement crédités
  // (voir lib/referral-rewards.ts et supabase/migrations/
  // 20260816b_referral_rewards.sql). Distinct de referredCount, qui compte
  // toutes les inscriptions, payantes ou non.
  rewardedCount: number;
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  try {
    const admin = createAdminClient();
    const [{ data: profile }, { count }, { count: rewardedCount }] = await Promise.all([
      admin.from("profiles").select("referral_code").eq("id", userId).maybeSingle(),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId),
      admin
        .from("referral_rewards")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", userId)
        .eq("status", "credited"),
    ]);
    return {
      code: (profile as { referral_code: string | null } | null)?.referral_code ?? null,
      referredCount: count ?? 0,
      rewardedCount: rewardedCount ?? 0,
    };
  } catch {
    return { code: null, referredCount: 0, rewardedCount: 0 };
  }
}
