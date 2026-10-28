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
  /** Structure Y01 à Y16 du plan vidéo YouTube (coach_scripts.video_plan). */
  structure?: string | null;
  /** Type de hook (FP, PX, VD...) du plan vidéo YouTube. */
  hook_type?: string | null;
}

export interface RotationCheck {
  id: "reel-formats" | "youtube-formats" | "reel-ego" | "youtube-structure" | "youtube-hooks";
  ok: boolean;
  text: string;
}

const REEL_BATCH = 5;
const MIN_REEL_FORMATS = 3;
const YOUTUBE_STREAK = 3;
const MAX_EGO_PER_BATCH = 1;
const YOUTUBE_STRUCTURE_WINDOW = 10;
const YOUTUBE_HOOK_BATCH = 5;

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

  // Structure (Y01 à Y16) : jamais la même deux fois sur les 10 dernières
  // vidéos ; type de hook : jamais deux fois le même sur une fournée de 5.
  const structured = latest(scripts, "youtube", YOUTUBE_STRUCTURE_WINDOW).map((s) => s.structure).filter((x): x is string => !!x);
  if (structured.length >= 2) {
    const repeated = structured.filter((x, i) => structured.indexOf(x) !== i);
    checks.push({
      id: "youtube-structure",
      ok: repeated.length === 0,
      text:
        repeated.length === 0
          ? "Tes dernières vidéos YouTube changent de structure."
          : `La structure ${Array.from(new Set(repeated)).join(", ")} revient sur tes ${YOUTUBE_STRUCTURE_WINDOW} dernières vidéos : change de structure.`,
    });
  }
  const hooks = latest(scripts, "youtube", YOUTUBE_HOOK_BATCH).map((s) => s.hook_type).filter((x): x is string => !!x);
  if (hooks.length >= 2) {
    const repeated = hooks.filter((x, i) => hooks.indexOf(x) !== i);
    checks.push({
      id: "youtube-hooks",
      ok: repeated.length === 0,
      text:
        repeated.length === 0
          ? "Les hooks de tes dernières vidéos YouTube sont de types différents."
          : `Le hook ${Array.from(new Set(repeated)).join(", ")} revient sur tes ${YOUTUBE_HOOK_BATCH} dernières vidéos : change de type de hook.`,
    });
  }

  return checks;
}
