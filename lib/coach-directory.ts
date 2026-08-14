import { createAdminClient } from "@/lib/supabase-admin";

// Axe 5 (VISION.md) : annuaire public des coachs de la plateforme, pour
// qu'un visiteur trouve celui qui correspond à son profil avant même de
// s'inscrire. Même filtre d'éligibilité que resolveCoachId() (app/auth/
// client/actions.ts) : un coach dont l'abonnement plateforme n'est plus
// actif ne doit pas apparaître, un lien d'inscription vers lui échouerait.
export interface CoachDirectoryEntry {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  invite_code: string | null;
  accepting_new_clients: boolean;
  specializations: string[];
}

export async function getCoachDirectory(): Promise<CoachDirectoryEntry[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url, bio, instagram_handle, invite_code, accepting_new_clients, specializations, is_platform_owner, platform_subscription_status")
      .eq("role", "coach")
      .not("invite_code", "is", null);

    const rows =
      (data as
        | {
            id: string;
            full_name: string | null;
            avatar_url: string | null;
            bio: string | null;
            instagram_handle: string | null;
            invite_code: string | null;
            accepting_new_clients: boolean | null;
            specializations: string[] | null;
            is_platform_owner: boolean | null;
            platform_subscription_status: string | null;
          }[]
        | null) ?? [];

    return rows
      .filter((r) => r.is_platform_owner || r.platform_subscription_status === "active")
      .map((r) => ({
        id: r.id,
        full_name: r.full_name,
        avatar_url: r.avatar_url,
        bio: r.bio,
        instagram_handle: r.instagram_handle,
        invite_code: r.invite_code,
        accepting_new_clients: r.accepting_new_clients ?? true,
        specializations: r.specializations ?? [],
      }))
      .sort((a, b) => {
        if (a.accepting_new_clients !== b.accepting_new_clients) return a.accepting_new_clients ? -1 : 1;
        return (a.full_name ?? "").localeCompare(b.full_name ?? "");
      });
  } catch {
    return [];
  }
}
