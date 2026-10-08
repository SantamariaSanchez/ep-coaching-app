// « Je veux... » (2026-10-08) : chaque besoin fréquent a un chemin en un
// geste, depuis l'accueil et depuis la loupe. Retour direct du fondateur :
// « si je veux savoir quoi manger, c'est quand ma séance, comprendre comment
// perdre du gras, prendre une note, voir mes stats, ce que m'ont rapporté mes
// ads, assigner une tâche, envoyer un message, voir mon agenda, partager un
// contenu, aller tourner, écrire, faire un carrousel : le chemin doit être
// hyper facile ».
//
// Le catalogue est déclaratif ; l'ordre affiché vient du profil (persona)
// puis de l'usage réel (les tuiles les plus touchées remontent).
// Fichier pur, importable partout.

export type IntentSpace = "coach" | "client";

export interface Intent {
  id: string;
  label: string;
  /** Icône lucide (voir components/home/IntentLauncher.tsx). */
  icon: string;
  /** Mots qu'une personne taperait dans la loupe. */
  keywords: string;
  href: Record<IntentSpace, string | null>;
  /** Visible seulement si la rubrique est active dans Mon appli. */
  segment?: Partial<Record<IntentSpace, string>>;
}

const C = "/dashboard/client";
const K = "/dashboard/coach";

export const INTENTS: Intent[] = [
  // ── Suivi perso (membres, clients, espace Moi des coachs) ─────────────
  { id: "manger", label: "Quoi manger maintenant", icon: "utensils", keywords: "manger repas faim plan diète nutrition calories macros quoi manger", href: { client: `${C}/nutrition`, coach: `${K}/moi/nutrition` }, segment: { client: "nutrition", coach: "moi/nutrition" } },
  { id: "seance", label: "Ma séance", icon: "dumbbell", keywords: "séance seance entraînement training programme muscu quand salle", href: { client: `${C}/program`, coach: `${K}/moi/programme` }, segment: { client: "program", coach: "moi/programme" } },
  { id: "bilan", label: "Mon bilan du jour", icon: "clipboard", keywords: "bilan poids pesée sommeil ressenti journée noter", href: { client: `${C}/bilan`, coach: `${K}/moi/bilan` }, segment: { client: "bilan", coach: "moi/bilan" } },
  { id: "pas", label: "Mes pas", icon: "footprints", keywords: "pas marche steps neat podomètre", href: { client: `${C}/steps`, coach: `${K}/moi/steps` }, segment: { client: "steps", coach: "moi/steps" } },
  { id: "courses", label: "Ma liste de courses", icon: "basket", keywords: "courses stock inventaire acheter liste frigo", href: { client: `${C}/nutrition?vue=courses`, coach: `${K}/moi/nutrition?vue=courses` }, segment: { client: "nutrition", coach: "moi/nutrition" } },
  { id: "comprendre", label: "Comprendre comment ça marche", icon: "lightbulb", keywords: "comprendre perdre gras maigrir sèche prise de muscle débuter comment ça marche apprendre", href: { client: `${C}/comprendre`, coach: `${K}/moi/comprendre` } },
  { id: "records", label: "Mes records", icon: "trophy", keywords: "records performances pr 1rm chrono allure", href: { client: `${C}/performances`, coach: `${K}/moi/performances` }, segment: { client: "performances", coach: "moi/performances" } },
  { id: "prepa", label: "Ma prépa compétition", icon: "medal", keywords: "prépa compétition posing peak week sèche scène pro card", href: { client: `${C}/performances?d=prepa`, coach: `${K}/moi/performances?d=prepa` }, segment: { client: "performances", coach: "moi/performances" } },
  { id: "posing", label: "Mes photos et posing", icon: "camera", keywords: "photos posing poses avant après progression", href: { client: `${C}/photos`, coach: `${K}/moi/photos` }, segment: { client: "photos", coach: "moi/photos" } },
  { id: "seance_adaptee", label: "Ma séance adaptée", icon: "heart", keywords: "grossesse post-partum périnée séance adaptée maman", href: { client: `${C}/performances?d=maternite`, coach: `${K}/moi/performances?d=maternite` }, segment: { client: "performances", coach: "moi/performances" } },
  { id: "douleur", label: "Noter ma douleur", icon: "activity", keywords: "douleur rééducation blessure reprise kiné", href: { client: `${C}/performances?d=reeducation`, coach: `${K}/moi/performances?d=reeducation` }, segment: { client: "performances", coach: "moi/performances" } },
  { id: "sante", label: "Ma tension et mes analyses", icon: "heartpulse", keywords: "tension prise de sang analyses santé bilan sanguin", href: { client: `${C}/performances?d=sante`, coach: `${K}/moi/performances?d=sante` }, segment: { client: "performances", coach: "moi/performances" } },
  { id: "message_coach", label: "Écrire à mon coach", icon: "message", keywords: "message coach écrire question", href: { client: `${C}/messages`, coach: null } },

  // ── Organisation (tout le monde) ──────────────────────────────────────
  { id: "agenda", label: "Mon agenda", icon: "calendar", keywords: "agenda planning semaine emploi du temps journée vue d'ensemble", href: { client: `${C}/agenda`, coach: `${K}/moi/agenda` }, segment: { client: "agenda", coach: "moi/agenda" } },
  { id: "note", label: "Prendre une note", icon: "note", keywords: "note idée noter capture dictée écrire", href: { client: `${C}/notes?capture=1`, coach: `${K}/notes?capture=1` }, segment: { client: "notes", coach: "notes" } },
  { id: "claude", label: "Demander à Claude", icon: "sparkles", keywords: "claude ia intelligence artificielle assistant notion", href: { client: `${C}/claude`, coach: `${K}/claude` } },

  // ── Coach ─────────────────────────────────────────────────────────────
  { id: "clients_attention", label: "Qui a besoin de moi", icon: "alert", keywords: "clients priorités urgences attention relancer", href: { client: null, coach: `${K}/prioritaires` } },
  { id: "bilans_repondre", label: "Répondre aux bilans", icon: "inbox", keywords: "bilans check-in répondre retours corrections photos", href: { client: null, coach: `${K}/inbox` } },
  { id: "message", label: "Envoyer un message", icon: "message", keywords: "message écrire client membre conversation", href: { client: null, coach: `${K}/messages` } },
  { id: "taches_equipe", label: "Tâches de mon équipe", icon: "tasks", keywords: "tâches équipe assigner staff setter closer monteur", href: { client: null, coach: `${K}/mon-equipe` } },
  { id: "ecrire", label: "Écrire un script", icon: "pen", keywords: "écrire script reel vidéo texte post", href: { client: null, coach: `${K}/studio?onglet=scripts` }, segment: { coach: "studio" } },
  { id: "tournage", label: "Aller tourner", icon: "video", keywords: "tourner tournage filmer prompteur vidéo", href: { client: null, coach: `${K}/studio?onglet=scripts` }, segment: { coach: "studio" } },
  { id: "carrousel", label: "Faire un carrousel", icon: "layers", keywords: "carrousel carousel slides post instagram linkedin légende", href: { client: null, coach: `${K}/studio?onglet=generateur` }, segment: { coach: "studio" } },
  { id: "stats_organiques", label: "Mes stats réseaux", icon: "chart", keywords: "stats statistiques organique abonnés vues réseaux instagram tiktok youtube", href: { client: null, coach: `${K}/stats-reseaux` }, segment: { coach: "stats-reseaux" } },
  { id: "ads", label: "Ce que rapportent mes ads", icon: "megaphone", keywords: "ads publicité pub roas rentabilité dépense coût par lead meta google", href: { client: null, coach: `${K}/business/ads` }, segment: { coach: "business/ads" } },
  { id: "partager", label: "Partager un contenu", icon: "share", keywords: "partager publier post communauté membres mot du coach", href: { client: null, coach: `${K}/communaute/coach` } },
  { id: "positionnement", label: "Ma niche et mon avatar", icon: "target", keywords: "niche positionnement avatar client idéal offre bio", href: { client: null, coach: `${K}/positionnement` } },
  { id: "live", label: "Mes lives et appels", icon: "live", keywords: "live visio appel 1:1 call rendez-vous", href: { client: `${C}/live`, coach: `${K}/live` }, segment: { client: "live", coach: "live" } },
];

