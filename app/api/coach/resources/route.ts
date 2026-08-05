import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

// PDF first-class, but also images, video, audio, zip and standalone HTML
// for interactive guides — the coach is the only one who can publish here
// (requireCoach below), so trusting richer formats is an acceptable trade-off.
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/html",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "application/zip",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  // Chaque envoi peut peser jusqu'a 50 Mo de stockage : quota d'upload.
  const limited = await enforceRateLimit(
    `resource-upload:${guard.userId}`,
    PRESETS.upload.limit,
    PRESETS.upload.windowSeconds,
    "Trop d'envois d'affilée. Réessaie dans un instant."
  );
  if (limited) return limited;

  const formData = await request.formData();
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const category = (formData.get("category") as string | null)?.trim() || null;
  const file = formData.get("file");

  if (!title) {
    return NextResponse.json({ error: "Le titre est requis." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Le fichier est requis." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Format non accepté. PDF, HTML, image, vidéo, audio ou ZIP uniquement." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (50MB max)." }, { status: 400 });
  }

  const admin = createAdminClient();
  const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const { error: uploadError } = await admin.storage
    .from("resources")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: "Erreur lors de l'upload du fichier." }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("resources").getPublicUrl(path);

  const { error } = await admin.from("resources").insert({
    title,
    description,
    category,
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
