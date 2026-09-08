import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getPointsMap } from "@/lib/gamification";
import { resolveAvatarUrls } from "@/utils/avatar";
import type { Profile } from "@/utils/auth-client";

// Réexporte les helpers purs (Profile, roleBadge, isSubscribed,
// isClientCapable...) pour que tous les appelants existants continuent
// d'importer depuis "@/utils/auth" sans rien changer. Un Client Component,
// lui, doit importer directement depuis "@/utils/auth-client" — voir le
// commentaire en tête de ce fichier.
export * from "@/utils/auth-client";

// Perf réelle (retour direct 2026-09-01, "j'ouvre l'appli c'est censé être
// instantané, au lieu de ça il y a un chargement de 10s / la navigation est
// trop lente") : app/dashboard/layout.tsx appelle déjà getUser()+getProfile(),
// et 106 fichiers page.tsx les rappellent CHACUN indépendamment pour leur
// propre garde d'accès — sans mise en cache, ça double (au moins) les
// allers-retours Supabase sur CHAQUE navigation dans le dashboard. React
// cache() mémoïse le résultat pour la durée d'un seul rendu serveur (une
// requête) : le premier appel dans le layout suffit, tous les appels
// suivants dans les pages/composants du même rendu réutilisent le résultat
// déjà résolu au lieu de retaper Supabase. Zéro changement de comportement,
// juste zéro round-trip redondant.
export const getUser = cache(async function getUser() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
});

// target_bedtime/target_wake_time (MASTERCLASS.md — bilan en 2 temps,
// 2026-08-15) sont VOLONTAIREMENT absents de cette liste partagée par
// quasi toute l'appli : leur migration (supabase/migrations/
// 20260815a_sleep_schedule.sql) doit être appliquée manuellement (voir
// AGENTS.md), donc pendant la fenêtre entre le déploiement du code et
// l'exécution de la migration, ces colonnes n'existent pas encore en base.
// Si elles étaient ici, ce select échouerait entièrement et getProfile()
// renverrait null pour TOUT LE MONDE — panne totale de l'appli le temps
// que la migration tourne. Les rares endroits qui en ont besoin
// (lib/daily-gate.ts, app/dashboard/*/tracking/page.tsx) font leur propre
// petit select dédié, à faible rayon d'explosion si jamais en retard sur
// la migration.
const PROFILE_FIELDS =
  "id, role, full_name, email, phone, start_date, weight_start, goal, status, competition_category, competition_date, photo_frequency, season_mode, subscription_status, subscription_plan, level, source, bio, avatar_url, onboarding_completed_at, checkin_day, coach_id, is_platform_owner, platform_subscription_status, platform_stripe_customer_id, platform_stripe_subscription_id, invite_code, instagram_handle, next_billing_date, external_payment_link, stripe_customer_id, stripe_subscription_id, email_verified_at, mfa_enabled, free_tier_started_at, locked_at";

export const getProfile = cache(async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("id", userId)
      .single();
    return (data as Profile) ?? null;
  } catch {
    return null;
  }
});

// Multi-coach : chaque coach ne voit que SES propres clients, jamais ceux
// d'un autre coach (y compris le propriétaire de la plateforme). coachId
// doit toujours être l'id du coach connecté — jamais une valeur déduite
// d'un input utilisateur.
// Ne filtre volontairement pas par role="client" : un profil role="coach"
// peut aussi être le client personnel d'un autre coach (double rôle), et
// doit apparaître dans la liste de CE coach comme n'importe quel client.
export async function getClients(coachId: string): Promise<Profile[]> {
  try {
    // Use admin client to bypass RLS — coach must see ALL of their own
    // clients regardless of policies. Only paying clients show up here —
    // free community members are managed separately (see getCommunityMembers).
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("coach_id", coachId)
      .eq("subscription_status", "active")
      .order("full_name");
    return (data as Profile[]) ?? [];
  } catch {
    return [];
  }
}

