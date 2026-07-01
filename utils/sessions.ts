import { createServerSupabase } from "@/lib/supabase-server";

export interface Session {
  id: string;
  client_id: string;
  program_id: string | null;
  day_label: string;
  muscle_groups: string[] | null;
  session_date: string;
  warmup_duration_seconds: number | null;
  warmup_validated: boolean;
  duration_minutes: number | null;
  general_feeling: number | null;
  energy_level: number | null;
  pump: number | null;
  notes: string | null;
  is_completed: boolean;
  created_at: string;
}

export interface SessionSet {
  id: string;
  session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  muscle_group: string | null;
  set_number: number;
  reps_target: string | null;
  reps_actual: number | null;
  weight_kg: number | null;
  previous_weight_kg: number | null;
  rir_target: number | null;
  rir_actual: number | null;
  standardization_score: number | null;
  rest_duration_seconds: number | null;
  is_pr: boolean;
  notes: string | null;
  video_url: string | null;
  created_at: string;
}

export interface PersonalRecord {
  id: string;
  client_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number | null;
  achieved_at: string;
  session_id: string | null;
}

export interface SessionWithSets extends Session {
  sets: SessionSet[];
}

// ── Client session fetches ────────────────────────────────────────────────────

export async function getActiveSession(clientId: string): Promise<Session | null> {
  try {
    const supabase = await createServerSupabase();
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_completed", false)
      .eq("session_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as Session) ?? null;
  } catch {
    return null;
  }
}

export async function getClientSessions(
  clientId: string,
  limit = 10
): Promise<Session[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_completed", true)
      .order("session_date", { ascending: false })
      .limit(limit);
    return (data as Session[]) ?? [];
  } catch {
    return [];
  }
}

// Used by the Programme pages to show live "X/Y séances cette semaine"
// adherence as sessions get logged, instead of only the static plan.
export async function getSessionsThisWeekCount(clientId: string): Promise<number> {
  try {
    const supabase = await createServerSupabase();
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("is_completed", true)
      .gte("session_date", weekStartStr);

    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    return (data as Session) ?? null;
  } catch {
    return null;
  }
}

export async function getSessionWithSets(
  sessionId: string
): Promise<SessionWithSets | null> {
  try {
    const supabase = await createServerSupabase();
    const [{ data: session }, { data: sets }] = await Promise.all([
      supabase.from("sessions").select("*").eq("id", sessionId).single(),
      supabase
        .from("session_sets")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at"),
    ]);
    if (!session) return null;
    return {
      ...(session as Session),
      sets: (sets as SessionSet[]) ?? [],
    };
  } catch {
    return null;
  }
}

export async function getClientPersonalRecords(
  clientId: string
): Promise<PersonalRecord[]> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("personal_records")
      .select("*")
      .eq("client_id", clientId)
      .order("achieved_at", { ascending: false });
    return (data as PersonalRecord[]) ?? [];
  } catch {
    return [];
  }
}

/** Map: exerciseName (lowercase) → best weight_kg across all PRs */
export function buildPRMap(records: PersonalRecord[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of records) {
    const key = r.exercise_name.toLowerCase();
    if (!(key in map) || r.weight_kg > map[key]) {
      map[key] = r.weight_kg;
    }
  }
  return map;
}

// ── Coach logbook fetches ─────────────────────────────────────────────────────

export async function getAllClientSessions(
  clientId: string,
  limit = 10
): Promise<SessionWithSets[]> {
  try {
    const supabase = await createServerSupabase();
    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_completed", true)
      .order("session_date", { ascending: false })
      .limit(limit);

    if (!sessions || sessions.length === 0) return [];

    const sessionIds = (sessions as Session[]).map((s) => s.id);
    const { data: sets } = await supabase
      .from("session_sets")
      .select("*")
      .in("session_id", sessionIds)
      .order("created_at");

    const resolvedSets = await resolveSetVideoUrls(supabase, (sets as SessionSet[]) ?? []);

    const setsMap: Record<string, SessionSet[]> = {};
    for (const set of resolvedSets) {
      if (!setsMap[set.session_id]) setsMap[set.session_id] = [];
      setsMap[set.session_id].push(set);
    }

    return (sessions as Session[]).map((s) => ({
      ...s,
      sets: setsMap[s.id] ?? [],
    }));
  } catch {
    return [];
  }
}

