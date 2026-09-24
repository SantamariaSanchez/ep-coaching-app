import { createAdminClient } from "@/lib/supabase-admin";

// Espace prive de production video, reserve au fondateur (is_platform_owner) :
// suivi des scripts mot pour mot des formations qu'il filme lui-meme, jamais
// visible d'un coach tiers, d'un membre ou d'un client. Sans rapport avec
// utils/formations.ts (catalogue "Academie EP" paye, visible cote coach/client).

export const VIDEO_STATUSES = ["a_ecrire", "a_completer", "pret_a_tourner", "tourne", "publie"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export const STATUS_LABELS: Record<VideoStatus, string> = {
  a_ecrire: "À écrire",
  a_completer: "À compléter",
  pret_a_tourner: "Prêt à tourner",
  tourne: "Tourné",
  publie: "Publié",
};

export interface FounderVideoScript {
  id: string;
  formation_num: number;
  formation_title: string;
  section_key: string;
  section_title: string;
  module_num: number | null;
  module_title: string | null;
  video_num: number;
  video_title: string;
  script_content: string;
  word_count: number;
  target_duration_minutes: number;
  status: VideoStatus;
  youtube_url: string | null;
  notes: string | null;
  order_seq: number;
  updated_at: string;
}

export async function getFounderVideoScripts(): Promise<FounderVideoScript[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("founder_video_scripts")
      .select(
        "id, formation_num, formation_title, section_key, section_title, module_num, module_title, video_num, video_title, script_content, word_count, target_duration_minutes, status, youtube_url, notes, order_seq, updated_at"
      )
      .order("order_seq", { ascending: true });
    return (data as FounderVideoScript[]) ?? [];
  } catch {
    return [];
  }
}

export interface FormationGroup {
  formation_num: number;
  formation_title: string;
  videos: FounderVideoScript[];
  totalVideos: number;
  scriptsReady: number; // pret_a_tourner, tourne ou publie
  filmed: number; // tourne ou publie
}

export function groupByFormation(videos: FounderVideoScript[]): FormationGroup[] {
  const map = new Map<number, FormationGroup>();
  for (const v of videos) {
    let g = map.get(v.formation_num);
    if (!g) {
      g = { formation_num: v.formation_num, formation_title: v.formation_title, videos: [], totalVideos: 0, scriptsReady: 0, filmed: 0 };
      map.set(v.formation_num, g);
    }
    g.videos.push(v);
    g.totalVideos += 1;
    if (v.status === "pret_a_tourner" || v.status === "tourne" || v.status === "publie") g.scriptsReady += 1;
    if (v.status === "tourne" || v.status === "publie") g.filmed += 1;
  }
  return Array.from(map.values()).sort((a, b) => a.formation_num - b.formation_num);
}
