// Captures d'écran façon iPhone de l'appli en ligne, avec les comptes de
// démonstration (voir scripts/demo-accounts.ts). Sert à la passe design et
// aux captures App Store.
//   npx tsx scripts/screenshots.ts <fichier-identifiants> <dossier-sortie> [coach|client] [filtre]
import { chromium, devices, type Page } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";

const [credsFile, outDir, only, filter] = process.argv.slice(2);
if (!credsFile || !outDir) throw new Error("Usage : tsx scripts/screenshots.ts <identifiants> <sortie> [coach|client] [filtre]");
const creds = readFileSync(credsFile, "utf8");
const password = creds.match(/Mot de passe \(les deux\) : (\S+)/)?.[1] ?? "";
const BASE = process.env.SHOT_BASE ?? "https://ep-coaching.vercel.app";

const PAGES: Record<"coach" | "client", string[]> = {
  coach: [
    "/dashboard/coach", "/dashboard/coach/clients", "/dashboard/coach/studio", "/dashboard/coach/stats-reseaux", "/dashboard/coach/formations",
    "/dashboard/coach/mon-equipe", "/dashboard/coach/business/pilotage", "/dashboard/coach/compta", "/dashboard/coach/moi/bilan", "/dashboard/coach/moi/agenda",
    "/dashboard/coach/moi/nutrition", "/dashboard/coach/moi/semaine", "/dashboard/coach/plus", "/dashboard/coach/notes", "/dashboard/coach/aide",
    "/dashboard/coach/mon-appli", "/dashboard/coach/live", "/dashboard/coach/communaute", "/dashboard/coach/parametres", "/dashboard/coach/profile",
  ],
  client: [
    "/dashboard/client", "/dashboard/client/program", "/dashboard/client/logbook", "/dashboard/client/bilan", "/dashboard/client/nutrition",
    "/dashboard/client/semaine", "/dashboard/client/agenda", "/dashboard/client/photos", "/dashboard/client/messages", "/dashboard/client/plus",
    "/dashboard/client/notes", "/dashboard/client/formations", "/dashboard/client/communaute", "/dashboard/client/mon-appli", "/dashboard/client/aide",
    "/dashboard/client/steps", "/dashboard/client/tracking", "/dashboard/client/roadmap",
  ],
};

async function login(page: Page, space: "coach" | "client") {
  const email = space === "coach" ? "demo.coach@epcoaching.app" : "demo.client@epcoaching.app";
  await page.goto(`${BASE}/auth/${space}${space === "client" ? "?mode=login" : ""}`, { waitUntil: "domcontentloaded" });
  if (space === "coach") await page.getByRole("button", { name: /^connexion$/i }).click();
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard\//, { timeout: 30000 });
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  for (const space of ["coach", "client"] as const) {
    if (only && only !== space) continue;
    const ctx = await browser.newContext({ ...devices["iPhone 14"], deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris" });
    await ctx.addInitScript(() => {
      for (const sp of ["coach", "client", "staff"]) localStorage.setItem(`ep-tour-done-v1-${sp}`, "1");
      sessionStorage.setItem("ep-setup-prompt-hidden", "1");
      localStorage.setItem("ep-permissions-primer-done", "1");
    });
    const page = await ctx.newPage();
    await login(page, space);
    for (const path of PAGES[space]) {
      if (filter && !path.includes(filter)) continue;
      const name = `${space}${path.replace(`/dashboard/${space}`, "").replace(/\//g, "_") || "_accueil"}`;
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 45000 });
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `${outDir}/${name}.png` });
        await page.screenshot({ path: `${outDir}/${name}-full.png`, fullPage: true });
        console.log("ok", path, page.url().replace(BASE, ""));
      } catch (e) {
        console.log("erreur", path, (e as Error).message.slice(0, 120));
      }
    }
    await ctx.close();
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
