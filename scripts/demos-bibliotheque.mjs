// Suivi des démonstrations (vidéo / photo) des exercices de la bibliothèque.
//
//   npm run demos:liste      -> écrit docs/exercices-sans-demo.md (exos de la
//                               bibliothèque sans vidéo NI photo, les plus
//                               prescrits d'abord, groupés par muscle)
//   npm run demos:appliquer -- demos.csv
//                            -> remplit exercise_library depuis un CSV
//                               "nom;video_url;image_url" (une ligne par exo,
//                               colonnes vides ignorées, séparateur ; ou ,)
//
// Une fois renseignée, la démo s'affiche automatiquement au client dans la
// séance, le programme et la fiche exo. Pas besoin de toucher au code.
// Nécessite NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (.env.local).
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (node --env-file=.env.local).");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const rest = (path, init) => fetch(`${url}/rest/v1/${path}`, { headers, ...init });

async function all(path) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await rest(path, { headers: { ...headers, Range: `${from}-${from + 999}` } });
    if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

const [cmd, file] = process.argv.slice(2);

if (cmd === "liste") {
  const lib = await all("exercise_library?select=name,muscle_group,video_url,image_url&is_official=eq.true&order=muscle_group,name");
  const used = await all("exercises?select=name");
  const counts = new Map();
  for (const r of used) counts.set(r.name, (counts.get(r.name) ?? 0) + 1);
  const missing = lib.filter((e) => !e.video_url && !e.image_url);
  const byGroup = new Map();
  for (const e of missing) byGroup.set(e.muscle_group, [...(byGroup.get(e.muscle_group) ?? []), e]);
  const lines = [
    "# Exercices de la bibliothèque sans démo",
    "",
    `${missing.length} sur ${lib.length} exercices de la bibliothèque n'ont ni vidéo ni photo.`,
    "Généré par `npm run demos:liste`. Les plus prescrits dans de vrais programmes sont à traiter en premier.",
    "",
    "## Priorité (prescrits dans des programmes)",
    "",
    ...missing
      .filter((e) => counts.get(e.name))
      .sort((a, b) => counts.get(b.name) - counts.get(a.name))
      .map((e) => `- [ ] ${e.name} (${e.muscle_group}) x${counts.get(e.name)}`),
    "",
    "## Tous, par muscle",
  ];
  for (const [g, list] of byGroup) lines.push("", `### ${g} (${list.length})`, "", ...list.map((e) => `- [ ] ${e.name}`));
  writeFileSync("docs/exercices-sans-demo.md", lines.join("\n") + "\n");
  console.log(`docs/exercices-sans-demo.md écrit : ${missing.length} exos sans démo.`);
} else if (cmd === "appliquer" && file) {
  const rows = readFileSync(file, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let ok = 0;
  for (const line of rows) {
    const [name, video, image] = line.split(/[;,](?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, "").trim());
    if (!name || /^nom$/i.test(name) || (!video && !image)) continue;
    const patch = {};
    if (video) patch.video_url = video;
    if (image) patch.image_url = image;
    const res = await rest(`exercise_library?is_official=eq.true&name=eq.${encodeURIComponent(name)}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(patch),
    });
    const n = res.ok ? (await res.json()).length : 0;
    console.log(`${n ? "OK " : "?? "} ${name}`);
    if (n) ok++;
  }
  console.log(`${ok} exercice(s) mis à jour. Le cache de la bibliothèque se rafraîchit en moins d'une heure.`);
} else {
  console.error("Usage : liste | appliquer <fichier.csv>");
  process.exit(1);
}
