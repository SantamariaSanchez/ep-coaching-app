import { unstable_rethrow } from "next/navigation";

// ── Appel de server action qui ne crashe jamais sur une coupure ────────────
//
// Une server action appelée dans `startTransition(async () => …)` qui jette
// (réseau coupé, déploiement en cours, timeout serverless…) fait remonter la
// promesse rejetée jusqu'à l'error boundary : l'utilisateur tombait sur la
// page d'erreur au lieu d'un simple message. `safeAction` attrape l'exception
// et la convertit en `{ error }`, la même forme que les erreurs « métier »
// renvoyées par les actions : la gestion d'erreur déjà en place dans le
// composant (setError, retour arrière d'une mise à jour optimiste…) prend
// donc aussi la coupure en charge, sans branche dédiée.

/** Message affiché quand l'appel n'a pas pu aboutir (réseau, serveur). */
export const NETWORK_ERROR_MESSAGE = "Connexion perdue, réessaie.";

/**
 * Forme renvoyée sur exception : `error` est renseigné et tous les autres
 * champs du type de retour de l'action sont absents (`undefined`). Garder
 * les clés de `T` permet au code existant de continuer à lire
 * `result.id ?? …` ou `result.reply` sans changer ses types.
 */
export type ActionFailure<T> = T extends object
  ? { [K in Exclude<keyof T, "error">]?: undefined } & { error: string }
  : { error: string };

export async function safeAction<T>(call: () => Promise<T>): Promise<T | ActionFailure<T>> {
  try {
    return await call();
  } catch (err) {
    // Une redirection ou un notFound() lancés par l'action ne sont pas des
    // erreurs : Next les signale par une exception à laisser remonter.
    unstable_rethrow(err);
    console.error("[safeAction]", err);
    return { error: NETWORK_ERROR_MESSAGE } as ActionFailure<T>;
  }
}
