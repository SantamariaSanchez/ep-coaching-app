"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { VOICE_THEMES, VOICE_SOURCE_LABELS } from "@/lib/client-voice";
import { getClientVoice } from "@/lib/client-voice-server";

/**
 * Transforme un thème de « Ce que tes clientes te demandent » en idée de
 * contenu (Studio > Idées, source « question »). Les exemples sont relus côté
 * serveur et anonymisés : rien de ce que le navigateur envoie n'est repris.
 */
export async function voiceThemeToIdeaAction(themeId: string): Promise<{ error?: string }> {
  const guard = await requireAuth();
  if (!guard.ok) return { error: guard.error };
  if (!VOICE_THEMES.some((t) => t.id === themeId)) return { error: "Thème inconnu." };
  const admin = createAdminClient();
  const { data: me } = await admin.from("profiles").select("role, is_platform_owner").eq("id", guard.userId).maybeSingle();
  if (!me || me.role === "client") return { error: "Réservé aux coachs." };

  const voice = await getClientVoice(guard.userId, !!me.is_platform_owner, 30);
  const theme = voice.themes.find((t) => t.id === themeId);
  if (!theme) return { error: "Plus aucune phrase sur ce thème ce mois-ci." };

  const notes = [
    `Thème qui revient : ${theme.label} (${theme.count} fois en 30 jours).`,
    "Ce qu'elles écrivent (anonyme) :",
    ...theme.examples.map((e) => `- « ${e.text} » (${VOICE_SOURCE_LABELS[e.source]})`),
    "",
    "Ouvre sur la question telle qu'elle revient, réponds avec une règle simple et refaisable. Ne nomme ni ne reconnais jamais personne.",
  ].join("\n");
  const { error } = await admin.from("content_ideas").insert({
    coach_id: guard.userId,
    title: theme.angle.replace(/^«\s*|\s*»$/g, "").slice(0, 200),
    notes,
    platform: "general",
    status: "idee",
    source: "question",
  });
  if (error) {
    console.error("voiceThemeToIdeaAction error:", error);
    return { error: "Idée impossible à créer, réessaie." };
  }
  revalidatePath("/dashboard/coach/studio");
  return {};
}
