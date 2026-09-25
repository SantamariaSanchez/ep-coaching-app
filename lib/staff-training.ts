// Parcours de formation de chaque métier (demande directe 2026-09-25 :
// "et surtout la phase de formation"). Suit les 4 étapes du parcours
// d'intégration (lib/job-applications.ts ONBOARDING_STEPS) : découverte,
// pratique accompagnée, autonomie encadrée, évaluation à 3 mois.
//
// Trois sources, pour ne rien écrire deux fois :
//   - leçons communes à toute l'équipe (ci-dessous) ;
//   - leçons de méthode propres au métier (ROLE_LESSONS) ;
//   - leçons générées depuis la routine (lib/staff-playbooks.ts) et la fiche
//     de poste (lib/org-roles.ts), toujours à jour avec elles.

import { getPlaybook } from "@/lib/staff-playbooks";
import { getRoleCard } from "@/lib/staff-roles";

export type TrainingPhase = "decouverte" | "pratique" | "autonomie" | "evaluation";

export const PHASES: { key: TrainingPhase; label: string; when: string }[] = [
  { key: "decouverte", label: "Découverte", when: "Semaine 1" },
  { key: "pratique", label: "Pratique accompagnée", when: "Semaines 2 et 3" },
  { key: "autonomie", label: "Autonomie encadrée", when: "Semaine 4" },
  { key: "evaluation", label: "Évaluation", when: "Mois 3" },
];

export interface Lesson {
  key: string;
  phase: TrainingPhase;
  title: string;
  minutes: number;
  points: string[];
  actions: string[];
}

const COMMON: Lesson[] = [
  {
    key: "common:ep-coaching",
    phase: "decouverte",
    title: "EP Coaching en 10 minutes",
    minutes: 10,
    points: [
      "La mission : aider chacun à comprendre son corps et son entraînement pour décider lui-même, au lieu de subir la surinformation et les conseils contradictoires des réseaux.",
      "Le fondateur, Santamaria Sanchéz, s'applique d'abord à lui-même ce qu'il enseigne (préparation pour la Heroes Cup WNBF France). C'est la preuve de légitimité de la marque : l'exécution, jamais un témoignage inventé.",
      "Les offres : coaching individuel physique, coaching business pour les coachs qui lancent ou développent leur activité, l'appli EP Coaching en Standard ou Premium, et des formations à l'unité.",
      "Règle absolue : seuls les prix de l'appli (Standard et Premium) sont affichés publiquement. Les prix des coachings et des formations se donnent uniquement en appel.",
    ],
    actions: ["Lis ta fiche technique en entier.", "Crée-toi un compte membre gratuit sur l'appli pour voir ce que vivent nos clients."],
  },
  {
    key: "common:ton-espace",
    phase: "decouverte",
    title: "Ton espace de travail",
    minutes: 8,
    points: [
      "Ton tableau de bord te dit quoi faire maintenant : le bloc de ta routine en cours, tes prochaines actions triées par urgence, tes rendez-vous du jour.",
      "Tout ce qui arrive d'ailleurs tombe seul dans ton espace : leads, RDV Calendly, paiements, candidatures, selon ton métier. Tu n'as rien à recopier.",
      "Les tâches marquées \"Assignée par Santamaria\" viennent du fondateur : quand tu les passes en Fait, il est prévenu.",
      "L'onglet Équipe te permet d'écrire à n'importe qui dans l'entreprise, fondateur compris, en privé ou sur le canal général.",
    ],
    actions: ["Active les notifications (bouton sur ton tableau de bord).", "Active la double authentification dans Mon compte.", "Présente-toi à Santamaria par message dans l'onglet Équipe."],
  },
  {
    key: "common:confidentialite",
    phase: "decouverte",
    title: "Données, confidentialité et image",
    minutes: 7,
    points: [
      "Nos clients nous confient des données de santé. Tu n'accèdes qu'à ce dont ton poste a besoin, et rien ne sort des outils EP Coaching.",
      "Jamais de capture d'écran de données client, jamais de donnée client collée dans un outil d'intelligence artificielle sans accord écrit.",
      "Un incident (mauvais destinataire, perte, fuite) se signale dans les 24 heures, sans attendre de savoir si c'est grave.",
      "Aucune prise de parole publique au nom d'EP Coaching sans validation.",
    ],
    actions: ["Relis les articles 6 et 7 de ton contrat (Documents)."],
  },
  {
    key: "common:voix",
    phase: "decouverte",
    title: "La voix EP Coaching",
    minutes: 6,
    points: [
      "Direct, concret, en tutoiement. On explique le pourquoi, on ne récite pas.",
      "Jamais de promesse de résultat, jamais de fausse urgence, jamais de superlatif vide.",
      "Aucun tiret long dans un texte de la marque : on fait des phrases courtes, des virgules, des deux-points.",
      "On ne cite jamais un résultat client qu'on ne peut pas prouver.",
    ],
    actions: ["Ouvre l'onglet Modèles et lis ceux de ton métier : ils sont écrits dans cette voix."],
  },
];

