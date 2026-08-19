"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requirePlatformOwner } from "@/lib/auth-guards";
import { checkRateLimit, PRESETS } from "@/lib/rate-limit";
import { createServerSupabase } from "@/lib/supabase-server";
import { getAgentByKey } from "@/lib/ai-agents";
import { runHeadCoachAudit, type HeadCoachAuditResult } from "@/lib/head-coach-audit";
import { revalidatePath } from "next/cache";

// Chat avec un agent IA (demande explicite 2026-08-17 : "mets moi vraiment
// ces agents IA dans l'appli que je puisse discuter avec eux directement").
// Même intégration Anthropic que le reste de l'appli (analyze-meal-photo),
// modèle claude-haiku-4-5. Le prompt système de l'agent (lib/ai-agents.ts)
// est statique, jamais modifiable côté client.
//
// requirePlatformOwner() et non requireCoach() (corrigé 2026-08-17) :
// cette fonctionnalité vit dans Administration > Organisation, réservée
// au propriétaire de la plateforme comme le reste du groupe (voir
// ../actions.ts, même garde sur setRoleStatus/setApplicationStatus). Un
// coach tiers recruté via /carrieres n'a pas à pouvoir consommer le
// budget Anthropic du propriétaire via ces actions, même si la page qui
// les appelle est elle-même déjà protégée par le même contrôle.
export async function sendAgentMessage(
  agentKey: string,
  message: string
): Promise<{ error?: string; reply?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  const agent = getAgentByKey(agentKey);
  if (!agent) return { error: "Agent introuvable." };

  const trimmed = message.trim();
  if (!trimmed) return { error: "Message vide." };
  if (trimmed.length > 4000) return { error: "Message trop long (4000 caractères max)." };

  const limited = await checkRateLimit(`agent-chat:${guard.userId}`, PRESETS.ai.limit, PRESETS.ai.windowSeconds);
  if (!limited.allowed) {
    return { error: "Trop de messages d'un coup, réessaie dans un instant." };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Clé ANTHROPIC_API_KEY manquante dans les variables d'environnement." };
  }

  try {
    const supabase = await createServerSupabase();

    // Le message utilisateur est sauvegardé avant l'appel IA : il reste
    // visible même si l'appel échoue ensuite, jamais perdu silencieusement.
    await supabase.from("ai_agent_messages").insert({
      owner_id: guard.userId,
      agent_key: agentKey,
      role: "user",
      content: trimmed,
    });

    const { data: history } = await supabase
      .from("ai_agent_messages")
      .select("role, content")
      .eq("owner_id", guard.userId)
      .eq("agent_key", agentKey)
      .order("created_at", { ascending: true })
      .limit(40);

    const messages = ((history as { role: string; content: string }[] | null) ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1500,
      system: agent.systemPrompt,
      messages,
    });

    const reply = (response.content[0] as { type: string; text: string }).text.trim();

    await supabase.from("ai_agent_messages").insert({
      owner_id: guard.userId,
      agent_key: agentKey,
      role: "assistant",
      content: reply,
    });

    revalidatePath(`/dashboard/coach/admin/organisation/agents/${agentKey}`);
    return { reply };
  } catch (e) {
    console.error("sendAgentMessage error:", e);
    return { error: "Erreur lors de l'envoi du message, réessaie." };
  }
}

export async function clearAgentConversation(agentKey: string): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("ai_agent_messages")
      .delete()
      .eq("owner_id", guard.userId)
      .eq("agent_key", agentKey);
    if (error) return { error: "Erreur lors de la suppression." };
    revalidatePath(`/dashboard/coach/admin/organisation/agents/${agentKey}`);
    return {};
  } catch (e) {
    console.error("clearAgentConversation error:", e);
    return { error: "Erreur inattendue." };
  }
}

export type AgentTaskStatus = "a_faire" | "en_cours" | "fait";

export async function createAgentTask(
  agentKey: string,
  title: string,
  description: string
): Promise<{ error?: string; id?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  const cleanTitle = title.trim().slice(0, 200);
  if (!cleanTitle) return { error: "Le titre de la tâche est requis." };

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("ai_agent_tasks")
      .insert({
        owner_id: guard.userId,
        agent_key: agentKey,
        title: cleanTitle,
        description: description.trim().slice(0, 2000) || null,
      })
      .select("id")
      .single();
    if (error || !data) return { error: "Erreur lors de la création de la tâche." };
    revalidatePath(`/dashboard/coach/admin/organisation/agents/${agentKey}`);
    revalidatePath("/dashboard/coach/admin/organisation");
    return { id: data.id as string };
  } catch (e) {
    console.error("createAgentTask error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function updateAgentTaskStatus(
  taskId: string,
  agentKey: string,
  status: AgentTaskStatus
): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("ai_agent_tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", taskId)
      .eq("owner_id", guard.userId);
    if (error) return { error: "Erreur lors de la mise à jour." };
    revalidatePath(`/dashboard/coach/admin/organisation/agents/${agentKey}`);
    revalidatePath("/dashboard/coach/admin/organisation");
    return {};
  } catch (e) {
    console.error("updateAgentTaskStatus error:", e);
    return { error: "Erreur inattendue." };
  }
}

export async function deleteAgentTask(taskId: string, agentKey: string): Promise<{ error?: string }> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { error: guard.error };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("ai_agent_tasks")
      .delete()
      .eq("id", taskId)
      .eq("owner_id", guard.userId);
    if (error) return { error: "Erreur lors de la suppression." };
    revalidatePath(`/dashboard/coach/admin/organisation/agents/${agentKey}`);
    revalidatePath("/dashboard/coach/admin/organisation");
    return {};
  } catch (e) {
    console.error("deleteAgentTask error:", e);
    return { error: "Erreur inattendue." };
  }
}

// Action réellement autonome (Axe 10, VISION.md — "renfloué ceux déjà
// dans ma structure") : Valentina (Head Coach) scanne les vrais clients
// et crée une vraie tâche par problème concret trouvé, voir
// lib/head-coach-audit.ts. Réservée au propriétaire de plateforme comme
// le reste de cette page.
export async function triggerHeadCoachAudit(): Promise<HeadCoachAuditResult> {
  const guard = await requirePlatformOwner();
  if (!guard.ok) return { scanned: 0, created: 0, error: guard.error };

  const result = await runHeadCoachAudit(guard.userId);
  if (result.created > 0) {
    revalidatePath("/dashboard/coach/admin/organisation/agents/head-coach");
    revalidatePath("/dashboard/coach/admin/organisation");
  }
  return result;
}
