import { createAdminClient } from "@/lib/supabase-admin";

// Item 41 (chantier 50 idées) : lecture des stats de parrainage d'un
// utilisateur. Requête ciblée (pas via getProfile/PROFILE_FIELDS) pour ne
// pas alourdir le fetch de profil déjà utilisé partout dans l'appli avec
// des colonnes que seule cette page consulte.
export interface ReferralStats {
  code: string | null;
  referredCount: number;
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  try {
    const admin = createAdminClient();
    const [{ data: profile }, { count }] = await Promise.all([
      admin.from("profiles").select("referral_code").eq("id", userId).maybeSingle(),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId),
    ]);
    return {
      code: (profile as { referral_code: string | null } | null)?.referral_code ?? null,
      referredCount: count ?? 0,
    };
  } catch {
    return { code: null, referredCount: 0 };
  }
}