const ROLE_LESSONS: Record<string, Lesson[]> = {
  closer: [
    {
      key: "closer:appel",
      phase: "pratique",
      title: "Le déroulé d'un appel de closing",
      minutes: 15,
      points: [
        "Ouverture : cadre le temps et l'objectif de l'appel, fais parler la personne en premier.",
        "Découverte : situation actuelle, objectif réel, ce qu'elle a déjà essayé, ce que ça lui coûte de ne rien changer. C'est 70 % de l'appel.",
        "Reformulation : résume ce que tu as compris et fais valider avant de parler de l'offre.",
        "Proposition : présente seulement ce qui répond à SON problème, puis annonce le prix une fois, clairement, et laisse le silence faire.",
        "Engagement : si c'est oui, envoie le lien de paiement pendant l'appel (onglet Offres et paiement). La vente se close seule dans ton CRM quand il paie avec le même email.",
      ],
      actions: ["Lis les sections Ouverture et Découverte des Scripts d'appel.", "Fais 2 appels en doublure écoutés par Santamaria ou le Head of Sales."],
    },
    {
      key: "closer:objections",
      phase: "pratique",
      title: "Traiter une objection sans forcer",
      minutes: 12,
      points: [
        "Toujours clarifier avant de répondre : \"Qu'est-ce qui te fait dire ça ?\"",
        "Prix : compare au coût de l'inaction qu'il t'a lui-même décrit, jamais une réduction improvisée.",
        "\"Je dois réfléchir\" : \"À quoi exactement ? Qu'est-ce qui te manque pour décider ?\"",
        "Quelqu'un d'autre décide : propose un deuxième appel avec cette personne plutôt qu'un \"je te rappelle\".",
        "Qualifier avant de persuader : si ce n'est pas pour lui, dis-le. Une vente forcée finit en remboursement et en mauvaise réputation.",
      ],
      actions: ["Note dans ton Espace de travail les 3 objections que tu crains le plus et ta réponse à chacune."],
    },
  ],
  setter: [
    {
      key: "setter:qualification",
      phase: "pratique",
      title: "Qualifier un lead en 3 questions",
      minutes: 12,
      points: [
        "Premier message en moins de 2h en journée, qui relance une vraie conversation. Jamais un lien en premier message.",
        "Les 3 questions : son objectif concret, son expérience de coaching passée, sa disponibilité réelle.",
        "Disqualifiant : pas de budget du tout, aucune disponibilité, ou un besoin médical (renvoie vers un professionnel de santé).",
        "Qualifié : propose 2 ou 3 créneaux précis, jamais \"quand es-tu dispo ?\".",
      ],
      actions: ["Lis les modèles Premier message et Relance (onglet Modèles)."],
    },
    {
      key: "setter:crm",
      phase: "pratique",
      title: "Ton CRM et le passage de relais au closer",
      minutes: 10,
      points: [
        "Chaque lead a une étape et une prochaine relance datée. Un lead sans relance est un lead perdu.",
        "Les réponses aux 3 questions vont dans les notes : le closer les lit avant son appel.",
        "Quand le lead réserve sur Calendly, le RDV arrive seul dans l'agenda d'un closer et ton lead passe en RDV booké.",
        "Si le closer marque un no-show, tu es prévenu : relance pour replanifier dans la journée.",
      ],
      actions: ["Fixe ton objectif de RDV bookés du mois sur ton tableau de bord."],
    },
  ],
  "head-of-sales": [
    {
      key: "hos:pilotage",
      phase: "pratique",
      title: "Piloter l'équipe sales à la donnée",
      minutes: 12,
      points: [
        "Chaque matin, Mon équipe : rapports reçus, ventes, taux de close, RDV bookés.",
        "Trouve le vrai goulot : pas assez de leads, trop de no-show, ou un taux de close trop bas. On ne corrige qu'un seul goulot à la fois.",
        "Un coaching individuel = 2 points d'action écrits, vérifiés la semaine suivante.",
      ],
      actions: ["Réécoute un appel gagné et un appel perdu, note ce qui les sépare."],
    },
    {
      key: "hos:recrutement",
      phase: "autonomie",
      title: "Recruter des setters et closers",
      minutes: 10,
      points: [
        "La scorecard d'abord : mission, résultats attendus, non-négociables (onglet Scorecards).",
        "Un entretien = une mise en situation réelle, pas un entretien de personnalité.",
        "Rémunération au pourcentage, jamais en fixe pour le setting.",
      ],
      actions: ["Relis la scorecard du closer et du setter."],
    },
  ],
  "createur-contenu-videaste": [
    {
      key: "video:formats",
      phase: "pratique",
      title: "Les formats qui marchent chez EP Coaching",
      minutes: 12,
      points: [
        "Reel et Short : vertical 9:16, accroche dans les 2 premières secondes, sous-titres toujours, moins de 60 secondes.",
        "Une vidéo = une seule idée. Si tu dois dire \"et aussi\", c'est une deuxième vidéo.",
        "L'identité : tons rouge profond, grain, lumière travaillée. Jamais un rendu générique de banque d'images.",
      ],
      actions: ["Regarde les 10 dernières vidéos publiées et note les 3 qui ont le mieux marché, avec pourquoi."],
    },
    {
      key: "video:workflow",
      phase: "pratique",
      title: "Du tournage à la livraison",
      minutes: 8,
      points: [
        "Chaque vidéo existe dans Livrables avant d'être tournée, avec sa deadline.",
        "Envoyée pour validation : En relecture. Validée et exportée : Livré, avec le lien du fichier.",
        "Le calendrier éditorial montre toute ta semaine d'un coup d'oeil.",
      ],
      actions: ["Crée tes livrables de la semaine."],
    },
  ],
  "community-manager": [
    {
      key: "cm:reponses",
      phase: "pratique",
      title: "Répondre, modérer, repérer",
      minutes: 12,
      points: [
        "Réponse publique en moins de 4h en journée, dans la voix de la marque.",
        "Une question chaude (prix, disponibilité, \"comment ça marche ?\") est une intention d'achat : tâche immédiate pour la faire suivre.",
        "Un commentaire hostile : on répond une fois, calmement, avec des faits, puis on laisse. Une crise se remonte tout de suite.",
      ],
      actions: ["Lis les modèles de réponses types (onglet Modèles)."],
    },
    {
      key: "cm:calendrier",
      phase: "pratique",
      title: "Tenir le calendrier",
      minutes: 8,
      points: [
        "La semaine suivante est prête le vendredi, visible dans le Calendrier éditorial.",
        "Chaque post publié passe en Publié avec son lien, pour que les statistiques soient justes.",
      ],
      actions: ["Planifie la semaine prochaine dans Livrables."],
    },
  ],
  copywriter: [
    {
      key: "copy:structure",
      phase: "pratique",
      title: "La structure d'un texte qui fait agir",
      minutes: 12,
      points: [
        "Accroche : un problème précis que le lecteur reconnaît, pas une généralité.",
        "Corps : pourquoi le problème existe, ce qui marche vraiment, une preuve vérifiable.",
        "Fin : une seule action demandée, claire.",
        "Premier jet dans la voix de la marque : aucun tiret long, phrases courtes, tutoiement.",
      ],
      actions: ["Réécris une ancienne légende avec cette structure, dans ton Espace de travail."],
    },
    {
      key: "copy:tests",
      phase: "autonomie",
      title: "Tester ses accroches",
      minutes: 6,
      points: ["3 variantes d'accroche pour un même contenu, une seule variable change à la fois.", "Note le résultat dans le livrable, c'est ta mémoire de ce qui marche."],
      actions: ["Propose 3 accroches pour le prochain email."],
    },
  ],
  "personal-brand-manager": [
    {
      key: "pbm:positionnement",
      phase: "pratique",
      title: "Le positionnement du fondateur",
      minutes: 10,
      points: [
        "Santamaria enseigne ce qu'il applique à lui-même : c'est ce qui le différencie, pas un diplôme ni un chiffre d'abonnés.",
        "Les sujets : comprendre plutôt qu'obéir, la science derrière les méthodes, la préparation en naturel.",
        "Toute prise de parole est validée avant d'être confirmée.",
      ],
      actions: ["Liste 10 podcasts ou comptes où ce positionnement aurait sa place (Opportunités)."],
    },
    {
      key: "pbm:reputation",
      phase: "autonomie",
      title: "Veille et réputation",
      minutes: 6,
      points: ["Veille quotidienne des mentions.", "Un enjeu de réputation se traite sous 24h, avec le fondateur, jamais seul."],
      actions: ["Mets en place ta routine de veille du matin."],
    },
  ],
  "growth-traffic-manager": [
    {
      key: "growth:metriques",
      phase: "pratique",
      title: "Les chiffres qui comptent",
      minutes: 10,
      points: [
        "Coût par lead = dépense divisée par les leads. ROAS = chiffre d'affaires généré divisé par la dépense.",
        "Une campagne se juge sur des chiffres à jour : mets à jour dépense, leads, ventes et CA chaque jour.",
        "Le calculateur te dit le budget nécessaire pour un objectif de ventes.",
      ],
      actions: ["Fais le calcul du budget nécessaire pour 5 ventes ce mois dans le Calculateur."],
    },
    {
      key: "growth:tests",
      phase: "autonomie",
      title: "Tester et couper",
      minutes: 8,
      points: ["Un test = une seule variable (audience, visuel ou accroche).", "On coupe une campagne qui ne performe pas au lieu d'attendre qu'elle se rattrape."],
      actions: ["Écris l'hypothèse de ton prochain test dans les notes de la campagne."],
    },
  ],
  "head-of-marketing": [
    {
      key: "hom:strategie",
      phase: "pratique",
      title: "Acquisition et conversion",
      minutes: 12,
      points: [
        "Contenu d'acquisition : faire découvrir la marque. Contenu de conversion : faire passer à l'action. Les deux ne se jugent pas sur les mêmes chiffres.",
        "Chaque semaine, un seul canal à corriger en priorité.",
        "Le calendrier éditorial de toute l'équipe est validé le lundi.",
      ],
      actions: ["Lis les rapports de l'équipe marketing de la semaine."],
    },
  ],
  "developpeur-saas": [
    {
      key: "dev:stack",
      phase: "decouverte",
      title: "La stack et ses règles",
      minutes: 15,
      points: [
        "Next.js déployé sur Vercel à chaque push sur master, Supabase (Postgres, authentification, stockage), Stripe pour les paiements, Brevo pour les emails.",
        "Les données de santé sont protégées par la sécurité au niveau des lignes (RLS). La clé service role ne s'utilise que côté serveur, jamais dans le navigateur.",
        "Une migration SQL s'exécute à la main dans Supabase : toujours ré-exécutable sans erreur.",
      ],
      actions: ["Demande tes accès au dépôt et à Supabase à Santamaria."],
    },
    {
      key: "dev:workflow",
      phase: "pratique",
      title: "Du ticket à la production",
      minutes: 8,
      points: ["Bug = ticket avec sa priorité. Évolution = entrée au backlog.", "Rien de ce qui touche des données de santé ne part sans test réel.", "Ce qui est livré est documenté."],
      actions: ["Prends ton premier ticket et suis-le jusqu'à Résolu."],
    },
  ],
  "product-manager": [
    {
      key: "pm:priorisation",
      phase: "pratique",
      title: "Prioriser avec des données",
      minutes: 10,
      points: [
        "Impact fort et effort faible d'abord. La dernière demande reçue n'est pas une priorité.",
        "Une spec contient : le problème, pour qui, le comportement attendu, les cas limites, comment on saura que c'est réussi.",
      ],
      actions: ["Classe le backlog actuel par impact et effort."],
    },
  ],
  "support-client-tech": [
    {
      key: "support:tickets",
      phase: "pratique",
      title: "Traiter un ticket",
      minutes: 10,
      points: [
        "Chaque demande devient un ticket, même résolue en 30 secondes : c'est ce qui révèle les problèmes récurrents.",
        "Critique = quelqu'un ne peut plus utiliser l'appli. Ça passe avant tout.",
        "La résolution est écrite dans le ticket : elle nourrit la base de réponses.",
        "Tu ne sais pas ? Tu le dis et tu remontes, tu n'inventes jamais une réponse.",
      ],
      actions: ["Lis les modèles de réponses du support."],
    },
  ],
  "office-ops-manager": [
    {
      key: "ops:process",
      phase: "pratique",
      title: "Écrire un process",
      minutes: 10,
      points: ["Un process : quand il s'applique, qui fait quoi, dans quel ordre, et à quoi on voit qu'il est bien fait.", "Un process qui n'est pas écrit n'existe pas."],
      actions: ["Documente le process d'intégration d'une recrue."],
    },
  ],
  "secretaire-assistant": [
    {
      key: "sec:organisation",
      phase: "pratique",
      title: "Emails, agenda, classement",
      minutes: 10,
      points: [
        "Aucun email administratif sans réponse plus de 48h.",
        "Chaque rendez-vous organisé est dans l'agenda, avec la personne et le lien.",
        "Un document arrivé aujourd'hui est classé aujourd'hui, dans Documents.",
      ],
      actions: ["Lis les modèles d'emails administratifs."],
    },
  ],
  "finance-comptabilite": [
    {
      key: "finance:tresorerie",
      phase: "pratique",
      title: "La trésorerie EP Coaching",
      minutes: 12,
      points: [
        "Chaque paiement Stripe (premier paiement et renouvellements) arrive seul dans ta trésorerie : ton rôle est de vérifier.",
        "Chaque dépense est saisie avec sa catégorie et son fournisseur.",
        "Un paiement pas reçu à sa date passe en retard, puis en relance.",
        "Les commissions des sales se calculent sur le cash réellement encaissé, net des remboursements.",
      ],
      actions: ["Exporte la trésorerie du mois en CSV et vérifie-la avec le tableau de bord Stripe."],
    },
  ],
  "rh-people-ops": [
    {
      key: "rh:scorecard",
      phase: "pratique",
      title: "Recruter sur scorecard",
      minutes: 12,
      points: [
        "Avant le premier candidat : mission, résultats attendus, critères non négociables (onglet Scorecards).",
        "Chaque candidature se lit en entier, CV compris, et reçoit une réponse sous 48h.",
        "Un entretien structuré : les mêmes questions pour tous, notées sur les mêmes critères.",
      ],
      actions: ["Lis les candidatures en attente et réponds à chacune."],
    },
  ],
  "head-coach": [
    {
      key: "hc:audit",
      phase: "pratique",
      title: "Auditer la qualité du coaching",
      minutes: 12,
      points: [
        "Un audit = un échantillon réel (bilans, programme, nutrition, messagerie), une note sur 10, 2 points forts, 2 points à corriger.",
        "Chaque décision de programme doit se justifier par une vraie raison, pas une habitude.",
        "Un point à corriger devient une formation, pas un reproche.",
      ],
      actions: ["Planifie tes audits de la semaine."],
    },
  ],
  "coach-onboarding-success": [
    {
      key: "onb:protocole",
      phase: "pratique",
      title: "Les 30 premiers jours d'un client",
      minutes: 12,
      points: [
        "J0 : bienvenue sous 24h, prise en main de l'appli, premier bilan planifié.",
        "J7 : premier bilan fait ? première semaine lancée ? une friction à lever ?",
        "J30 : toujours actif ou parti. C'est ce qui déclenche ta prime de rétention.",
        "Chaque friction produit se remonte le jour même.",
      ],
      actions: ["Lis les modèles Bienvenue et Suivi J+7."],
    },
  ],
};

