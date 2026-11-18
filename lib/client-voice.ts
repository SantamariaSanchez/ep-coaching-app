// « Ce que tes clientes te demandent » : le coaching est le meilleur
// marketing (dépôt du 18/11, ThePrepDad : analyser chaque semaine les
// conversations clients pour trouver les thèmes qui reviennent, puis en faire
// du contenu). Fichier pur : regroupe des phrases déjà écrites par les
// clientes et les prospectes (check-ins, candidatures, messages, communauté)
// par thème, sans jamais garder de nom ni de coordonnée.

export type VoiceSource = "checkin" | "candidature" | "message" | "communaute";

export type VoiceSnippet = { source: VoiceSource; kind: string; text: string; at: string };

export type VoiceTheme = {
  id: string;
  label: string;
  /** Angle de contenu proposé, formulé comme une question qui revient. */
  angle: string;
  count: number;
  examples: VoiceSnippet[];
};

type ThemeDef = { id: string; label: string; angle: string; words: RegExp };

// Thèmes de la cible (filles 16-25 ans qui débutent la muscu). Ordre = priorité
// quand une phrase touche plusieurs thèmes : elle compte dans chacun.
export const VOICE_THEMES: ThemeDef[] = [
  { id: "salle", label: "Peur de la salle et du regard des autres", angle: "« J'ose pas aller à la salle, j'ai peur qu'on me regarde »", words: /regard|jug[eé]|intimid|honte|g[eê]n[eé]e?\b|toute seule|peur d.aller|mecs? (?:à|a) la salle/i },
  { id: "fessiers", label: "Fessiers et bas du corps", angle: "« Je fais des squats mais mes fessiers ne bougent pas »", words: /fess|glute|cuisse|jambe|hip ?thrust|bas du corps/i },
  { id: "regularite", label: "Tenir sur la durée", angle: "« Je commence fort puis j'arrête au bout de 2 semaines »", words: /motiv|r[eé]gul|abandon|arr[eê]t[eé]?|flemme|discipline|tenir|reprendre|recommenc/i },
  { id: "temps", label: "Le temps avec les cours ou le travail", angle: "« Entre les cours et le boulot, j'ai pas le temps »", words: /\btemps\b|\bcours\b|[eé]tudes?\b|partiels?|boulot|travail|emploi du temps|planning|alternance/i },
  { id: "nutrition", label: "Manger, faim et grignotage", angle: "« Je sais pas quoi manger pour voir des résultats »", words: /faim|fringale|grignot|sucr|calor|prot[eé]in|repas|manger|nourriture|alimentation|petit[- ]d[eé]j/i },
  { id: "poids", label: "Le poids qui stagne", angle: "« Je fais tout bien et la balance ne bouge pas »", words: /stagn|balance|kilos?\b|poids|perdre|maigrir|plateau/i },
  { id: "technique", label: "Technique et choix des exercices", angle: "« Je sais jamais si je fais bien l'exercice »", words: /technique|posture|exercice|mouvement|squat|souleve|ex[eé]cution|programme/i },
  { id: "energie", label: "Fatigue et sommeil", angle: "« Je suis crevée tout le temps, c'est normal ? »", words: /sommeil|fatigu|dormi|dormir|[eé]nergie|crev[eé]e?/i },
  { id: "confiance", label: "Confiance et image du corps", angle: "« J'aime pas ce que je vois dans le miroir »", words: /complex|confiance|miroir|image de moi|mon corps|assum|silhouette/i },
  { id: "cycle", label: "Cycle et règles", angle: "« Pendant mes règles, je fais quoi à la salle ? »", words: /r[eè]gles|\bcycle|menstru|syndrome pr[eé]menstruel|spm\b/i },
];

// Sujets qu'on ne transforme jamais en contenu à partir de la phrase d'une
// personne (règle 5 : santé, douleur, blessure, trouble alimentaire) : la
// phrase est écartée, pas seulement le thème.
const SENSITIVE = /trouble|\btca\b|anorex|boulim|vomi|hyperphag|purge|d[eé]pression|suicid|automutil|scarif|enceinte|grossesse|douleur|bless|tendin|entorse|\bmal (?:au|à|a la|aux)\b|j.ai mal|m[eé]dica|traitement|m[eé]decin/i;

/** Retire tout ce qui pourrait identifier quelqu'un et coupe à `max`. */
export function anonymizeSnippet(raw: string, max = 220): string {
  const t = raw
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, "[lien]")
    .replace(/@[\w.]{2,}/g, "[compte]")
    .replace(/(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/g, "[téléphone]")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export function isUsableSnippet(text: string): boolean {
  const t = text.trim();
  return t.length >= 12 && !SENSITIVE.test(t);
}

/** Regroupe les phrases par thème, du plus fréquent au moins fréquent. */
export function groupVoice(snippets: VoiceSnippet[], examplesPerTheme = 3): VoiceTheme[] {
  const themes = new Map<string, VoiceTheme>();
  for (const s of snippets) {
    if (!isUsableSnippet(s.text)) continue;
    const text = anonymizeSnippet(s.text);
    for (const def of VOICE_THEMES) {
      if (!def.words.test(text)) continue;
      const theme = themes.get(def.id) ?? { id: def.id, label: def.label, angle: def.angle, count: 0, examples: [] };
      theme.count++;
      if (theme.examples.length < examplesPerTheme && !theme.examples.some((e) => e.text === text)) {
        theme.examples.push({ ...s, text });
      }
      themes.set(def.id, theme);
    }
  }
  const order = new Map(VOICE_THEMES.map((d, i) => [d.id, i]));
  return [...themes.values()].sort((a, b) => b.count - a.count || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export const VOICE_SOURCE_LABELS: Record<VoiceSource, string> = {
  checkin: "check-in",
  candidature: "candidature",
  message: "message",
  communaute: "communauté",
};

export const VOICE_RULES = [
  "Ne jamais nommer ni reconnaître une personne : on reprend la question, jamais le cas.",
  "Ouvrir sur la question telle qu'elle revient, puis répondre avec une règle simple et refaisable.",
  "Une phrase qui touche à la santé (douleur, trouble alimentaire, grossesse) ne devient jamais un contenu.",
];

/** Version texte pour Claude (outil MCP) : thèmes, angles et exemples anonymes. */
export function voiceMarkdown(themes: VoiceTheme[], days: number, total: number): string {
  if (!themes.length) {
    return `Aucune phrase exploitable sur les ${days} derniers jours (${total} lue(s)). Rien à transformer en contenu pour l'instant : ne pas inventer de question de cliente.`;
  }
  const head = [`Ce que les clientes et prospectes ont écrit sur ${days} jours (${total} phrase(s) lue(s)), regroupé par thème :`, "", "Règles :", ...VOICE_RULES.map((r) => `- ${r}`), ""];
  const body = themes.map((t) => [
    `### ${t.label} (${t.count})`,
    `Angle : ${t.angle}`,
    ...t.examples.map((e) => `- « ${e.text} » (${VOICE_SOURCE_LABELS[e.source]})`),
  ].join("\n"));
  return head.join("\n") + body.join("\n\n");
}