// Total de membres inscrits chez CE coach (clients payants + communauté
// gratuite), tous statuts confondus — sert de repère de croissance sur le
// dashboard coach, distinct de getClients() qui ne compte que les payants actifs.
export async function getTotalMembersCount(coachId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("coach_id", coachId);
    return count ?? 0;
  } catch {
    return 0;
  }
}

// Le coach doit pouvoir écrire à n'importe quel membre parmi les SIENS
// (clients payants et membres gratuits de sa communauté), pas seulement
// ses clients actifs — utilisé par la liste des messages coach.
export async function getAllMessageableMembers(coachId: string): Promise<Profile[]> {
  const [clients, communityMembers] = await Promise.all([
    getClients(coachId),
    getCommunityMembers(coachId),
  ]);
  return [...clients, ...communityMembers];
}

export async function getCommunityMembers(coachId: string): Promise<Profile[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("coach_id", coachId)
      .neq("subscription_status", "active")
      .order("start_date", { ascending: false });
    return (data as Profile[]) ?? [];
  } catch {
    return [];
  }
}

export interface CommunityMemberActivity {
  points: number;
  sessionCount: number;
  lastSessionAt: string | null;
  postCount: number;
  /** Inscrit, onboarding fait ou pas, mais aucune trace d'usage réel de l'appli. */
  neverReturned: boolean;
  /**
   * Inscrit dans la période de grâce (3 jours), sans trace d'usage pour
   * l'instant — la fenêtre où un message personnel du coach a le plus de
   * chances de transformer une inscription en vraie première action, avant
   * que la relance automatique ne prenne le relais (voir cron
   * weekly-reengagement). Jamais vrai en même temps que neverReturned : soit
   * on est encore dans la fenêtre de découverte, soit on l'a dépassée.
   */
  isNew: boolean;
}

export interface CommunityMemberWithActivity extends Profile {
  activity: CommunityMemberActivity;
}

// La liste brute des membres gratuits (getCommunityMembers) ne dit rien de
// qui est réellement actif : sur ce coach, 11 des 12 membres gratuits n'ont
// ni séance, ni point, ni post — jamais revenus depuis l'inscription. Sans
// ce signal, le seul qui a 9 séances réelles et progresse depuis des mois
// se noyait au même rang que les 11 autres, triés uniquement par date
// d'inscription. 3 requêtes groupées (pas une par membre) pour rester léger
// même avec beaucoup de membres.
export async function getCommunityMembersWithActivity(coachId: string): Promise<CommunityMemberWithActivity[]> {
  const members = await getCommunityMembers(coachId);
  if (members.length === 0) return [];

  try {
    const ids = members.map((m) => m.id);
    const admin = createAdminClient();

    const [pointsMap, sessionsRes, postsRes, avatarMap] = await Promise.all([
      getPointsMap(ids),
      admin.from("sessions").select("client_id, created_at").eq("is_completed", true).in("client_id", ids),
      admin.from("community_posts").select("author_id").in("author_id", ids),
      // Le bucket avatars est privé : avatar_url en base n'est qu'un chemin
      // (voir utils/avatar.ts). Sans résolution, la photo de chaque membre
      // restait invisible dans cette liste, y compris pour son propre coach.
      resolveAvatarUrls(members.map((m) => ({ id: m.id, avatar_url: m.avatar_url }))),
    ]);

    const sessionCountMap: Record<string, number> = {};
    const lastSessionMap: Record<string, string> = {};
    for (const s of sessionsRes.data ?? []) {
      const cid = s.client_id as string;
      const createdAt = s.created_at as string;
      sessionCountMap[cid] = (sessionCountMap[cid] ?? 0) + 1;
      if (!lastSessionMap[cid] || createdAt > lastSessionMap[cid]) lastSessionMap[cid] = createdAt;
    }

    const postCountMap: Record<string, number> = {};
    for (const p of postsRes.data ?? []) {
      const aid = p.author_id as string;
      postCountMap[aid] = (postCountMap[aid] ?? 0) + 1;
    }

    const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // laisse le temps de découvrir l'appli avant de qualifier "jamais revenu"

    return members.map((m) => {
      const points = pointsMap[m.id] ?? 0;
      const sessionCount = sessionCountMap[m.id] ?? 0;
      const postCount = postCountMap[m.id] ?? 0;
      const pastGracePeriod = m.start_date ? Date.now() - new Date(m.start_date).getTime() > GRACE_PERIOD_MS : true;
      return {
        ...m,
        avatar_url: avatarMap[m.id] ?? null,
        activity: {
          points,
          sessionCount,
          lastSessionAt: lastSessionMap[m.id] ?? null,
          postCount,
          neverReturned: pastGracePeriod && points === 0 && sessionCount === 0 && postCount === 0,
          isNew: !pastGracePeriod && points === 0 && sessionCount === 0 && postCount === 0,
        },
      };
    });
  } catch {
    return members.map((m) => ({
      ...m,
      activity: { points: 0, sessionCount: 0, lastSessionAt: null, postCount: 0, neverReturned: false, isNew: false },
    }));
  }
}

