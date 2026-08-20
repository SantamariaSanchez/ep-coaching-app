import { createAdminClient } from "@/lib/supabase-admin";
import { sendCoachAgentCheckin } from "@/lib/coach-agent-checkin";
import { runHeadCoachAudit } from "@/lib/head-coach-audit";
import { relanceQuietClients } from "@/lib/quiet-client-relance";

// Assistant coach réellement récurrent (Axe 10, VISION.md — demande
// directe 2026-08-19 : "je veux que agent IA pour les coach humain soit
// des assistant mais qui prenne quand même des décisions et ont des
// tâche auto récurente"). Appelé une fois par jour par
// app/api/cron/coach-assistant/route.ts pour TOUS les coachs humains
// (jamais les coachs IA, qui gèrent déjà leurs propres réponses via
// triggerAICoachReply) — chaque coach reçoit le même traitement que celui
// déjà disponible manuellement (bouton "Relance agent IA", bouton "Lancer
// l'audit qualité"), mais déclenché automatiquement et cloisonné à SES
// propres clients uniquement.
//
// Confirmé explicitement par l'utilisatrice : action directe, sans
// validation humaine avant envoi (même logique que le Setter sur les
// leads et les coachs IA), fréquence quotidienne.

const CHECKIN_STALE_BILAN_DAYS = 3;
// Ne relance jamais un client qui a déjà reçu un message de son coach
// (humain ou généré par cet assistant) il y a moins de ce nombre de
// jours — sans ce garde-fou, un client resté inactif serait relancé
// CHAQUE JOUR par le cron, perçu à raison comme du spam.
const CHECKIN_MIN_MESSAGE_GAP_DAYS = 3;

export interface CoachAssistantSweepResult {
  coachesProcessed: number;
  checkinsSent: number;
  auditTasksCreated: number;
  quietRelanced: number;
  errors: string[];
}

export async function runCoachAssistantSweep(): Promise<CoachAssistantSweepResult> {
  const admin = createAdminClient();
  const result: CoachAssistantSweepResult = {
    coachesProcessed: 0,
    checkinsSent: 0,
    auditTasksCreated: 0,
    quietRelanced: 0,
    errors: [],
  };

  const { data: coaches } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "coach")
    .eq("is_ai_coach", false);

  for (const coach of coaches ?? []) {
    const coachId = coach.id as string;
    result.coachesProcessed++;

    try {
      // 1. Audit qualité — décision autonome : ne crée une tâche que si un
      // vrai problème concret est trouvé, jamais un rapport creux. Cloisonné
      // aux clients de CE coach uniquement.
      const audit = await runHeadCoachAudit(coachId, { scopeToCoachId: coachId });
      result.auditTasksCreated += audit.created;

      // 2. Relance des clients "silencieux" de CE coach (Axe 3, VISION.md) —
      // aucune donnée qui cloche, juste une absence de contact humain
      // depuis 30j+. Signal orthogonal au check-in ci-dessous (étape 3).
      const quiet = await relanceQuietClients(coachId);
      result.quietRelanced += quiet.relanced;

      // 3. Relance des clients à risque de CE coach — décision autonome
      // aussi : ne relance que si le bilan est réellement à l'arrêt ET
      // qu'aucun message n'est déjà parti récemment.
      const { data: clients } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "client")
        .eq("coach_id", coachId);

      for (const client of clients ?? []) {
        const clientId = client.id as string;

        const { data: lastLog } = await admin
          .from("daily_logs")
          .select("log_date")
          .eq("client_id", clientId)
          .order("log_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!lastLog?.log_date) continue;

        const daysSinceBilan = Math.floor(
          (Date.now() - new Date(lastLog.log_date as string).getTime()) / 86400000
        );
        if (daysSinceBilan < CHECKIN_STALE_BILAN_DAYS) continue;

        const { data: lastCoachMsg } = await admin
          .from("messages")
          .select("created_at")
          .eq("conversation_id", clientId)
          .eq("sender_id", coachId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastCoachMsg?.created_at) {
          const daysSinceMsg = Math.floor(
            (Date.now() - new Date(lastCoachMsg.created_at as string).getTime()) / 86400000
          );
          if (daysSinceMsg < CHECKIN_MIN_MESSAGE_GAP_DAYS) continue;
        }

        const checkin = await sendCoachAgentCheckin(clientId);
        if (checkin.sent) result.checkinsSent++;
      }
    } catch (e) {
      console.error("runCoachAssistantSweep coach error:", coachId, e);
      result.errors.push(coachId);
    }
  }

  return result;
}
