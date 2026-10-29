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
      "Ne jamais reprendre un mouvement douloureux sans validation du kinésithérapeute ou du médecin qui suit la blessure. Le coach adapte le programme autour de ce cadre, il ne le remplace pas.",
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
      "Prioriser la régularité (constance sur plusieurs semaines) plutôt que l'intensité ponctuelle : c'est ce qui a l'effet le plus documenté sur ces pathologies.",
    ],
    redFlags: [
      "Douleur thoracique, essoufflement anormal, palpitations ou vertiges pendant l'effort : arrêt immédiat de la séance.",
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
      "Le handicap recouvre des situations extrêmement variées (moteur, sensoriel, cognitif) : il n'existe pas de \"programme handicap\" unique, seulement des principes d'adaptation à appliquer à la situation précise du client. La première étape est toujours de comprendre concrètement ce que le client peut faire, veut faire, et dans quelles conditions, jamais de présumer des limites à sa place.",
    adaptationPrinciples: [
      "Partir des capacités réelles du client (testées ensemble) plutôt que d'un diagnostic générique : deux personnes avec le même diagnostic peuvent avoir des capacités très différentes.",
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
      "Zéro restriction calorique volontaire pendant la grossesse et l'allaitement : la nutrition sert la santé de la mère et de l'enfant, jamais un objectif esthétique sur cette période.",
    ],
    redFlags: [
      "Saignement, contractions douloureuses, perte de liquide, essoufflement anormal ou douleur thoracique pendant l'effort : arrêt immédiat et contact avec la sage-femme/le gynécologue.",
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
      "Prioriser l'entraînement en résistance à charge progressive (2-3 séances/semaine minimum) plutôt qu'un focus cardio seul : c'est ce qui a l'effet le plus direct sur la préservation de la masse musculaire et osseuse.",
      "Intégrer des exercices porteurs de charge (mise en charge du squelette : squat, fentes, montées de charge) pour la santé osseuse, en particulier en l'absence de contre-indication ostéoarticulaire.",
      "Attention accrue à la récupération : le sommeil et le stress sont souvent perturbés sur cette période (bouffées de chaleur, insomnies), ce qui peut réduire la tolérance au volume d'entraînement habituel.",
      "Apport protéique à réévaluer à la hausse (la synthèse protéique musculaire devient moins efficace avec l'âge) plutôt que de garder un objectif calorique/protéique calé sur un profil plus jeune.",
      "Ne pas présumer d'une baisse de capacité générale : l'ajustement porte sur la récupération et la structure, pas nécessairement sur l'intensité absolue.",
    ],
    redFlags: [
      "Douleur osseuse inhabituelle ou fracture pour un traumatisme mineur : évoquer une évaluation de densité osseuse avec le médecin.",
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
      "Un trouble du comportement alimentaire (restriction, hyperphagie, purge) n'est pas un simple excès de rigueur nutritionnelle : c'est une pathologie qui nécessite une prise en charge spécialisée (médecin, psychiatre, diététicien spécialisé). Le rôle du coach ici est avant tout la détection précoce et l'orientation, jamais le traitement. Un programme nutritionnel classique peut aggraver un TCA existant.",
    adaptationPrinciples: [
      "Ne jamais fixer d'objectif de poids ou de composition corporelle chiffré tant qu'un TCA est suspecté ou en cours de prise en charge.",
      "Retirer la pression de performance/apparence du discours (\"progrès\", \"objectif physique\") pour recentrer sur le fonctionnement (force, énergie, sommeil) le temps de la prise en charge.",
      "Ne jamais proposer de plan restrictif à un client qui montre des signaux de TCA, même à sa demande explicite : orienter plutôt vers un professionnel spécialisé avant de continuer le suivi nutrition.",
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
  // 3 fiches ajoutées le 2026-09-22, retour direct : "sur l'appli on peut
  // réellement tout faire sur la prog ou la nutrition d'un client ?" —
  // ces 3 cas (donnés dans le contenu Mastermind niveau 3 fourni par
  // Santamaria : véganisme, Ramadan, obésité) manquaient alors que TCA,
  // grossesse, ménopause et handicap étaient déjà couverts. Sourcées
  // fraîchement sur PubMed plutôt que réutiliser les citations du
  // Mastermind (données sans DOI, non vérifiables telles quelles).
  {
    slug: "vegetarisme-veganisme",
    title: "Végétarisme & véganisme",
    shortLabel: "Végan/végé",
    summary: "Sécuriser les apports en protéines et micronutriments à risque, sans jamais présenter le régime lui-même comme un problème.",
    overview:
      "Un régime végétalien ou végétarien bien construit n'entraîne aucun désavantage démontré sur la performance, l'adaptation à l'entraînement ou la récupération. Le vrai risque n'est pas le régime en soi, mais un apport spontané insuffisant en protéines et en certains micronutriments clés quand la transition n'a pas été accompagnée. Le rôle du coach est d'aider à combler ces apports, jamais de remettre en cause le choix alimentaire ou éthique du client.",
    adaptationPrinciples: [
      "Sécuriser l'apport protéique total avant toute autre chose : viser la même fourchette que pour un régime omnivore (1,6 à 2,2 g/kg/j), en insistant sur la variété des sources végétales (légumineuses, soja, seitan, quinoa) pour couvrir le profil complet en acides aminés sur la journée plutôt que par repas isolé.",
      "Surveiller particulièrement 4 micronutriments à risque documenté en cas de régime végétalien spontané (non supplémenté) : vitamine B12 (quasi absente des sources végétales, supplémentation quasi systématique nécessaire en végétalien strict), fer, zinc, calcium.",
      "La vitamine B12 ne se \"rattrape\" pas par l'alimentation seule en végétalien strict : orienter vers un dosage sanguin et une supplémentation adaptée avec un professionnel de santé plutôt que de laisser une carence s'installer silencieusement.",
      "Viser plutôt le haut de la fourchette de protéines, avec une source riche en lysine à chaque prise (soja, légumineuses, seitan associé à des légumineuses). Les aliments végétaux sont moins denses en calories et plus riches en fibres : vérifier que l'apport énergétique est réellement atteint, surtout en prise de masse.",
      "Oméga 3 : la conversion de l'ALA (lin, noix) en EPA et DHA est faible, donc envisager une huile d'algue. Pense aussi à l'iode, à la vitamine D et au calcium. Un suivi précis de l'alimentation est plus important que pour un omnivore.",
      "Ne jamais présenter le régime comme la cause d'une stagnation ou d'une fatigue sans avoir vérifié ces apports concrets en premier : la première hypothèse est presque toujours un déficit de planification, pas le régime lui-même.",
    ],
    redFlags: [
      "Fatigue inexpliquée, pâleur, essoufflement à l'effort inhabituel : évoquer une carence en fer ou B12, orienter vers un bilan sanguin plutôt que de deviner.",
      "Régime végétalien récent sans aucune supplémentation en B12 envisagée : signal à traiter rapidement, pas à laisser \"se voir avec le temps\".",
      "Apport calorique ou protéique total manifestement insuffisant pour l'objectif visé (prise de muscle notamment) : revoir le plan avant d'incriminer autre chose.",
    ],
    sources: [
      "West et al., \"Nutritional Considerations for the Vegan Athlete\", Adv Nutr, 2023 (doi: 10.1016/j.advnut.2023.04.012)",
      "Bakaloudi et al., \"Intake and adequacy of the vegan diet, a systematic review of the evidence\", Clin Nutr, 2020 (doi: 10.1016/j.clnu.2020.11.035)",
    ],
  },
  {
    slug: "ramadan-jeune-religieux",
    title: "Ramadan & jeûne religieux",
    shortLabel: "Ramadan",
    summary: "Adapter horaires et charge autour du jeûne diurne, sans jamais suggérer de l'interrompre : le coach s'adapte à la pratique, pas l'inverse.",
    overview:
      "Le jeûne du Ramadan (abstinence totale de nourriture ET de boisson du lever au coucher du soleil, pendant environ un mois) a des effets variables et globalement modestes sur la performance quand l'entraînement, l'alimentation et le sommeil sont réorganisés autour de lui. Le rôle du coach est d'adapter le programme à la pratique religieuse du client, jamais de la questionner ni de suggérer une interruption.",
    adaptationPrinciples: [
      "Décaler les séances aux moments compatibles avec le jeûne : juste avant la rupture du jeûne (iftar) ou en soirée après un repas, pour ne jamais entraîner à jeun strict sur une séance à charge élevée.",
      "Maintenir autant que possible l'apport calorique et protéique total habituel en le concentrant sur la fenêtre nocturne (iftar à sahur), plutôt que d'accepter un déficit énergétique non voulu par simple contrainte d'horaires.",
      "Le vrai risque documenté n'est pas la performance elle-même mais l'hypohydratation et la dette de sommeil (horaires sociaux nocturnes décalés) : prioriser l'hydratation sur la fenêtre nocturne et surveiller la qualité du sommeil, pas seulement sa durée.",
      "Réduire le volume d'entraînement plutôt que l'intensité les jours où la fatigue est marquée : mieux vaut une séance plus courte bien exécutée qu'une séance longue en dette de sommeil et d'hydratation.",
      "Revenir progressivement au programme habituel après l'Aïd plutôt que de reprendre le rythme pré-Ramadan du jour au lendemain.",
    ],
    redFlags: [
      "Vertiges, confusion, crampes sévères pendant l'effort : signes de déshydratation significative, arrêter la séance immédiatement.",
      "Perte de poids rapide et importante sur le mois (au-delà de la perte d'eau attendue) : signal d'un déficit calorique non voulu à corriger sur la fenêtre nocturne.",
      "Dette de sommeil qui s'accumule sur plusieurs jours sans récupération : réduire le volume avant que la fatigue ne devienne le facteur limitant de tout le mois.",
    ],
    sources: [
      "Chaouachi et al., \"The effects of Ramadan intermittent fasting on athletic performance: recommendations for the maintenance of physical fitness\", J Sports Sci, 2012 (doi: 10.1080/02640414.2012.698297)",
      "Chamari et al., \"Optimizing training and competition during the month of Ramadan\", Tunis Med, 2019",
      "Trabelsi et al., \"Assessment of hydration status and sleep in athletes during Ramadan month\", Tunis Med, 2025 (doi: 10.62438/tunismed.v103i7.5828)",
    ],
  },
  {
    slug: "obesite",
    title: "Obésité",
    shortLabel: "Obésité",
    summary: "Prioriser les bénéfices de santé mesurables (tension, glycémie, mobilité) sur le seul chiffre du poids, jamais l'inverse.",
    overview:
      "L'activité physique chez une personne en situation d'obésité apporte des bénéfices de santé mesurables (tension artérielle, sensibilité à l'insuline, mobilité, qualité de vie) même sans perte de poids significative. Les recommandations récentes déplacent explicitement le focus du chiffre sur la balance vers ces marqueurs fonctionnels et de santé. Le renforcement musculaire a un rôle particulier : préserver la masse maigre pendant une perte de poids, là où le cardio seul y contribue peu.",
    adaptationPrinciples: [
      "Ouvrir sur les marqueurs de santé et de fonction (tension, endurance, mobilité, sommeil, humeur) plutôt que sur un objectif de poids chiffré : ce sont ces bénéfices qui sont les mieux documentés, y compris en l'absence de perte de poids.",
      "Toujours inclure du renforcement musculaire, pas seulement du cardio : il aide à préserver la masse maigre pendant une perte de poids et améliore la mobilité et la fonction indépendamment du poids perdu.",
      "Progression très graduelle du volume/intensité en tenant compte des contraintes articulaires et de la tolérance à l'effort réelles, jamais un programme copié d'un client sans cette contrainte.",
      "Approche sans jugement ni discours culpabilisant sur le poids (\"weight stigma\") : la littérature récente en fait un point de vigilance explicite, un discours culpabilisant nuit à l'adhésion sans bénéfice de santé démontré.",
      "Si le client est suivi médicalement pour l'obésité (traitement médicamenteux GLP-1, chirurgie bariatrique passée ou à venir), coordonner le programme avec cette prise en charge plutôt que l'ignorer : les besoins en protéines et le risque de perte osseuse changent après une chirurgie bariatrique notamment.",
    ],
    redFlags: [
      "Douleur articulaire qui s'aggrave avec la progression de charge : ralentir et réévaluer le choix d'exercices plutôt que forcer.",
      "Client récemment opéré (chirurgie bariatrique) sans suivi nutritionnel/osseux actif : orienter vers l'équipe médicale avant tout programme de renforcement à charge significative.",
      "Discours d'auto-dévalorisation marqué autour du poids : rester dans le rôle du coach, orienter si besoin vers un accompagnement psychologique dédié plutôt que de \"motiver\" seul.",
    ],
    sources: [
      "Conradie-Smit et al., \"Physical activity in obesity management\", S Afr Med J, 2025 (doi: 10.7196/SAMJ.2025.v115i9b.3603)",
      "Gerber et al., \"Swiss obesity clinical practice guidance\", Swiss Med Wkly, 2026 (doi: 10.57187/5415)",
    ],
  },

  // Fiches ajoutées depuis le niveau 5 et le niveau 6 du Mastermind ThePrepDad
  // (physiologie féminine, RED-S, préparation de compétition). Statut de tout
  // ce qui suit : enseignement du mentor, pas une preuve scientifique. L'appli
  // ne diagnostique rien, ne calcule rien de médical et n'affiche aucun chiffre
  // de prise en charge : elle informe le coach humain et oriente vers un
  // professionnel de santé. Références vérifiables uniquement (jamais celles
  // recopiées telles quelles des notes de cours).
  {
    slug: "red-s",
    title: "Déficit énergétique relatif dans le sport (RED-S)",
    shortLabel: "RED-S",
    summary: "Repérer une disponibilité énergétique trop basse chez une personne active, sans diagnostiquer, et orienter vers un médecin du sport.",
    overview:
      "Le corps dépense de l'énergie à l'entraînement, puis utilise ce qu'il reste pour ses fonctions vitales : c'est la disponibilité énergétique (apport moins dépense d'exercice, rapporté à la masse maigre). Le Mastermind donne comme repère d'enseignement environ 45 kcal par kg de masse maigre et par jour pour l'équilibre en population générale, mais l'appli ne calcule rien de tel. Quand la disponibilité est trop basse, parce qu'on mange moins et/ou qu'on s'entraîne plus, le corps économise : métabolisme, hormones, digestion, concentration, reproduction, os. Cela concerne les hommes comme les femmes, surtout dans les sports de force, les sports esthétiques et les gros volumes d'entraînement. Elle peut être involontaire (charge qui monte, appétit qui baisse, manque de temps ou d'argent) ou voulue (changer de composition, s'entraîner à jeun, supprimer des groupes d'aliments, trouble alimentaire). Le dépistage se fait avec un outil à feux tricolores rempli par un médecin du sport : le coach n'est pas dans ce rôle.",
    adaptationPrinciples: [
      "Observer et noter sans conclure : règles, énergie, sommeil, blessures à répétition, performances qui baissent. Plusieurs signaux ensemble justifient d'orienter, un seul justifie d'en parler.",
      "Quand plusieurs signaux s'accumulent, orienter vers un médecin du sport (et un diététicien du sport) et ne proposer aucun nouveau déficit chiffré en attendant.",
      "Expliquer simplement au client : si le coût de l'entraînement n'est pas couvert par l'alimentation, le corps ralentit d'autres fonctions (reproduction, digestion, concentration). Parler de santé et de fonctionnement, jamais d'apparence.",
      "Cas involontaire : trouver la cause (charge d'entraînement, appétit, temps, budget), éduquer, lever les obstacles pour manger plus et simplifier la semaine.",
      "Cas voulu : chercher d'abord un trouble alimentaire ou un trouble de l'exercice, avec un psychologue si besoin, et appliquer la fiche TCA. Ne jamais gérer seul.",
      "La prise en charge chiffrée (hausse d'apport, calcium, vitamine D, reprise du sport) relève d'un professionnel de santé. Le coach reste sur l'entraînement, la régularité et l'écoute.",
    ],
    redFlags: [
      "Règles absentes ou devenues irrégulières chez une femme sans cause connue (contraception hormonale exclue) : en parler à un médecin.",
      "Fatigue persistante, performances en baisse malgré un programme bien fait, blessures ou douleurs osseuses à répétition.",
      "Restriction alimentaire marquée, rituels autour de la nourriture, culpabilité, sport pour compenser : appliquer la fiche TCA.",
      "Perte de poids rapide avec un volume d'entraînement élevé, froid permanent, vertiges ou malaises.",
    ],
    sources: [
      "Mountjoy et al., \"The IOC consensus statement: beyond the Female Athlete Triad, Relative Energy Deficiency in Sport (RED-S)\", Br J Sports Med, 2014",
      "Loucks, Kiens & Wright, \"Energy availability in athletes\", J Sports Sci, 2011",
    ],
  },
  {
    slug: "sopk",
    title: "SOPK (syndrome des ovaires polykystiques)",
    shortLabel: "SOPK",
    summary: "Accompagner une cliente avec un SOPK par l'entraînement et l'alimentation, sans diagnostiquer ni toucher à son traitement.",
    overview:
      "Le SOPK est un trouble hormonal fréquent chez les femmes en âge d'avoir des enfants (environ une sur huit selon le Mastermind), au tableau très variable : cycles irréguliers, excès d'androgènes (acné, pilosité, perte de cheveux), ovaires d'aspect polykystique à l'échographie. Le diagnostic (critères de Rotterdam : deux critères sur trois) est médical, jamais celui du coach. Beaucoup de femmes ont une résistance à l'insuline (50 à 70 % selon le Mastermind), y compris des femmes minces, ce qui peut rendre la perte de gras plus lente. Le coach agit dans son cadre : entraînement et alimentation, en lien avec le médecin de la cliente.",
    adaptationPrinciples: [
      "Approche individualisée : le SOPK ne se présente pas de la même façon d'une femme à l'autre. Demander le diagnostic et le traitement en cours (metformine, contraception, anti-androgènes, aide à l'ovulation) pour comprendre le contexte, ne jamais y toucher.",
      "Priorité à la sensibilité à l'insuline et à une glycémie stable : l'entraînement en résistance compte (plus de muscle améliore la sensibilité à l'insuline) et tout mouvement régulier aide. Repères de départ, sans protocole propre au SOPK : environ 150 minutes d'activité modérée par semaine et 2 à 3 séances de musculation.",
      "Alimentation : un déficit calorique améliore les marqueurs de santé quelle que soit la composition. Point de départ du cours : glucides modérés et à indice glycémique bas, graisses surtout insaturées, protéines modérées, beaucoup de légumes et de fibres, aliments bruts, alcool modéré. La tolérance aux glucides se teste sur les sensations (énergie, concentration).",
      "Une perte de 5 à 10 % du poids peut améliorer l'ovulation, la fertilité et la régularité du cycle chez une cliente en surpoids. Ce n'est jamais une obligation, et l'IMC a ses limites : chez une femme musclée, le rapport taille-hanches est plus parlant.",
      "Passé de régimes à répétition, faible estime de soi ou troubles alimentaires (plus fréquents avec un SOPK) : ne pas centrer l'accompagnement sur les calories, construire une relation sereine aux aliments bruts, et appliquer la fiche TCA. Une petite restriction durable vaut mieux qu'un régime sévère.",
      "Les régimes très hypocaloriques sont hors du champ du coach : ne jamais les proposer.",
    ],
    redFlags: [
      "Cycles très espacés ou absents, pilosité, acné ou chute de cheveux sans diagnostic : orienter vers un médecin ou un gynécologue avant d'adapter quoi que ce soit.",
      "Signes de trouble alimentaire, restriction extrême ou crises : fiche TCA, orientation immédiate.",
      "Humeur très basse, anxiété marquée ou perte d'estime de soi importante : encourager à en parler à un professionnel.",
      "Soif intense, fatigue inhabituelle, vision floue : possible trouble de la glycémie, bilan médical.",
    ],
    sources: [
      "Teede et al., \"Recommendations from the international evidence-based guideline for the assessment and management of polycystic ovary syndrome\", Fertil Steril, 2018",
      "Moran et al., \"Dietary composition in the treatment of polycystic ovary syndrome: a systematic review to inform evidence-based guidelines\", J Acad Nutr Diet, 2013",
      "\"The effects of different exercises on weight loss and hormonal changes in women with polycystic ovarian syndrome: a network meta-analysis\", BMC Womens Health, 2024 (doi: 10.1186/s12905-024-03297-4)",
    ],
  },
  {
    slug: "contraception-hormonale",
    title: "Contraception hormonale",
    shortLabel: "Contraception",
    summary: "Comprendre ce que change une contraception hormonale sans jamais conseiller d'en commencer, d'en arrêter ou d'en changer.",
    overview:
      "La contraception hormonale sert à éviter une grossesse, mais aussi à réguler le cycle ou à traiter acné, endométriose, règles abondantes, syndrome prémenstruel sévère ou SOPK. Il n'existe pas une seule contraception : les formes combinées (pilule, patch, anneau) contiennent un œstrogène et un progestatif de synthèse, les formes à progestatif seul (mini-pilule, injection, implant, dispositif intra-utérin hormonal) n'en contiennent qu'un. Selon le Mastermind, elles suppriment le cycle naturel, peuvent faire baisser la testostérone (jusqu'à environ 50 % avec une pilule orale), modifier la rétention d'eau selon la molécule, et leurs effets sur l'os restent mitigés. Il existe peu de données sur les formes récentes. Le dispositif intra-utérin hormonal agit surtout localement.",
    adaptationPrinciples: [
      "C'est une décision médicale : le coach ne conseille jamais de commencer, d'arrêter ou de changer de contraception, même si la cliente se plaint de ses effets. Il l'encourage à en parler à son médecin.",
      "Demander simplement quel type de contraception elle utilise, pour comprendre le contexte, sans en tirer de règle d'entraînement.",
      "Une cliente sous contraception hormonale n'a pas le même cycle qu'une autre : ne pas appliquer de logique par phase du cycle, partir de sa récupération et de sa progression réelles.",
      "Une variation de poids ou de rétention d'eau n'est pas un échec : décider sur la tendance de plusieurs semaines, jamais sur une pesée.",
      "Os et muscles : entraînement en résistance régulier, charge qui progresse, apport en calcium à valider avec un professionnel de santé. Humeur, libido ou fatigue qui changent : à signaler au médecin, pas à corriger par le programme.",
    ],
    redFlags: [
      "Douleur ou gonflement inhabituel d'une jambe, douleur dans la poitrine ou essoufflement brutal : urgence médicale.",
      "Saignements anormaux, maux de tête inhabituels ou changement d'humeur important après un changement de contraception : en parler au médecin.",
      "Règles qui ne reviennent pas après l'arrêt prolongé d'une contraception, surtout avec un entraînement intense ou une alimentation restreinte : voir la fiche RED-S et orienter.",
    ],
    sources: [
      "\"The Effect of Hormonal Contraceptive Use on Skeletal Muscle Hypertrophy, Power and Strength Adaptations to Resistance Exercise Training: A Systematic Review and Multilevel Meta-analysis\", Sports Med, 2023 (doi: 10.1007/s40279-023-01911-3)",
      "\"Menstrual cycle hormones and oral contraceptives: a multimethod systems physiology-based review of their impact on key aspects of female physiology\", J Appl Physiol, 2023 (doi: 10.1152/japplphysiol.00346.2023)",
    ],
  },
  {
    slug: "cycle-menstruel",
    title: "Cycle menstruel",
    shortLabel: "Cycle",
    summary: "Comprendre le cycle pour mieux lire les variations de poids, d'appétit et d'énergie, sans imposer de règle d'entraînement par phase.",
    overview:
      "Le cycle dure en moyenne 28 jours (de 24 à 32) et se découpe en phase folliculaire (œstrogènes en hausse, bonne sensibilité à l'insuline, peu de rétention d'eau) puis phase lutéale après l'ovulation (progestérone dominante, température et métabolisme un peu plus hauts, appétit et fringales parfois plus marqués, glycémie moins stable). En fin de phase lutéale, la chute des hormones peut s'accompagner d'un syndrome prémenstruel : crampes, fatigue, humeur, sommeil perturbé, rétention d'eau plus importante. La durée du cycle, des phases et l'intensité des symptômes varient beaucoup d'une femme à l'autre et d'un mois à l'autre : il n'existe pas de cycle normal unique.",
    adaptationPrinciples: [
      "Aucune règle d'entraînement ou de calories n'est imposée par phase du cycle. Les différences de performance entre phases sont subtiles et difficiles à prévoir : on part de la récupération et de la progression réelles de la cliente.",
      "Si la cliente le souhaite, lui proposer de noter son cycle et ses symptômes dans l'appli (onglet Mon cycle) pour repérer ses propres schémas.",
      "Ne jamais conclure d'une variation de poids dans la fenêtre de fin de cycle : la rétention d'eau est plus marquée, on regarde la tendance sur plusieurs semaines.",
      "Appétit et fringales plus forts avant les règles : rassurer, simplifier la semaine, ne jamais culpabiliser un écart.",
      "Fatigue et sommeil perturbés en fin de cycle : alléger si la cliente le ressent, sans toucher au plan de fond.",
    ],
    redFlags: [
      "Règles absentes depuis plusieurs mois (hors grossesse, ménopause, contraception qui l'explique) : voir la fiche RED-S, orienter vers un médecin.",
      "Douleurs qui empêchent de vivre normalement, saignements très abondants ou très irréguliers : orienter vers un médecin ou un gynécologue.",
      "Syndrome prémenstruel avec détresse psychologique importante : encourager à en parler à un professionnel de santé.",
    ],
    sources: [
      "\"The Effects of Menstrual Cycle Phase on Elite Athlete Performance: A Critical and Systematic Review\", Front Physiol, 2021 (doi: 10.3389/fphys.2021.654585)",
      "\"Menstrual cycle hormones and oral contraceptives: a multimethod systems physiology-based review of their impact on key aspects of female physiology\", J Appl Physiol, 2023 (doi: 10.1152/japplphysiol.00346.2023)",
    ],
  },
  {
    slug: "preparation-competition",
    title: "Préparation à une compétition de physique",
    shortLabel: "Compétition",
    summary: "Évaluer si une personne est prête à préparer une compétition, et lui faire comprendre la différence entre une préparation et un simple déficit calorique.",
    overview:
      "Une préparation de physique n'est pas un déficit calorique plus long : l'échéance est fixe, la flexibilité est faible, les coûts (déplacements, hôtel, compléments de santé) et les sacrifices sociaux sont réels, et le résultat sur scène sera le fruit du travail du coach. Le Mastermind insiste sur trois compétences : connaître les critères de jugement de la fédération et de la catégorie, savoir analyser un physique de façon honnête, et savoir communiquer un plan. Cette fiche sert à décider avec la personne, pas à lancer une préparation automatiquement. Chez EP Coaching, aucune préparation n'est conseillée par l'appli ni par un assistant IA : c'est une décision humaine, prise avec la coach.",
    adaptationPrinciples: [
      "Avant de dire oui, vérifier : assez d'expérience (plusieurs phases de surplus et de déficit déjà vécues), assez de muscle pour être compétitive dans la catégorie visée, adhésion globale solide (qui n'adhère pas à son surplus n'adhérera pas à son déficit), état d'esprit stable.",
      "Demander d'où vient la motivation : le ferait-elle sans les réseaux sociaux ? Regarder le mode de vie (famille, restaurants, travail), la situation financière (compléments de santé, hôtel proche de la compétition) et la capacité à accepter un mauvais classement sans accuser personne.",
      "Se référer aux règles officielles de la fédération et de la catégorie, regarder des compétitions et des physiques gagnants pour se faire un œil. Une personne qui ne rentre pas dans les critères doit parfois attendre longtemps : mieux vaut repousser que préparer quelqu'un qui sera démoralisé.",
      "Poser la timeline : marqueurs de santé vérifiés, surplus assez long, suivi de données avant de commencer pour avoir une référence (pas, poids moyen, sommeil). Selon le Mastermind, 20 à 25 semaines sont plus réalistes que 16 pour arriver en condition, avec une perte progressive.",
      "Nutrition de préparation : tout ce qui vaut pour un déficit s'applique, on ne cycle pas les calories d'un jour à l'autre, on ajuste sur la tendance. Entraînement : adapter à la récupération, parfois plus de séances avec moins de volume chacune, contrôler les exécutions en vidéo, ne pas chercher à rattraper les points faibles en pleine préparation. Dépense : augmenter par rapport à la base, sans nombre magique de pas ou de cardio.",
      "Expliquer honnêtement les contraintes (échéance, flexibilité, argent, énergie mentale) avant de commencer : le vrai risque est un abandon à 10 ou 12 semaines suivi d'un dégoût.",
      "Produits dopants et peak week : le coach n'en conseille aucun, informe des risques pour la santé (et des effets irréversibles possibles chez la femme) et oriente vers un médecin. Une personne qui en veut toujours plus est un signal pour s'arrêter.",
    ],
    redFlags: [
      "Trouble alimentaire, relation compliquée à la nourriture ou peur excessive de reprendre du poids : appliquer la fiche TCA, ne pas préparer.",
      "Règles absentes, fatigue profonde, blessures à répétition en déficit : voir la fiche RED-S, orienter.",
      "Demande de produits dopants, de peak week extrême (déshydratation, retrait de sodium) ou d'un déficit plus agressif que le plan : refuser d'en conseiller, orienter vers un professionnel de santé.",
      "Pression financière forte, vie familiale incompatible, impossibilité d'accepter l'échec : repousser la compétition.",
    ],
    sources: [
      "Mountjoy et al., \"The IOC consensus statement: beyond the Female Athlete Triad, Relative Energy Deficiency in Sport (RED-S)\", Br J Sports Med, 2014",
      "Règles officielles de la fédération et de la catégorie visée (à consulter à la source avant toute décision)",
    ],
  },
];

export function getMedicalConstraintBySlug(slug: string): MedicalConstraint | undefined {
  return MEDICAL_CONSTRAINTS.find((c) => c.slug === slug);
}
