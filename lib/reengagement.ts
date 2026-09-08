import { wrapBrandedEmail } from "@/lib/mailing-audience";

// ── Séquence de relance des membres dormants ────────────────────────────────
// Contexte réel (constaté le 2026-09-08) : sur 15 comptes clients, 14 n'ont
// jamais fait la moindre action (0 check-in, 0 repas, 0 séance) et pour presque
// tous la dernière connexion est le jour même de l'inscription. Le problème
// n'est donc pas "ils se lassent au bout de quelques semaines", c'est "ils ne
// reviennent jamais une deuxième fois".
//
// L'ancien système envoyait un message générique tiré au hasard ("On continue ?"),
// une fois par semaine, indéfiniment, et uniquement aux clients ayant terminé
// l'onboarding — donc jamais à ceux qui décrochent le premier jour, c'est-à-dire
// exactement la population à récupérer.
//
// Principe de cette séquence : chaque message DONNE quelque chose d'utile
// (un vrai guide de la bibliothèque, choisi selon l'objectif déclaré du membre)
// avant de demander quoi que ce soit. On ne répète jamais deux fois le même
// angle, et la séquence se termine proprement plutôt que de harceler.

export const REENGAGEMENT_STEPS = 5;

/** Catégories de la bibliothèque de lead magnets, pour le ciblage par objectif. */
export type GuideCategory =
  | "Entraînement"
  | "Nutrition"
  | "Récupération"
  | "Psychologie"
  | "Steps & activité quotidienne"
  | "Général";

export interface GuideRef {
  slug: string;
  title: string;
  hook: string | null;
}

export interface ReengagementContext {
  firstName: string;
  /** Objectif 3 mois déclaré à l'intake, s'il existe. Jamais inventé. */
  goal: string | null;
  guide: GuideRef | null;
  appUrl: string;
}

/**
 * Devine la catégorie de guide la plus pertinente à partir de l'objectif écrit
 * par le membre lui-même. Volontairement simple et lisible : mieux vaut un
 * ciblage grossier mais explicable qu'une heuristique opaque impossible à
 * corriger quand un membre reçoit un guide à côté de la plaque.
 */
export function categoryForGoal(goal: string | null): GuideCategory {
  const g = (goal ?? "").toLowerCase();
  if (!g.trim()) return "Général";
  if (/(muscle|masse|prendre du|volume|force|hypertroph|grossir)/.test(g)) return "Entraînement";
  if (/(perdre|gras|sèche|seche|maigrir|poids|ventre|affiner)/.test(g)) return "Nutrition";
  if (/(sommeil|dormir|fatigue|récup|recup|blessure|douleur)/.test(g)) return "Récupération";
  if (/(motivation|discipline|régularité|regularite|tête|tete|stress|confiance|mental)/.test(g))
    return "Psychologie";
  if (/(marche|pas |bouger|sédentaire|sedentaire|actif|activité|activite)/.test(g))
    return "Steps & activité quotidienne";
  return "Général";
}

/**
 * Choix déterministe d'un guide dans la liste candidate : le même membre à la
 * même étape reçoit toujours le même guide (donc un renvoi n'envoie pas un
 * contenu différent), mais deux étapes successives en donnent deux différents.
 */
export function pickGuide(candidates: GuideRef[], clientId: string, step: number): GuideRef | null {
  if (candidates.length === 0) return null;
  let hash = step * 31;
  for (const char of clientId) hash = (hash * 33 + char.charCodeAt(0)) % 100000;
  return candidates[hash % candidates.length];
}

