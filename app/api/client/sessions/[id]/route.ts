import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createServerSupabase } from "@/lib/supabase-server";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { getActiveProgram } from "@/utils/programs";
import type { Session, SessionSet, PersonalRecord } from "@/utils/sessions";
import type { Exercise } from "@/utils/programs";
import { loadPreviousForNames } from "@/lib/session-previous";
import { getProfile } from "@/utils/auth";

interface InitData {
  session: Session;
  exercises: Exercise[];
  prMap: Record<string, number>; // exerciseName.lower → best weight
  prevWeights: Record<string, { weight: number | null; reps: string | null; rir: number | null }>;
  // Retour direct 2026-09-17 ("j'arrive sur mon exo et je vois ce que j'ai
  // fait la dernière fois, pas juste un set mais TOUS les sets") :
  // prevWeights ne garde qu'UN set (le plus récent créé, toutes séances
  // confondues) — utile pour la suggestion de charge (suggestNextWeight),
  // mais illisible comme "historique". prevSets regroupe plutôt TOUS les
  // sets de la séance précédente la plus récente où cet exercice a été
  // fait, dans l'ordre (set_number croissant).
  prevSets: Record<string, { weight: number | null; reps: string | null; rir: number | null }[]>;
  existingSets: SessionSet[];
  // Note libre persistante par exercice, clé = nom exact (pas .lower, même
  // convention que accessoriesByName) — voir client_exercise_notes.
  exerciseNotes: Record<string, string>;
  // exerciseName.lower → conseils réels + vidéo d'exemple, tirés de la
  // bibliothèque d'exercices (exercise_library) plutôt que d'un petit
  // dictionnaire générique — voir lib/execution-tips.ts pour le fallback.
  libraryByName: Record<string, { instructions: string | null; video_url: string | null }>;
  // "À prévoir" (lib/session-accessories.ts) : bagage choisi explicitement
  // par exercice (exercise_library.accessories), clé exacte (pas .lower,
  // accessoriesForSession matche sur le nom affiché tel quel).
  accessoriesByName: Record<string, string[]>;
  // Séance terminée uniquement : set id → URL signée de sa vidéo, pour le
  // "Détail des séries" du récap (video_url en base n'est qu'un chemin de
  // stockage, pas une adresse lisible).
  videoUrlsBySetId: Record<string, string>;
  // Bouton « Envoyer au coach » des vidéos de série : seulement avec un
  // coach (autre que soi-même, cas du fondateur en double rôle).
  hasCoach: boolean;
}

// Noms des exercices ajoutés ou remplaçants mémorisés dans l'état de séance
// (sessions.live_state, migration 20261014), lecture tolérante.
function addedNamesFromLiveState(sess: Session): string[] {
  const live = (sess as Session & { live_state?: unknown }).live_state;
  if (!live || typeof live !== "object") return [];
  const added = (live as { added?: unknown }).added;
  if (!Array.isArray(added)) return [];
  return added
    .map((e) => (e && typeof e === "object" ? (e as { name?: unknown }).name : null))
    .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
    .slice(0, 50);
}

