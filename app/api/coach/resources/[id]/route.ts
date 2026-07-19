import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const category = typeof body.category === "string" ? body.category.trim() || null : undefined;

  if (category === undefined) {
    return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  }

  const admin = createAdminClient();
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

  const { id } = await params;
  const admin = createAdminClient();

  const { data: resource } = await admin
    .from("resources")
    .select("file_path")
    .eq("id", id)
    .single();

  await admin.from("resources").delete().eq("id", id);

  if (resource?.file_path) {
    await admin.storage.from("resources").remove([resource.file_path]);
  }

  return NextResponse.json({ ok: true });
}
