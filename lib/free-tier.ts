// Règles du compte gratuit, rassemblées ici et nulle part ailleurs.
//
// Pourquoi ces limites existent (demande du 2026-09-08) : "c'est tellement
// toute l'appli gratuite et énormément de valeur que du coup le lead lambda ne
// voit même pas la valeur incroyable que je lui offre et donc ne prend pas
// d'appel". Le gratuit passe donc d'un accès illimité à une période d'essai
// bornée : soit la personne saisit l'opportunité, soit son accès s'arrête.
//
// Choix arbitrés explicitement le 2026-09-08 :
//   - à la fin des 2 mois, le compte est VERROUILLÉ, pas supprimé : les données
//     restent et l'accès se rouvre dès qu'un coach est pris. Réversible.
//   - la suppression n'intervient que sur inactivité totale (60 jours sans la
//     moindre connexion), et jamais sans avoir prévenu deux fois avant.

import type { AccessType } from "@/utils/auth-client";

/** Durée du compte gratuit, en jours. */
export const FREE_TIER_DAYS = 60;

/** Jours sans aucune connexion avant suppression du compte. */
export const INACTIVITY_DELETE_DAYS = 60;
/** Premiers et seconds avertissements avant suppression, en jours d'inactivité. */
export const INACTIVITY_WARN_DAYS = [40, 55] as const;

/**
 * Avertissements de fin de période gratuite pour un membre ACTIF (qui ouvre
 * l'appli, contrairement à INACTIVITY_WARN_DAYS qui cible celui qui ne
 * revient jamais). En jours écoulés depuis free_tier_started_at : à 7 jours
 * puis 1 jour du verrou (FREE_TIER_DAYS = 60).
 */
export const EXPIRY_WARN_DAYS = [FREE_TIER_DAYS - 7, FREE_TIER_DAYS - 1] as const;

/**
 * Générations de recettes autorisées par mois pour un membre gratuit.
 * L'outil reste utilisable pour se faire une idée, sans devenir un générateur
 * illimité qui remplace complètement l'accompagnement.
 */
export const FREE_RECIPE_GENERATIONS_PER_MONTH = 3;

export interface FreeTierProfile {
  free_tier_started_at?: string | null;
  locked_at?: string | null;
  subscription_status?: string | null;
  role?: string | null;
}

export interface FreeTierStatus {
  /** Vrai uniquement pour un membre gratuit soumis à la limite de durée. */
  applies: boolean;
  daysLeft: number;
  daysUsed: number;
  expired: boolean;
  locked: boolean;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * État de la période gratuite. Les coachs et les clients accompagnés ne sont
 * jamais concernés : `applies` vaut false et tout le reste est neutre.
 */
export function freeTierStatus(
  profile: FreeTierProfile | null | undefined,
  accessType: AccessType,
  now: Date = new Date()
): FreeTierStatus {
  const neutral: FreeTierStatus = {
    applies: false,
    daysLeft: FREE_TIER_DAYS,
    daysUsed: 0,
    expired: false,
    locked: false,
  };
  if (!profile || accessType !== "membre_gratuit") return neutral;

  // Sans date de départ (compte créé avant la migration et non rétro-rempli),
  // on n'enferme personne : mieux vaut laisser l'accès ouvert qu'exclure à tort.
  if (!profile.free_tier_started_at) return neutral;

  const started = new Date(profile.free_tier_started_at);
  if (Number.isNaN(started.getTime())) return neutral;

  const daysUsed = Math.max(0, daysBetween(started, now));
  const daysLeft = Math.max(0, FREE_TIER_DAYS - daysUsed);
  const expired = daysUsed >= FREE_TIER_DAYS;

  return {
    applies: true,
    daysUsed,
    daysLeft,
    expired,
    // `locked_at` est posé par le cron, mais l'échéance seule suffit à verrouiller :
    // sinon un compte échu resterait ouvert jusqu'au prochain passage du cron.
    locked: expired || !!profile.locked_at,
  };
}

/**
 * Fonctionnalités coupées pour un membre gratuit (indépendamment de l'échéance).
 * La bibliothèque de lead magnets en fait partie : demande explicite du
 * 2026-09-08, "les lead magnets en tant que membre gratuit on ne peut pas y
 * accéder sur l'appli, seulement quand moi je les envoie par Insta". Les liens
 * directs (/ressources/[slug]) restent volontairement ouverts : c'est par eux
 * que passe l'acquisition, et c'est ce que Santamaria partage lui-même.
 */
export const FREE_TIER_BLOCKED = {
  leadMagnetLibrary: true,
} as const;

export function canBrowseLeadMagnetLibrary(accessType: AccessType): boolean {
  return accessType !== "membre_gratuit";
}

/** Message d'échéance affiché au membre, calibré selon ce qu'il lui reste. */
export function freeTierUrgencyLabel(status: FreeTierStatus): string | null {
  if (!status.applies) return null;
  if (status.locked) return "Ton accès gratuit est terminé";
  if (status.daysLeft <= 7) return `Plus que ${status.daysLeft} jour${status.daysLeft > 1 ? "s" : ""} d'accès gratuit`;
  if (status.daysLeft <= 21) return `${status.daysLeft} jours d'accès gratuit restants`;
  return null;
}
