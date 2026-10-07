import { createAdminClient } from "@/lib/supabase-admin";
import { getAppSetup } from "@/lib/app-setup-server";
import { activeDisciplines } from "@/lib/app-setup";
import type { DisciplineKey, PerformanceEntry } from "@/lib/disciplines";

// Données de l'écran Performances pour une personne (elle-même, ou un client
// vu par son coach : l'appelant vérifie l'accès avant d'appeler).
export async function loadPerformance(userId: string): Promise<{
  disciplines: DisciplineKey[];
  entries: PerformanceEntry[];
  bodyweightKg: number | null;
  isWoman: boolean;
  practices: string[];
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
  const practices = Array.isArray(setup.answers?.pratique) ? (setup.answers.pratique as string[]) : [];
  return {
    disciplines: activeDisciplines(setup),
    entries: (entriesRes.data ?? []) as PerformanceEntry[],
    bodyweightKg: weightRes.data?.weight_morning ? Number(weightRes.data.weight_morning) : null,
    isWoman: intakeRes.data?.gender === "Femme",
    practices,
  };
}
