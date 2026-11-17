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
