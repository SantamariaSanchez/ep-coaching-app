import type { SupabaseClient } from "@supabase/supabase-js";
import type { Roadmap, RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";
import { computePhasePilot, type PhasePilot, type PilotPerspective } from "@/lib/phase-pilot";
import { addDaysIso, isValidIsoDate, minIso } from "@/lib/roadmap-weeks";
import { todayInParis } from "@/lib/dates";

// Chargement serveur de la road map + du pilote de phase (lib/phase-pilot.ts)
// pour les 3 vues road map : espace "Moi" du coach, membre, et coach qui
// consulte la road map d'un client.
//
// Le client Supabase est fourni par l'appelant APRÈS vérification des droits
// (getUser pour sa propre road map, requireOwnClient pour un client) : ce
// module ne décide jamais seul qui peut lire quoi.
//
// Une erreur de lecture n'est JAMAIS maquillée en "pas de road map" : c'est
// exactement ce qui pouvait faire écraser la vraie road map du fondateur
// pendant la panne Supabase de septembre (formulaire de création vide
// affiché, puis enregistré par-dessus l'existante).

export interface RoadmapPageData {
  roadmap: Roadmap | null;
  phases: RoadmapPhase[];
  objectives: RoadmapObjective[];
  /** La road map elle-même n'a pas pu être lue : ne rien afficher comme "vide". */
  error: string | null;
  pilot: PhasePilot | null;
  /** La road map est lue mais les suivis (pesées, tracker...) non. */
  pilotError: string | null;
}

const ROADMAP_ERROR = "Impossible de charger la road map pour l'instant.";
const PILOT_ERROR = "Impossible de charger tes suivis pour le pilote de phase.";

type Row = Record<string, unknown>;

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function loadRoadmapPageData(
  supabase: SupabaseClient,
  clientId: string,
  perspective: PilotPerspective
): Promise<RoadmapPageData> {
  const empty: RoadmapPageData = { roadmap: null, phases: [], objectives: [], error: null, pilot: null, pilotError: null };

  let roadmap: Roadmap | null;
  let phases: RoadmapPhase[];
  let objectives: RoadmapObjective[];
  try {
    const { data, error } = await supabase.from("roadmaps").select("*").eq("client_id", clientId).maybeSingle();
    if (error) throw error;
    if (!data) return empty;
    roadmap = data as Roadmap;

    const [phasesRes, objectivesRes] = await Promise.all([
      supabase.from("roadmap_phases").select("*").eq("roadmap_id", roadmap.id).order("position"),
      supabase.from("roadmap_objectives").select("*").eq("roadmap_id", roadmap.id).order("target_date"),
    ]);
    if (phasesRes.error) throw phasesRes.error;
    if (objectivesRes.error) throw objectivesRes.error;
    phases = (phasesRes.data ?? []) as RoadmapPhase[];
    objectives = (objectivesRes.data ?? []) as RoadmapObjective[];
  } catch (e) {
    console.error("loadRoadmapPageData roadmap error:", e);
    return { ...empty, error: ROADMAP_ERROR };
  }

  const base: RoadmapPageData = { roadmap, phases, objectives, error: null, pilot: null, pilotError: null };

  try {
    const pilot = await loadPilot(supabase, clientId, roadmap, phases, objectives, perspective);
    return { ...base, pilot };
  } catch (e) {
    console.error("loadRoadmapPageData pilot error:", e);
    return {
      ...base,
      pilotError: perspective === "self" ? PILOT_ERROR : "Impossible de charger les suivis de ce client pour le pilote de phase.",
    };
  }
}

async function loadPilot(
  supabase: SupabaseClient,
  clientId: string,
  roadmap: Roadmap,
  phases: RoadmapPhase[],
  objectives: RoadmapObjective[],
  perspective: PilotPerspective
): Promise<PhasePilot> {
  const today = todayInParis();

  // Pesées : de 30 jours avant le début de la road map (pour le poids de
  // départ des objectifs de poids) jusqu'à aujourd'hui, au moins 8 semaines
  // pour la tendance, et jamais plus de ~2,5 ans (une ligne par jour, reste
  // sous le plafond de 1000 lignes de PostgREST).
  const roadmapFrom = isValidIsoDate(roadmap.start_date) ? addDaysIso(roadmap.start_date, -30) : addDaysIso(today, -56);
  let weightsFrom = minIso(roadmapFrom, addDaysIso(today, -56));
  const floor = addDaysIso(today, -900);
  if (weightsFrom < floor) weightsFrom = floor;

  // Nutrition : 14 jours terminés, colonnes simples (jamais l'embed
  // foods(*), voir utils/nutrition.ts attachFoods). ~15 lignes par jour
  // au plus, loin du plafond.
  const foodFrom = addDaysIso(today, -14);
  const sessionsFrom = addDaysIso(today, -27);

  const [dailyRes, foodRes, sessionsRes, nutritionRes, programRes, profileRes] = await Promise.all([
    supabase
      .from("daily_logs")
      .select("log_date, weight_morning, sleep_hours")
      .eq("client_id", clientId)
      .gte("log_date", weightsFrom)
      .lte("log_date", today)
      .order("log_date")
      .limit(1000),
    supabase
      .from("food_logs")
      .select("logged_at, calories, proteins")
      .eq("client_id", clientId)
      .gte("logged_at", foodFrom)
      .lte("logged_at", today)
      .limit(1000),
    supabase
      .from("sessions")
      .select("session_date")
      .eq("client_id", clientId)
      .eq("is_completed", true)
      .gte("session_date", sessionsFrom)
      .lte("session_date", today),
    supabase
      .from("nutrition_profiles")
      .select("calories_target, proteins_target, sessions_per_week, age")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("programs")
      .select("frequency, mesocycle_start_date, mesocycle_weeks")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("competition_date").eq("id", clientId).maybeSingle(),
  ]);

  for (const res of [dailyRes, foodRes, sessionsRes, nutritionRes, programRes, profileRes]) {
    if (res.error) throw res.error;
  }

  const daily = (dailyRes.data ?? []) as Row[];
  const weights = daily
    .map((r) => ({ date: String(r.log_date), kg: num(r.weight_morning) }))
    .filter((w): w is { date: string; kg: number } => w.kg != null && w.kg > 0);
  const sleep = daily
    .map((r) => ({ date: String(r.log_date), hours: num(r.sleep_hours) }))
    .filter((s): s is { date: string; hours: number } => s.hours != null && s.hours > 0);

  const byDay = new Map<string, { kcal: number; protein: number }>();
  for (const r of (foodRes.data ?? []) as Row[]) {
    const date = String(r.logged_at).slice(0, 10);
    const d = byDay.get(date) ?? { kcal: 0, protein: 0 };
    d.kcal += num(r.calories) ?? 0;
    d.protein += num(r.proteins) ?? 0;
    byDay.set(date, d);
  }

  const nutrition = nutritionRes.data as Row | null;
  const program = programRes.data as Row | null;
  const profile = profileRes.data as Row | null;
  const frequency = num(program?.frequency);
  const sessionsPerWeek = frequency && frequency > 0 ? frequency : num(nutrition?.sessions_per_week);
  const competitionDate = typeof profile?.competition_date === "string" ? profile.competition_date.slice(0, 10) : null;

  return computePhasePilot({
    roadmap: { start_date: roadmap.start_date, end_date: roadmap.end_date },
    phases,
    objectives,
    today,
    weights,
    foodDays: [...byDay.entries()].map(([date, v]) => ({ date, ...v })),
    sessionDates: ((sessionsRes.data ?? []) as Row[]).map((r) => String(r.session_date)),
    sleep,
    targets: {
      kcal: num(nutrition?.calories_target),
      protein: num(nutrition?.proteins_target),
      sessionsPerWeek: sessionsPerWeek && sessionsPerWeek > 0 ? sessionsPerWeek : null,
    },
    competitionDate: isValidIsoDate(competitionDate) ? competitionDate : null,
    age: num(nutrition?.age),
    programHasMesocycle: !!program?.mesocycle_start_date && (num(program?.mesocycle_weeks) ?? 0) > 1,
    perspective,
  });
}
