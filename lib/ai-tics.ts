// Tics d'écriture IA (2026-11-17, retour d'Emmanuel : « le problème c'est pas
// ta X mais c'est ta Y, ça c'est toi qui inventes, c'est beaucoup trop IA »,
// et « carnet » écrit à la place de « logbook »). Règle du process Notion :
// on n'écrit qu'avec des mots et des tournures lus dans les transcripts. Ces
// tournures-là n'y sont pas : ajouter_script et modifier_script les refusent.
// Fichier pur, testé dans lib/__tests__/ai-tics.test.ts.

export interface AiTic {
  /** Passage trouvé, tel quel. */
  found: string;
  /** Pourquoi c'est refusé. */
  why: string;
}

interface Pattern {
  re: RegExp;
  why: string;
}

const PATTERNS: Pattern[] = [
  {
    // « Le problème, ce n'est pas ta motivation, c'est… », « le vrai problème c'est pas… »
    re: /\b(?:le|ton|ta|son) (?:vrai |seul )?(?:probl[eè]me|souci|frein|ennemi)\b[^.!?\n]{0,12}(?:ce n['’]est pas|c['’]est pas|n['’]est pas)\b[^.!?\n]{0,80}/gi,
    why: "« Le problème, ce n'est pas X, c'est Y » : tournure d'IA, absente des transcripts",
  },
  {
    // « Ce n'est pas X, c'est Y » / « C'est pas X, c'est Y » dans la même phrase.
    re: /\b(?:ce n['’]est|c['’]est) pas\b[^.!?\n]{1,70}?,\s*(?:c['’]est|mais c['’]est|c['’]est surtout)\b/gi,
    why: "« Ce n'est pas X, c'est Y » : tournure d'IA, absente des transcripts",
  },
  {
    // « … n'est pas X. C'est Y. » sur deux phrases.
    re: /\bn['’]est pas\b[^.!?\n]{1,60}[.!]\s+(?:C['’]est|Ce sont)\b/g,
    why: "« X n'est pas Y. C'est Z. » : tournure d'IA, absente des transcripts",
  },
  {
    // « Tu ne manques pas de X. Tu manques de Y. »
    re: /\btu ne manques pas d[e'’](?:\s*volont[ée]|\s*motivation|\s*discipline|\s*temps|\s*d['’]efforts|[^.!?\n]{1,40}[.!,]\s*(?:tu manques|il te manque))/gi,
    why: "« Tu ne manques pas de X, tu manques de Y » : tournure d'IA, absente des transcripts",
  },
  {
    // « pas ta X mais ta Y », « pas ton X, mais ton Y »
    re: /\bpas (?:ta|ton|tes) [^.!?\n,]{1,30},? mais (?:c['’]est )?(?:ta|ton|tes)\b/gi,
    why: "« Pas ta X mais ta Y » : tournure d'IA, absente des transcripts",
  },
  {
    // Les transcripts disent « logbook ».
    re: /\bcarnets? d['’]entra[iî]nement\b|\bcarnets? de s[ée]ances?\b|\b(?:ton|tes|ce) carnets?\b/gi,
    why: "Les transcripts disent « logbook », pas « carnet »",
  },
];

/** Tics d'IA trouvés dans un texte (un seul signalement par passage). */
export function findAiTics(text: string | null | undefined): AiTic[] {
  if (!text) return [];
  const out: AiTic[] = [];
  const seen = new Set<string>();
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    for (const m of text.matchAll(p.re)) {
      const found = m[0].trim();
      const key = found.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ found, why: p.why });
    }
  }
  return out;
}

/** Message de refus pour les outils d'écriture (ajouter_script, modifier_script). */
export function aiTicsRefusal(tics: AiTic[]): string {
  return [
    "Script refusé : il contient des tournures qui ne viennent pas des transcripts.",
    ...tics.slice(0, 8).map((t) => `- « ${t.found} » : ${t.why}`),
    "Relis les transcripts (Notion, page Transcription) et réécris ces phrases avec des mots et des tournures que tu y as lus. Rien n'a été enregistré.",
  ].join("\n");
}

// Accroches interdites (Notion, Bible J2, transcripts : « beaucoup de gens me
// demandent » et « dans cette vidéo je vais vous parler de » font décrocher
// dans les deux premières secondes). Vérifiées seulement sur l'ouverture :
// annoncer le plan plus loin dans une vidéo longue reste permis.
const WEAK_HOOKS: Pattern[] = [
  {
    re: /\b(?:beaucoup|plein) de (?:gens|personnes|filles|monde|vous)\b[^.!?\n]{0,25}\b(?:me )?(?:demandent|m['’]ont demand[ée]|me posent)/gi,
    why: "« Beaucoup de gens me demandent » : accroche interdite (J2), ouvre sur la vraie question telle qu'elle revient",
  },
  {
    re: /\bdans (?:cette|la) (?:vid[ée]o|reel|story)\b[^.!?\n]{0,20}\b(?:je vais|on va)\b[^.!?\n]{0,15}\b(?:parler|montrer|expliquer|voir)/gi,
    why: "« Dans cette vidéo je vais vous parler de » : accroche interdite (J2), commence directement par l'image, le paradoxe ou la question",
  },
  {
    re: /^\s*(?:salut|coucou|hello|bonjour)\s+(?:tout le monde|à tous|les filles|la team)\b/gim,
    why: "Ouverture par une salutation : accroche interdite (J2), les deux premières secondes doivent accrocher",
  },
  {
    re: /^\s*aujourd['’]hui,? (?:on va|je vais) (?:parler|voir|te parler|vous parler)\b/gim,
    why: "« Aujourd'hui on va parler de » : accroche interdite (J2), entre directement dans le sujet",
  },
];

/** Longueur d'ouverture vérifiée pour les accroches interdites. */
export const HOOK_WINDOW = 220;

/**
 * Accroches interdites trouvées dans l'ouverture : l'accroche donnée à part
 * (vérifiée en entier) et le début du contenu (les HOOK_WINDOW premiers caractères).
 */
export function findWeakHooks(accroche: string | null | undefined, contenu: string | null | undefined): AiTic[] {
  const opening = [accroche ?? "", (contenu ?? "").slice(0, HOOK_WINDOW)].filter(Boolean).join("\n");
  if (!opening.trim()) return [];
  const out: AiTic[] = [];
  const seen = new Set<string>();
  for (const p of WEAK_HOOKS) {
    p.re.lastIndex = 0;
    for (const m of opening.matchAll(p.re)) {
      const found = m[0].trim();
      if (seen.has(found.toLowerCase())) continue;
      seen.add(found.toLowerCase());
      out.push({ found, why: p.why });
    }
  }
  return out;
}

/** Message de refus pour une accroche interdite. */
export function weakHooksRefusal(hooks: AiTic[]): string {
  return [
    "Script refusé : l'accroche fait partie des ouvertures interdites (Notion, Bible J2).",
    ...hooks.slice(0, 4).map((h) => `- « ${h.found} » : ${h.why}`),
    "Ouvertures qui marchent : casser une image qu'elle a en tête, son idée reçue, un paradoxe avec « pourtant », son corps ou sa situation maintenant, une vraie question de cliente (questions_clientes). Rien n'a été enregistré.",
  ].join("\n");
}
