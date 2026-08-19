// Espace "Contraintes & populations spécifiques" (Axe 8, VISION.md — demande
// directe 2026-08-19 : "fait toute une partie sur le côté médical, blessure,
// réhab etc, maladie, handicap, femme enceinte, ménopause etc, donc vraiment
// toutes les contraintes comme ça").
//
// Garde-fou non négociable (cohérent avec le refus posé à l'Axe AE de
// MASTERCLASS.md pour les coachs IA) : contenu de RÉFÉRENCE pour un coach
// HUMAIN qui construit un programme, jamais un système qui pose un
// diagnostic ou prescrit un traitement à un client, et jamais confié à un
// coach IA (lib/ai-coaches.ts exclut explicitement ces sujets et oriente
// vers un humain). Chaque fiche rappelle sa limite dans son propre contenu,
// pas seulement dans un bandeau générique.
//
// Contenu écrit en s'appuyant sur des repères déjà établis par la
// littérature de référence sur l'entraînement en résistance et les
// populations spécifiques, jamais un remplacement d'un avis médical
// individualisé — voir le rappel explicite dans chaque fiche.

export interface MedicalConstraint {
  slug: string;
  title: string;
  shortLabel: string;
  summary: string;
  overview: string;
  adaptationPrinciples: string[];
  redFlags: string[];
  sources: string[];
}

