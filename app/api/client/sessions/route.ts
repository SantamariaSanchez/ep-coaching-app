import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(
    `session-create:${guard.userId}`,
    PRESETS.write.limit,
    PRESETS.write.windowSeconds
  );
  if (limited) return limited;

  try {
    const body = await request.json();
    const { dayLabel, programId, muscleGroups } = body as {
      dayLabel: string;
      programId?: string;
      muscleGroups?: string[];
    };

    const supabase = await createServerSupabase();
    const today = new Date().toISOString().split("T")[0];

    // Resume an already-started session instead of creating a new one —
    // closing the app / locking the phone mid-séance must never abandon
    // progress. Without this, tapping "Démarrer" again after the app got
    // killed in the background silently orphaned the in-progress session
    // and started a brand new empty one.
    const { data: existing } = await supabase
      .from("sessions")
      .select("id")
      .eq("client_id", guard.userId)
      .eq("day_label", dayLabel)
      .eq("session_date", today)
      .eq("is_completed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ sessionId: (existing as { id: string }).id });
    }

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        client_id: guard.userId,
        program_id: programId ?? null,
        day_label: dayLabel,
        muscle_groups: muscleGroups ?? null,
        session_date: today,
        is_completed: false,
        warmup_validated: false,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ sessionId: (data as { id: string }).id });
  } catch (e) {
    console.error("Create session error:", e);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
