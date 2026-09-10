import { createAdminClient } from "@/lib/supabase-admin";

// Action réellement autonome de l'agent Head Coach (Axe 10, VISION.md —
// "les agents IA doivent gérer EP Coaching", "renfloué ceux déjà dans ma
// structure"). Jusqu'ici Valentina Hayes (Head Coach, lib/ai-agents.ts)
// n'existait que comme chat — sa mission déclarée ("Audit de qualité sur
// un échantillon de bilans/programmes") n'était jamais réellement
// exécutée. Cette fonction la rend réelle : scanne les vrais clients,
// crée une vraie tâche (ai_agent_tasks) par problème concret trouvé,
// jamais un résumé vague.
//
// Idempotent par construction : ne recrée jamais une tâche déjà ouverte
// pour le même client + même type de problème (vérifié par le titre
// exact avant insertion), donc relancer l'audit plusieurs fois n'empile
// pas de doublons.

export interface HeadCoachAuditResult {
  scanned: number;
  created: number;
  error?: string;
}

const STALE_BILAN_DAYS = 5;

// CORRIGÉ 2026-08-19 (avant productionisation en cron quotidien, Axe 10) :
// le titre de tâche incluait le nombre exact de jours ("depuis 5 jours",
// puis "depuis 6 jours" le lendemain) — chaque jour aurait donc créé une
// NOUVELLE tâche au lieu d'être reconnu comme déjà signalé, cassant
// l'idempotence dès qu'exécuté plus d'une fois pour le même client. Le
// titre reste maintenant stable (le nombre de jours précis va dans la
// description, qui elle peut varier sans casser la déduplication).
//
// scopeToCoachId (nouveau) : un appel sans ce paramètre (le propriétaire
// de plateforme, depuis le bouton manuel) audite tous les clients de la
// plateforme, comme avant. Le balayage automatique quotidien (voir
// app/api/cron/coach-assistant/route.ts) l'utilise pour cloisonner
// l'audit aux seuls clients de CE coach — jamais les clients d'un autre.
export async function runHeadCoachAudit(
  ownerId: string,
  options?: { scopeToCoachId?: string }
): Promise<HeadCoachAuditResult> {
  try {
    const admin = createAdminClient();

    let query = admin.from("profiles").select("id, full_name, coach_id").eq("role", "client");
    if (options?.scopeToCoachId) {
      query = query.eq("coach_id", options.scopeToCoachId);
    }
    const { data: clients } = await query;
    const rows = clients ?? [];

    const { data: existingTasks } = await admin
      .from("ai_agent_tasks")
      .select("title")
      .eq("owner_id", ownerId)
      .eq("agent_key", "head-coach")
      .neq("status", "fait");
    const existingTitles = new Set((existingTasks ?? []).map((t) => t.title as string));

    let created = 0;
    const todayMs = Date.now();

    for (const client of rows) {
      const clientId = client.id as string;
      const name = (client.full_name as string | null) ?? "Client sans nom";

      const [{ data: lastLog }, { data: programs }] = await Promise.all([
        admin
          .from("daily_logs")
          .select("log_date")
          .eq("client_id", clientId)
          .order("log_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin.from("programs").select("id").eq("client_id", clientId).order("created_at", { ascending: false }).limit(1),
      ]);

      // Bilan à l'arrêt depuis plusieurs jours.
      if (lastLog?.log_date) {
        const daysSince = Math.floor((todayMs - new Date(lastLog.log_date as string).getTime()) / 86400000);
        if (daysSince >= STALE_BILAN_DAYS) {
          const title = `${name} : bilan à l'arrêt (${STALE_BILAN_DAYS}+ jours)`;
          if (!existingTitles.has(title)) {
            await admin.from("ai_agent_tasks").insert({
              owner_id: ownerId,
              agent_key: "head-coach",
              title,
              description: `Dernier bilan le ${lastLog.log_date}. Vérifier si un message de relance ("Relance agent IA" dans la conversation avec ce client) a déjà été envoyé, sinon en déclencher un.`,
              status: "a_faire",
            });
            existingTitles.add(title);
            created++;
          }
        }
      }

      // Programme créé mais jamais réellement configuré (0 exercice).
      const latestProgramId = programs?.[0]?.id as string | undefined;
      if (latestProgramId) {
        const { count: dayCount } = await admin
          .from("program_days")
          .select("id", { count: "exact", head: true })
          .eq("program_id", latestProgramId);
        if (!dayCount || dayCount === 0) {
          const title = `${name} : programme créé sans aucune séance`;
          if (!existingTitles.has(title)) {
            await admin.from("ai_agent_tasks").insert({
              owner_id: ownerId,
              agent_key: "head-coach",
              title,
              description: "Un programme existe pour ce client mais ne contient aucune séance configurée, probablement laissé inachevé, à reprendre ou supprimer.",
              status: "a_faire",
            });
            existingTitles.add(title);
            created++;
          }
        }
      }
    }

    return { scanned: rows.length, created };
  } catch (e) {
    console.error("runHeadCoachAudit error:", e);
    return { scanned: 0, created: 0, error: "Erreur inattendue pendant l'audit." };
  }
}
