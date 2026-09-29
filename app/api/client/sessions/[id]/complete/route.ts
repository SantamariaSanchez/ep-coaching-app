import { todayInParis } from "@/lib/dates";
import { NextResponse } from "next/server";
import { getProfile } from "@/utils/auth";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { sendBrevoEmail } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import { awardPoints, POINTS } from "@/lib/gamification";
import { getCoachForClient } from "@/utils/insert-notification";
import { notifyUser } from "@/lib/notify";
import { isFirstEverAction, celebrateFirstAction } from "@/lib/first-action-celebration";
import { escapeHtml } from "@/lib/sanitize";

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
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(`session-complete:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return limited;

  const { id: sessionId } = await params;
  const body = (await req.json()) as CompleteBody;
  const supabase = await createServerSupabase();

  // Verify ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("client_id, day_label, is_completed")
    .eq("id", sessionId)
    .single();

  if (!session || (session as { client_id: string }).client_id !== guard.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Déjà terminée (double envoi, nouvel essai après une réponse perdue en
  // salle) : rien à refaire. Sans ce garde, un second envoi réinsérait le
  // volume (workout_logs) et redonnait les points. Une séance rouverte
  // (voir ../reopen) repasse à is_completed=false et reste terminable.
  if ((session as { is_completed: boolean }).is_completed) {
    return NextResponse.json({ ok: true, alreadyCompleted: true });
  }

  // 1. Update session as completed
  // Conditionné à is_completed=false : deux envois quasi simultanés (nouvel
  // essai lancé pendant que le premier est encore en route) passaient tous
  // les deux le test ci-dessus. Seul celui qui fait réellement basculer la
  // séance écrit ensuite PR, volume et points.
  const { data: updatedRows, error: updateError } = await supabase
    .from("sessions")
    .update({
      is_completed: true,
      duration_minutes: body.duration_minutes,
      general_feeling: body.general_feeling,
      energy_level: body.energy_level,
      pump: body.pump,
      notes: body.notes || null,
    })
    .eq("id", sessionId)
    .eq("client_id", guard.userId)
    .eq("is_completed", false)
    .select("id");

  // L'erreur n'était jamais testée : la séance restait "en cours" en base
  // pendant que l'écran confirmait la sauvegarde. On s'arrête ici, avant
  // d'écrire le moindre PR ou volume rattaché à une séance non terminée.
  if (updateError) {
    console.error("POST complete: mise à jour de la séance impossible:", updateError);
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }
  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json({ ok: true, alreadyCompleted: true });
  }

  // 2. Insert PRs : un seul par exercice (le plus lourd), et seulement s'il
  // bat vraiment le meilleur record déjà en base. Avant, toutes les séries
  // marquées PR côté écran étaient insérées telles quelles : 5 couples
  // (séance, exercice) sur 22 en double dans personal_records, et des faux
  // PR après un rechargement de la page en pleine séance.
  const bestByExercise = new Map<string, PR>();
  for (const pr of Array.isArray(body.prs) ? body.prs : []) {
    if (typeof pr?.exerciseName !== "string" || !pr.exerciseName.trim()) continue;
    const weight = Number(pr.weightKg);
    if (!Number.isFinite(weight) || weight <= 0) continue;
    const key = pr.exerciseName.toLowerCase();
    const current = bestByExercise.get(key);
    if (!current || weight > current.weightKg) {
      bestByExercise.set(key, {
        exerciseName: pr.exerciseName,
        weightKg: weight,
        reps: typeof pr.reps === "number" && Number.isFinite(pr.reps) ? pr.reps : null,
      });
    }
  }

  let prsToInsert: PR[] = [];
  if (bestByExercise.size > 0) {
    const { data: existingRecords, error: recordsError } = await supabase
      .from("personal_records")
      .select("exercise_name, weight_kg")
      .eq("client_id", guard.userId);
    if (recordsError) {
      // Sans la liste des records existants, impossible de savoir ce qui est
      // vraiment nouveau : on n'écrit rien plutôt que de risquer des faux PR.
      console.error("POST complete: lecture des records impossible:", recordsError);
    } else {
      const bestExisting: Record<string, number> = {};
      for (const r of (existingRecords as { exercise_name: string; weight_kg: number }[]) ?? []) {
        const key = r.exercise_name.toLowerCase();
        if (!(key in bestExisting) || r.weight_kg > bestExisting[key]) bestExisting[key] = r.weight_kg;
      }
      prsToInsert = [...bestByExercise.entries()]
        .filter(([key, pr]) => !(key in bestExisting) || pr.weightKg > bestExisting[key])
        .map(([, pr]) => pr);
    }
  }

  if (prsToInsert.length > 0) {
    const { error: prError } = await supabase.from("personal_records").insert(
      prsToInsert.map((pr) => ({
        client_id: guard.userId,
        exercise_name: pr.exerciseName,
        weight_kg: pr.weightKg,
        reps: pr.reps,
        session_id: sessionId,
        achieved_at: todayInParis(),
      }))
    );
    if (prError) {
      console.error("POST complete: insertion des PR impossible:", prError);
      prsToInsert = [];
    }
  }

  // 3. Insert workout_logs for volume tracking
  // MASTERCLASS.md Axe L : new Date().toISOString()/.getDay() reflètent le
  // calendrier UTC du serveur (Vercel), pas celui de Paris — pile au
  // passage dimanche -> lundi heure de Paris (jour d'entraînement pour lui,
  // voir schedule_blocks), une séance terminée dans cette fenêtre se serait
  // vue étiqueter avec le lundi de LA SEMAINE PRÉCÉDENTE de façon
  // PERMANENTE en base (week_start), invisible du "Volume réalisé cette
  // semaine" pour toujours. Même correctif que
  // components/ui/VolumeIntensitySection.tsx et utils/sessions.ts (même
  // fonctionnalité, trois copies indépendantes du même bug trouvées).
  const todayStr = todayInParis();
  const dow = new Date(`${todayStr}T12:00:00Z`).getUTCDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const [wy, wm, wd] = todayStr.split("-").map(Number);
  const weekStartStr = new Date(Date.UTC(wy, wm - 1, wd - daysSinceMonday)).toISOString().split("T")[0];

  // Vérifié AVANT l'insert : cette séance peut écrire plusieurs lignes
  // workout_logs d'un coup (une par exercice), donc un COUNT fait après
  // l'insert ne vaudrait jamais 1 pour une vraie première séance.
  const isFirstWorkout =
    body.workoutData.length > 0 && (await isFirstEverAction(guard.userId, "workout_logs", "client_id"));

  if (body.workoutData.length > 0) {
    await supabase.from("workout_logs").insert(
      body.workoutData.map((w) => ({
        client_id: guard.userId,
        exercise_name: w.exerciseName,
        muscle_group: w.muscleGroup,
        is_direct: w.isDirect,
        sets_completed: w.setsCompleted,
        rir_actual: w.rirActual,
        weight_kg: w.weightKg,
        logged_at: new Date().toISOString(),
        week_start: weekStartStr,
        // Voir supabase/migrations/20260909e_workout_logs_session_id.sql et
        // app/api/client/sessions/[id]/reopen/route.ts : sans ce lien,
        // rouvrir une séance terminée par erreur ne pouvait pas retirer
        // proprement SES lignes de volume (une séance de la même journée
        // aurait été touchée par erreur avec une correspondance approximative).
        session_id: sessionId,
      }))
    );

    // Encouragement immédiat au membre lui-même, uniquement la toute
    // première fois (voir lib/first-action-celebration.ts) — jusqu'ici
    // seul le coach était notifié d'une séance terminée, jamais le membre.
    if (isFirstWorkout) {
      celebrateFirstAction(guard.userId, {
        type: "first_workout_logged",
        title: "🔥 Première séance loguée !",
        body: "C'est noté, et ça restera dans ton historique. Continue, chaque séance compte.",
        url: "/dashboard/client/logbook",
      }).catch(() => {});
    }
  }

  awardPoints(guard.userId, POINTS.session_complete, "Séance terminée", "session_complete", sessionId);

  // 4. Notification au coach ASSIGNÉ (in-app + push + email) — auparavant
  // l'email partait vers une adresse en dur (peccoux.manu@gmail.com), donc
  // tous les coachs tiers voyaient leurs séances client atterrir dans la
  // boîte mail du fondateur au lieu de la leur, et rien n'apparaissait dans
  // la cloche de notifications côté coach.
  const profile = await getProfile(guard.userId);
  const clientName = profile?.full_name ?? "Un client";
  const dayLabel = (session as { day_label: string }).day_label;
  // Les PR réellement enregistrés, pas ceux envoyés par l'écran : le coach
  // ne doit pas lire un record qui n'en est pas un.
  const prLine =
    prsToInsert.length > 0
      ? `<p>🏆 <strong>${prsToInsert.length} nouveau${prsToInsert.length > 1 ? "x" : ""} PR</strong> : ${prsToInsert.map((p) => `${escapeHtml(p.exerciseName)} ${p.weightKg}kg`).join(", ")}</p>`
      : "";
  const prSummary = prsToInsert.length > 0 ? ` 🏆 ${prsToInsert.length} nouveau${prsToInsert.length > 1 ? "x" : ""} PR.` : "";

  const coach = await getCoachForClient(guard.userId);

  if (coach) {
    notifyUser(coach.id, {
      type: "session_complete",
      title: "💪 Séance terminée",
      body: `${clientName} a terminé « ${dayLabel} » (${body.duration_minutes} min).${prSummary}`,
      url: `/dashboard/coach/clients/${guard.userId}/logbook`,
      senderId: guard.userId,
    }).catch(() => {});

    if (coach.email) {
      try {
        await sendBrevoEmail({
          to: coach.email,
          subject: `Séance terminée : ${clientName}`,
          // Même habillage de marque que les autres emails de l'appli
          // (logo, carte rouge sombre, pied de page) : celui-ci partait en
          // <div> brut, sans logo ni cadre.
          htmlContent: wrapBrandedEmail(`
            <h2 style="color:#E01E1E;margin:0 0 12px;font-size:18px;">💪 Séance terminée</h2>
            <p style="margin:0 0 12px;"><strong>${clientName}</strong> vient de terminer sa séance <em>${dayLabel}</em>.</p>
            <ul style="line-height:2;padding-left:16px;margin:0 0 12px;">
              <li>Durée : ${body.duration_minutes} min</li>
              <li>Énergie : ${body.energy_level}/5</li>
              <li>Pump : ${body.pump}/5</li>
              <li>Feeling : ${body.general_feeling}/5</li>
            </ul>
            ${prLine}
            <a href="${APP_URL}/dashboard/coach/clients/${guard.userId}/logbook"
               style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;
                      text-decoration:none;display:inline-block;margin-top:8px;font-weight:bold;">
              Voir le logbook
            </a>
          `),
        });
      } catch {
        // email failure is non-blocking
      }
    }
  }

  return NextResponse.json({ ok: true });
}
