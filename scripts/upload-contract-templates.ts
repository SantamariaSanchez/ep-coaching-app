// Envoie les modèles PDF des contrats (contracts-templates/) dans le bucket
// privé "staff-contracts" : templates/{roleKey}/{version}.pdf (upsert).
// Usage : npm run contracts:upload
// Accepte les deux nommages : "{roleKey}.pdf" (générateur) ou
// "Contrat EP Coaching - NN - Poste.pdf" (fichiers fournis, NN = ordre des postes).
// Si les deux existent pour un même poste, le fichier le plus récent gagne.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { POLES } from "../lib/org-roles";
import { STAFF_CONTRACT_VERSION } from "../lib/staff-contract";

const DIR = join(process.cwd(), "contracts-templates");
const BUCKET = "staff-contracts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (lancer avec --env-file=.env.local).");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });

// Ordre des postes = numérotation des fichiers fournis (01 à 19).
const ROLE_KEYS = POLES.flatMap((p) => p.roles.map((r) => r.key));

function roleKeyFor(file: string): string | null {
  const base = file.replace(/\.pdf$/i, "");
  if (ROLE_KEYS.includes(base)) return base;
  const m = /^Contrat EP Coaching - (\d{2}) - /.exec(file);
  if (m) return ROLE_KEYS[Number(m[1]) - 1] ?? null;
  return null;
}

async function main() {
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.id === BUCKET)) {
    const { error } = await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 20 * 1024 * 1024, allowedMimeTypes: ["application/pdf"] });
    if (error) throw new Error(`Création du bucket impossible : ${error.message}`);
    console.log(`Bucket "${BUCKET}" créé (privé).`);
  }

  const problems: string[] = [];
  const newest = new Map<string, { file: string; mtime: number }>();
  for (const file of readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".pdf"))) {
    const roleKey = roleKeyFor(file);
    if (!roleKey) {
      problems.push(`${file} : poste non reconnu`);
      continue;
    }
    const mtime = statSync(join(DIR, file)).mtimeMs;
    const prev = newest.get(roleKey);
    if (!prev || mtime > prev.mtime) newest.set(roleKey, { file, mtime });
  }
  const done = new Map<string, string>();
  for (const [roleKey, { file }] of newest) {
    const body = readFileSync(join(DIR, file));
    if (body.subarray(0, 4).toString() !== "%PDF") {
      problems.push(`${file} : ce n'est pas un PDF`);
      continue;
    }
    const path = `templates/${roleKey}/${STAFF_CONTRACT_VERSION}.pdf`;
    const { error } = await admin.storage.from(BUCKET).upload(path, body, { contentType: "application/pdf", upsert: true });
    if (error) problems.push(`${file} : ${error.message}`);
    else done.set(roleKey, `${path} (${Math.round(body.length / 1024)} Ko, ${file})`);
  }

  console.log(`\nModèles envoyés (version ${STAFF_CONTRACT_VERSION}) :`);
  for (const k of ROLE_KEYS) console.log(`  ${done.has(k) ? "OK  " : "MANQUE"} ${k}${done.has(k) ? `  ->  ${done.get(k)}` : ""}`);
  if (problems.length) console.log(`\nProblèmes :\n  ${problems.join("\n  ")}`);

  // Contrôle final : ce qui est réellement dans le bucket.
  let present = 0;
  for (const k of ROLE_KEYS) {
    const { data } = await admin.storage.from(BUCKET).list(`templates/${k}`);
    if (data?.some((f) => f.name === `${STAFF_CONTRACT_VERSION}.pdf`)) present++;
  }
  console.log(`\nDans le bucket : ${present}/${ROLE_KEYS.length} modèles pour la version ${STAFF_CONTRACT_VERSION}.`);
  if (present !== ROLE_KEYS.length) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
