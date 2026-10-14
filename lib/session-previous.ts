import type { createServerSupabase } from "@/lib/supabase-server";

// « Dernière fois » d'une liste d'exercices pour la séance en cours : la
// série la plus récente (prevWeights, base de la charge suggérée) et toutes
// les séries de la séance précédente où l'exercice a été fait (prevSets).
// Partagé par GET /api/client/sessions/[id] (exercices du programme) et
// GET /api/client/sessions/[id]/previous (exercice remplaçant ou ajouté en
// cours de séance, « machine prise »).

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

export interface PrevSet {
  weight: number | null;
  reps: string | null;
  rir: number | null;
  /** Détail d'une série à technique (session_sets.details), si la colonne existe. */
  details?: unknown;
}

export interface PreviousForNames {
  prevWeights: Record<string, PrevSet>;
  prevSets: Record<string, PrevSet[]>;
}

// Taille des paquets pour les filtres .in() : au-delà de quelques centaines
// d'UUID, l'URL de la requête PostgREST dépasse les limites courantes.
const IN_CHUNK = 150;

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

interface Row {
  exercise_name: string;
  weight_kg: number | null;
  reps_actual: number | null;
  rir_actual: number | null;
  created_at: string;
  session_id: string;
  set_number: number;
  details?: unknown;
}

const BASE_COLUMNS = "exercise_name, weight_kg, reps_actual, rir_actual, created_at, session_id, set_number";

export async function loadPreviousForNames(
  supabase: Supabase,
  userId: string,
  currentSessionId: string,
  names: string[]
): Promise<PreviousForNames> {
  const prevWeights: Record<string, PrevSet> = {};
  const prevSets: Record<string, PrevSet[]> = {};
  const uniqueNames = [...new Set(names.filter((n) => typeof n === "string" && n.trim()))];
  if (uniqueNames.length === 0) return { prevWeights, prevSets };

  // Uniquement les séances du client lui-même, filtrées explicitement : la
  // RLS "Users see own session sets" laisse aussi un coach lire les séries de
  // SES membres, ses charges "dernière fois" auraient pu venir d'eux.
  const { data: ownSessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("client_id", userId)
    .neq("id", currentSessionId)
    // Les plus récentes d'abord : si la liste venait à être tronquée par le
    // plafond de lignes de PostgREST, ce sont les plus anciennes qui sautent.
    .order("session_date", { ascending: false });
  const ownSessionIds = ((ownSessions as { id: string }[]) ?? []).map((s) => s.id);

  // session_sets.details n'existe qu'après la migration 20261014 : on la
  // demande, et on retombe sur les colonnes d'origine si elle manque.
  let withDetails = true;
  const lastSets: Row[] = [];
  const fetchChunk = (ids: string[], columns: string) =>
    supabase
      .from("session_sets")
      .select(columns)
      .in("exercise_name", uniqueNames)
      .in("session_id", ids)
      .order("created_at", { ascending: false });
  for (const ids of chunk(ownSessionIds, IN_CHUNK)) {
    let res = await fetchChunk(ids, withDetails ? `${BASE_COLUMNS}, details` : BASE_COLUMNS);
    if (res.error && withDetails) {
      withDetails = false;
      res = await fetchChunk(ids, BASE_COLUMNS);
    }
    lastSets.push(...(((res.data as unknown) as Row[] | null) ?? []));
  }
  // Tri global après fusion des paquets : du plus récent au plus ancien.
  lastSets.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const latestSessionIdByExercise: Record<string, string> = {};
  const unsorted: Record<string, (PrevSet & { setNumber: number })[]> = {};
  for (const set of lastSets) {
    const key = set.exercise_name.toLowerCase();
    const entry: PrevSet = {
      weight: set.weight_kg,
      reps: set.reps_actual != null ? String(set.reps_actual) : null,
      rir: set.rir_actual,
      ...(set.details != null ? { details: set.details } : {}),
    };
    if (!(key in prevWeights)) prevWeights[key] = entry;
    if (!(key in latestSessionIdByExercise)) latestSessionIdByExercise[key] = set.session_id;
    if (set.session_id === latestSessionIdByExercise[key]) {
      const group = (unsorted[key] ??= []);
      // Doublon d'enregistrement (même numéro de série) : la version la plus
      // récente, la première rencontrée ici, gagne.
      if (group.some((g) => g.setNumber === set.set_number)) continue;
      group.push({ ...entry, setNumber: set.set_number });
    }
  }
  for (const [key, rows] of Object.entries(unsorted)) {
    prevSets[key] = rows
      .sort((a, b) => a.setNumber - b.setNumber)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ setNumber, ...rest }) => rest);
  }
  return { prevWeights, prevSets };
}
