import { NextResponse } from "next/server";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { sendBrevoEmail } from "@/utils/brevo";
import { awardPoints, POINTS } from "@/lib/gamification";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface PR {
  exerciseName: string;
  weightKg: number;
  reps: number | null;
}

interface WorkoutData {
  exerciseName: string;
  muscleGroup: string;
  isDirect: boolean;
  setsCompleted: number;
  rirActual: number | null;
  weightKg: number | null;
}

interface CompleteBody {
  duration_minutes: number;
  general_feeling: number;
  energy_level: number;
  pump: number;
  notes: string;
  prs: PR[];
  workoutData: WorkoutData[];
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = await params;
  const body = (await req.json()) as CompleteBody;
  const supabase = await createServerSupabase();

  // Verify ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("client_id, day_label")
    .eq("id", sessionId)
    .single();

  if (!session || (session as { client_id: string }).client_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Update session as completed
  await supabase
    .from("sessions")
    .update({
      is_completed: true,
      duration_minutes: body.duration_minutes,
      general_feeling: body.general_feeling,
      energy_level: body.energy_level,
      pump: body.pump,
      notes: body.notes || null,
    })
    .eq("id", sessionId);

  // 2. Insert PRs
  if (body.prs.length > 0) {
    await supabase.from("personal_records").insert(
      body.prs.map((pr) => ({
        client_id: user.id,
        exercise_name: pr.exerciseName,
        weight_kg: pr.weightKg,
        reps: pr.reps,
        session_id: sessionId,
        achieved_at: new Date().toISOString().split("T")[0],
      }))
    );
  }

  // 3. Insert workout_logs for volume tracking
  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekStartStr = weekStart.toISOString().split("T")[0];

  if (body.workoutData.length > 0) {
    await supabase.from("workout_logs").insert(
      body.workoutData.map((w) => ({
        client_id: user.id,
        exercise_name: w.exerciseName,
        muscle_group: w.muscleGroup,
        is_direct: w.isDirect,
        sets_completed: w.setsCompleted,
        rir_actual: w.rirActual,
        weight_kg: w.weightKg,
        logged_at: new Date().toISOString(),
        week_start: weekStartStr,
      }))
    );
  }

  awardPoints(user.id, POINTS.session_complete, "Séance terminée", "session_complete", sessionId);

  // 4. Email notification to coach
  const profile = await getProfile(user.id);
  const clientName = profile?.full_name ?? "Un client";
  const prLine =
    body.prs.length > 0
      ? `<p>🏆 <strong>${body.prs.length} nouveau${body.prs.length > 1 ? "x" : ""} PR</strong> : ${body.prs.map((p) => `${p.exerciseName} ${p.weightKg}kg`).join(", ")}</p>`
      : "";

  try {
    await sendBrevoEmail({
      to: "peccoux.manu@gmail.com",
      subject: `Séance terminée : ${clientName}`,
      htmlContent: `
        <div style="font-family:sans-serif;background:#270101;color:#F5EDED;padding:32px;border-radius:12px;">
          <h2 style="color:#E01E1E;margin-top:0;">💪 Séance terminée</h2>
          <p><strong>${clientName}</strong> vient de terminer sa séance <em>${(session as { day_label: string }).day_label}</em>.</p>
          <ul style="line-height:2;padding-left:16px;">
            <li>Durée : ${body.duration_minutes} min</li>
            <li>Énergie : ${body.energy_level}/5</li>
            <li>Pump : ${body.pump}/5</li>
            <li>Feeling : ${body.general_feeling}/5</li>
          </ul>
          ${prLine}
          <a href="${APP_URL}/dashboard/coach/clients/${user.id}/logbook"
             style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                    text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold;">
            Voir le logbook
          </a>
        </div>
      `,
    });
  } catch {
    // email failure is non-blocking
  }

  return NextResponse.json({ ok: true });
}
