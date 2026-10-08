import { PRACTICE_OPTIONS, type AppSetup } from "@/lib/app-setup";

// Réponses pré-cochées quand le questionnaire n'a jamais été rempli : tout
// ce que l'appli fait déjà aujourd'hui (rien ne disparaît sans le vouloir),
// sauf les nouveautés optionnelles et le cycle, proposé seulement aux femmes.
export function defaultAnswers(setup: AppSetup, opts: { role: "coach" | "client"; isWoman: boolean; coachNiches?: string[] }): Record<string, unknown> {
  if (setup.completed) return setup.answers;
  // Un client arrive avec les disciplines de la niche de son coach (un coach
  // running propose directement le suivi course à ses clients).
  const practices = PRACTICE_OPTIONS.map((o) => o.value);
  const fromCoach = (opts.coachNiches ?? []).filter((n) => practices.includes(n));
  const member = {
    pratique: fromCoach.length ? fromCoach : ["musculation"],
    corps: ["poids", "mensurations", "photos"],
    bilan: ["sommeil", "pas", "stress", "digestion", "faim"],
    entrainement: "salle",
    nutrition: "tracker",
    // Notes : outil de créateur, proposé d'office aux coachs seulement (un
    // powerlifter n'a pas à voir d'onglet Notes s'il ne l'a pas demandé).
    extras: [...(opts.isWoman ? ["cycle"] : []), "mindset", ...(opts.role === "coach" ? ["notes"] : [])],
  };
  // Réponses déjà données ailleurs (ex. mode de travail choisi dans Mon
  // équipe) : gardées par-dessus les valeurs par défaut.
  if (opts.role === "client") return { ...member, ...setup.answers };
  return {
    career_mode: "independant",
    objectifs: ["coacher", "contenu", "formations", "lives", "business"],
    plateformes: ["instagram"],
    clients_count: "0",
    suivi_perso: "oui",
    ...member,
    ...setup.answers,
  };
}
