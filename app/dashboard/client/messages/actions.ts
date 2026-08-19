"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requireClient } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { getAICoachByKey, buildAICoachSystemPrompt } from "@/lib/ai-coaches";
import { revalidatePath } from "next/cache";

// Deuxième moitié du comportement autonome d'un coach IA (voir aussi
// lib/ai-coach-welcome.ts pour le premier message) : quand SON client lui
// écrit, il répond vraiment, comme le ferait un coach humain — appelée
// depuis ConversationView juste après l'envoi réussi d'un message texte à
// un coach dont isPeerAICoach est vrai.
//
// Volontairement silencieuse en cas d'échec (limite de débit, coach pas
// réellement IA, pas de nouveau message côté client...) : le message du
// client, lui, est déjà bien envoyé au moment où cette action se déclenche
// (voir ConversationView.sendText) — un souci ici ne doit jamais donner
// l'impression que l'envoi du client lui-même a échoué.
export async function triggerAICoachReply(aiCoachId: string): Promise<{ error?: string }> {
  const guard = await requireClient();
  if (!guard.ok) return {};

  try {
    const admin = createAdminClient();

    // Vérifie que ce coach est réellement CELUI du client courant et
    // réellement IA — jamais de confiance sur le seul id transmis par le
    // client (RLS mise à part, appartenance métier vérifiée explicitement).
    const { data: client } = await admin
      .from("profiles")
      .select("coach_id, full_name")
      .eq("id", guard.userId)
      .maybeSingle();
    if (!client || client.coach_id !== aiCoachId) return {};

    const { data: coach } = await admin
      .from("profiles")
      .select("is_ai_coach, ai_coach_key")
      .eq("id", aiCoachId)
      .maybeSingle();
    if (!coach?.is_ai_coach || !coach.ai_coach_key) return {};

    const persona = getAICoachByKey(coach.ai_coach_key);
    if (!persona) return {};

    if (!process.env.ANTHROPIC_API_KEY) return {};

    const limited = await checkRateLimit(`ai-coach-reply:${guard.userId}`, PRESETS.ai.limit, PRESETS.ai.windowSeconds);
    if (!limited.allowed) return {};

    const { data: history } = await admin
      .from("messages")
      .select("sender_id, content, type")
      .eq("conversation_id", guard.userId)
      .order("created_at", { ascending: true })
      .limit(30);

    const textHistory = ((history as { sender_id: string; content: string | null; type: string }[]) ?? [])
      .filter((m) => m.type === "text" && m.content)
      .map((m) => ({
        role: (m.sender_id === aiCoachId ? "assistant" : "user") as "assistant" | "user",
        content: m.content as string,
      }));

    // Rien à répondre (dernier message déjà du coach, ou historique vide) —
    // évite qu'une double invocation ou un ordre inattendu ne fasse
    // répondre le coach IA à lui-même.
    if (textHistory.length === 0 || textHistory[textHistory.length - 1].role !== "user") return {};

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system: buildAICoachSystemPrompt(persona),
      messages: textHistory,
    });

    const reply = (response.content[0] as { type: string; text: string }).text?.trim();
    if (!reply) return {};

    await admin.from("messages").insert({
      conversation_id: guard.userId,
      sender_id: aiCoachId,
      receiver_id: guard.userId,
      type: "text",
      content: reply,
      is_read: false,
    });

    revalidatePath("/dashboard/client/messages");
    return {};
  } catch (e) {
    console.error("triggerAICoachReply error:", e);
    return {};
  }
}
