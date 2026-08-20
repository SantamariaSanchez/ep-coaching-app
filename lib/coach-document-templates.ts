// Modèles/contrats types pour l'activité individuelle du coach (Axe 2,
// VISION.md — cadré le 2026-08-20, demande directe). Contenu STATIQUE,
// même logique que lib/medical-constraints.ts (pas de table, pas de saisie
// par coach) : une base à copier/adapter, jamais un document juridique
// prêt à l'emploi.
//
// Garde-fou non négociable, cohérent avec Axe AQ (contraintes médicales) :
// ce sont des BASES DE TRAVAIL rédigées pour couvrir les clauses
// essentielles d'une activité de coaching sportif/nutrition en France,
// PAS un contrat validé par un avocat pour la situation précise de chaque
// coach (statut juridique, assurance RC pro, régime fiscal...). Chaque
// modèle porte son propre rappel, pas seulement un bandeau générique.

export interface DocumentTemplate {
  slug: string;
  title: string;
  shortLabel: string;
  summary: string;
  disclaimer: string;
  content: string;
}

const CONTRACT_DISCLAIMER =
  "Base de travail à adapter à ta situation (statut juridique, assurance RC pro) et à faire relire par un professionnel (avocat, expert-comptable) avant tout usage réel avec un client payant. Ce n'est pas un contrat validé juridiquement.";

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    slug: "contrat-coaching",
    title: "Contrat de coaching individuel",
    shortLabel: "Contrat",
    summary: "Les clauses essentielles d'une prestation de coaching sportif/nutrition : objet, durée, tarifs, obligations de chaque partie, responsabilité.",
    disclaimer: CONTRACT_DISCLAIMER,
    content: `CONTRAT DE PRESTATION DE COACHING SPORTIF ET/OU NUTRITIONNEL

Entre les soussignés :

[Nom du coach], [statut juridique — auto-entrepreneur / société], [numéro SIRET], domicilié(e) à [adresse], ci-après désigné "le Coach",

Et :

[Nom du client], domicilié(e) à [adresse], ci-après désigné "le Client",

Il a été convenu ce qui suit :

ARTICLE 1 — OBJET
Le présent contrat a pour objet la fourniture par le Coach d'un accompagnement en [entraînement / nutrition / les deux], comprenant [détail des prestations : programme d'entraînement, suivi nutritionnel, séances de coaching, disponibilité messagerie, etc.].

ARTICLE 2 — DURÉE ET RÉSILIATION
Le présent contrat est conclu pour une durée de [durée] à compter du [date], reconductible tacitement par périodes de [durée] sauf résiliation par l'une des parties avec un préavis de [délai, ex : 15 jours] avant la date d'échéance.

ARTICLE 3 — TARIFS ET MODALITÉS DE PAIEMENT
La prestation est facturée [montant] € par [mois / séance / cycle], payable [avant le 5 de chaque mois / à la réservation / etc.] par [moyen de paiement]. Tout retard de paiement de plus de [délai] entraîne [conséquence, ex : suspension de l'accompagnement].

ARTICLE 4 — OBLIGATIONS DU COACH
Le Coach s'engage à mettre en œuvre les moyens nécessaires à l'atteinte des objectifs du Client (obligation de moyens, non de résultat), à adapter le programme à l'évolution du Client, et à respecter la confidentialité des informations personnelles et de santé communiquées.

ARTICLE 5 — OBLIGATIONS DU CLIENT
Le Client s'engage à communiquer au Coach toute information de santé pertinente (antécédents médicaux, blessures, traitements en cours) avant le début de l'accompagnement et à toute évolution, à suivre les recommandations du Coach, et à consulter un médecin avant reprise ou poursuite d'une activité physique en cas de doute sur son état de santé.

ARTICLE 6 — RESPONSABILITÉ
Le Coach ne saurait être tenu responsable d'un accident, blessure ou incident de santé résultant d'une information de santé incomplète ou erronée communiquée par le Client, ou d'un non-respect par le Client des consignes données. Le Coach dispose d'une assurance responsabilité civile professionnelle n° [numéro].

ARTICLE 7 — DONNÉES PERSONNELLES
Les données de santé et personnelles communiquées par le Client sont utilisées exclusivement dans le cadre de l'accompagnement et ne sont transmises à aucun tiers sans son accord explicite, conformément au RGPD.

ARTICLE 8 — LITIGES
Tout litige relatif à l'exécution du présent contrat relève, à défaut de résolution amiable, des tribunaux compétents du ressort de [ville].

Fait à [ville], le [date], en deux exemplaires.

Signature du Coach                              Signature du Client`,
  },
  {
    slug: "questionnaire-onboarding-client",
    title: "Questionnaire d'onboarding client",
    shortLabel: "Questionnaire",
    summary: "Les questions à poser avant de démarrer un accompagnement : santé, objectifs, expérience, disponibilités — la base d'un vrai bilan initial.",
    disclaimer:
      "Ce questionnaire recueille des données de santé sensibles : conserve-le de façon sécurisée (jamais par simple email en clair) et n'improvise jamais une réponse à une alerte santé — oriente toujours vers un professionnel de santé (voir aussi la fiche Contraintes & populations spécifiques de la Bibliothèque).",
    content: `QUESTIONNAIRE D'ONBOARDING — NOUVEAU CLIENT

IDENTITÉ
- Nom, prénom, date de naissance
- Téléphone, email
- Profession et rythme de vie (sédentaire / actif / horaires décalés...)

OBJECTIFS
- Objectif principal (prise de masse, perte de gras, force, santé générale, préparation compétition...)
- Échéance visée s'il y en a une (événement, date)
- Ce qui a déjà été essayé, et pourquoi ça n'a pas tenu dans la durée

SANTÉ — À REMPLIR AVEC SÉRIEUX, RÉPONSES CONFIDENTIELLES
- As-tu un problème cardiaque connu, ou un médecin t'a-t-il déjà dit de ne pratiquer une activité physique que sous surveillance médicale ?
- Ressens-tu une douleur à la poitrine pendant l'effort, ou des vertiges/pertes d'équilibre ?
- As-tu une blessure articulaire ou musculaire actuelle ou récente (moins de 6 mois) ?
- Prends-tu un traitement médical régulier ? Lequel ?
- As-tu un diagnostic de maladie chronique (diabète, hypertension, asthme...) ?
- Es-tu enceinte, en post-partum, ou en ménopause/périménopause ?
- As-tu ou as-tu eu un trouble du comportement alimentaire ?
- As-tu un handicap ou une limitation physique à prendre en compte ?
- Ton médecin t'a-t-il déjà déconseillé un type d'effort particulier ?

Si une réponse positive apparaît ci-dessus sur un sujet médical : demander un avis médical écrit avant de démarrer, ou orienter vers un professionnel de santé avant toute prescription d'entraînement.

EXPÉRIENCE SPORTIVE
- Pratique(s) actuelle(s) et passée(s), depuis quand
- Niveau de familiarité avec les mouvements de base (squat, soulevé de terre, développé...)
- Blessures sportives passées, même anciennes

DISPONIBILITÉS ET MATÉRIEL
- Nombre de séances possibles par semaine, durée disponible par séance
- Lieu d'entraînement (salle, domicile, extérieur) et matériel accessible
- Contraintes d'horaires récurrentes

NUTRITION
- Régime alimentaire particulier (végétarien, allergies, intolérances...)
- Repas habituels, contraintes professionnelles/familiales sur les repas
- Rapport à l'alimentation (aisance, restrictions passées, appréhensions)

CONSENTEMENT
- Le client confirme l'exactitude des informations communiquées et s'engage à signaler tout changement de son état de santé pendant l'accompagnement.
- Signature et date.`,
  },
  {
    slug: "cgv-perso-coach",
    title: "CGV de mon activité de coaching",
    shortLabel: "CGV perso",
    summary: "Les conditions générales de vente de TA propre activité de coach — distinctes des CGV de la plateforme EP Coaching, à personnaliser si tu vends aussi en dehors.",
    disclaimer: CONTRACT_DISCLAIMER,
    content: `CONDITIONS GÉNÉRALES DE VENTE — [Nom du coach / de la marque]

ARTICLE 1 — OBJET
Les présentes conditions générales de vente régissent la vente de prestations de coaching sportif et/ou nutritionnel par [Nom du coach], [statut juridique], SIRET [numéro], à toute personne physique souhaitant y souscrire, ci-après "le Client".

ARTICLE 2 — PRESTATIONS PROPOSÉES
[Détail des offres : coaching individuel, programme en ligne, formation, etc., avec leur contenu respectif.]

ARTICLE 3 — PRIX ET PAIEMENT
Les prix sont indiqués en euros, [TTC / net de TVA si micro-entreprise]. Le paiement s'effectue [comptant / par abonnement mensuel] via [moyen de paiement]. Toute prestation commence après réception du paiement, sauf accord contraire écrit.

ARTICLE 4 — RÉTRACTATION ET REMBOURSEMENT
Conformément à l'article L221-18 du Code de la consommation, le Client dispose d'un délai de 14 jours pour se rétracter, sauf si la prestation a déjà commencé avec son accord exprès (auquel cas le droit de rétractation s'exerce au prorata des sommes déjà exécutées). [Préciser toute politique de remboursement complémentaire.]

ARTICLE 5 — RÉSILIATION
Le Client peut résilier son abonnement avec un préavis de [délai]. Aucune séance ou période déjà entamée n'est remboursée sauf accord exprès du Coach.

ARTICLE 6 — OBLIGATIONS ET LIMITES
Le Coach agit dans le cadre d'une obligation de moyens, jamais de résultat. Les conseils donnés ne remplacent en aucun cas un avis médical. Le Client déclare ne présenter aucune contre-indication médicale à la pratique d'une activité physique, ou avoir obtenu l'accord d'un médecin le cas échéant.

ARTICLE 7 — PROPRIÉTÉ INTELLECTUELLE
Les programmes, contenus et documents fournis par le Coach restent sa propriété intellectuelle exclusive et ne peuvent être reproduits, revendus ou partagés sans autorisation écrite.

ARTICLE 8 — DONNÉES PERSONNELLES
Conformément au RGPD, le Client dispose d'un droit d'accès, de rectification et de suppression de ses données personnelles, à exercer auprès de [contact].

ARTICLE 9 — DROIT APPLICABLE
Les présentes CGV sont soumises au droit français. Tout litige relève, à défaut de résolution amiable, des tribunaux compétents du ressort de [ville].

Dernière mise à jour : [date]`,
  },
];

export function getDocumentTemplate(slug: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((t) => t.slug === slug);
}
