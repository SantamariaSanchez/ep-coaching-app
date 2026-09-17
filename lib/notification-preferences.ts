// Catégories de notification push, réglables par l'utilisateur.
//
// Avant ce fichier, une notification était soit reçue soit désactivée
// entièrement (au niveau OS/navigateur) — impossible de garder les messages
// du coach tout en coupant l'activité de la communauté. lib/notify.ts lit
// ces catégories pour décider d'envoyer ou non le PUSH ; la notification
// in-app (cloche) n'est JAMAIS coupée ici, elle reste l'historique complet.
//
// Volontairement 3 catégories seulement, pas une par type de notification
// (~35 types différents existent dans le code) : plus de granularité serait
// illisible pour l'utilisateur et un vrai fardeau à maintenir à chaque nouveau
// type ajouté. "essentiel" n'est jamais affiché comme désactivable dans
// l'interface : elle regroupe la facturation/l'accès ET les mécanismes de
// relance de rétention (quiet_client_relance, stagnation_escalation,
// coach_relaunch...) — les laisser désactivables reviendrait à donner à un
// membre qui décroche le moyen de couper le seul système conçu pour le faire
// revenir (voir lib/reengagement.ts et les crons free-tier-*).

export type NotificationCategory = "essentiel" | "coaching" | "communaute";

export const MUTABLE_CATEGORIES: readonly NotificationCategory[] = ["coaching", "communaute"];

export const CATEGORY_META: Record<NotificationCategory, { label: string; description: string }> = {
  essentiel: {
    label: "Compte & suivi essentiel",
    description: "Facturation, accès, et les relances qui te ramènent quand tu décroches. Toujours actives.",
  },
  coaching: {
    label: "Mon coaching",
    description: "Messages, plans, rappels, retours de ton coach ou sur ton propre suivi.",
  },
  communaute: {
    label: "Communauté",
    description: "Nouveaux posts, questions, formations publiées.",
  },
};

// Préfixes plutôt qu'une liste exhaustive de ~35 types exacts : moins de
// maintenance, et un nouveau type de notification tombe automatiquement dans
// la bonne catégorie tant qu'il suit la convention de nommage déjà en place
// dans le code (voir tous les appels notifyUser()/notifyUsers()).
const ESSENTIEL_TYPES = new Set([
  "subscription_canceled",
  "client_subscription_canceled",
  "trial_started",
  "trial_ended",
  "waitlist_join",
  "new_member_signup",
  "referral_signup",
  "referral_reward",
  "quiet_client_relance",
  "quiet_client_relance_coach",
  "stagnation_escalation",
  "stagnation_escalation_coach",
  "coach_relaunch",
  "first_action_followup",
]);

const COMMUNAUTE_PREFIXES = ["community_", "coach_post", "new_formation_published"];

/**
 * Catégorie d'un type de notification. Un type non reconnu tombe dans
 * "coaching" par défaut : jamais silencieusement essentiel (l'utilisateur
 * garde la main), jamais silencieusement communauté (le défaut le plus large
 * et le plus susceptible de contenir quelque chose d'utile).
 */
export function categoryForType(type: string): NotificationCategory {
  if (ESSENTIEL_TYPES.has(type)) return "essentiel";
  if (COMMUNAUTE_PREFIXES.some((p) => type.startsWith(p))) return "communaute";
  return "coaching";
}

export type NotificationPreferences = Partial<Record<NotificationCategory, boolean>>;

/** true = catégorie coupée (le push n'est pas envoyé, la notif in-app reste). */
export function isCategoryMuted(prefs: NotificationPreferences | null | undefined, category: NotificationCategory): boolean {
  if (category === "essentiel") return false;
  return prefs?.[category] === true;
}

/** Le push doit-il partir pour ce type de notification, compte tenu des préférences ? */
export function shouldSendPush(prefs: NotificationPreferences | null | undefined, type: string): boolean {
  return !isCategoryMuted(prefs, categoryForType(type));
}