export const INTENT_BY_ID = Object.fromEntries(INTENTS.map((i) => [i.id, i])) as Record<string, Intent>;

/** Intentions accessibles à cette personne (rubriques coupées exclues). */
export function availableIntents(space: IntentSpace, hidden: Set<string>): Intent[] {
  return INTENTS.filter((i) => {
    if (!i.href[space]) return false;
    const seg = i.segment?.[space];
    if (seg && (hidden.has(seg) || (hidden.has("moi/*") && seg.startsWith("moi/")))) return false;
    return true;
  });
}

/**
 * Ordre d'affichage : les priorités du profil d'abord, puis l'usage réel
 * (un geste fréquent finit par passer devant), le reste ensuite.
 */
export function rankIntents(intents: Intent[], focus: string[], usage: Record<string, { n: number; last: number }>, now: number): Intent[] {
  const score = (i: Intent) => {
    const f = focus.indexOf(i.id);
    const base = f === -1 ? 0 : (focus.length - f) * 3;
    const u = usage[i.id];
    // L'usage compte avec une demi-vie de deux semaines.
    const used = u ? Math.min(u.n, 30) * Math.pow(0.5, (now - u.last) / (14 * 86400000)) : 0;
    return base + used * 2;
  };
  return [...intents].sort((a, b) => score(b) - score(a));
}