function guideBlock(guide: GuideRef | null, appUrl: string): string {
  if (!guide) return "";
  return `
    <div style="background:#1f0101;border:1px solid rgba(137,4,4,0.35);border-radius:12px;padding:16px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(245,237,237,0.45);">Pour toi, à lire en 5 minutes</p>
      <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#ffffff;">${guide.title}</p>
      ${guide.hook ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.5;color:rgba(245,237,237,0.65);">${guide.hook}</p>` : ""}
      <a href="${appUrl}/ressources/${guide.slug}" style="background:#E01E1E;color:#ffffff;padding:11px 22px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;font-size:14px;">
        Lire le guide
      </a>
    </div>`;
}

function ctaBlock(appUrl: string, label: string, path: string): string {
  return `
    <a href="${appUrl}${path}" style="background:transparent;color:#E01E1E;padding:11px 22px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;font-size:14px;border:1px solid rgba(224,30,30,0.5);">
      ${label}
    </a>`;
}

export interface ReengagementMessage {
  subject: string;
  pushTitle: string;
  pushBody: string;
  pushUrl: string;
  html: string;
}

/**
 * Le message de l'étape demandée. Chaque étape a un angle différent et donne
 * quelque chose avant de demander : jamais deux fois "reviens sur l'appli".
 * Aucune statistique client ni témoignage n'est inventé ici, seulement ce que
 * l'appli fait réellement.
 */
export function buildMessage(step: number, ctx: ReengagementContext): ReengagementMessage {
  const { firstName, goal, guide, appUrl } = ctx;
  const hi = firstName ? `Salut ${firstName}` : "Salut";
  const goalLine = goal?.trim()
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.75);">Tu avais noté ton objectif : <strong style="color:#ffffff;">${goal.trim()}</strong>. C'est là-dessus que tout ce qui suit est calibré.</p>`
    : "";

  switch (step) {
    case 1:
      return {
        subject: "Ton point de départ est déjà prêt",
        pushTitle: "Ton point de départ t'attend",
        pushBody: "2 minutes pour voir où tu en es vraiment.",
        pushUrl: "/dashboard/client",
        html: wrapBrandedEmail(`
          <h2 style="color:#E01E1E;margin:0 0 14px;font-size:20px;">${hi} 👋</h2>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">Tu as créé ton compte, et je ne t'ai pas encore montré grand-chose. Je répare ça tout de suite, sans rien te demander en retour.</p>
          ${goalLine}
          ${guideBlock(guide, appUrl)}
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">Quand tu veux passer à ton propre suivi : ton espace calcule tes besoins, garde tes séances et suit ta progression. Tout est gratuit.</p>
          ${ctaBlock(appUrl, "Ouvrir mon espace", "/dashboard/client")}
        `),
      };

    case 2:
      return {
        subject: "Ce qui bloque presque tout le monde au début",
        pushTitle: "Le vrai blocage du début",
        pushBody: "Ce n'est pas la motivation. Explication en 5 min.",
        pushUrl: "/dashboard/client/ressources",
        html: wrapBrandedEmail(`
          <h2 style="color:#E01E1E;margin:0 0 14px;font-size:20px;">${hi}</h2>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">La plupart des gens qui décrochent au début ne manquent pas de motivation. Ils manquent d'un point de repère : ils ne savent pas si ce qu'ils font marche, donc ils arrêtent.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">C'est exactement le trou que ton espace remplit : un chiffre de départ, puis une comparaison honnête semaine après semaine.</p>
          ${guideBlock(guide, appUrl)}
          ${ctaBlock(appUrl, "Poser mon point de départ", "/dashboard/client/bilan")}
        `),
      };

    case 3:
      return {
        subject: "Ce que je fais concrètement pour toi",
        pushTitle: "Ce que tu as déjà, gratuitement",
        pushBody: "Programme, nutrition, suivi : tout est déjà là.",
        pushUrl: "/dashboard/client",
        html: wrapBrandedEmail(`
          <h2 style="color:#E01E1E;margin:0 0 14px;font-size:20px;">${hi}</h2>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">Je te dis simplement ce que tu as entre les mains, parce que beaucoup de membres ne le savent pas :</p>
          <ul style="margin:0 0 16px;padding-left:18px;font-size:15px;line-height:1.8;color:rgba(245,237,237,0.75);">
            <li>Un calcul de tes besoins caloriques et protéiques, adapté à ton objectif</li>
            <li>Un suivi de séances qui garde tes charges et te montre si tu progresses</li>
            <li>Une bibliothèque de guides vérifiés sur des vraies études, pas des posts Instagram</li>
            <li>Un bilan hebdo qui te dit où tu en es, sans te juger</li>
          </ul>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">Tout ça est gratuit et déjà actif sur ton compte. Il n'y a rien à acheter pour t'en servir.</p>
          ${guideBlock(guide, appUrl)}
          ${ctaBlock(appUrl, "Voir mon espace", "/dashboard/client")}
        `),
      };

    case 4:
      return {
        subject: "Une question, franchement",
        pushTitle: "Une question rapide",
        pushBody: "Qu'est-ce qui t'a bloqué ? Ça m'aide vraiment.",
        pushUrl: "/dashboard/client/messages",
        html: wrapBrandedEmail(`
          <h2 style="color:#E01E1E;margin:0 0 14px;font-size:20px;">${hi}</h2>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">Tu t'es inscrit et tu n'es pas revenu. Je ne le prends pas mal, mais j'aimerais comprendre, parce que si quelque chose ne va pas dans l'appli je préfère le corriger.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">Réponds juste à cet email en un mot si tu veux : trop compliqué, pas le temps, pas ce que j'attendais, autre chose. Ça prend dix secondes et ça m'aide énormément.</p>
          ${guideBlock(guide, appUrl)}
          ${ctaBlock(appUrl, "M'écrire dans l'appli", "/dashboard/client/messages")}
        `),
      };

    default:
      return {
        subject: "Je te laisse tranquille",
        pushTitle: "Dernier message",
        pushBody: "Ton compte reste ouvert quand tu veux.",
        pushUrl: "/dashboard/client",
        html: wrapBrandedEmail(`
          <h2 style="color:#E01E1E;margin:0 0 14px;font-size:20px;">${hi}</h2>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">C'est mon dernier message de relance, je ne vais pas t'écrire toutes les semaines pour rien. Ton compte reste ouvert et gratuit, tu peux revenir quand ça te va, dans un mois ou dans un an.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(245,237,237,0.8);">Je te laisse avec un dernier truc utile, même si tu ne remets jamais les pieds dans l'appli :</p>
          ${guideBlock(guide, appUrl)}
          <p style="margin:0;font-size:14px;line-height:1.6;color:rgba(245,237,237,0.55);">Bon courage pour la suite, sincèrement.</p>
        `),
      };
  }
}
