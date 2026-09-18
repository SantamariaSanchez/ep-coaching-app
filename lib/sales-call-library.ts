// Bibliothèque de questions pour l'appel de vente (app/dashboard/coach/
// admin/ventes) — retour direct 2026-09-18 : "met du contenu et plein de
// question à poser selon les situations, des vrai contenu dédié au
// closing, donc vraiment tout, et différent script, question par
// question hein, pas mot pour mot". Contenu statique (curé une fois),
// même convention que lib/content-library.ts : pas de table Supabase,
// juste un import.
//
// Volontairement PAS un script mot pour mot : un appel de vente ne se
// déroule jamais dans le même ordre deux fois, une banque de questions
// organisée par situation sert mieux qu'un texte à lire. Chaque question
// porte une note sur QUAND/POURQUOI l'utiliser, pour qu'elle reste
// utilisable même sans connaître la théorie derrière.

export interface SalesQuestion {
  text: string;
  note: string;
}

export interface SalesCategory {
  id: string;
  label: string;
  intro: string;
  questions: SalesQuestion[];
}

export const SALES_CALL_LIBRARY: SalesCategory[] = [
  {
    id: "ouverture",
    label: "Ouverture",
    intro:
      "Les 2-3 premières minutes servent à cadrer l'appel et mettre la personne à l'aise, pas encore à vendre.",
    questions: [
      {
        text: "Avant de commencer, dis-moi en une phrase ce qui t'a poussé à prendre ce call aujourd'hui.",
        note: "Ouverture neutre, fait parler la personne en premier plutôt que de commencer par se présenter soi-même.",
      },
      {
        text: "T'as bien 20-30 minutes tranquille, ou je dois faire plus court ?",
        note: "Cadre le temps disponible, évite d'être coupé en plein milieu d'une question importante.",
      },
      {
        text: "Je vais te poser pas mal de questions pour bien comprendre ta situation avant de te dire si et comment je peux t'aider, ça te va ?",
        note: "Annonce la structure de l'appel : évite que la personne s'attende à une présentation d'offre immédiate et se braque quand les questions arrivent.",
      },
    ],
  },
  {
    id: "decouverte",
    label: "Découverte de la situation",
    intro:
      "Comprendre où la personne en est vraiment avant de parler de quoi que ce soit d'autre. Le but est de la faire parler 80% du temps sur cette partie.",
    questions: [
      {
        text: "Où t'en es aujourd'hui concrètement, sur ton physique / ton activité de coach ?",
        note: "Question ouverte de départ, jamais fermée : laisse la personne raconter avec ses propres mots plutôt que de répondre à une liste.",
      },
      {
        text: "Qu'est-ce que t'as déjà essayé pour y arriver ?",
        note: "Révèle l'historique (programmes, coachs, méthodes déjà tentés) sans jamais juger ce qui a été fait.",
      },
      {
        text: "Pourquoi ça n'a pas marché, à ton avis ?",
        note: "La réponse dit souvent plus sur le vrai blocage (manque de suivi, mauvaise nutrition, pas assez de temps) que n'importe quelle question directe sur le blocage.",
      },
      {
        text: "Depuis combien de temps t'es sur ce problème précis ?",
        note: "Une durée longue renforce naturellement l'urgence sans avoir à la créer artificiellement, la personne s'en rend compte elle-même en répondant.",
      },
      {
        text: "Si tu devais résumer le plus gros obstacle en une phrase, ce serait quoi ?",
        note: "Force une priorisation. Utile quand la personne énumère plusieurs problèmes en vrac.",
      },
    ],
  },
  {
    id: "objectif",
    label: "Objectif et vision du résultat",
    intro: "Faire visualiser le résultat concret, pas juste noter un chiffre ou une deadline.",
    questions: [
      {
        text: "Si dans 6 mois c'est réglé, à quoi ça ressemble concrètement pour toi ?",
        note: "Fait décrire un résultat vécu, pas juste un objectif chiffré (\"perdre 10kg\" devient une vraie scène : les vêtements qui vont, les photos qu'on n'évite plus).",
      },
      {
        text: "Qu'est-ce qui changerait dans ta vie si t'atteignais ça, à côté du physique/du business lui-même ?",
        note: "Fait remonter les vrais enjeux (confiance, énergie avec les enfants, liberté de temps pour un coach) qui pèsent souvent plus que l'objectif affiché au départ.",
      },
      {
        text: "Sur une échelle de 1 à 10, à quel point c'est important pour toi de régler ça maintenant ?",
        note: "Un chiffre bas (5-6) révèle une priorité encore floue à creuser avant de parler d'offre ; un chiffre haut (8-10) justifié confirme que le moment est bon.",
      },
    ],
  },
  {
    id: "urgence",
    label: "Creuser la douleur et l'urgence",
    intro:
      "Pourquoi maintenant, et pas il y a 6 mois ou dans 6 mois. Sans ça, même une bonne offre se fait remettre à plus tard.",
    questions: [
      {
        text: "Qu'est-ce qui fait que tu cherches une solution maintenant, et pas avant ou plus tard ?",
        note: "Révèle le déclencheur réel (une photo, une remarque, une échéance) qui compte souvent plus que l'objectif lui-même dans la décision.",
      },
      {
        text: "Si tu ne changes rien à partir d'aujourd'hui, à quoi ressemble ta situation dans un an ?",
        note: "Fait visualiser le coût de l'inaction sans jamais l'affirmer soi-même à la place de la personne, elle doit arriver à cette conclusion seule.",
      },
      {
        text: "C'est quoi le vrai coût de rester où t'es maintenant, pas que sur le physique/le business mais aussi sur le reste ?",
        note: "Ouvre sur l'impact émotionnel/relationnel, souvent plus fort que l'impact fonctionnel et jamais mentionné spontanément.",
      },
    ],
  },
  {
    id: "qualification",
    label: "Qualification (décision, budget, timing)",
    intro:
      "À poser avant de présenter l'offre, jamais après : connaître ces réponses évite de closer dans le vide.",
    questions: [
      {
        text: "Est-ce que t'es la seule personne à décider, ou il y a quelqu'un d'autre à consulter avant ?",
        note: "Anticipe l'objection \"je dois en parler à mon/ma conjoint(e)\" en la faisant remonter avant la présentation du prix, pas après.",
      },
      {
        text: "T'as déjà mis un budget de côté pour ça, ou c'est encore flou à ce stade ?",
        note: "Jauge le sérieux de la démarche sans jamais donner de chiffre en premier soi-même.",
      },
      {
        text: "Si on trouve la bonne solution aujourd'hui, tu serais en mesure de démarrer quand ?",
        note: "Une réponse évasive (\"dans quelques mois\", \"faut voir\") signale un manque d'urgence réelle à creuser avant de parler prix.",
      },
    ],
  },
  {
    id: "transition-offre",
    label: "Transition vers l'offre",
    intro: "Le pont entre la découverte et la présentation, avant de parler du prix.",
    questions: [
      {
        text: "Vu tout ce que tu m'as dit, voilà ce que je te propose, et pourquoi je pense que c'est ce dont tu as besoin.",
        note: "Chaque point de l'offre doit être relié explicitement à une phrase dite par la personne plus tôt dans l'appel, jamais une présentation générique récitée pareil à chaque appel.",
      },
      {
        text: "Est-ce que ça correspond à ce que tu cherches, avant que je te parle des modalités ?",
        note: "Fait valider l'adéquation AVANT le prix : si la réponse est mitigée, mieux vaut ajuster la présentation que d'enchaîner sur un prix qui va se heurter à un doute non résolu.",
      },
    ],
  },
  {
    id: "objections",
    label: "Objections courantes",
    intro:
      "Répondre à une objection par une question plutôt que par un argument direct : ça fait creuser la vraie raison derrière l'objection affichée, qui n'est presque jamais la vraie raison.",
    questions: [
      {
        text: "\"C'est trop cher\" → Trop cher par rapport à quoi ? Est-ce que c'est vraiment le prix, ou tu n'es pas encore sûr à 100% que ça va marcher pour toi ?",
        note: "Le prix seul est rarement la vraie objection : cette question sépare un problème de budget réel d'un doute sur le résultat, qui se traite très différemment.",
      },
      {
        text: "\"Je dois réfléchir\" → Bien sûr. Réfléchir à quoi précisément, pour que je puisse t'aider à y voir plus clair maintenant plutôt que d'attendre ?",
        note: "\"Je dois réfléchir\" est souvent une objection polie qui cache une vraie question non posée. La faire nommer permet d'y répondre tout de suite.",
      },
      {
        text: "\"Je dois en parler à mon/ma conjoint(e)/associé(e)\" → Complètement logique. Qu'est-ce que cette personne dirait si elle savait exactement ce que ça te coûte de rester où t'es aujourd'hui ?",
        note: "Ne jamais contester le besoin de consulter quelqu'un (ça braque), mais faire réfléchir sur ce qui sera réellement rapporté à cette personne.",
      },
      {
        text: "\"J'ai déjà essayé un coach/un programme avant et ça n'a pas marché\" → Qu'est-ce qui n'a pas marché exactement, concrètement ?",
        note: "Sert à isoler LE vrai point de friction passé (suivi absent, programme générique, pas assez de nutrition...) pour montrer précisément en quoi ça sera différent, sans jamais dénigrer le coach précédent.",
      },
      {
        text: "\"Je n'ai pas le temps pour ça en ce moment\" → Le temps que ça prendrait, comparé au temps que tu perds déjà à tourner en rond sans résultat, lequel est le plus long au final ?",
        note: "Retourne l'objection temps en coût de l'inaction plutôt que de minimiser le temps réellement nécessaire, ce qui serait malhonnête.",
      },
      {
        text: "\"Je vais essayer seul encore un peu avant\" → Qu'est-ce qui serait différent cette fois par rapport aux fois précédentes où t'as essayé seul ?",
        note: "Fait remonter elle-même l'absence de méthode/suivi qui a déjà échoué, sans avoir à l'affirmer à sa place.",
      },
    ],
  },
  {
    id: "closing",
    label: "Closing",
    intro: "Une fois l'offre présentée et les objections principales traitées.",
    questions: [
      {
        text: "Est-ce que ça répond à ce que tu cherchais, ou il reste des questions ?",
        note: "Toujours poser cette question avant de proposer le paiement : closer sur un doute non exprimé mène presque toujours à un rétractation ou un client difficile ensuite.",
      },
      {
        text: "Qu'est-ce qui pourrait t'empêcher de démarrer aujourd'hui ?",
        note: "Fait sortir la dernière objection cachée plutôt que de la découvrir après coup si elle n'est jamais posée.",
      },
      {
        text: "On démarre ensemble maintenant, ou tu préfères qu'on fixe un point précis à débloquer avant ?",
        note: "Propose une porte de sortie honnête (jamais insister sans fin) tout en gardant l'initiative sur la suite plutôt que de laisser un \"je te recontacte\" flou.",
      },
    ],
  },
  {
    id: "relance",
    label: "Relance après l'appel",
    intro:
      "Quand la personne ne dit ni oui ni non en direct. Toujours une question ouverte, jamais juste \"tu as réfléchi ?\".",
    questions: [
      {
        text: "Message J+1 : Salut [prénom], je repense à ce qu'on s'est dit hier sur [élément précis de sa situation]. Qu'est-ce qui te ferait le plus hésiter encore à te lancer ?",
        note: "Reprend un détail spécifique de l'appel (jamais générique) pour montrer que l'échange a vraiment compté, pas juste un rappel automatique.",
      },
      {
        text: "Message J+3-4 (sans réponse au premier) : Je voulais juste savoir où t'en es dans ta réflexion, même si la réponse c'est \"pas maintenant\", ça m'aide à savoir si je te recontacte plus tard ou pas.",
        note: "Laisse une porte de sortie honnête plutôt que d'insister, ce qui paradoxalement obtient plus souvent une vraie réponse (oui ou non) qu'une relance insistante.",
      },
    ],
  },
];
