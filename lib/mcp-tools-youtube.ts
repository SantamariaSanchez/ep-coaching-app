// Outils YouTube du connecteur Claude (2026-10-28) : titres notés, structure
// d'une vidéo longue, miniatures, audit d'un script, clips pour les reels et
// plan enregistré. Toute la logique vit dans lib/youtube-studio.ts.
import { createAdminClient } from "@/lib/supabase-admin";
import { fuzzyScore } from "@/lib/fuzzy-search";
import { isMissingColumnError } from "@/lib/coach-ideation";
import {
  HOOK_TYPES, TITLE_ANGLES, YT_STRUCTURES, analyzeYoutubeScript, blueprintToText, buildVideoBlueprint, checkDescription,
  cleanVideoPlan, deriveClips, fmtTime, generateTitles, getYtStructure, journalRow, scoreTitle, thumbnailIdeas,
  type TitleInput,
} from "@/lib/youtube-studio";

type Role = "coach" | "client" | "staff";
type ToolDef = { name: string; description: string; inputSchema: Record<string, unknown>; roles: Role[] };

const SCRIPT_REF = { type: "string", description: "Identifiant court donné par mes_scripts (8 caractères) ou titre du script" };
const text = (t: string) => ({ content: [{ type: "text", text: t }] });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const YOUTUBE_TOOLS: ToolDef[] = [
  {
    name: "titres_youtube",
    roles: ["coach"],
    description: "Titres YouTube notés sur 100 (moins de 60 caractères, vraie phrase, contraste, mots simples, aucun appât), un candidat par angle : curiosité, résultat, erreur, contre-pied, chiffre fermé, filtre d'audience. Donne ce que tu sais (sujet, douleur, résultat, erreur, idée reçue, vérité, nombre) ; ou passe `titre` pour noter un titre existant. Montre les meilleurs au coach et garde la liste pour un test.",
    inputSchema: {
      type: "object",
      properties: {
        titre: { type: "string", description: "Un titre à noter (sans générer)" },
        sujet: { type: "string", description: "Le sujet en quelques mots (ex. « ton ventre »)" },
        douleur: { type: "string", description: "La douleur à la 2e personne (ex. « tu fais des abdos tous les soirs »)" },
        resultat: { type: "string", description: "Le résultat visé (ex. « perdre ton ventre »)" },
        erreur: { type: "string", description: "L'erreur à arrêter, à l'infinitif" },
        idee_recue: { type: "string" },
        verite: { type: "string", description: "La vérité qui renverse l'idée reçue" },
        nombre: { type: "number", description: "Nombre de raisons, d'erreurs ou d'étapes (2 à 9)" },
        public: { type: "string", description: "Pour un titre filtre (ex. « t'as 30 ans et tu commences la muscu »)" },
      },
    },
  },
  {
    name: "structure_video_youtube",
    roles: ["coach"],
    description: "Plan d'une vidéo YouTube longue : chronologie (hook 0-30 s, promesse, plan, parties, récap, demandes de fin), nombre de mots, relances toutes les 2 à 3 minutes, boucle ouverte, rappel de la ressource. Jamais de chapitres ni de timecodes. Renvoie aussi les 16 structures Y01 à Y16 et les types de hook pour en choisir une différente des dernières vidéos.",
    inputSchema: {
      type: "object",
      properties: {
        duree_minutes: { type: "number", description: "8 à 16, 12 par défaut" },
        parties: { type: "number", description: "3 à 6, 4 par défaut" },
        structure: { type: "string", description: "Identifiant Y01 à Y16 pour voir son déroulé" },
      },
    },
  },
  {
    name: "miniatures_youtube",
    roles: ["coach"],
    description: "Idées de miniature YouTube pour un titre : 3 concepts (visage et objet, deux côtés, objet seul) avec composition, émotion, contraste, texte optionnel de 2 à 4 mots, plus le protocole de test A/B et les règles.",
    inputSchema: { type: "object", properties: { titre: { type: "string" }, sujet: { type: "string" } }, required: ["titre"] },
  },
  {
    name: "analyser_script_youtube",
    roles: ["coach"],
    description: "Audit d'un script YouTube du Studio : points de relecture (ouverture, promesse, plan annoncé, boucle ouverte, relances, rappel de la ressource, récap, fin), règles de marque et contrôle de la description. Lis-le avant de réécrire un script, puis corrige ce qui échoue.",
    inputSchema: { type: "object", properties: { script: SCRIPT_REF }, required: ["script"] },
  },
  {
    name: "clips_depuis_video",
    roles: ["coach"],
    description: "Passages d'un script YouTube à sortir en reels (30 à 60 secondes) : texte, 4 titres hook sans ponctuation faits avec les mots du passage, description courte avec l'appel à l'action « Commente « VIDEO » pour recevoir la vidéo complète ».",
    inputSchema: { type: "object", properties: { script: SCRIPT_REF, nombre: { type: "number", description: "1 à 8, 6 par défaut" } }, required: ["script"] },
  },
  {
    name: "plan_video_youtube",
    roles: ["coach"],
    description: "Enregistre le plan d'une vidéo YouTube sur son script : structure (Y01 à Y16), type de hook (" + HOOK_TYPES.map((h) => h.id).join(", ") + "), identifiant du hook (H01 à H92), titres candidats, miniatures A et B. Renvoie la ligne à ajouter au Journal de rotation.",
    inputSchema: {
      type: "object",
      properties: {
        script: SCRIPT_REF,
        structure: { type: "string", enum: YT_STRUCTURES.map((s) => s.id) },
        type_hook: { type: "string", enum: HOOK_TYPES.map((h) => h.id) },
        id_hook: { type: "string", description: "H01 à H92" },
        titres: { type: "array", items: { type: "string" } },
        miniature_a: { type: "string" },
        miniature_b: { type: "string" },
      },
      required: ["script"],
    },
  },
];

