import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";

// Isolation entre coachs : requireCoach() dit seulement "c'est un coach", pas
// "c'est SON fichier". Sans ce controle, n'importe quel compte coach peut
// reclasser ou supprimer les ressources publiees par un autre, simplement en
// devinant un identifiant.
async function ownsResource(
  admin: SupabaseClient,
  id: string,
  userId: string
): Promise<boolean> {
  const { data } = await admin
    .from("resources")
    .select("created_by")
    .eq("id", id)
    .single();
  return !!data && data.created_by === userId;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(`coach-resource-patch:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return limited;

  const { id } = await params;
  const body = await request.json();
  const category = typeof body.category === "string" ? body.category.trim() || null : undefined;

  if (category === undefined) {
    return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!(await ownsResource(admin, id, guard.userId))) {
    return NextResponse.json({ error: "Cette ressource ne t'appartient pas." }, { status: 403 });
  }

  const { error } = await admin.from("resources").update({ category }).eq("id", id);
  if (error) return NextResponse.json({ error: "Erreur lors de la mise à jour." }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const limited = await enforceRateLimit(`coach-resource-delete:${guard.userId}`, PRESETS.write.limit, PRESETS.write.windowSeconds);
  if (limited) return limited;

  const { id } = await params;
  const admin = createAdminClient();

  const { data: resource } = await admin
    .from("resources")
    .select("file_path, created_by")
    .eq("id", id)
    .single();

  if (!resource || resource.created_by !== guard.userId) {
    return NextResponse.json({ error: "Cette ressource ne t'appartient pas." }, { status: 403 });
  }

  await admin.from("resources").delete().eq("id", id);

  if (resource?.file_path) {
    await admin.storage.from("resources").remove([resource.file_path]);
  }

  return NextResponse.json({ ok: true });
}
