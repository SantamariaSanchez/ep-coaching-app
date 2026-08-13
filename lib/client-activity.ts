import { createAdminClient } from "@/lib/supabase-admin";

export interface ClientActivity {
  lastActivityAt: string | null;
  // null = aucune activité trouvée sur la fenêtre regardée (silencieux
  // depuis au moins `lookbackDays`, ou compte jamais utilisé).
  daysSinceActivity: number | null;
}

// Dernière activité réelle d'un client, tous azimuts (entraînement,
// nutrition, bilan quotidien) — idée #9/#7 du chantier : repérer qui
// décroche sans avoir à ouvrir chaque fiche. Volontairement simple (juste
// "silence depuis combien de temps"), pas un score composite.
//
// Bornée à `lookbackDays` (35 par défaut) plutôt que de scanner tout
// l'historique : un client inscrit depuis un an a des milliers de lignes,
// on n'a besoin que de savoir s'il a été actif RÉCEMMENT.
export async function getClientsLastActivity(
  clientIds: string[],
  lookbackDays = 35
): Promise<Record<string, ClientActivity>> {
  if (clientIds.length === 0) return {};
  try {
    const admin = createAdminClient();
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);
    const sinceIso = since.toISOString();

    const [{ data: workouts }, { data: foods }, { data: daily }] = await Promise.all([
      admin.from("workout_logs").select("client_id, created_at").in("client_id", clientIds).gte("created_at", sinceIso),
      admin.from("food_logs").select("client_id, created_at").in("client_id", clientIds).gte("created_at", sinceIso),
      admin.from("daily_logs").select("client_id, created_at").in("client_id", clientIds).gte("created_at", sinceIso),
    ]);

    const latest: Record<string, string> = {};
    for (const rows of [workouts, foods, daily]) {
      for (const r of (rows ?? []) as { client_id: string; created_at: string }[]) {
        if (!latest[r.client_id] || r.created_at > latest[r.client_id]) {
          latest[r.client_id] = r.created_at;
        }
      }
    }

    const now = Date.now();
    const result: Record<string, ClientActivity> = {};
    for (const id of clientIds) {
      const ts = latest[id] ?? null;
      result[id] = {
        lastActivityAt: ts,
        daysSinceActivity: ts ? Math.floor((now - new Date(ts).getTime()) / 86400000) : null,
      };
    }
    return result;
  } catch {
    return {};
  }
}
