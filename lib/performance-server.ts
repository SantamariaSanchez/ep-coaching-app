import { createAdminClient } from "@/lib/supabase-admin";
import { getAppSetup } from "@/lib/app-setup-server";
import { activeDisciplines } from "@/lib/app-setup";
import type { DisciplineKey, PerformanceEntry } from "@/lib/disciplines";
import { logbookRecords, type LogbookRecords } from "@/lib/training-styles";

// Données de l'écran Performances pour une personne (elle-même, ou un client
// vu par son coach : l'appelant vérifie l'accès avant d'appeler).
export async function loadPerformance(userId: string): Promise<{
  disciplines: DisciplineKey[];
  entries: PerformanceEntry[];
  bodyweightKg: number | null;
  isWoman: boolean;
  practices: string[];
  logbook: LogbookRecords;
}> {
  const admin = createAdminClient();
  const since = new Date();
  since.setFullYear(since.getFullYear() - 2);
  const [setup, entriesRes, weightRes, intakeRes] = await Promise.all([
    getAppSetup(userId),
    admin.from("performance_entries").select("id, discipline, kind, performed_on, data, created_at").eq("owner_id", userId).gte("performed_on", since.toISOString().slice(0, 10)).order("performed_on", { ascending: false }).limit(2000),
    admin.from("daily_logs").select("weight_morning").eq("client_id", userId).not("weight_morning", "is", null).order("log_date", { ascending: false }).limit(1).maybeSingle(),
    admin.from("client_intake").select("gender").eq("client_id", userId).maybeSingle(),
  ]);
  const logbook = await loadLogbookRecords(userId);
  const practices = Array.isArray(setup.answers?.pratique) ? (setup.answers.pratique as string[]) : [];
  return {
    disciplines: activeDisciplines(setup),
    entries: (entriesRes.data ?? []) as PerformanceEntry[],
    bodyweightKg: weightRes.data?.weight_morning ? Number(weightRes.data.weight_morning) : null,
    isWoman: intakeRes.data?.gender === "Femme",
    practices,
    logbook,
  };
}

// Séries du logbook (150 dernières séances) lues pour en tirer les records de
// force et de calisthenics. Lecture tolérante : sans la colonne details
// (migration 20261014), seuls les noms d'exercices servent.
async function loadLogbookRecords(userId: string): Promise<LogbookRecords> {
  try {
    const admin = createAdminClient();
    const { data: sessions } = await admin.from("sessions").select("id").eq("client_id", userId).order("session_date", { ascending: false }).limit(150);
    const ids = ((sessions as { id: string }[]) ?? []).map((s) => s.id);
    const rows: { exercise_name: string; weight_kg: number | null; reps_actual: number | null; details?: unknown }[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      let res = await admin.from("session_sets").select("exercise_name, weight_kg, reps_actual, details").in("session_id", chunk).not("reps_actual", "is", null);
      if (res.error) res = (await admin.from("session_sets").select("exercise_name, weight_kg, reps_actual").in("session_id", chunk).not("reps_actual", "is", null)) as typeof res;
      rows.push(...((res.data as typeof rows | null) ?? []));
    }
    return logbookRecords(rows);
  } catch {
    return { lifts: [], total: null, skills: [], maxReps: [] };
  }
}
