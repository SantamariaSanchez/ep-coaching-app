// Rapport "quoi réitérer" : meilleures et pires publications des N derniers
// jours avec leur script du Studio, pour réécrire les prochains scripts à
// partir des vraies stats. Usage : npm run social:report -- [--jours=30]
import { createClient } from "@supabase/supabase-js";

const days = Number(process.argv.find((a) => a.startsWith("--jours="))?.split("=")[1]) || 30;
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

(async () => {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data: posts, error } = await admin
    .from("social_posts")
    .select("platform, caption, published_at, views, reach, likes, comments, shares, saves, engagement_rate, completion_rate, avg_watch_seconds, new_followers, script_id, url")
    .gte("published_at", since)
    .order("views", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  const list = posts ?? [];
  const ids = [...new Set(list.map((p) => p.script_id).filter(Boolean))];
  const { data: scripts } = ids.length ? await admin.from("coach_scripts").select("id, title, hook, format, pillar").in("id", ids) : { data: [] };
  const byId = new Map((scripts ?? []).map((s) => [s.id, s]));
  const line = (p: (typeof list)[number]) => {
    const s = p.script_id ? byId.get(p.script_id) : null;
    return `[${p.platform}] ${p.views ?? "?"} vues, eng ${p.engagement_rate ?? "?"} %, complétion ${p.completion_rate ?? "?"}, ${p.new_followers ?? "?"} abonnés | ${(p.caption ?? "").replace(/\s+/g, " ").slice(0, 110)}${s ? `\n      script : ${s.title} (accroche : ${s.hook ?? "?"}, format ${s.format ?? "?"}, pilier ${s.pillar ?? "?"})` : ""}`;
  };
  console.log(`${list.length} publication(s) sur ${days} jours.\n\nTOP 10`);
  list.slice(0, 10).forEach((p, i) => console.log(`${i + 1}. ${line(p)}`));
  console.log("\nFLOP 5");
  list.slice(-5).reverse().forEach((p, i) => console.log(`${i + 1}. ${line(p)}`));
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
