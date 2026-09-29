import type { createAdminClient } from "@/lib/supabase-admin";

// Relie chaque publication synchronisée au script du Studio créatif dont elle
// vient (demande directe 2026-09-29 : "que je puisse avoir un suivi de mes
// vraies stats et que tu puisses réitérer l'écriture des scripts"). Les
// vraies stats d'un script se lisent ensuite dans social_posts (script_id).
//
// Le rapprochement automatique compare la légende publiée au texte du script
// (légende, accroche, titre, début du texte). Il est volontairement prudent :
// un doute ne crée jamais de lien, le fondateur peut toujours relier à la
// main depuis Stats réseaux (lien "manuel", jamais écrasé ensuite).

type Admin = ReturnType<typeof createAdminClient>;

const STOP = new Set(
  "les des une un le la de du et en est que qui pour pas sur dans avec ton ta tes mon ma mes ce cet cette ces tu te on il elle nous vous ils elles au aux par plus mais ou donc car ne se sa son leur leurs lui y a as ai ont sont etre avoir fait faire tout tous toute toutes comme quand alors si bien tres the and you your for with this that".split(" ")
);

export function words(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#@][\p{L}\p{N}_]+/gu, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
}

function overlap(a: string[], b: string[]): number {
  if (a.length < 5 || b.length < 5) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / Math.min(A.size, B.size);
}

function startsWithHook(caption: string[], hook: string[]): boolean {
  if (hook.length < 4) return false;
  const n = Math.min(6, hook.length);
  return caption.slice(0, n + 2).join(" ").includes(hook.slice(0, n).join(" "));
}

interface Script {
  id: string;
  title: string | null;
  hook: string | null;
  instagram_caption: string | null;
  content: string | null;
}

export function scoreScript(caption: string, s: Script): number {
  const c = words(caption);
  if (c.length < 5) return 0;
  const hook = words(s.hook);
  if (startsWithHook(c, hook)) return 1;
  return Math.max(
    overlap(c, words(s.instagram_caption)),
    overlap(c, hook) * 0.95,
    overlap(c, words(s.title)) * 0.9,
    overlap(c, words((s.content ?? "").slice(0, 600))) * 0.85
  );
}

export async function linkPostsToScripts(admin: Admin): Promise<number> {
  const { data: owner } = await admin.from("profiles").select("id").eq("is_platform_owner", true).limit(1).maybeSingle();
  if (!owner?.id) return 0;
  const [{ data: posts }, { data: scripts }] = await Promise.all([
    admin.from("social_posts").select("id, caption").is("script_id", null).is("script_link_source", null).not("caption", "is", null).limit(2000),
    admin.from("coach_scripts").select("id, title, hook, instagram_caption, content").eq("coach_id", owner.id).limit(2000),
  ]);
  const list = (scripts ?? []) as Script[];
  if (!list.length) return 0;
  let linked = 0;
  for (const p of (posts ?? []) as { id: string; caption: string }[]) {
    const scored = list.map((s) => ({ id: s.id, score: scoreScript(p.caption, s) })).sort((a, b) => b.score - a.score);
    const [best, second] = scored;
    if (!best || best.score < 0.6) continue;
    if (second && best.score - second.score < 0.1 && best.score < 1) continue;
    const { error } = await admin.from("social_posts").update({ script_id: best.id, script_link_source: "auto" }).eq("id", p.id).is("script_id", null);
    if (!error) linked++;
  }
  return linked;
}
