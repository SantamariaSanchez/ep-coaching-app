import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const formData = await request.formData();
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const file = formData.get("file");

  if (!title) {
    return NextResponse.json({ error: "Le titre est requis." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Le fichier PDF est requis." }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés." }, { status: 400 });
  }

  const admin = createAdminClient();
  const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error: uploadError } = await admin.storage
    .from("resources")
    .upload(path, file, { contentType: "application/pdf" });

  if (uploadError) {
    return NextResponse.json({ error: "Erreur lors de l'upload du fichier." }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("resources").getPublicUrl(path);

  const { error } = await admin.from("resources").insert({
    title,
    description,
    file_url: pub.publicUrl,
    file_path: path,
    created_by: guard.userId,
  });

  if (error) {
    await admin.storage.from("resources").remove([path]);
    return NextResponse.json({ error: "Erreur lors de la création de la ressource." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
