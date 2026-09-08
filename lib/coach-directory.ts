import { createAdminClient } from "@/lib/supabase-admin";
import { resolveAvatarUrls } from "@/utils/avatar";

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
  /** Coach IA (lib/ai-coaches.ts) — déclenche le badge "Coach IA" partout où ce coach apparaît. */
  is_ai_coach: boolean;
}

/**
 * Annuaire des coachs.
 *
 * `includeAICoaches` est à false par défaut, et c'est volontaire : les
 * coachs IA restent strictement internes à l'espace connecté (règle de
 * positionnement Notion du 2026-08-30, "les coachs IA et agents IA internes
 * ne sont jamais mentionnés publiquement"). L'annuaire /coachs est une page
 * publique, sans compte, indexable : elle listait jusqu'ici 10 personas IA
 * portant des noms de personnes, avec un bouton "Commencer avec <prénom>",
 * face à un visiteur qui découvre la marque. La transparence décidée à
 * l'Axe AF (badge "Coach IA" visible, jamais d'impersonation) reste entière
 * là où elle a été demandée, c'est à dire une fois le compte créé : choix
 * du coach et messagerie côté client, plus la section dédiée de la politique
 * de confidentialité.
 */
export async function getCoachDirectory(
  { includeAICoaches = false }: { includeAICoaches?: boolean } = {}
): Promise<CoachDirectoryEntry[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url, bio, instagram_handle, invite_code, accepting_new_clients, specializations, is_platform_owner, platform_subscription_status, is_ai_coach")
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
            is_ai_coach: boolean | null;
          }[]
        | null) ?? [];

    const eligible = rows
      .filter((r) => r.is_platform_owner || r.platform_subscription_status === "active")
      .filter((r) => includeAICoaches || !r.is_ai_coach);

    // Le bucket avatars est privé : avatar_url en base n'est qu'un chemin,
    // jamais une URL affichable telle quelle (voir utils/avatar.ts). Sans
    // cette résolution, la photo de chaque coach — y compris celle du
    // Fondateur — restait invisible sur cet annuaire public.
    const resolvedAvatars = await resolveAvatarUrls(eligible.map((r) => ({ id: r.id, avatar_url: r.avatar_url })));

    return eligible
      .map((r) => ({
        id: r.id,
        full_name: r.full_name,
        avatar_url: resolvedAvatars[r.id] ?? null,
        bio: r.bio,
        instagram_handle: r.instagram_handle,
        invite_code: r.invite_code,
        accepting_new_clients: r.accepting_new_clients ?? true,
        specializations: r.specializations ?? [],
        is_ai_coach: r.is_ai_coach ?? false,
      }))
      .sort((a, b) => {
        if (a.accepting_new_clients !== b.accepting_new_clients) return a.accepting_new_clients ? -1 : 1;
        return (a.full_name ?? "").localeCompare(b.full_name ?? "");
      });
  } catch {
    return [];
  }
}
