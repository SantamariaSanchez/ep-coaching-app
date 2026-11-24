// « Ton audit » : préparation de l'audit stratégique par la prospecte
// (transcripts « $100M Sales Team » et Hamza Skali : une page entre la
// réservation et l'appel, avec une petite question à renvoyer). Fichier pur,
// testé dans lib/__tests__/audit-prep.test.ts.

export interface PrepQuestion {
  key: string;
  label: string;
  placeholder: string;
  max: number;
}

export const PREP_QUESTIONS: PrepQuestion[] = [
  { key: "objectif", label: "Ton objectif, en une phrase", placeholder: "Ex. : perdre du gras et me sentir bien dans mes jeans", max: 300 },
  { key: "semaine", label: "Ta semaine type", placeholder: "Cours ou travail, horaires, sommeil, sport déjà fait…", max: 600 },
  { key: "salle", label: "Où tu t'entraînes (ou voudrais t'entraîner)", placeholder: "Nom de la salle, ou à la maison avec quel matériel", max: 300 },
  { key: "deja_essaye", label: "Ce que tu as déjà essayé", placeholder: "Programmes, régimes, applis… et ce qui a coincé", max: 600 },
  { key: "hesitation", label: "Ce qui te fait hésiter", placeholder: "Le prix, le temps, la peur de ne pas tenir… tout se dit", max: 400 },
];

/** Ce qui se passe pendant les 30 minutes, dit simplement. */
export const AUDIT_STEPS_TEXT: string[] = [
  "On regarde où tu en es vraiment : ta semaine, ce que tu as déjà fait, ce qui coince.",
  "On fixe ce que tu veux, et en combien de temps c'est réaliste.",
  "Je te dis honnêtement si le coaching peut t'aider. Si ce n'est pas le cas, je te le dis aussi, et tu repars avec des pistes.",
];

/** Réponses bornées et nettoyées ; les clés inconnues sont ignorées. */
export function cleanPrepAnswers(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const q of PREP_QUESTIONS) {
    const v = raw[q.key];
    if (typeof v !== "string") continue;
    const t = v.replace(/\s+/g, " ").trim().slice(0, q.max);
    if (t) out[q.key] = t;
  }
  return out;
}

/** Lignes à afficher au coach (même ordre que les questions). */
export function prepLines(answers: Record<string, unknown> | null | undefined): { label: string; value: string }[] {
  if (!answers) return [];
  return PREP_QUESTIONS.flatMap((q) => {
    const v = answers[q.key];
    return typeof v === "string" && v.trim() ? [{ label: q.label, value: v }] : [];
  });
}

export function isPrepToken(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
