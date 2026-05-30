import { createServerSupabase } from "@/lib/supabase-server";

export interface CoachNote {
  id: string;
  client_id: string;
  week_start: string;
  week_number: number | null;
  phase: string | null;
  weight: number | null;
  weight_variation: number | null;
  observations: string | null;
  nutrition_adjustments: string | null;
  program_adjustments: string | null;
  next_actions: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface KeyDecision {
  id: string;
  client_id: string;
  decision_date: string;
  type: "nutrition" | "programme" | "stratégie" | "autre" | null;
  decision: string;
  reason: string | null;
  result: string | null;
  created_at: string;
}

export interface CoachNoteInput {
  week_start: string;
  week_number: number | null;
  phase: string | null;
  weight: number | null;
  weight_variation: number | null;
  observations: string | null;
  nutrition_adjustments: string | null;
  program_adjustments: string | null;
  next_actions: string | null;
  rating: number | null;
}

export interface KeyDecisionInput {
  decision_date: string;
  type: string | null;
  decision: string;
  reason: string | null;
  result: string | null;
}

export function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export function getISOWeekNumber(dateStr: string): number {
  const date = new Date(dateStr + "T12:00:00");
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
}

export async function getClientNotes(clientId: string): Promise<CoachNote[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("coach_notes")
      .select("*")
      .eq("client_id", clientId)
      .order("week_start", { ascending: false });
    return (data as CoachNote[]) ?? [];
  } catch {
    return [];
  }
}

export async function getClientKeyDecisions(
  clientId: string
): Promise<KeyDecision[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("key_decisions")
      .select("*")
      .eq("client_id", clientId)
      .order("decision_date", { ascending: false });
    return (data as KeyDecision[]) ?? [];
  } catch {
    return [];
  }
}

export async function getLatestCoachNote(
  clientId: string
): Promise<CoachNote | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("coach_notes")
      .select("*")
      .eq("client_id", clientId)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as CoachNote) ?? null;
  } catch {
    return null;
  }
}

export interface ClientNoteSummary {
  clientId: string;
  clientName: string | null;
  latestNote: CoachNote | null;
  hasNoteThisWeek: boolean;
}

export async function getAllClientsNotesSummary(): Promise<ClientNoteSummary[]> {
  try {
    const supabase = await createServerSupabase();

    const [{ data: clients }, { data: notes }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "client")
        .order("full_name"),
      supabase
        .from("coach_notes")
        .select("*")
        .order("week_start", { ascending: false }),
    ]);

    if (!clients) return [];

    const monday = getCurrentMonday();
    const latestByClient: Record<string, CoachNote> = {};

    for (const note of (notes ?? []) as CoachNote[]) {
      if (!latestByClient[note.client_id]) {
        latestByClient[note.client_id] = note;
      }
    }

    return clients.map((c: { id: string; full_name: string | null }) => ({
      clientId: c.id,
      clientName: c.full_name,
      latestNote: latestByClient[c.id] ?? null,
      hasNoteThisWeek:
        latestByClient[c.id]?.week_start === monday,
    }));
  } catch {
    return [];
  }
}
