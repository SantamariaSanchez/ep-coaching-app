import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { applyRoadmapForClient } from "@/utils/roadmap";
import type { RoadmapApplyInput } from "@/utils/roadmap";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import { validateRoadmapInput } from "@/lib/roadmap-validation";
import { isValidIsoDate } from "@/lib/roadmap-weeks";

// Un coach ne peut agir que sur SES propres clients — jamais sur ceux d'un
// autre coach, même en connaissant leur id.
async function canAccessRoadmap(userId: string, clientId: string): Promise<boolean> {
  if (userId === clientId) return true;
  const admin = createAdminClient();
  const { data: client } = await admin
    .from("profiles")
    .select("coach_id")
    .eq("id", clientId)
    .eq("role", "client")
    .single();
  return !!client && client.coach_id === userId;
}

// GET — load roadmap for a client
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const { clientId } = await params;

  // A client can only read their own roadmap; the coach can only read
  // the roadmap of clients assigned to them.
  if (!(await canAccessRoadmap(guard.userId, clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();

  // Audit 2026-09-28 : l'erreur de cette lecture était ignorée, donc une
  // panne base (vécue avec la crise Supabase de septembre) répondait
  // { roadmap: null } en 200, exactement comme "pas encore de road map".
  // L'éditeur affichait alors le formulaire de CRÉATION vide, et
  // l'enregistrer écrasait la vraie road map. roadmap: null n'est renvoyé
  // que si la lecture a RÉUSSI sans trouver de ligne.
  const { data: roadmap, error: roadmapError } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  if (roadmapError) {
    console.error("GET /api/roadmap roadmap error:", roadmapError);
    return NextResponse.json({ error: "Chargement de la road map impossible." }, { status: 500 });
  }

  if (!roadmap) return NextResponse.json({ roadmap: null, phases: [], objectives: [] });

  const [phasesRes, objectivesRes] = await Promise.all([
    supabase.from("roadmap_phases").select("*").eq("roadmap_id", roadmap.id).order("position"),
    supabase.from("roadmap_objectives").select("*").eq("roadmap_id", roadmap.id).order("target_date"),
  ]);

  if (phasesRes.error || objectivesRes.error) {
    console.error("GET /api/roadmap phases/objectives error:", phasesRes.error ?? objectivesRes.error);
    return NextResponse.json({ error: "Chargement de la road map impossible." }, { status: 500 });
  }

  return NextResponse.json({
    roadmap,
    phases: phasesRes.data ?? [],
    objectives: objectivesRes.data ?? [],
  });
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

// Lecture défensive du corps : on ne garde que les champs attendus, avec
// leur type, pour que la validation (lib/roadmap-validation.ts) et
// l'écriture ne voient jamais autre chose.
function parseBody(body: unknown): RoadmapApplyInput | null {
  if (!isObject(body) || !Array.isArray(body.phases) || !Array.isArray(body.objectives)) return null;
  if (!body.phases.every(isObject) || !body.objectives.every(isObject)) return null;
  return {
    start_date: str(body.start_date),
    end_date: str(body.end_date),
    phases: (body.phases as Record<string, unknown>[]).map((p, i) => ({
      type: str(p.type) || "custom",
      label: str(p.label),
      start_date: str(p.start_date),
      end_date: str(p.end_date),
      notes: strOrNull(p.notes),
      position: i,
    })),
    objectives: (body.objectives as Record<string, unknown>[]).map((o) => {
      // numeric Postgres peut revenir en chaîne selon la précision : on
      // l'accepte pour ne jamais perdre une valeur cible à la réécriture.
      const rawValue =
        typeof o.target_value === "number"
          ? o.target_value
          : typeof o.target_value === "string" && o.target_value.trim() !== ""
          ? Number(o.target_value)
          : NaN;
      const value = Number.isFinite(rawValue) ? rawValue : null;
      const achieved = o.is_achieved === true;
      return {
        type: str(o.type) || "custom",
        label: str(o.label),
        target_date: str(o.target_date),
        target_value: value,
        target_unit: strOrNull(o.target_unit),
        description: strOrNull(o.description),
        term: str(o.term) as "short" | "medium" | "long",
        is_achieved: achieved,
        // Colonne date : une valeur mal formée ferait échouer toute la
        // sauvegarde avec un message générique, on la ramène à null.
        achieved_at: achieved && typeof o.achieved_at === "string" && isValidIsoDate(o.achieved_at) ? o.achieved_at : null,
      };
    }),
  };
}

// POST — upsert roadmap + phases + objectives
export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const guard = await requireAuth();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  // Cette route réécrit toutes les phases et tous les objectifs à chaque appel
  // (insertion de la nouvelle version puis retrait de l'ancienne) : c'est une
  // écriture lourde.
  const limited = await enforceRateLimit(
    `roadmap-write:${guard.userId}`,
    PRESETS.write.limit,
    PRESETS.write.windowSeconds
  );
  if (limited) return limited;

  const { clientId } = await params;
  // Coach can edit only their own clients' roadmap; a client can only edit
  // their own (free community members build their own roadmap autonomously).
  if (!(await canAccessRoadmap(guard.userId, clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }
  const input = parseBody(raw);
  if (!input) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  // Même validation que l'éditeur : on ne fait jamais confiance au navigateur.
  const { errors } = validateRoadmapInput(input);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0], errors }, { status: 400 });
  }

  // Admin client bypasses RLS for all roadmap writes
  const supabase = createAdminClient();

  const result = await applyRoadmapForClient(supabase, clientId, guard.userId, input);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, roadmapId: result.roadmapId });
}
