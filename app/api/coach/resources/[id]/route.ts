import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";

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
