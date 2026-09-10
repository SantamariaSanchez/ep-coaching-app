import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase-admin";
import { getAICoachByKey, buildAICoachSystemPrompt } from "@/lib/ai-coaches";

// Action réellement autonome d'un coach IA (demande directe 2026-08-19 :
// "les agents IA ba ils ont toujours rien fait dans mon entreprise... par
// exemple Inès ba pour l'onboarding de Rayane elle fait rien"). Dès qu'un
// client se rattache à un coach IA (choix direct ou lien d'invitation),
// ce coach lui envoie vraiment un premier message personnalisé dans la
// messagerie de l'appli — pas un template statique copié-collé, un vrai
// appel IA avec le prénom et le contexte du client.
//
// Volontairement non bloquant : appelée en fire-and-forget (jamais await
// dans le chemin critique d'inscription/rattachement), toute erreur reste
// silencieuse ici — un souci sur ce message ne doit jamais faire échouer
// l'inscription ou le changement de coach eux-mêmes.
export async function maybeSendAICoachWelcome(clientId: string, coachId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: coach } = await admin
      .from("profiles")
      .select("is_ai_coach, ai_coach_key, full_name")
      .eq("id", coachId)
      .maybeSingle();
    if (!coach?.is_ai_coach || !coach.ai_coach_key) return;

    const persona = getAICoachByKey(coach.ai_coach_key);
    if (!persona) return;

    if (!process.env.ANTHROPIC_API_KEY) return;

    const { data: client } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", clientId)
      .maybeSingle();
    const clientFirstName = client?.full_name?.split(" ")[0] || "";

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: buildAICoachSystemPrompt(persona),
      messages: [
        {
          role: "user",
          content: `Un nouveau client vient de te choisir comme coach dans l'appli${clientFirstName ? `, il s'appelle ${clientFirstName}` : ""}. Écris-lui un premier message de bienvenue court (3-5 phrases max), qui donne envie de continuer, qui dit clairement que tu es son coach IA (jamais caché), et qui l'invite à une première action concrète et simple (par exemple faire son premier bilan du jour dans l'appli). Réponds uniquement avec le message, rien d'autre.`,
        },
      ],
    });

    const text = (response.content[0] as { type: string; text: string }).text?.trim();
    if (!text) return;

    await admin.from("messages").insert({
      conversation_id: clientId,
      sender_id: coachId,
      receiver_id: clientId,
      type: "text",
      content: text,
      is_read: false,
    });
  } catch (e) {
    console.error("maybeSendAICoachWelcome error:", e);
  }
}
