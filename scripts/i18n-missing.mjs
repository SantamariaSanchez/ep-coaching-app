// Liste les textes entourés de t("...") qui n'ont pas encore de traduction
// anglaise dans lib/i18n-en.ts. Usage : node scripts/i18n-missing.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["app", "components", "lib"];
const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|mjs)$/.test(f)) files.push(p);
  }
};
roots.forEach(walk);

const STR = String.raw`"((?:[^"\\]|\\.)*)"`;
const dict = readFileSync("lib/i18n-en.ts", "utf8");
const keys = new Set([...dict.matchAll(new RegExp(String.raw`^\s*` + STR + ":", "gm"))].map((m) => JSON.parse(`"${m[1]}"`)));
const missing = new Map();
for (const f of files) {
  if (f.endsWith("i18n-en.ts")) continue;
  const src = readFileSync(f, "utf8");
  if (!/useT\(|getT\(|makeT\(/.test(src)) continue;
  for (const m of src.matchAll(new RegExp(String.raw`\btr?\(\s*` + STR, "g"))) {
    const k = JSON.parse(`"${m[1]}"`);
    if (!keys.has(k)) missing.set(k, f);
  }
}
// Fichiers de données dont les libellés (label, title, hint...) sont
// traduits au moment de l'affichage avec t(variable).
const DATA_FILES = [
  "components/ui/DashboardNav.tsx",
  "lib/notification-preferences.ts",
  "lib/personalization.ts",
  "lib/accessibility.ts",
  "components/coach/MyPlatformSubscriptionCard.tsx",
  "components/settings/LegalLinksCard.tsx",
  "lib/app-setup.ts",
  "components/settings/LanguageDisplayCard.tsx",
  "lib/claude-prompts.ts",
  "lib/positioning.ts",
  "lib/disciplines.ts",
  "lib/onboarding-checklist.ts",
  "lib/gamification-types.ts",
  "app/dashboard/client/page.tsx",
  "components/coach/PositioningBuilder.tsx",
  "components/ai/ClaudeHub.tsx",
];
for (const f of DATA_FILES) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(new RegExp(String.raw`(?:label|menuLabel|title|desc|description|hint|subtitle|group|help|intro|prompt|tip|placeholder): ` + STR, "g"))) {
    const k = JSON.parse(`"${m[1]}"`);
    if (k && /[A-Za-zÀ-ÿ]{2,}/.test(k) && !keys.has(k)) missing.set(k, f);
  }
}
// Listes de choix (options: [...]) des fichiers de données.
for (const f of DATA_FILES) {
  const src = readFileSync(f, "utf8");
  for (const block of src.matchAll(/(?:options: |const [A-Z_]+(?:: [^=\n]+)? = )\[([^\]]*)\]/g)) {
    // Seulement les listes de textes (pas de code ni de commentaire dedans).
    if (!/^(\s*"(?:[^"\\\n]|\\.)*"\s*,?\s*)+$/.test(block[1])) continue;
    for (const m of block[1].matchAll(new RegExp(STR, "g"))) {
      const k = JSON.parse(`"${m[1]}"`);
      // Les codes internes (« perf_course », « /dashboard/... ») ne s'affichent pas.
      if (k && /[A-Za-zÀ-ÿ]{2,}/.test(k) && !/^[a-z0-9_/-]+$/.test(k) && !keys.has(k)) missing.set(k, f);
    }
  }
}
for (const [k, f] of missing) console.log(`${JSON.stringify(k)}  <- ${f}`);
console.log(`\n${missing.size} texte(s) sans traduction.`);