// Exercice "synthétique" pour des séries enregistrées dont le nom n'existe
// pas dans la liste d'exercices de la séance : séance libre, séance importée
// (Hevy/Strong, program_id null), séance faite sur une version précédente du
// programme, ou exercice ajouté en cours de séance (sa liste ne vit qu'en
// localStorage). Sans lui, SessionView n'affichait tout simplement pas ces
// séries : 7 séances terminées du fondateur montraient 0 série alors que 70
// existaient en base. Le préfixe "local-" est obligatoire : persistSet
// envoie alors exercise_id null (pas d'uuid inventé) et ExerciseCard le
// traite comme un exercice ajouté à la volée.
function syntheticExercisesFor(sets: SessionSet[], known: Exercise[]): Exercise[] {
  // Comparaison au nom EXACT, la même que buildExerciseState côté client :
  // une comparaison en minuscules laisserait invisible une série "curl"
  // face à un exercice "Curl" (le client ne les rapproche pas).
  const knownNames = new Set(known.map((e) => e.name));
  const byName = new Map<string, SessionSet[]>();
  for (const s of sets) {
    if (knownNames.has(s.exercise_name)) continue;
    const list = byName.get(s.exercise_name);
    if (list) list.push(s);
    else byName.set(s.exercise_name, [s]);
  }
  // Map garde l'ordre d'insertion : sets arrive trié par created_at, donc
  // les exercices sortent dans l'ordre où ils ont été faits.
  return [...byName.entries()].map(([name, rows], i) => ({
    // Dérivé du nom plutôt que de l'index : l'ordre des exercices mémorisé
    // en localStorage (exerciseOrderKey) reste valable d'un chargement à
    // l'autre même si une série d'un autre exercice est retirée entre-temps.
    id: `local-set-${name}`,
    day_id: "",
    name,
    sets: new Set(rows.map((r) => r.set_number)).size,
    reps: rows[0].reps_target,
    rir: rows[0].rir_target,
    rest_seconds: null,
    notes: null,
    position: 1000 + i,
    muscle_group: rows.find((r) => r.muscle_group)?.muscle_group ?? null,
    muscle_subgroup: null,
    is_direct: true,
  }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const { id: sessionId } = await params;
  const supabase = await createServerSupabase();

  // Fetch session
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("client_id", guard.userId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const sess = session as Session;

  // Fetch exercises for this day (if linked to a program)
  let programExercises: Exercise[] = [];
  if (sess.program_id && sess.day_label) {
    // Séance TERMINÉE : la version du programme sur laquelle elle a été
    // faite. Chaque sauvegarde du programme en crée un nouveau (voir
    // saveProgramForClient), donc le programme actif d'aujourd'hui ne
    // contient plus forcément les exercices d'une séance passée. Le
    // programme doit appartenir au client : sessions.program_id vient du
    // corps de la requête de création, jamais vérifié à ce moment-là.
    if (sess.is_completed) {
      const { data: ownProgram } = await supabase
        .from("programs")
        .select("id")
        .eq("id", sess.program_id)
        .eq("client_id", guard.userId)
        .maybeSingle();
      if (ownProgram) {
        const { data: dayRow } = await supabase
          .from("program_days")
          .select("id")
          .eq("program_id", sess.program_id)
          .eq("day_label", sess.day_label)
          .limit(1)
          .maybeSingle();
        if (dayRow) {
          const { data: exRows } = await supabase
            .from("exercises")
            .select("*")
            .eq("day_id", (dayRow as { id: string }).id)
            .order("position");
          programExercises = (exRows as Exercise[]) ?? [];
        }
      }
    }
    // Séance en cours (ou version introuvable) : le programme actif, comme
    // avant. Indispensable pendant l'entraînement : un programme modifié en
    // cours de séance doit s'afficher dans sa nouvelle version.
    if (programExercises.length === 0) {
      const program = await getActiveProgram(guard.userId);
      if (program) {
        const day = program.days.find((d) => d.day_label === sess.day_label);
        programExercises = day?.exercises ?? [];
      }
    }
  }

  // Fetch existing sets for this session
  const { data: existingSetsRaw } = await supabase
    .from("session_sets")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at");
  const existingSets = (existingSetsRaw as SessionSet[]) ?? [];

  // Liste combinée : exercices du programme puis, à la suite, un exercice
  // synthétique par nom de série enregistrée qui n'y figure pas. Toutes les
  // lectures ci-dessous (dernière fois, bibliothèque, notes) partent d'elle.
  const exercises: Exercise[] = [
    ...programExercises,
    ...syntheticExercisesFor(existingSets, programExercises),
  ];

  // Fetch personal records
  const { data: prs } = await supabase
    .from("personal_records")
    .select("exercise_name, weight_kg")
    .eq("client_id", guard.userId);

  const prMap: Record<string, number> = {};
  for (const r of (prs as PersonalRecord[]) ?? []) {
    const key = r.exercise_name.toLowerCase();
    if (!(key in prMap) || r.weight_kg > prMap[key]) {
      prMap[key] = r.weight_kg;
    }
  }

  // "Dernière fois" (voir lib/session-previous.ts) : exercices de la séance,
  // plus les remplaçants et ajouts déjà mémorisés dans live_state (machine
  // prise, exercice ajouté), pour qu'ils aient eux aussi leur historique au
  // rechargement.
  const liveAddedNames = addedNamesFromLiveState(sess);
  const { prevWeights, prevSets } = await loadPreviousForNames(
    supabase,
    guard.userId,
    sessionId,
    [...exercises.map((e) => e.name), ...liveAddedNames]
  );

  // Conseils + vidéo d'exemple par exercice, tirés de la bibliothèque —
  // match par nom (pas de FK entre les exercices d'un programme et la
  // bibliothèque), insensible à la casse.
  const libraryByName: Record<string, { instructions: string | null; video_url: string | null }> = {};
  const accessoriesByName: Record<string, string[]> = {};
  if (exercises.length > 0) {
    const { data: libraryRows } = await supabase
      .from("exercise_library")
      .select("name, instructions, video_url, accessories");
    for (const row of (libraryRows as { name: string; instructions: string | null; video_url: string | null; accessories: string[] | null }[]) ?? []) {
      libraryByName[row.name.toLowerCase()] = { instructions: row.instructions, video_url: row.video_url };
      accessoriesByName[row.name] = row.accessories ?? [];
    }
  }

  // Note libre persistante par exercice (Logbook, "Ton exercice") — retour
  // direct 2026-09-17 : avant, cette note vivait en localStorage clée par
  // sessionId, donc remise à zéro à chaque nouvelle séance. Une seule ligne
  // par (client, exercice), indépendante de la séance en cours (voir
  // migration 20260917e_client_exercise_notes.sql).
  const exerciseNotes: Record<string, string> = {};
  if (exercises.length > 0) {
    const { data: noteRows } = await supabase
      .from("client_exercise_notes")
      .select("exercise_name, note")
      .eq("client_id", guard.userId);
    for (const row of (noteRows as { exercise_name: string; note: string }[]) ?? []) {
      exerciseNotes[row.exercise_name] = row.note;
    }
  }

  // Vidéos des séries d'une séance terminée, lisibles dans le récap. Même
  // bucket et même durée que le logbook (utils/sessions.ts,
  // resolveSetVideoUrls). Un échec de signature n'empêche jamais le récap de
  // s'afficher : la série garde juste sa pastille sans lien.
  const videoUrlsBySetId: Record<string, string> = {};
  const withVideo = sess.is_completed ? existingSets.filter((s) => s.video_url) : [];
  if (withVideo.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from("set-videos")
      .createSignedUrls(withVideo.map((s) => s.video_url as string), 3600);
    if (signError) {
      console.error("GET session: signature des vidéos impossible:", signError);
    }
    const urlByPath: Record<string, string> = {};
    for (const row of signed ?? []) {
      if (row.path && row.signedUrl) urlByPath[row.path] = row.signedUrl;
    }
    for (const s of withVideo) {
      const url = urlByPath[s.video_url as string];
      if (url) videoUrlsBySetId[s.id] = url;
    }
  }

  const profile = await getProfile(guard.userId);
  const hasCoach = !!profile?.coach_id && profile.coach_id !== guard.userId;

  const result: InitData = {
    session: sess,
    exercises,
    prMap,
    prevWeights,
    prevSets,
    existingSets,
    libraryByName,
    accessoriesByName,
    exerciseNotes,
    videoUrlsBySetId,
    hasCoach,
  };

  return NextResponse.json(result);
}

// PATCH — update warmup validated
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(`session-patch:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return limited;

  const { id: sessionId } = await params;
  const body = await req.json();
  const supabase = await createServerSupabase();

  // Allowlist explicite plutôt que d'écrire le body tel quel : sans ça, un
  // body forgé pourrait réassigner client_id (ou toute autre colonne) de la
  // séance au lieu de se limiter au warmup.
  const update: Record<string, unknown> = {};
  if (body.warmup_validated !== undefined) update.warmup_validated = body.warmup_validated;
  if (body.warmup_duration_seconds !== undefined) update.warmup_duration_seconds = body.warmup_duration_seconds;

  // État de la séance en cours (ordre, exercices retirés ou remplacés,
  // saisies pas encore validées), voir lib/live-session.ts. Un objet de
  // quelques Ko : au-delà de 256 Ko, c'est un envoi anormal, refusé.
  let liveState: unknown = undefined;
  if (body.live_state !== undefined) {
    const ok =
      body.live_state === null ||
      (typeof body.live_state === "object" &&
        !Array.isArray(body.live_state) &&
        JSON.stringify(body.live_state).length <= 262144);
    if (!ok) return NextResponse.json({ error: "État de séance invalide." }, { status: 400 });
    liveState = body.live_state;
  }

  if (Object.keys(update).length === 0 && liveState === undefined) {
    return NextResponse.json({ ok: true });
  }

  let error: { code?: string; message?: string } | null = null;
  if (Object.keys(update).length > 0) {
    ({ error } = await supabase
      .from("sessions")
      .update(update)
      .eq("id", sessionId)
      .eq("client_id", guard.userId));
  }

  // Écrit à part : tant que la migration 20261014 n'est pas passée, la
  // colonne n'existe pas et la séance vit seulement sur le téléphone, sans
  // jamais faire échouer l'enregistrement de l'échauffement.
  let liveStored: boolean | undefined;
  if (!error && liveState !== undefined) {
    const { error: liveError } = await supabase
      .from("sessions")
      .update({ live_state: liveState, live_state_updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("client_id", guard.userId)
      .eq("is_completed", false);
    liveStored = !liveError;
    if (liveError && liveError.code !== "PGRST204" && liveError.code !== "42703") {
      console.error("PATCH session live_state error:", liveError);
    }
  }

  // Masterclass Axe P : error.message (texte brut Postgres/Supabase, peut
  // révéler des noms de colonnes ou de contraintes) partait tel quel au
  // client au lieu d'un message générique — loggé côté serveur à la place.
  if (error) {
    console.error("PATCH session error:", error);
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }
  return NextResponse.json(liveStored === undefined ? { ok: true } : { ok: true, liveStored });
}

// DELETE — abandonner une séance non terminée (bouton "Annuler la séance").
// Ne touche jamais une séance déjà validée : is_completed=false uniquement,
// pour ne jamais effacer un historique réel par erreur.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(`session-delete:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return limited;

  const { id: sessionId } = await params;
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("client_id", guard.userId)
    .eq("is_completed", false);

  if (error) {
    console.error("DELETE session error:", error);
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
