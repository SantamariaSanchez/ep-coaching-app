import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase-admin";
import { getAgentByKey } from "@/lib/ai-agents";

// Action réellement autonome d'un agent IA interne SUR un vrai client
// (demande directe 2026-08-19 : "les agents IA doivent gérer EP Coaching...
// s'occuper des 2 clients gratuits" — Rayane et Zacharia). Différent des
// coachs IA (lib/ai-coaches.ts, comptes profiles à part entière) : ici
// l'agent (par défaut Camila, onboarding/success) rédige un message pour
// un client réel et l'envoie via le compte du VRAI coach humain qui le
// suit déjà (sender_id = client.coach_id) — automatiser une tâche que ce
// coach ferait lui-même, pas se faire passer pour un tiers.
//
// Contexte réel (bilans faits, dernier bilan, programmes créés) injecté
// dans le prompt pour un message vraiment personnalisé, jamais un
// template générique — c'est précisément le reproche d'origine ("Inès
// pour l'onboarding de Rayane elle fait rien").
export async function sendCoachAgentCheckin(
  clientId: string,
  agentKey: string = "coach-onboarding-success"
): Promise<{ error?: string; sent?: boolean }> {
  try {
    const admin = createAdminClient();
    const { data: client } = await admin
      .from("profiles")
      .select("id, full_name, coach_id, start_date")
      .eq("id", clientId)
      .maybeSingle();
    if (!client) return { error: "Client introuvable." };
    if (!client.coach_id) return { error: "Ce client n'a pas de coach rattaché." };

    const agent = getAgentByKey(agentKey);
    if (!agent) return { error: "Agent introuvable." };

    if (!process.env.ANTHROPIC_API_KEY) return { error: "Clé ANTHROPIC_API_KEY manquante." };

    const [bilanCountRes, lastLogRes, programCountRes] = await Promise.all([
      admin.from("daily_logs").select("id", { count: "exact", head: true }).eq("client_id", clientId),
      admin.from("daily_logs").select("log_date").eq("client_id", clientId).order("log_date", { ascending: false }).limit(1).maybeSingle(),
      admin.from("programs").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    ]);

    const bilanCount = bilanCountRes.count ?? 0;
    const programCount = programCountRes.count ?? 0;
    const lastBilanDate = lastLogRes.data?.log_date as string | undefined;
    const daysSinceStart = client.start_date
      ? Math.floor((Date.now() - new Date(client.start_date).getTime()) / 86400000)
      : null;
    const daysSinceLastBilan = lastBilanDate
      ? Math.floor((Date.now() - new Date(lastBilanDate).getTime()) / 86400000)
      : null;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const firstName = client.full_name?.split(" ")[0] || "";
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: agent.systemPrompt,
      messages: [
        {
          role: "user",
          content: `Rédige un message de relance pour ${firstName || "ce client"}, inscrit depuis ${daysSinceStart ?? "un nombre inconnu de"} jours, ${bilanCount} bilan${bilanCount > 1 ? "s" : ""} fait${bilanCount > 1 ? "s" : ""} au total, dernier bilan ${daysSinceLastBilan != null ? `il y a ${daysSinceLastBilan} jour${daysSinceLastBilan > 1 ? "s" : ""}` : "jamais fait"}, ${programCount} programme${programCount > 1 ? "s" : ""} créé${programCount > 1 ? "s" : ""}. Message court (3-4 phrases), chaleureux, jamais culpabilisant, qui reconnaît où il/elle en est réellement et donne une seule action concrète à faire maintenant. Réponds uniquement avec le message, rien d'autre.`,
        },
      ],
    });

    const text = (response.content[0] as { type: string; text: string }).text?.trim();
    if (!text) return { error: "Réponse vide." };

    await admin.from("messages").insert({
      conversation_id: clientId,
      sender_id: client.coach_id,
      receiver_id: clientId,
      type: "text",
      content: text,
      is_read: false,
    });

    return { sent: true };
  } catch (e) {
    console.error("sendCoachAgentCheckin error:", e);
    return { error: "Erreur inattendue." };
  }
}
