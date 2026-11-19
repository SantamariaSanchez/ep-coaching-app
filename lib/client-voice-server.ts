import { createAdminClient } from "@/lib/supabase-admin";
import { cleanReasons, groupVoice, type VoiceSnippet, type VoiceTheme } from "@/lib/client-voice";

// Lecture serveur pour « Ce que tes clientes te demandent » (lib/client-voice.ts).
// Un coach ne lit que les phrases de SES clientes ; les candidatures et la
// communauté (tout le site) ne sont lues que pour le propriétaire de la
// plateforme. Lecture best-effort : une source en panne est simplement absente.

const CHECKIN_FIELDS: { col: string; kind: string }[] = [
  { col: "coach_questions", kind: "question au coach" },
  { col: "upcoming_obstacles", kind: "obstacle à venir" },
  { col: "plan_adherence_feedback", kind: "ressenti sur le plan" },
  { col: "improvement_reflection", kind: "à améliorer" },
  { col: "biggest_win", kind: "victoire" },
];

const PREQUAL_FIELDS: { key: string; kind: string }[] = [
  { key: "blocage", kind: "ce qui bloque" },
  { key: "pourquoi", kind: "pourquoi maintenant" },
  { key: "objectif", kind: "objectif" },
];

export async function getClientVoice(
  coachId: string,
  isOwner: boolean,
  days = 30
): Promise<{ themes: VoiceTheme[]; total: number; days: number; reasons: { kind: string; text: string }[] }> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const snippets: VoiceSnippet[] = [];

  const { data: clients } = await admin.from("profiles").select("id").eq("coach_id", coachId).neq("id", coachId).limit(1000);
  const clientIds = ((clients ?? []) as { id: string }[]).map((c) => c.id);

  const tasks: PromiseLike<void>[] = [];
  const rawReasons: { kind: string; text: string | null }[] = [];
  if (clientIds.length > 0) {
    // Raisons du choix : toute la fiche d'onboarding, pas seulement 30 jours
    // (elle n'est remplie qu'une fois par cliente).
    tasks.push(
      admin
        .from("client_intake")
        .select("why_me, why_joined, created_at")
        .in("client_id", clientIds)
        .order("created_at", { ascending: false })
        .limit(200)
        .then(({ data }) => {
          for (const r of (data ?? []) as { why_me?: string | null; why_joined?: string | null }[]) {
            rawReasons.push({ kind: "pourquoi toi", text: r.why_me ?? null }, { kind: "ce qui a donné envie", text: r.why_joined ?? null });
          }
        }, () => undefined)
    );
    tasks.push(
      admin
        .from("check_ins")
        .select(`created_at, ${CHECKIN_FIELDS.map((f) => f.col).join(", ")}`)
        .in("client_id", clientIds)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(400)
        .then(({ data }) => {
          for (const row of (data ?? []) as unknown as Record<string, string | null>[]) {
            for (const f of CHECKIN_FIELDS) {
              const v = row[f.col];
              if (typeof v === "string" && v.trim()) snippets.push({ source: "checkin", kind: f.kind, text: v, at: row.created_at ?? "" });
            }
          }
        }, () => undefined)
    );
    tasks.push(
      admin
        .from("messages")
        .select("content, created_at, sender_id")
        .eq("receiver_id", coachId)
        .eq("type", "text")
        .in("sender_id", clientIds)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(400)
        .then(({ data }) => {
          for (const m of (data ?? []) as { content: string | null; created_at: string }[]) {
            // Les questions seulement : « ok merci » n'apprend rien.
            if (m.content && m.content.includes("?")) snippets.push({ source: "message", kind: "question", text: m.content, at: m.created_at });
          }
        }, () => undefined)
    );
  }

  if (isOwner) {
    tasks.push(
      admin
        .from("prequalification_responses")
        .select("answers, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300)
        .then(({ data }) => {
          for (const r of (data ?? []) as { answers: Record<string, unknown> | null; created_at: string }[]) {
            for (const f of PREQUAL_FIELDS) {
              const v = r.answers?.[f.key];
              if (typeof v === "string" && v.trim()) snippets.push({ source: "candidature", kind: f.kind, text: v, at: r.created_at });
            }
          }
        }, () => undefined)
    );
    tasks.push(
      admin
        .from("community_posts")
        .select("content, created_at")
        .eq("type", "question")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300)
        .then(({ data }) => {
          for (const p of (data ?? []) as { content: string | null; created_at: string }[]) {
            if (p.content) snippets.push({ source: "communaute", kind: "question", text: p.content, at: p.created_at });
          }
        }, () => undefined)
    );
  }

  await Promise.all(tasks);
  return { themes: groupVoice(snippets), total: snippets.length, days, reasons: cleanReasons(rawReasons) };
}
