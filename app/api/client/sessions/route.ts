import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { dayLabel, programId, muscleGroups } = body as {
      dayLabel: string;
      programId?: string;
      muscleGroups?: string[];
    };

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        client_id: user.id,
        program_id: programId ?? null,
        day_label: dayLabel,
        muscle_groups: muscleGroups ?? null,
        session_date: new Date().toISOString().split("T")[0],
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