// Renvoie le client uniquement s'il appartient bien à coachId — un coach ne
// doit jamais pouvoir lire la fiche d'un client qui n'est pas le sien, même
// en devinant/forgeant un id dans l'URL.
export async function getClientById(id: string, coachId: string): Promise<Profile | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("id", id)
      .eq("coach_id", coachId)
      .single();
    return (data as Profile) ?? null;
  } catch {
    return null;
  }
}

// Réservé aux jobs système (cron) qui doivent agir sur tous les clients de
// la plateforme, tous coachs confondus (ex. rappels programmés) — ne JAMAIS
// utiliser cette fonction dans une page ou action déclenchée par un coach.
export async function getAllActiveClientsSystemWide(): Promise<Profile[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("role", "client")
      .eq("subscription_status", "active")
      .order("full_name");
    return (data as Profile[]) ?? [];
  } catch {
    return [];
  }
}

export interface CoachDiscoveryEntry {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  invite_code: string | null;
  /** Coach IA (lib/ai-coaches.ts) — déclenche le badge "Coach IA". */
  is_ai_coach: boolean;
}

// Liste publique (au sein de l'appli) des coachs tiers actifs, utilisée
// quand un membre sans coach veut en choisir un nouveau — ne renvoie que
// les champs sûrs à afficher, jamais le Profile complet.
export async function getActiveCoachesForDiscovery(): Promise<CoachDiscoveryEntry[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, bio, avatar_url, invite_code, is_ai_coach")
      .eq("role", "coach")
      .eq("is_platform_owner", false)
      .eq("platform_subscription_status", "active")
      .order("full_name");
    return ((data as (CoachDiscoveryEntry & { is_ai_coach: boolean | null })[]) ?? []).map((c) => ({
      ...c,
      is_ai_coach: c.is_ai_coach ?? false,
    }));
  } catch {
    return [];
  }
}

// Réservé au propriétaire de la plateforme (is_platform_owner) — liste tous
// les coachs tiers pour la gestion de leur abonnement plateforme. Ne JAMAIS
// exposer à un coach normal : ce n'est pas cloisonné par coach_id, par nature.
export async function getAllCoaches(): Promise<Profile[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("role", "coach")
      .eq("is_platform_owner", false)
      .order("full_name");
    return (data as Profile[]) ?? [];
  } catch {
    return [];
  }
}

// Le fondateur (Santamaria) gère le support pour tout le monde, quel que soit
// le coach réellement assigné — utilisé pour épingler sa conversation en
// tête de liste dans la messagerie, côté client comme côté coach.
export async function getPlatformOwner(): Promise<Profile | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("role", "coach")
      .eq("is_platform_owner", true)
      .maybeSingle();
    return (data as Profile) ?? null;
  } catch {
    return null;
  }
}

export async function getUserRole(
  userId: string
): Promise<"coach" | "client" | null> {
  const profile = await getProfile(userId);
  return profile?.role ?? null;
}
