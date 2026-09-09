// Idée #2 de la passe "onglet Aujourd'hui" (2026-09-09, retour direct "au
// moins 20 idées") : une astuce qui change chaque jour sur le tableau de
// bord, plutôt qu'un écran figé qui redevient invisible à force d'être
// toujours pareil. Rotation déterministe par jour de l'année (pas aléatoire à
// chaque rendu) : la même astuce reste affichée toute la journée, y compris
// après un rafraîchissement de page.

export const COACH_DAILY_TIPS: string[] = [
  "Un client qui décroche a presque toujours prévenu avant, en silence : un bilan sauté, une séance en moins. Regarde \"Qui a besoin de moi\" avant qu'un vrai signal n'apparaisse.",
  "Une relance envoyée dans les 24h d'un silence a bien plus d'impact que la même relance une semaine plus tard.",
  "Le repos programmé compte autant que la séance elle-même dans le résultat final. Vérifie qu'aucun de tes clients n'enchaîne sans off-day.",
  "Une victoire de client publiée dans la Communauté vaut plus qu'un témoignage écrit par toi. Encourage le partage direct.",
  "Un programme jamais modifié depuis 8 semaines n'est plus un programme, c'est une routine. Vérifie la progression de charge de tes clients actifs.",
  "La régularité bat l'intensité sur la durée. Un client à 70% chaque semaine progresse plus qu'un client à 100% une semaine sur deux.",
  "Réponds à un message court par un message court. La vitesse de réponse compte souvent plus que sa longueur.",
  "Un client qui ne loggue plus sa nutrition avant de décrocher de l'entraînement : la nutrition est souvent le signal avant-coureur.",
  "Chaque semaine, une seule vraie question à te poser : qui, dans ma liste, n'a pas eu de nouvelles de moi depuis trop longtemps ?",
  "Le sommeil est le levier le plus sous-exploité en coaching. Un client mal reposé n'a pas un problème d'entraînement, il a un problème de récupération.",
  "Un compliment précis ('ta technique sur le squat s'est nettement améliorée') marque plus qu'un compliment vague ('bon travail').",
  "La phase de calibrage est la plus fragile : c'est là que se joue la moitié de la rétention à 3 mois.",
  "Filmer un exercice avant de le valider, pas après : la correction arrive avant l'erreur suivante, pas après.",
  "Un client qui pose beaucoup de questions n'est pas un client difficile, c'est un client engagé. Traite chaque question comme un signal positif.",
  "Le meilleur moment pour demander un témoignage : juste après une victoire concrète, jamais à froid.",
  "Une fiche client incomplète est une fiche client à risque : les débuts flous produisent des attentes floues.",
  "Ne laisse jamais un bilan sans réponse plus de 48h. Le silence du coach se lit comme du désintérêt, même quand ce n'est pas vrai.",
  "Diversifie tes formats de live : un client qui n'ose jamais parler en groupe se révèle parfois totalement différent en 1:1.",
  "Une astuce nutrition simple appliquée vaut mieux qu'un plan parfait jamais suivi.",
  "Prends deux minutes pour relire tes propres notes sur un client avant chaque appel. La mémoire du détail crée la confiance.",
];

export function getTipOfTheDay(date: Date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return COACH_DAILY_TIPS[dayOfYear % COACH_DAILY_TIPS.length];
}
