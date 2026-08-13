import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";

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

// Item 20 : régularité mise en avant, calculée à la volée plutôt que
// stockée — jours consécutifs avec au moins une activité (entraînement,
// nutrition, bilan) jusqu'à aujourd'hui. Client de session (pas admin) : un
// client ne calcule jamais que SA propre régularité, RLS suffit ici,
// contrairement à getClientsLastActivity ci-dessus qui lit pour d'autres
// utilisateurs (le coach) et doit passer par l'admin.
//
// "Aujourd'hui pas encore loggé" ne casse pas le streak (la journée n'est
// pas finie) : le calcul démarre d'hier dans ce cas, comme les streaks
// habituels (Duolingo etc).
export async function getClientActivityStreak(clientId: string): Promise<number> {
  try {
    const supabase = await createServerSupabase();
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const sinceIso = since.toISOString();

    const [{ data: workouts }, { data: foods }, { data: daily }] = await Promise.all([
      supabase.from("workout_logs").select("created_at").eq("client_id", clientId).gte("created_at", sinceIso),
      supabase.from("food_logs").select("created_at").eq("client_id", clientId).gte("created_at", sinceIso),
      supabase.from("daily_logs").select("created_at").eq("client_id", clientId).gte("created_at", sinceIso),
    ]);

    const days = new Set<string>();
    for (const rows of [workouts, foods, daily]) {
      for (const r of (rows ?? []) as { created_at: string }[]) {
        days.add(r.created_at.slice(0, 10));
      }
    }

    const cursor = new Date();
    const todayStr = cursor.toISOString().slice(0, 10);
    if (!days.has(todayStr)) cursor.setDate(cursor.getDate() - 1);

    let streak = 0;
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  } catch {
    return 0;
  }
}
