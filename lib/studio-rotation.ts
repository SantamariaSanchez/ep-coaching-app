// Règle anti-stagnation du Studio (Centre de commandes contenu, section E) :
// éviter de refaire le même format ou le même pilier en boucle. Module pur,
// testé dans lib/__tests__/studio-rotation.test.ts.
//
// Seules les règles qui se lisent dans les données du Studio sont contrôlées
// ici (format et pilier). Le type de hook, la structure et le sujet restent
// suivis dans le Journal de rotation de Notion.

export interface RotationScript {
  platform: string;
  content_format?: string | null;
  pillar?: string | null;
  created_at: string;
}

export interface RotationCheck {
  id: "reel-formats" | "youtube-formats" | "reel-ego";
  ok: boolean;
  text: string;
}

const REEL_BATCH = 5;
const MIN_REEL_FORMATS = 3;
const YOUTUBE_STREAK = 3;
const MAX_EGO_PER_BATCH = 1;

function latest(scripts: readonly RotationScript[], platform: string, n: number): RotationScript[] {
  return scripts
    .filter((s) => s.platform === platform)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, n);
}

function formatOf(s: RotationScript): string {
  return s.content_format || "face_cam";
}

function isEgoPillar(pillar: string | null | undefined): boolean {
  const p = (pillar ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return p.includes("ego") && p.includes("bloque");
}

export function checkRotation(scripts: readonly RotationScript[]): RotationCheck[] {
  const checks: RotationCheck[] = [];

  const reels = latest(scripts, "reel", REEL_BATCH);
  if (reels.length >= REEL_BATCH) {
    const formats = new Set(reels.map(formatOf)).size;
    checks.push({
      id: "reel-formats",
      ok: formats >= MIN_REEL_FORMATS,
      text:
        formats >= MIN_REEL_FORMATS
          ? `Tes ${REEL_BATCH} derniers reels utilisent ${formats} formats différents.`
          : `Tes ${REEL_BATCH} derniers reels n'utilisent que ${formats} format${formats > 1 ? "s" : ""} : vise au moins ${MIN_REEL_FORMATS} formats différents.`,
    });
    const ego = reels.filter((s) => isEgoPillar(s.pillar)).length;
    checks.push({
      id: "reel-ego",
      ok: ego <= MAX_EGO_PER_BATCH,
      text:
        ego <= MAX_EGO_PER_BATCH
          ? "Le pilier « l'ego qui bloque » reste rare sur tes derniers reels."
          : `Le pilier « l'ego qui bloque » revient ${ego} fois sur tes ${REEL_BATCH} derniers reels : au plus ${MAX_EGO_PER_BATCH}.`,
    });
  }

  const videos = latest(scripts, "youtube", YOUTUBE_STREAK);
  if (videos.length >= YOUTUBE_STREAK) {
    const same = new Set(videos.map(formatOf)).size === 1;
    checks.push({
      id: "youtube-formats",
      ok: !same,
      text: same
        ? `Tes ${YOUTUBE_STREAK} dernières vidéos YouTube ont le même format : change de format pour la prochaine.`
        : "Tes dernières vidéos YouTube alternent les formats.",
    });
  }

  return checks;
}
