// Réponse en DM à quelqu'un qui a commenté « NNN » sous un reel (25/11).
// Constat : 66 scripts à tourner finissent par « commente NNN », aucun lien
// /g/NNN n'a jamais été ouvert, et aucune réponse n'était préparée. Le Studio
// donne donc, pour chaque script, le message prêt à coller.
//
// Règles (Mastermind ThePrepDad, « Conversations Instagram avec des
// prospects », page 04 — Application) : on répond à une demande volontaire,
// brièvement, en reprenant son contexte, avec UNE seule question. Aucune
// relance automatique, aucune pression, aucune prospection. Fichier pur.

/** Lien court d'un guide, à mettre dans le DM : ep-coaching.vercel.app/g/797. */
export function shortGuideLink(base: string, code: string): string {
  return `${base.replace(/\/$/, "")}/g/${encodeURIComponent(code)}`;
}

/** Une question par sujet du guide, pour ouvrir la conversation sans vendre. */
export function openingQuestion(title: string): string {
  const t = title.toLowerCase();
  if (/gras|sèche|seche|perdre|poids|déficit|deficit|calorie/.test(t)) return "Et toi, t'en es où en ce moment, t'essaies de perdre du gras depuis longtemps ?";
  if (/manger|alimentation|repas|protéine|proteine|nutrition|diète|diete|faim/.test(t)) return "Et toi, ce qui coince le plus en ce moment, c'est quoi dans ton alimentation ?";
  if (/salle|machine|exercice|séance|seance|programme|muscu|fessier|jambe|dos|bras|épaule|epaule/.test(t)) return "Et toi, ça fait combien de temps que tu vas à la salle ?";
  if (/règle|regle|cycle|menstru/.test(t)) return "Et toi, c'est quelle période de ton cycle qui te pose le plus de souci à la salle ?";
  if (/motivation|régularité|regularite|reprendre|abandon|temps/.test(t)) return "Et toi, qu'est-ce qui t'a fait arrêter les dernières fois ?";
  return "Et toi, c'est quoi ton objectif en ce moment ?";
}

/** Le message complet : le guide promis, le lien, une seule question. */
export function guideDmReply(title: string, link: string): string {
  return [`Hey ! Comme promis, voilà le guide « ${title} » :`, link, "", openingQuestion(title)].join("\n");
}
