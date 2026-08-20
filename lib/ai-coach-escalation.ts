import { createAdminClient } from "@/lib/supabase-admin";
import { insertNotification } from "@/utils/insert-notification";
import { getPlatformOwnerId } from "@/lib/job-applications";

// Escalade réelle d'un coach IA vers Santamaria (2026-08-20, VISION.md
// Axe 5 "reste à faire" : "un coach IA généraliste qui détecte un sujet
// TCA/blessure dans un message et voudrait orienter vers Santamaria plutôt
// que juste le dire dans sa réponse"). Jusqu'ici le system prompt
// (lib/ai-coaches.ts) se contentait de le dire AU CLIENT dans le texte de
// la réponse, sans jamais réellement prévenir la coach humaine — un client
// qui ne relance pas de lui-même après ce conseil pouvait rester sans
// vraie prise en charge sur un sujet sensible (blessure, TCA, grossesse,
// médical) sans que personne ne le sache.
//
// Déclenché uniquement quand le modèle a lui-même posé le marqueur
// AI_COACH_ESCALATION_MARKER en tête de sa réponse (voir triggerAICoachReply)
// — jamais une seconde analyse séparée du message : le modèle a déjà tout le
// contexte nécessaire au moment où il rédige sa réponse, dupliquer l'appel
// coûterait une latence et un coût inutiles pour le même jugement.
//
// Volontairement silencieux en cas d'échec : une notification manquée ne
// doit jamais faire échouer l'envoi du message du coach IA au client, qui
// lui contient déjà la redirection en clair.
export async function escalateToHumanCoach(
  clientId: string,
  aiCoachName: string,
  clientMessageExcerpt: string
): Promise<void> {
  try {
    const ownerId = await getPlatformOwnerId();
    if (!ownerId) return;

    const admin = createAdminClient();
    const { data: client } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", clientId)
      .maybeSingle();
    const clientName = client?.full_name ?? "Un client";

    const url = `/dashboard/coach/messages/${clientId}`;

    // Dédoublonnage : pas de nouvelle notification pour le même client dans
    // les 6h qui suivent une première alerte (même sujet probable en train
    // de se poursuivre dans la conversation) — évite de noyer Santamaria
    // sous des doublons si le client échange plusieurs messages de suite
    // sur le même sujet sensible.
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ownerId)
      .eq("type", "ai_coach_escalation")
      .eq("url", url)
      .gte("created_at", sixHoursAgo);
    if ((count ?? 0) > 0) return;

    const excerpt =
      clientMessageExcerpt.length > 180
        ? `${clientMessageExcerpt.slice(0, 180)}…`
        : clientMessageExcerpt;

    await insertNotification({
      userId: ownerId,
      type: "ai_coach_escalation",
      title: `⚠️ ${clientName} a évoqué un sujet sensible avec ${aiCoachName}`,
      body: `Le coach IA a redirigé vers toi (blessure, TCA, grossesse ou sujet médical). Message du client : "${excerpt}"`,
      url,
    });
  } catch (e) {
    console.error("escalateToHumanCoach error:", e);
  }
}