type Row = { id: string; title: string; content: string | null; duration_seconds: number | null; instagram_caption: string | null; pillar: string | null; content_format?: string | null; source_reference: string | null; platform: string | null; video_plan?: unknown };

async function findScript(ownerId: string, ref: string): Promise<Row | null> {
  const admin = createAdminClient();
  const r = ref.trim().slice(0, 200);
  if (!r) return null;
  const base = "id, title, content, duration_seconds, instagram_caption, pillar, source_reference, platform";
  const query = (cols: string) => admin.from("coach_scripts").select(cols).eq("coach_id", ownerId).limit(500);
  const full = await query(`${base}, content_format, video_plan`);
  const data = isMissingColumnError(full.error) ? (await query(base)).data : full.data;
  const list = (data ?? []) as unknown as Row[];
  if (/^[0-9a-f-]{8,36}$/i.test(r)) {
    const byId = list.find((s) => s.id.toLowerCase().startsWith(r.toLowerCase()));
    if (byId) return byId;
  }
  return list.map((s) => ({ s, sc: fuzzyScore(s.title, r) })).filter((x) => x.sc >= 0).sort((a, b) => b.sc - a.sc)[0]?.s ?? null;
}

export function youtubeToolsForRole(role: Role) {
  return YOUTUBE_TOOLS.filter((t) => t.roles.includes(role)).map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
}