export const MEDICAL_CONSTRAINTS: MedicalConstraint[] = [
  {
    slug: "blessures-reeducation",
    title: "Blessures & réhabilitation",
    shortLabel: "Blessures",
    summary: "Reprendre l'entraînement après une blessure sans la réaggraver, en coordination avec le suivi médical du client.",
    overview:
      "Une blessure ne signifie pas l'arrêt total de l'entraînement, mais un changement de priorité : la zone touchée demande une reprise progressive et encadrée, pendant que le reste du corps peut souvent continuer à s'entraîner normalement. Le principe directeur est la charge relative à la douleur (\"pain-guided loading\") : une gêne légère et stable pendant l'exercice est généralement acceptable, une douleur qui augmente pendant ou après la séance ne l'est pas.",
    adaptationPrinciples: [
      "Ne jamais reprendre un mouvement douloureux sans validation du kinésithérapeute ou du médecin qui suit la blessure — le coach adapte le programme autour de ce cadre, il ne le remplace pas.",
      "Entraînement autour de la blessure (\"train around it\") : maintenir le volume sur les groupes musculaires non concernés pendant la phase de repos relatif de la zone touchée.",
      "Réintroduction progressive par paliers d'amplitude et de charge, jamais un retour direct au niveau pré-blessure.",
      "Privilégier les variantes d'exercice qui déchargent l'articulation concernée (machine guidée plutôt que charge libre, amplitude partielle avant amplitude complète).",
      "Documenter chaque séance de reprise (charge, répétitions, douleur ressentie sur 10) pour objectiver la progression réelle plutôt que le ressenti du jour.",
    ],
    redFlags: [
      "Douleur qui augmente pendant la série ou qui persiste plus de 24h après la séance.",
      "Gonflement, chaleur ou rougeur nouvelle autour de l'articulation.",
      "Perte de force ou de sensation (fourmillements, engourdissement) associée à la douleur.",
      "Le client n'a pas de suivi médical/kiné actif pour une blessure encore récente ou non diagnostiquée.",
    ],
    sources: [
      "Silbernagel et al., \"Current clinical concepts: conservative management of Achilles tendinopathy\", J Athl Train, 2020",
      "Scott et al., \"Load Management in Tendinopathy: Clinical Progression for Achilles and Patellar Tendinopathy\", Br J Sports Med, 2020",
    ],
  },
  {
    slug: "maladies-chroniques",
    title: "Maladies chroniques",
    shortLabel: "Maladies chroniques",
    summary: "Diabète, hypertension, pathologies cardiovasculaires : adapter l'intensité et la structure sans se substituer au suivi médical.",
    overview:
      "L'activité physique régulière est un traitement complémentaire reconnu pour la plupart des maladies chroniques (diabète de type 2, hypertension, pathologies cardiovasculaires stabilisées), mais le cadre d'intensité et les précautions changent selon la pathologie exacte et son degré de contrôle médical. Le rôle du coach est de structurer un entraînement cohérent avec l'autorisation et les limites posées par le médecin traitant, jamais de définir ces limites lui-même.",
    adaptationPrinciples: [
      "Toujours demander une autorisation médicale explicite avant de démarrer un programme structuré chez un client avec une pathologie chronique diagnostiquée, en particulier cardiovasculaire.",
      "Diabète : anticiper le risque d'hypoglycémie à l'effort (collation avant/pendant si besoin), éviter les efforts très intenses non planifiés.",
      "Hypertension : privilégier des charges permettant de respirer normalement pendant l'effort (éviter le blocage respiratoire/Valsalva prolongé sur les efforts maximaux), progression très graduelle de l'intensité.",
      "Pathologies cardiovasculaires stabilisées : suivre strictement le cadre de fréquence cardiaque et d'intensité donné par le cardiologue plutôt qu'un pourcentage générique de FC max.",
      "Prioriser la régularité (constance sur plusieurs semaines) plutôt que l'intensité ponctuelle — c'est ce qui a l'effet le plus documenté sur ces pathologies.",
    ],
    redFlags: [
      "Douleur thoracique, essoufflement anormal, palpitations ou vertiges pendant l'effort — arrêt immédiat de la séance.",
      "Symptômes d'hypoglycémie chez un client diabétique (tremblements, sueurs froides, confusion).",
      "Le client n'a pas d'autorisation médicale récente pour l'activité physique alors que sa pathologie est encore mal contrôlée.",
      "Toute aggravation rapportée entre deux séances qui n'a pas encore été vue par le médecin traitant.",
    ],
    sources: [
      "Colberg et al., \"Physical Activity/Exercise and Diabetes: A Position Statement of the ADA\", Diabetes Care, 2016",
      "Pescatello et al., \"Exercise and Hypertension\", ACSM Position Stand, Med Sci Sports Exerc, 2004 (mis à jour 2019)",
    ],
  },
  {
    slug: "handicap",
    title: "Handicap",
    shortLabel: "Handicap",
    summary: "Adapter l'accessibilité du programme et des exercices à la situation réelle du client, jamais un programme générique retouché à la marge.",
    overview:
      "Le handicap recouvre des situations extrêmement variées (moteur, sensoriel, cognitif) : il n'existe pas de \"programme handicap\" unique, seulement des principes d'adaptation à appliquer à la situation précise du client. La première étape est toujours de comprendre concrètement ce que le client peut faire, veut faire, et dans quelles conditions — jamais de présumer des limites à sa place.",
    adaptationPrinciples: [
      "Partir des capacités réelles du client (testées ensemble) plutôt que d'un diagnostic générique — deux personnes avec le même diagnostic peuvent avoir des capacités très différentes.",
      "Handicap moteur : privilégier les machines guidées et les positions stables (assis, appuyé) qui isolent le mouvement voulu sans exiger un équilibre ou une posture que le client ne maîtrise pas encore.",
      "Handicap sensoriel (visuel, auditif) : structurer la communication autrement (démonstration tactile, repères physiques dans la salle, supports écrits) plutôt que de réduire le contenu de l'entraînement.",
      "Handicap cognitif : simplifier la structure de la séance (moins d'exercices différents, répétés plus longtemps) plutôt que de réduire l'intensité ou le volume.",
      "Impliquer l'équipe médicale/paramédicale déjà en place (kiné, ergothérapeute) quand elle existe, plutôt que de reconstruire seul un cadre d'adaptation.",
    ],
    redFlags: [
      "Douleur, spasticité ou fatigue anormale qui apparaît sur un mouvement pourtant validé précédemment.",
      "Le client ou son entourage signale un changement récent de son état (nouvelle prescription, nouvelle limitation) non encore intégré au programme.",
      "Une situation où le matériel disponible ne permet pas une exécution réellement sécurisée du mouvement prévu.",
    ],
    sources: [
      "American College of Sports Medicine, \"ACSM Guidelines for Exercise Testing and Prescription\", chapitre populations spécifiques, 11e édition",
      "Rimmer & Marques, \"Physical activity for people with disabilities\", Lancet, 2012",
    ],
  },
  {
    slug: "grossesse-post-partum",
    title: "Grossesse & post-partum",
    shortLabel: "Grossesse",
    summary: "Adapter par trimestre et respecter la reprise post-partum, toujours avec l'accord de la sage-femme ou du gynécologue.",
    overview:
      "L'activité physique pendant une grossesse sans complication est aujourd'hui recommandée par les sociétés savantes, mais la nature et l'intensité de l'entraînement doivent évoluer avec chaque trimestre, et la reprise post-partum suit son propre calendrier de récupération (plancher pelvien, diastasis des grands droits). Le coach travaille toujours en coordination avec le suivi obstétrical, jamais à sa place.",
    adaptationPrinciples: [
      "Valider systématiquement l'absence de contre-indication avec la sage-femme ou le gynécologue avant de démarrer ou poursuivre un programme structuré.",
      "1er trimestre : peu de changements nécessaires pour une grossesse sans complication, en restant attentif à la fatigue et aux nausées.",
      "2e-3e trimestre : éviter les exercices en décubitus dorsal prolongé après le 1er trimestre, réduire les mouvements à fort risque de chute ou d'impact, adapter l'intensité au ressenti (\"talk test\" plutôt qu'un pourcentage de FC max).",
      "Post-partum : reprise très progressive, dépistage du diastasis des grands droits et du plancher pelvien avant de réintroduire les exercices à forte pression abdominale (gainage classique, charges lourdes), généralement après le feu vert de la visite post-natale.",
      "Zéro restriction calorique volontaire pendant la grossesse et l'allaitement — la nutrition sert la santé de la mère et de l'enfant, jamais un objectif esthétique sur cette période.",
    ],
    redFlags: [
      "Saignement, contractions douloureuses, perte de liquide, essoufflement anormal ou douleur thoracique pendant l'effort — arrêt immédiat et contact avec la sage-femme/le gynécologue.",
      "Diastasis abdominal visible (bombement le long de la ligne médiane) non encore évalué par un professionnel.",
      "Douleur pelvienne ou fuites urinaires pendant l'effort en post-partum, signe d'un plancher pelvien pas encore prêt pour la charge prévue.",
    ],
    sources: [
      "ACOG, \"Physical Activity and Exercise During Pregnancy and the Postpartum Period\", Committee Opinion, 2020",
      "Davenport et al., \"2019 Canadian Guideline for Physical Activity throughout Pregnancy\", Br J Sports Med, 2018",
    ],
  },
  {
    slug: "menopause",
    title: "Ménopause",
    shortLabel: "Ménopause",
    summary: "Prioriser le renforcement musculaire et l'entraînement en charge face à la perte osseuse et musculaire accélérée de cette période.",
    overview:
      "La chute des œstrogènes à la ménopause accélère la perte de masse musculaire et de densité osseuse, et modifie souvent la répartition des graisses. L'entraînement en résistance devient un levier particulièrement important sur cette période, pas un simple complément au cardio.",
    adaptationPrinciples: [
      "Prioriser l'entraînement en résistance à charge progressive (2-3 séances/semaine minimum) plutôt qu'un focus cardio seul — c'est ce qui a l'effet le plus direct sur la préservation de la masse musculaire et osseuse.",
      "Intégrer des exercices porteurs de charge (mise en charge du squelette : squat, fentes, montées de charge) pour la santé osseuse, en particulier en l'absence de contre-indication ostéoarticulaire.",
      "Attention accrue à la récupération : le sommeil et le stress sont souvent perturbés sur cette période (bouffées de chaleur, insomnies), ce qui peut réduire la tolérance au volume d'entraînement habituel.",
      "Apport protéique à réévaluer à la hausse (la synthèse protéique musculaire devient moins efficace avec l'âge) plutôt que de garder un objectif calorique/protéique calé sur un profil plus jeune.",
      "Ne pas présumer d'une baisse de capacité générale : l'ajustement porte sur la récupération et la structure, pas nécessairement sur l'intensité absolue.",
    ],
    redFlags: [
      "Douleur osseuse inhabituelle ou fracture pour un traumatisme mineur — évoquer une évaluation de densité osseuse avec le médecin.",
      "Palpitations, bouffées de chaleur sévères ou vertiges qui perturbent réellement la sécurité de la séance.",
      "Aucun suivi gynécologique/médical récent alors que la cliente rapporte des symptômes marqués (à orienter, pas à gérer côté coaching).",
    ],
    sources: [
      "Sipilä et al., \"Muscle and bone mass in middle-aged women: role of menopause status and physical activity\", J Cachexia Sarcopenia Muscle, 2020",
      "Daly et al., \"Exercise for the prevention of osteoporosis in postmenopausal women: an evidence-based guide\", J Bone Metab, 2019",
    ],
  },
  {
    slug: "tca",
    title: "Troubles du comportement alimentaire",
    shortLabel: "TCA",
    summary: "Reconnaître les signaux, ne jamais tenter de \"gérer\" un TCA soi-même, orienter systématiquement vers un professionnel spécialisé.",
    overview:
      "Un trouble du comportement alimentaire (restriction, hyperphagie, purge) n'est pas un simple excès de rigueur nutritionnelle : c'est une pathologie qui nécessite une prise en charge spécialisée (médecin, psychiatre, diététicien spécialisé). Le rôle du coach ici est avant tout la détection précoce et l'orientation, jamais le traitement — un programme nutritionnel classique peut aggraver un TCA existant.",
    adaptationPrinciples: [
      "Ne jamais fixer d'objectif de poids ou de composition corporelle chiffré tant qu'un TCA est suspecté ou en cours de prise en charge.",
      "Retirer la pression de performance/apparence du discours (\"progrès\", \"objectif physique\") pour recentrer sur le fonctionnement (force, énergie, sommeil) le temps de la prise en charge.",
      "Ne jamais proposer de plan restrictif à un client qui montre des signaux de TCA, même à sa demande explicite — orienter plutôt vers un professionnel spécialisé avant de continuer le suivi nutrition.",
      "Rester dans le rôle du coach sportif (entraînement, régularité, écoute) pendant qu'un professionnel spécialisé gère le volet nutritionnel/psychologique.",
    ],
    redFlags: [
      "Restriction calorique sévère et progressive, obsession du contrôle alimentaire, rituels autour de la nourriture.",
      "Épisodes de crises alimentaires suivis de culpabilité intense, comportements de purge (vomissements provoqués, laxatifs, sur-entraînement compensatoire).",
      "Variation de poids rapide et importante, fatigue, troubles du cycle menstruel, malaises.",
      "Tout signal de ce type : orientation immédiate vers un médecin ou un psychiatre spécialisé en TCA, jamais un ajustement du programme en attendant.",
    ],
    sources: [
      "American Psychiatric Association, \"Practice Guideline for the Treatment of Patients With Eating Disorders\", 4e édition, 2023",
      "Bratland-Sanda & Sundgot-Borgen, \"Eating disorders in athletes: overview of prevalence, risk factors and recommendations for prevention and treatment\", Eur J Sport Sci, 2013",
    ],
  },
];

export function getMedicalConstraintBySlug(slug: string): MedicalConstraint | undefined {
  return MEDICAL_CONSTRAINTS.find((c) => c.slug === slug);
}