function routineLesson(roleKey: string): Lesson | null {
  const pb = getPlaybook(roleKey);
  if (!pb) return null;
  return {
    key: `${roleKey}:routine`,
    phase: "decouverte",
    title: "Ta journée type et quoi noter",
    minutes: 8,
    points: [
      ...pb.routine.map((b) => `${b.start} à ${b.end}, ${b.title} : ${b.detail}`),
      ...pb.logRules.map((r) => `${r.when} : ${r.what}`),
    ],
    actions: ["Suis cette routine une journée complète et note ce qui coince dans ton rapport."],
  };
}

function evaluationLesson(roleKey: string): Lesson | null {
  const card = getRoleCard(roleKey);
  const pb = getPlaybook(roleKey);
  if (!card) return null;
  return {
    key: `${roleKey}:evaluation`,
    phase: "evaluation",
    title: "Ton bilan à 3 mois",
    minutes: 6,
    points: [
      "Le bilan porte sur des critères écrits à l'avance, les voici :",
      ...card.role.nonNegotiable,
      ...(pb ? pb.targets.map((t) => `Tes résultats sur : ${t.label.toLowerCase()}`) : []),
      "La régularité de tes rapports du jour et la tenue de ton espace.",
    ],
    actions: ["Prépare 3 choses qui ont marché et 3 choses à améliorer.", "Propose une date de bilan à Santamaria par message."],
  };
}

function autonomyLesson(roleKey: string): Lesson | null {
  const pb = getPlaybook(roleKey);
  if (!pb) return null;
  return {
    key: `${roleKey}:autonomie`,
    phase: "autonomie",
    title: "Tes objectifs et tes rituels",
    minutes: 5,
    points: [
      ...pb.targets.map((t) => `Objectif du mois à fixer : ${t.label}.`),
      ...pb.rituals.map((r) => `Chaque ${["", "lundi", "mardi", "mercredi", "jeudi", "vendredi"][r.day]} : ${r.title}. ${r.detail}`),
    ],
    actions: ["Fixe tes objectifs du mois sur ton tableau de bord."],
  };
}

export function trainingFor(roleKey: string): Lesson[] {
  const order: TrainingPhase[] = ["decouverte", "pratique", "autonomie", "evaluation"];
  const lessons = [
    ...COMMON,
    routineLesson(roleKey),
    ...(ROLE_LESSONS[roleKey] ?? []),
    autonomyLesson(roleKey),
    evaluationLesson(roleKey),
  ].filter((l): l is Lesson => !!l);
  return lessons.sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase));
}
