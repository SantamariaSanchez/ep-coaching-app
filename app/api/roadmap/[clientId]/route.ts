import { NextResponse } from "next/server";
import { getUser } from "@/utils/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import type { RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";

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
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;

  // A client can only read their own roadmap; the coach can only read
  // the roadmap of clients assigned to them.
  if (!(await canAccessRoadmap(user.id, clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();

  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!roadmap) return NextResponse.json({ roadmap: null, phases: [], objectives: [] });

  const [{ data: phases }, { data: objectives }] = await Promise.all([
    supabase.from("roadmap_phases").select("*").eq("roadmap_id", roadmap.id).order("position"),
    supabase.from("roadmap_objectives").select("*").eq("roadmap_id", roadmap.id).order("target_date"),
  ]);

  return NextResponse.json({
    roadmap,
    phases: phases ?? [],
    objectives: objectives ?? [],
  });
}

// POST — upsert roadmap + phases + objectives
export async function POST(
  req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  // Coach can edit only their own clients' roadmap; a client can only edit
  // their own (free community members build their own roadmap autonomously).
  if (!(await canAccessRoadmap(user.id, clientId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { start_date, end_date, phases, objectives } = body as {
    start_date: string;
    end_date: string;
    phases: Omit<RoadmapPhase, "id" | "roadmap_id">[];
    objectives: Omit<RoadmapObjective, "id" | "roadmap_id">[];
  };

  // Admin client bypasses RLS for all roadmap writes
  const supabase = createAdminClient();

  const { data: roadmap, error: rmErr } = await supabase
    .from("roadmaps")
    .upsert(
      { client_id: clientId, created_by: user.id, start_date, end_date, updated_at: new Date().toISOString() },
      { onConflict: "client_id" }
    )
    .select("id")
    .single();

  if (rmErr || !roadmap) {
    console.error("roadmap upsert error:", rmErr);
    return NextResponse.json({ error: rmErr?.message ?? "Erreur upsert roadmap" }, { status: 500 });
  }

  const roadmapId = (roadmap as { id: string }).id;

  await supabase.from("roadmap_phases").delete().eq("roadmap_id", roadmapId);
  if (phases.length > 0) {
    await supabase.from("roadmap_phases").insert(
      phases.map((p, i) => ({ ...p, roadmap_id: roadmapId, position: i }))
    );
  }

  await supabase.from("roadmap_objectives").delete().eq("roadmap_id", roadmapId);
  if (objectives.length > 0) {
    await supabase.from("roadmap_objectives").insert(
      objectives.map((o) => ({ ...o, roadmap_id: roadmapId }))
    );
  }

  return NextResponse.json({ ok: true, roadmapId });
}
