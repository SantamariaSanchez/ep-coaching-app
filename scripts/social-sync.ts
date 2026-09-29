// Synchro des stats réseaux lancée à la main (même moteur que le cron du
// lundi). Usage : npm run social:sync -- [plateforme] [--backfill] [--jours=90]
// Il faut WINDSOR_API_KEY dans .env.local.
import { runSocialSync } from "../lib/social/sync";
import type { Platform } from "../lib/social/platforms";

const args = process.argv.slice(2);
const platform = (args.find((a) => !a.startsWith("--")) as Platform | undefined) ?? null;
const backfill = args.includes("--backfill");
const days = Number(args.find((a) => a.startsWith("--jours="))?.split("=")[1]) || 30;

runSocialSync({ platform, trigger: "script", days, backfill, budgetMs: 20 * 60_000 })
  .then((res) => {
    for (const r of res.results) {
      console.log(`${r.status.padEnd(8)} ${r.platform.padEnd(10)} ${r.rows} ligne(s)${r.error ? `  ${r.error}` : ""}`);
      const missing = (r.details.missingFields ?? {}) as Record<string, string[]>;
      for (const [k, v] of Object.entries(missing)) console.log(`         champs non fournis (${k}) : ${v.join(", ")}`);
      for (const w of (r.details.warnings ?? []) as string[]) console.log(`         attention : ${w}`);
    }
    console.log(`${res.linked} publication(s) reliée(s) à un script.`);
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
