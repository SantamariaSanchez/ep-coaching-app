import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { parseWorkoutCsv, deriveProgramDaysFromSessions } from "@/utils/csv-import";
import { saveProgramForClient } from "@/utils/programs";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // reste sous la limite de payload des fonctions Vercel

export async function POST(request: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  // Un import declenche le parsing d'un CSV de plusieurs mega octets puis des
  // centaines d'insertions : c'est la route la plus couteuse cote base.
  const limited = await enforceRateLimit(
    `import-logbook:${guard.userId}`,
    10,
    3600,
    "Trop d'imports d'affilée. Réessaie dans un moment."
  );
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 4 Mo), exporte une période plus courte depuis Hevy/Strong." },
        { status: 413 }
      );
    }

    const text = await file.text();
    const parsed = parseWorkoutCsv(text);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const sourceLabel = parsed.source === "hevy" ? "Hevy" : "Strong";
    const importNote = `Importé depuis ${sourceLabel}`;

    let sessionsImported = 0;
    let setsImported = 0;
    let sessionsSkipped = 0;

    for (const session of parsed.sessions) {
      // Avoid duplicating sessions on a re-upload of the same export.
      const { data: existing } = await supabase
        .from("sessions")
        .select("id")
        .eq("client_id", guard.userId)
        .eq("session_date", session.date)
        .eq("day_label", session.dayLabel)
        .eq("notes", importNote)
        .maybeSingle();

      if (existing) {
        sessionsSkipped++;
        continue;
      }

      const { data: sessionRow, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          client_id: guard.userId,
          program_id: null,
          day_label: session.dayLabel,
          session_date: session.date,
          duration_minutes: session.durationMinutes,
          is_completed: true,
          warmup_validated: true,
          notes: importNote,
        })
        .select("id")
        .single();

      if (sessionError || !sessionRow) continue;

      const counters: Record<string, number> = {};
      const setsPayload = session.sets.map((set) => {
        counters[set.exerciseName] = (counters[set.exerciseName] ?? 0) + 1;
        return {
          session_id: (sessionRow as { id: string }).id,
          exercise_name: set.exerciseName,
          set_number: counters[set.exerciseName],
          weight_kg: set.weightKg,
          reps_actual: set.reps,
          notes: set.note,
        };
      });

      const { error: setsError } = await supabase.from("session_sets").insert(setsPayload);
      if (!setsError) {
        sessionsImported++;
        setsImported += setsPayload.length;
      }
    }

    // ── Backfill personal records from the imported history ──
    // Only insert a PR if it beats whatever the client already has on record,
    // so re-importing never overwrites a more recent real PR with an old one.
    const bestByExercise = new Map<string, { weightKg: number; reps: number | null; date: string }>();
    for (const session of parsed.sessions) {
      for (const set of session.sets) {
        if (set.weightKg == null) continue;
        const current = bestByExercise.get(set.exerciseName);
        if (!current || set.weightKg > current.weightKg) {
          bestByExercise.set(set.exerciseName, {
            weightKg: set.weightKg,
            reps: set.reps,
            date: session.date,
          });
        }
      }
    }

    for (const [exerciseName, best] of bestByExercise) {
      const { data: existingPr } = await supabase
        .from("personal_records")
        .select("weight_kg")
        .eq("client_id", guard.userId)
        .eq("exercise_name", exerciseName)
        .order("weight_kg", { ascending: false })
        .limit(1)
        .maybeSingle();

      const existingBest = (existingPr as { weight_kg: number } | null)?.weight_kg ?? 0;
      if (best.weightKg > existingBest) {
        await supabase.from("personal_records").insert({
          client_id: guard.userId,
          exercise_name: exerciseName,
          weight_kg: best.weightKg,
          reps: best.reps,
          achieved_at: best.date,
        });
      }
    }

    // ── Rebuild the active Programme from the imported split ──
    // Hevy/Strong exports only contain history, no program definition — but a
    // client switching apps still expects "their split" to show up in the
    // Programme tab instead of staying empty. One day per distinct day_label,
    // exercises/sets/reps taken from each label's most recent occurrence.
    let programCreated = false;
    const derivedDays = deriveProgramDaysFromSessions(parsed.sessions);
    if (derivedDays.length > 0) {
      const programResult = await saveProgramForClient(supabase, guard.userId, {
        name: `Programme importé (${sourceLabel})`,
        type: sourceLabel,
        frequency: derivedDays.length,
        days: derivedDays.map((d) => ({
          day_label: d.day_label,
          exercises: d.exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            rir: null,
            rest_seconds: null,
            notes: null,
            muscle_group: null,
            muscle_subgroup: null,
            is_direct: true,
          })),
        })),
      });
      programCreated = !programResult.error;
    }

    return NextResponse.json({
      source: parsed.source,
      sessionsImported,
      setsImported,
      sessionsSkipped,
      programCreated,
    });
  } catch (err) {
    // Garantit une réponse JSON propre dans tous les cas — sans ce filet, une
    // exception inattendue renvoie une page d'erreur HTML que le client ne
    // peut pas parser, et qui s'affichait comme "vérifie ta connexion".
    console.error("import-logbook error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'import. Réessaie, ou contacte ton coach si ça persiste." },
      { status: 500 }
    );
  }
}