export async function callYoutubeTool(ownerId: string, role: Role, name: string, args: Record<string, unknown>) {
  const tool = YOUTUBE_TOOLS.find((t) => t.name === name);
  if (!tool) return null;
  if (!tool.roles.includes(role)) return text("Cet outil est réservé aux coachs.");

  switch (name) {
    case "titres_youtube": {
      const titre = str(args.titre, 200);
      if (titre) {
        const s = scoreTitle(titre);
        return text([`« ${titre} » : ${s.passed}/${s.total} critères tenus`, ...s.criteria.map((c) => `- ${c.ok ? "ok" : "à corriger"} · ${c.label}${c.ok || !c.hint ? "" : ` : ${c.hint}`}`)].join("\n"));
      }
      const input: TitleInput = {
        subject: str(args.sujet, 120), pain: str(args.douleur, 160), result: str(args.resultat, 120), mistake: str(args.erreur, 120),
        myth: str(args.idee_recue, 120), truth: str(args.verite, 120), audience: str(args.public, 120),
        count: typeof args.nombre === "number" ? args.nombre : undefined,
      };
      const list = generateTitles(input);
      if (!list.length) return text("Donne au moins un élément : sujet, douleur, résultat, erreur, idée reçue ou public.");
      const angle = (id: string) => TITLE_ANGLES.find((a) => a.id === id)?.label ?? id;
      return text(["Titres candidats (moins de 60 caractères). Relis-les : ce sont des gabarits à ajuster avec les mots du coach, la promesse doit être tenue dans la vidéo.", ...list.map((c) => `- [${angle(c.angle)}] ${c.text}`)].join("\n"));
    }

    case "structure_video_youtube": {
      const s = getYtStructure(str(args.structure, 4));
      const bp = buildVideoBlueprint({ durationMin: typeof args.duree_minutes === "number" ? args.duree_minutes : undefined, parts: typeof args.parties === "number" ? args.parties : undefined });
      return text([
        blueprintToText(bp),
        "",
        s ? `STRUCTURE ${s.id} · ${s.name} : ${s.steps.join(" → ")}. Pour : ${s.bestFor}` : "STRUCTURES : " + YT_STRUCTURES.map((x) => `${x.id} ${x.name}`).join(" ; "),
        "TYPES DE HOOK : " + HOOK_TYPES.map((h) => `${h.id} ${h.label}`).join(" ; ") + ". Écris 3 hooks de 3 types différents et garde le plus fort.",
      ].join("\n"));
    }

    case "miniatures_youtube": {
      const titre = str(args.titre, 200);
      if (!titre) return text("Titre obligatoire.");
      const ideas = thumbnailIdeas({ title: titre, subject: str(args.sujet, 200) });
      return text([
        ...ideas.concepts.map((c, i) => [`Concept ${i + 1} · ${c.label}`, `Composition : ${c.composition}`, `Émotion : ${c.emotion}`, `Contraste : ${c.contrast}`, c.textOptions.length ? `Texte possible (2 à 4 mots) : ${c.textOptions.join(" · ")}` : "Sans texte"].join("\n")),
        "TEST A/B", ...ideas.abTest.map((t) => `- ${t}`),
        "RÈGLES", ...ideas.rules.map((t) => `- ${t}`),
      ].join("\n\n"));
    }

    case "analyser_script_youtube": {
      const script = await findScript(ownerId, str(args.script, 200));
      if (!script) return text("Script introuvable dans ton Studio. Utilise mes_scripts pour voir les identifiants.");
      const a = analyzeYoutubeScript({ content: script.content, durationSec: script.duration_seconds });
      const desc = checkDescription(script.instagram_caption).filter((d) => !d.ok);
      return text([
        `« ${script.title} » : ${a.passed}/${a.total} points tenus · ${a.words} mots · ${a.minutes} min · plus longue durée sans relance ${fmtTime(a.longestGapSec)}`,
        ...a.checks.map((c) => `- ${c.ok ? "ok" : "À CORRIGER"} · ${c.label}${c.ok || !c.detail ? "" : ` : ${c.detail}`}`),
        "",
        desc.length ? `\nDESCRIPTION À CORRIGER\n${desc.map((d) => `- ${d.text}`).join("\n")}` : "\nDescription conforme au modèle.",
      ].join("\n"));
    }

    case "clips_depuis_video": {
      const script = await findScript(ownerId, str(args.script, 200));
      if (!script) return text("Script introuvable dans ton Studio. Utilise mes_scripts pour voir les identifiants.");
      const n = typeof args.nombre === "number" ? Math.min(8, Math.max(1, Math.round(args.nombre))) : 6;
      const clips = deriveClips(script.content, script.duration_seconds, n);
      if (!clips.length) return text("Script trop court pour en tirer des clips.");
      return text(clips.map((c) => [`CLIP ${c.n} · vers ${fmtTime(c.atSec)} · ~${c.seconds} s`, c.text, `Titres hook :\n${c.hooks.map((h) => `- ${h}`).join("\n") || "- (à écrire avec les mots du passage)"}`, `Description :\n${c.description}`].join("\n")).join("\n\n---\n\n"));
    }

    case "plan_video_youtube": {
      const script = await findScript(ownerId, str(args.script, 200));
      if (!script) return text("Script introuvable dans ton Studio. Utilise mes_scripts pour voir les identifiants.");
      if (script.platform !== "youtube") return text("Ce script n'est pas une vidéo YouTube.");
      const current = cleanVideoPlan(script.video_plan);
      const next = cleanVideoPlan({
        ...current,
        ...(args.structure !== undefined ? { structure: args.structure } : {}),
        ...(args.type_hook !== undefined ? { hookType: args.type_hook } : {}),
        ...(args.id_hook !== undefined ? { hookId: args.id_hook } : {}),
        ...(Array.isArray(args.titres) ? { titles: args.titres } : {}),
        ...(args.miniature_a !== undefined ? { thumbA: args.miniature_a } : {}),
        ...(args.miniature_b !== undefined ? { thumbB: args.miniature_b } : {}),
      });
      const admin = createAdminClient();
      const { error } = await admin.from("coach_scripts").update({ video_plan: next, updated_at: new Date().toISOString() }).eq("id", script.id).eq("coach_id", ownerId);
      if (error && isMissingColumnError(error)) return text("Le plan de vidéo n'est pas encore activé dans la base EP Coaching.");
      if (error) return text("Enregistrement impossible, réessaie.");
      const row = journalRow({ id: script.id, title: script.title, pillar: script.pillar, contentFormat: script.content_format, sourceReference: script.source_reference, plan: next });
      return text(`Plan enregistré sur « ${script.title} ».\nLigne du Journal de rotation :\n${Object.entries(row).map(([k, v]) => `${k} : ${v}`).join("\n")}`);
    }
  }
  return null;
}
