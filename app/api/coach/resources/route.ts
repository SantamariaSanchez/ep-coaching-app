import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase-admin";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

// Contenu passif uniquement. text/html et image/svg+xml ont ete retires
// volontairement : les ressources sont publiees telles quelles sur /ressources,
// une page publique sans authentification, et servies par
// app/api/resources/[id] avec leur vrai type MIME. Un fichier HTML ou SVG
// deposé ici s'executerait donc en JavaScript sur notre propre domaine, avec
// acces au cookie de session (lisible en JS, voir lib/auth-cookies.ts).
// Les fichiers HTML deja en ligne continuent de s'afficher normalement, seul
// l'ajout de nouveaux est ferme.
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "application/zip",
]);

// Le type MIME annonce par le navigateur ne suffit pas : app/api/resources/[id]
// choisit le Content-Type qu'il renvoie a partir de l'EXTENSION du fichier
// stocke. Un "evil.html" envoye avec un type declare application/pdf serait
// donc quand meme servi en text/html. On verrouille les deux.
const BLOCKED_EXTENSIONS = [
  ".html", ".htm", ".svg", ".xhtml", ".xht", ".xml", ".mhtml", ".mht",
  ".js", ".mjs", ".swf",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  // Publier sur /ressources, c'est publier sur une page publique. Un compte
  // coach s'obtient en libre-service et est actif immediatement, avant tout
  // paiement (voir app/auth/coach/actions.ts) : sans ce controle, n'importe
  // qui peut deposer un fichier visible de tous en quelques secondes.
  const admin = createAdminClient();
  const { data: coachProfile } = await admin
    .from("profiles")
    .select("platform_subscription_status")
    .eq("id", guard.userId)
    .single();

  if (coachProfile?.platform_subscription_status !== "active") {
    return NextResponse.json(
      { error: "Ton abonnement plateforme doit être actif pour publier une ressource." },
      { status: 403 }
    );
  }

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
      { error: "Format non accepté. PDF, image, vidéo, audio ou ZIP uniquement." },
      { status: 400 }
    );
  }
  const lowerName = file.name.toLowerCase();
  if (BLOCKED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return NextResponse.json(
      { error: "Ce type de fichier ne peut pas être publié. PDF, image, vidéo, audio ou ZIP uniquement." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (50MB max)." }, { status: 400 });
  }

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