// Set video_url holds a storage path ("sessionId/setId.webm"), not a playable
// URL — exchange it for a short-lived signed URL right before rendering.
async function resolveSetVideoUrls(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  sets: SessionSet[]
): Promise<SessionSet[]> {
  const withVideo = sets.filter((s) => s.video_url);
  if (withVideo.length === 0) return sets;

  const signed = await Promise.all(
    withVideo.map((s) =>
      supabase.storage.from("set-videos").createSignedUrl(s.video_url as string, 3600)
    )
  );

  const urlByPath: Record<string, string> = {};
  withVideo.forEach((s, i) => {
    const url = signed[i].data?.signedUrl;
    if (url) urlByPath[s.video_url as string] = url;
  });

  return sets.map((s) =>
    s.video_url && urlByPath[s.video_url] ? { ...s, video_url: urlByPath[s.video_url] } : s
  );
}

export async function getExerciseSessionHistory(
  clientId: string,
  exerciseName: string,
  limit = 10
): Promise<
  {
    date: string;
    maxWeight: number | null;
    reps: number | null;
    rir: number | null;
    score: number | null;
  }[]
> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("session_sets")
      .select(
        "weight_kg, reps_actual, rir_actual, standardization_score, created_at, session_id"
      )
      .eq("exercise_name", exerciseName)
      .order("created_at", { ascending: false })
      .limit(limit * 4);

    if (!data || data.length === 0) return [];

    // Also need session dates — fetch them
    const sessionIds = [...new Set((data as SessionSet[]).map((d) => d.session_id))];
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, session_date, client_id, is_completed")
      .in("id", sessionIds)
      .eq("client_id", clientId)
      .eq("is_completed", true);

    const dateMap: Record<string, string> = {};
    for (const s of (sessions as Session[]) ?? []) {
      dateMap[s.id] = s.session_date;
    }

    // Group by session, take max weight
    const bySession: Record<
      string,
      { date: string; maxWeight: number | null; reps: number | null; rir: number | null; score: number | null }
    > = {};
    for (const row of data as SessionSet[]) {
      const date = dateMap[row.session_id];
      if (!date) continue;
      if (!bySession[row.session_id]) {
        bySession[row.session_id] = {
          date,
          maxWeight: row.weight_kg,
          reps: row.reps_actual,
          rir: row.rir_actual,
          score: row.standardization_score,
        };
      } else if ((row.weight_kg ?? 0) > (bySession[row.session_id].maxWeight ?? 0)) {
        bySession[row.session_id] = {
          date,
          maxWeight: row.weight_kg,
          reps: row.reps_actual,
          rir: row.rir_actual,
          score: row.standardization_score,
        };
      }
    }

    return Object.values(bySession)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-limit);
  } catch {
    return [];
  }
}

// ── Export helpers ────────────────────────────────────────────────────────────

export async function getClientSessionsForExport(
  clientId: string,
  days = 30
): Promise<SessionWithSets[]> {
  try {
    const supabase = await createServerSupabase();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];

    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_completed", true)
      .gte("session_date", sinceStr)
      .order("session_date", { ascending: false });

    if (!sessions || sessions.length === 0) return [];

    const sessionIds = (sessions as Session[]).map((s) => s.id);
    const { data: sets } = await supabase
      .from("session_sets")
      .select("*")
      .in("session_id", sessionIds)
      .order("created_at");

    const setsMap: Record<string, SessionSet[]> = {};
    for (const set of (sets as SessionSet[]) ?? []) {
      if (!setsMap[set.session_id]) setsMap[set.session_id] = [];
      setsMap[set.session_id].push(set);
    }

    return (sessions as Session[]).map((s) => ({
      ...s,
      sets: setsMap[s.id] ?? [],
    }));
  } catch {
    return [];
  }
}
