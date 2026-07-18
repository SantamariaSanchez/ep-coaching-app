import { createServerSupabase } from "@/lib/supabase-server";

export interface PeriodLog {
  id: string;
  client_id: string;
  start_date: string;
  end_date: string | null;
  flow: "leger" | "moyen" | "abondant" | null;
  symptoms: string[];
  notes: string | null;
  created_at: string;
}

export interface CycleStats {
  avgCycleLength: number | null;
  avgPeriodLength: number | null;
  lastStart: string | null;
  nextEstimated: string | null;
}

export async function getPeriodLogs(clientId: string): Promise<PeriodLog[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("period_logs")
      .select("*")
      .eq("client_id", clientId)
      .order("start_date", { ascending: false })
      .limit(24);
    return (data as PeriodLog[]) ?? [];
  } catch {
    return [];
  }
}

// Calcule la durée moyenne de cycle (écart entre débuts successifs) et la
// durée moyenne des règles à partir de l'historique — nécessite au moins
// 2 entrées pour un cycle, l'estimation de la prochaine date est une pure
// projection linéaire (pas de prédiction médicale).
export function computeCycleStats(logs: PeriodLog[]): CycleStats {
  if (logs.length === 0) {
    return { avgCycleLength: null, avgPeriodLength: null, lastStart: null, nextEstimated: null };
  }
  const sorted = [...logs].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const cycleLengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].start_date);
    const curr = new Date(sorted[i].start_date);
    const days = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (days > 0 && days < 90) cycleLengths.push(days);
  }
  const avgCycleLength = cycleLengths.length > 0
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length)
    : null;

  const periodLengths: number[] = [];
  for (const log of sorted) {
    if (!log.end_date) continue;
    const start = new Date(log.start_date);
    const end = new Date(log.end_date);
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days > 0 && days < 15) periodLengths.push(days);
  }
  const avgPeriodLength = periodLengths.length > 0
    ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
    : null;

  const lastStart = sorted[sorted.length - 1].start_date;
  let nextEstimated: string | null = null;
  if (avgCycleLength) {
    const next = new Date(lastStart);
    next.setDate(next.getDate() + avgCycleLength);
    nextEstimated = next.toISOString().split("T")[0];
  }

  return { avgCycleLength, avgPeriodLength, lastStart, nextEstimated };
}
