// Profil d'usage (2026-10-08) : retour direct du fondateur, « l'appli doit
// être réellement 100 % personnalisée : une femme de 40 ans sédentaire qui
// veut juste perdre du gras sans rien y connaître, un compétiteur qui a déjà
// sa pro card et parle anglais, un coach IA pour les entreprises... chacun
// doit trouver en un geste ce qu'il fait le plus ».
//
// Ce fichier traduit ce qu'on sait d'une personne (questionnaire Mon appli,
// questionnaire de bienvenue, rôle, genre) en un profil simple : ses
// priorités du moment et le niveau d'explication dont elle a besoin. Pas de
// devinette sur ce qu'on ne sait pas : sans réponse, on reste générique.
// Fichier pur, importable partout.
import type { AppSetup } from "@/lib/app-setup";
import type { MemberPreferences } from "@/lib/personalization";

export type PersonaKey =
  | "debutant_perte_gras"
  | "perte_gras"
  | "debutant_muscu"
  | "prise_muscle"
  | "competiteur"
  | "force"
  | "endurance"
  | "reeducation"
  | "maternite"
  | "sante"
  | "coach_clients"
  | "coach_createur"
  | "coach_business"
  | "general";

export interface Persona {
  key: PersonaKey;
  role: "coach" | "client";
  /** Besoin d'explications simples (débutant, peu ou pas sportif). */
  guided: boolean;
  /** Intentions à mettre en avant, dans l'ordre (voir lib/intents.ts). */
  focus: string[];
  /** Guide « Comprendre » le plus utile pour cette personne. */
  learn: string | null;
  practices: string[];
}

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function derivePersona(input: {
  role: "coach" | "client";
  setup: AppSetup | null;
  prefs: MemberPreferences | null;
  isWoman?: boolean;
}): Persona {
  const answers = input.setup?.answers ?? {};
  const practices = arr(answers.pratique);
  const has = (p: string) => practices.includes(p);
  const prefs = input.prefs;
  const beginner = prefs?.experience_level === "debutant";
  const sedentary = prefs?.training_frequency === "0";
  const guided = beginner || sedentary;
  const goal = prefs?.primary_goal ?? null;

  if (input.role === "coach") {
    const objectifs = arr(answers.objectifs);
    const hasTeam = answers.career_mode === "entreprise" || objectifs.includes("equipe");
    const coaching = objectifs.includes("coacher");
    const content = objectifs.includes("contenu");
    const business = objectifs.includes("business") || objectifs.includes("formations");
    const team = hasTeam ? ["taches_equipe"] : [];
    if (coaching && (Number(String(answers.clients_count ?? "0").replace(/\D/g, "")) > 0 || answers.clients_count === "31+")) {
      return {
        key: "coach_clients", role: "coach", guided: false, learn: null, practices,
        focus: ["clients_attention", "bilans_repondre", "message", "agenda", ...team, "ecrire", "stats_organiques", "note"],
      };
    }
    if (content && !coaching) {
      return {
        key: "coach_createur", role: "coach", guided: false, learn: null, practices,
        focus: ["ecrire", "tournage", "carrousel", "stats_organiques", "partager", "agenda", ...team, "note"],
      };
    }
    if (business && !coaching) {
      return {
        key: "coach_business", role: "coach", guided: false, learn: null, practices,
        focus: ["ads", "stats_organiques", ...team, "agenda", "ecrire", "message", "positionnement", "note"],
      };
    }
    return {
      key: "coach_clients", role: "coach", guided: false, learn: null, practices,
      focus: ["clients_attention", "message", "agenda", "ecrire", "stats_organiques", ...team, "ads", "note"],
    };
  }

  // Membres et clients : la pratique déclarée prime, puis l'objectif.
  if (has("bodybuilding_compet")) {
    return { key: "competiteur", role: "client", guided: false, learn: null, practices, focus: ["prepa", "seance", "manger", "bilan", "posing", "message_coach", "agenda", "records"] };
  }
  if (has("maternite")) {
    return { key: "maternite", role: "client", guided: true, learn: null, practices, focus: ["seance_adaptee", "manger", "bilan", "message_coach", "agenda", "pas"] };
  }
  if (has("reeducation")) {
    return { key: "reeducation", role: "client", guided: true, learn: null, practices, focus: ["douleur", "seance", "bilan", "message_coach", "agenda"] };
  }
  if (has("force")) {
    return { key: "force", role: "client", guided: false, learn: null, practices, focus: ["seance", "records", "manger", "bilan", "agenda", "message_coach"] };
  }
  if (has("course") || has("hyrox") || has("crossfit")) {
    return { key: "endurance", role: "client", guided: false, learn: null, practices, focus: ["seance", "records", "manger", "bilan", "agenda", "pas"] };
  }
  if (has("sante")) {
    return { key: "sante", role: "client", guided: false, learn: null, practices, focus: ["sante", "bilan", "seance", "manger", "message_coach"] };
  }
  const fatLoss = has("perte_gras") || goal === "perte_poids" || goal === "remise_en_forme";
  if (fatLoss) {
    return guided
      ? { key: "debutant_perte_gras", role: "client", guided: true, learn: "perte-de-gras", practices, focus: ["manger", "comprendre", "bilan", "pas", "seance", "courses", "message_coach"] }
      : { key: "perte_gras", role: "client", guided: false, learn: "perte-de-gras", practices, focus: ["manger", "bilan", "seance", "pas", "courses", "agenda", "message_coach"] };
  }
  const muscle = has("musculation") || goal === "prise_muscle";
  if (muscle) {
    return guided
      ? { key: "debutant_muscu", role: "client", guided: true, learn: "debuter-la-musculation", practices, focus: ["seance", "comprendre", "manger", "bilan", "message_coach", "agenda"] }
      : { key: "prise_muscle", role: "client", guided: false, learn: "prise-de-muscle", practices, focus: ["seance", "manger", "bilan", "records", "courses", "agenda"] };
  }
  return { key: "general", role: "client", guided, learn: guided ? "debuter-la-musculation" : null, practices, focus: ["seance", "manger", "bilan", "agenda", "message_coach", "note"] };
}
