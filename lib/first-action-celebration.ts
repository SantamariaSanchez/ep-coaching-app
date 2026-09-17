import { createAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/notify";

// ── Encouragement au tout premier vrai geste de valeur ─────────────────────
//
// Audit rétention nouveaux inscrits (2026-09-16) : une nouvelle séance
// loguée, un premier repas noté ou un premier bilan quotidien rempli
// déclenchaient déjà des points (lib/gamification.ts) et, quand un coach est
// assigné, une notification... au COACH. Le membre lui-même ne recevait
// STRICTEMENT rien pour son propre geste — le tout premier "aha moment"
// (voir lib/onboarding-checklist.ts, qui suit exactement ces 3 actions)
// n'était jamais suivi d'un encouragement, alors que c'est l'instant où un
// renforcement positif immédiat compte le plus pour transformer un geste
// isolé en habitude (surtout pour un membre gratuit sans coach, qui ne
// reçoit sinon aucun retour humain).

export interface FirstActionCelebration {
  type: string;
  title: string;
  body: string;
  url: string;
}

/**
 * À appeler AVANT d'écrire la ligne qui pourrait être la première :
 * renvoie true si ce client n'a encore AUCUNE ligne dans `table`. Un COUNT
 * fait après coup ne marche pas pour un insert qui écrit plusieurs lignes
 * d'un coup (ex. plusieurs exercices d'une même séance) : le compte final
 * vaudrait alors le nombre de lignes insérées, jamais 1, et la notif ne
 * partirait jamais.
 */
export async function isFirstEverAction(
  clientId: string,
  table: string,
  clientIdColumn: string
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(clientIdColumn, clientId);
    return (count ?? 0) === 0;
  } catch {
    // Incertain -> on ne félicite pas plutôt que de risquer un doublon.
    return false;
  }
}

/**
 * Envoie la notification de félicitations (in-app + push, voir
 * lib/notify.ts). À appeler seulement après une écriture réussie, et
 * seulement si `isFirstEverAction` a renvoyé true avant cette écriture.
 * Fire-and-forget : ne doit jamais faire échouer l'action appelante.
 *
 * Pose aussi `profiles.first_real_action_at` la toute première fois
 * (workout/repas/bilan, peu importe lequel arrive en premier) : sans ça,
 * rien ne permettait de savoir QUAND relancer le lendemain (voir
 * app/api/cron/first-action-followup, ajouté le 2026-09-17 pour combler le
 * trou entre "vient de faire son premier geste" et la relance des membres
 * dormants à J+10, lib/reengagement.ts).
 */
export async function celebrateFirstAction(
  clientId: string,
  celebration: FirstActionCelebration
): Promise<void> {
  try {
    await notifyUser(clientId, celebration);
  } catch {
    // best-effort — jamais bloquant
  }

  try {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ first_real_action_at: new Date().toISOString() })
      .eq("id", clientId)
      .is("first_real_action_at", null);
  } catch {
    // best-effort — jamais bloquant
  }
}
