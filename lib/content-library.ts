// Bibliothèque de référence pour l'espace Scripts (Idéation) — demande
// explicite du 2026-08-15 : prompts prêts à coller dans Claude, banque de
// hooks, exemples de CTA, fiches techniques de montage. Contenu statique
// (curé une fois, pas généré par utilisateur) : pas de table Supabase,
// juste un import — beaucoup plus simple à faire évoluer/relire qu'une
// table qu'il faudrait migrer à chaque ajustement de texte.

export interface ContentPrompt {
  title: string;
  category: "Hook" | "Script" | "Concept" | "Description" | "CTA" | "YouTube" | "Business" | "Repurposing" | "Planification";
  prompt: string;
}

// Bibliothèque étendue (2026-09-10, retour direct : "je veux plein plein
// de prompts, vraiment de la valeur, hyper personnalisé"). Chaque prompt
// copié depuis l'onglet Prompts est automatiquement précédé du contexte
// business du coach (Business Model Canvas, voir IdeationScripts.tsx/
// buildCoachContext) quand il l'a rempli — ces textes ci-dessous restent
// donc volontairement génériques avec des [CROCHETS] à remplir, le
// contexte business fait le reste du travail de personnalisation sans
// dupliquer 9 blocs de canvas dans chaque prompt individuellement.
export const CONTENT_PROMPTS: ContentPrompt[] = [
  {
    title: "10 hooks pour un sujet donné",
    category: "Hook",
    prompt:
      "Tu es coach sportif/nutrition, marque EP Coaching, ton direct et sans blabla, jamais de tiret dans le texte. Écris-moi 10 hooks (première phrase d'une vidéo courte) sur le sujet suivant : [SUJET]. Contrainte : chaque hook doit créer une tension ou une curiosité en une phrase, sans jamais révéler la réponse. Varie les angles : question directe, chiffre choc, erreur commune, affirmation contre-intuitive, storytelling en une phrase. Numérote-les, une phrase par hook, pas de blabla explicatif autour.",
  },
  {
    title: "Script Reel/Short (30-60s)",
    category: "Script",
    prompt:
      "Écris-moi le script complet d'un Reel/Short de 30 à 45 secondes sur : [SUJET]. Structure imposée : hook (1 phrase, 0-2s), problème/tension (2-3 phrases), le point clé à retenir (le cœur du contenu, avec un exemple concret si possible), CTA final court. Ton : coach direct, tutoiement, jamais de tiret. Indique aussi entre crochets ce qui doit être filmé/montré à chaque étape (ex. [face caméra], [démo geste technique], [texte à l'écran]).",
  },
  {
    title: "10 variantes de concept vidéo sur un thème",
    category: "Concept",
    prompt:
      "À partir de ce thème : [THÈME], propose-moi 10 concepts de vidéo totalement différents (pas 10 variations du même angle) : un format liste, un format mythe/réalité, un format \"j'ai testé X pendant Y jours\", un format réaction à une pratique courante, un format avant/après une erreur corrigée, un format question de communauté, un format duo (2 avis qui s'opposent), un format démonstration technique, un format storytelling personnel, un format chiffre/étude expliquée simplement. Une phrase de pitch par concept.",
  },
  {
    title: "Description + tags pour une vidéo",
    category: "Description",
    prompt:
      "Écris-moi la description YouTube/Instagram de cette vidéo : [RÉSUMÉ DE LA VIDÉO]. Format : 2-3 phrases qui donnent envie et résument la valeur sans spoiler le hook, puis une liste de ce que la vidéo couvre, puis un CTA vers [OFFRE/COMPTE]. Termine par une liste de 8-10 hashtags pertinents pour la musculation/nutrition en français.",
  },
  {
    title: "10 CTA différents pour la même offre",
    category: "CTA",
    prompt:
      "Écris-moi 10 CTA différents (une phrase chacun) pour donner envie de [ACTION : s'abonner / prendre RDV / télécharger le guide / commenter]. Contrainte : jamais \"clique sur le lien en bio\" tout seul sans raison, toujours relier le CTA à un bénéfice concret évoqué juste avant. Varie le registre : urgence douce, curiosité, preuve sociale, question directe, défi.",
  },
  {
    title: "Réponse à un commentaire qui mérite un vrai contenu",
    category: "Concept",
    prompt:
      "Voici une question posée par un membre de la communauté : [QUESTION]. Transforme-la en un concept de vidéo courte qui y répond vraiment (pas une réponse vague) : donne-moi le hook, l'angle, et les 2-3 points clés à couvrir pour que la réponse soit complète et actionnable, pas juste rassurante.",
  },
  {
    title: "Script format \"mythe / réalité\"",
    category: "Script",
    prompt:
      "Écris-moi un script court (30-40s) format \"mythe / réalité\" sur cette croyance répandue : [CROYANCE]. Structure : énonce le mythe tel qu'on l'entend souvent (2-3s, ton neutre voire complice \"toi aussi t'as déjà entendu ça\"), puis \"en réalité\" et la vraie explication simple, puis ce que ça change concrètement dans la pratique. Termine par une phrase de CTA courte.",
  },
  {
    title: "Script storytelling personnel",
    category: "Script",
    prompt:
      "Écris-moi un script de 45-60s en storytelling personnel sur ce vécu réel : [SITUATION VÉCUE]. Structure : accroche qui plante la scène sans tout révéler (\"il y a [X], je [situation]\"), le moment où ça a basculé ou la leçon apprise, ce que ça change concrètement dans ma façon de coacher/m'entraîner aujourd'hui, chute qui relie l'histoire au spectateur (\"toi aussi si...\"). Jamais d'exagération ni de détail inventé, uniquement ce que je te donne comme vécu réel.",
  },
  {
    title: "Script \"j'ai testé pendant X jours\"",
    category: "Script",
    prompt:
      "Écris-moi le script d'un format \"j'ai testé [PRATIQUE/MÉTHODE] pendant [X] jours\" sur : [SUJET]. Structure : hook qui annonce le test et le enjeu (pas encore le résultat), le protocole exact suivi (2-3 phrases factuelles, pas de blabla), ce qui a réellement changé (mesurable si possible, honnête si le résultat est mitigé), la conclusion pratique pour quelqu'un qui voudrait tester pareil. Ne jamais inventer un résultat chiffré que je ne t'ai pas donné, demande-le-moi si je ne l'ai pas précisé.",
  },
  {
    title: "Script réponse à une objection",
    category: "Script",
    prompt:
      "Voici une objection fréquente que j'entends : [OBJECTION, ex. 'je n'ai pas le temps', 'c'est trop cher', 'j'ai déjà essayé et ça n'a pas marché']. Écris-moi un script court (30-45s) qui la déconstruit sans être sur la défensive : reformule l'objection pour montrer que je la comprends vraiment, explique la croyance ou le raisonnement caché derrière, apporte un contre-argument concret et vérifiable (pas juste rassurant), termine sur une ouverture (pas une vente forcée).",
  },
  {
    title: "Script duo/débat (2 points de vue)",
    category: "Script",
    prompt:
      "Écris-moi un script de 30-40s en format duo/débat (voir fiche technique montage \"clone\") sur ce sujet qui divise : [SUJET]. Deux voix distinctes qui s'interrompent et se répondent rapidement (pas deux monologues), l'une défendant [POSITION A], l'autre [POSITION B]. Termine par une synthèse courte qui ne tranche pas artificiellement si le sujet est vraiment nuancé, ou qui tranche clairement si un camp a raison sur le fond.",
  },
  {
    title: "5 idées de vidéo à partir d'un DM ou message reçu",
    category: "Concept",
    prompt:
      "Voici un message ou une situation reçue en DM/en séance : [MESSAGE/SITUATION]. Sans jamais citer ni décrire la personne de façon identifiable, propose-moi 5 idées de contenu différentes qui partent de ce déclencheur réel mais restent 100% anonymisées et généralisables à n'importe qui dans la même situation.",
  },
  {
    title: "Titre + miniature YouTube (SEO et CTR)",
    category: "YouTube",
    prompt:
      "Pour cette vidéo YouTube : [RÉSUMÉ DE LA VIDÉO], propose-moi 8 titres différents (moins de 60 caractères chacun, sans clickbait mensonger, une vraie promesse tenue dans la vidéo) et pour chacun une idée de texte de miniature en 2-4 mots maximum qui crée une tension visuelle avec le titre plutôt que de le répéter. Varie les angles : chiffre, question, contradiction, promesse de résultat, urgence.",
  },
  {
    title: "Plan de vidéo YouTube longue (8-15 min)",
    category: "YouTube",
    prompt:
      "Écris-moi un plan détaillé (pas le script mot à mot) d'une vidéo YouTube de 8 à 15 minutes sur : [SUJET]. Structure : accroche (20-30s, ce que la vidéo va vraiment apporter, sans sur-promettre), contexte/problème (1-2 min), 3 à 5 parties principales avec pour chacune le point clé + un exemple concret + une transition, un rappel du bénéfice toutes les 2-3 minutes pour garder l'attention, récap final + CTA. Ajoute des timestamps de chapitres YouTube correspondant exactement à cette structure. Public : pratiquants de musculation qui veulent des réponses fiables, pas du contenu marketing creux.",
  },
  {
    title: "Script vidéo YouTube \"vlog/dans les coulisses\"",
    category: "YouTube",
    prompt:
      "Écris-moi la trame (pas mot à mot, les moments clés à filmer et ce qu'il faut dire à chacun) d'une vidéo YouTube format vlog/dans les coulisses de [X] minutes sur : [JOURNÉE OU SITUATION, ex. 'une journée de prep compétition', 'comment je construis un programme client']. Structure : accroche qui pose l'enjeu du jour, 3-4 moments filmés avec pour chacun ce qui est montré ET ce qui est expliqué en voix off, un ou deux ratés/difficultés réels assumés (pas que du positif lissé, ça retient plus), conclusion qui relie la journée à une leçon transférable au spectateur.",
  },
  {
    title: "Série YouTube en plusieurs épisodes",
    category: "YouTube",
    prompt:
      "À partir de ce grand sujet : [SUJET LARGE, ex. 'la prise de masse de A à Z', 'monter une activité de coach'], découpe-le en une série de [X] épisodes YouTube cohérents (ni trop redondants, ni des sauts d'écart). Pour chaque épisode : titre, ce qu'il couvre précisément, ce qu'il NE couvre PAS (renvoyé à un épisode suivant), et le fil qui donne envie d'enchaîner sur le suivant sans que chaque épisode soit dépendant des autres pour être compris seul.",
  },
  {
    title: "Nommer ma méthode/mon mécanisme",
    category: "Business",
    prompt:
      "Voici comment je travaille avec mes clients au quotidien : [DÉCRIS TA MÉTHODE/TON PROCESS RÉEL, ex. l'app + le suivi hebdo + les ajustements]. Aide-moi à trouver 8 noms courts et mémorables (2-4 mots) pour désigner cette méthode comme un concept propre à moi (pas un terme générique comme \"accompagnement personnalisé\"), que je pourrais réutiliser dans tout mon contenu pour créer une reconnaissance de marque. Explique en une phrase pourquoi chaque nom fonctionne ou pas.",
  },
  {
    title: "Contenu qui s'adresse aux coachs (pas aux clients finaux)",
    category: "Business",
    prompt:
      "Écris-moi un script court (30-45s) qui s'adresse spécifiquement à des coachs sportifs qui veulent scaler leur activité (pas à mes clients finaux en musculation), sur ce sujet : [SUJET, ex. un outil, une erreur de business, un chiffre à suivre]. Ton toujours direct et concret, jamais de langage \"business coach\" générique, un vrai retour d'expérience ou un vrai raisonnement, jamais de statistique ou de résultat client inventé.",
  },
  {
    title: "Transformer une leçon business en contenu",
    category: "Business",
    prompt:
      "Voici une vraie leçon ou erreur que j'ai vécue dans la construction de mon activité : [LEÇON/ERREUR RÉELLE]. Transforme-la en script court destiné aux coachs qui me suivent : le contexte en une phrase, l'erreur ou la mauvaise hypothèse de départ, ce qui a changé quand j'ai corrigé, la leçon généralisable pour quelqu'un dans la même situation. Jamais de chiffre inventé, demande-le-moi si utile et que je ne te l'ai pas donné.",
  },
  {
    title: "Semaine de contenu à partir d'une seule idée",
    category: "Planification",
    prompt:
      "Voici une idée de fond : [IDÉE CENTRALE]. Décline-la en un calendrier de 5-7 contenus pour la semaine, chacun avec un angle et un format différents (ne jamais répéter deux fois le même angle) : par exemple un reel qui pose le problème, une story qui creuse un détail, un reel qui donne la solution, un carousel qui résume en étapes, un reel storytelling personnel lié au même thème. Une ligne par jour : jour, format, angle, hook.",
  },
  {
    title: "30 idées de contenu en 10 minutes (méthode colonnes)",
    category: "Planification",
    prompt:
      "Aide-moi à remplir 5 colonnes d'idées de contenu à partir de ce que je te donne, méthode par catégories (pas de mélange entre colonnes) : GOÛTS (ce que j'aime, mes intérêts persos liés ou pas au fitness : [LISTE]), ÉCHECS (mes erreurs ou galères passées : [LISTE]), POURQUOI (pourquoi je fais ce métier : [PHRASE]), POINTS COMMUNS AVEC MON AUDIENCE (ce qu'on vit pareil : [LISTE]), MESSAGE (ce qui différencie ma méthode : [PHRASE]). Pour chaque colonne, propose-moi 6 idées de contenu concrètes qui en découlent (30 au total), une ligne par idée, sans blabla.",
  },
  {
    title: "Repérer le pattern qui marche (analyse de performance)",
    category: "Planification",
    prompt:
      "Voici plusieurs contenus récents avec leurs résultats (vues, likes, commentaires, ou juste \"a mieux marché que la moyenne\"/\"a fait un flop\") : [LISTE DES CONTENUS + RÉSULTATS]. Analyse ce qui différencie ceux qui ont bien marché de ceux qui n'ont pas marché : le sujet, l'angle, le hook, le format, l'heure de publication si connue. Donne-moi 3 hypothèses concrètes sur ce qui explique l'écart, et pour chacune un prochain contenu à tester pour la confirmer ou l'infirmer.",
  },
  {
    title: "Repurposer une vidéo longue en plusieurs formats courts",
    category: "Repurposing",
    prompt:
      "Voici le script ou le résumé d'une vidéo longue : [SCRIPT/RÉSUMÉ]. Découpe-la en 4-5 extraits distincts qui pourraient chacun devenir un Reel/Short autonome (pas juste un bout coupé au hasard : chaque extrait doit avoir son propre hook, sa propre chute, se comprendre seul sans avoir vu la vidéo complète). Pour chaque extrait : le passage concerné, le hook à ajouter en ouverture (souvent absent du contenu long), la durée approximative.",
  },
  {
    title: "Transformer un reel en carousel (et inversement)",
    category: "Repurposing",
    prompt:
      "Voici le contenu d'un [REEL ou CAROUSEL] : [CONTENU]. Transforme-le dans l'autre format ([CAROUSEL ou REEL], l'inverse de ce que je viens de donner) en gardant le même message central mais en adaptant vraiment la structure au nouveau format (un carousel a besoin d'un titre de slide 1 qui donne envie de swiper, un reel a besoin d'un rythme parlé et d'un hook filmable), pas juste couper-coller le texte.",
  },
  {
    title: "Adapter un contenu Instagram en post LinkedIn",
    category: "Repurposing",
    prompt:
      "Voici le script ou le sujet d'un contenu Instagram : [CONTENU/SUJET]. Réécris-le en post LinkedIn texte (pas de vidéo), destiné à des coachs sportifs ou entrepreneurs qui suivent mon activité de scaling via l'app. Structure LinkedIn classique : accroche courte en une ligne qui donne envie de cliquer \"voir plus\", corps en paragraphes courts et aérés (pas un pavé), la leçon ou l'angle business qui en ressort, question ouverte en fin de post pour lancer la discussion en commentaire.",
  },
];

export interface Hook {
  text: string;
  kind: "visuel" | "texte";
  category: string;
}

// ~90 hooks — pas un chiffre magique, mais volontairement large pour
// couvrir assez d'angles différents sans jamais réutiliser deux fois la
// même mécanique dans une même catégorie.
export const HOOK_BANK: Hook[] = [
  // Texte — question directe
  { text: "Tu fais cette erreur depuis combien de temps sans le savoir ?", kind: "texte", category: "Question" },
  { text: "Et si le problème n'était pas ta motivation ?", kind: "texte", category: "Question" },
  { text: "Pourquoi tu stagnes alors que tu fais tout comme il faut ?", kind: "texte", category: "Question" },
  { text: "Tu veux savoir ce que je change en premier chez un nouveau client ?", kind: "texte", category: "Question" },
  { text: "C'est quoi le truc que personne ne te dit sur [SUJET] ?", kind: "texte", category: "Question" },
  { text: "Tu t'es déjà demandé pourquoi certains progressent plus vite avec moins d'efforts ?", kind: "texte", category: "Question" },
  { text: "Depuis combien de temps tu répètes cette erreur sans t'en rendre compte ?", kind: "texte", category: "Question" },
  // Texte — chiffre choc
  { text: "90% des gens font ça à l'envers.", kind: "texte", category: "Chiffre choc" },
  { text: "Une étude sur [N] personnes a trouvé un résultat qui surprend même les coachs.", kind: "texte", category: "Chiffre choc" },
  { text: "3 minutes par jour suffisent à changer ce chiffre-là.", kind: "texte", category: "Chiffre choc" },
  { text: "Ce détail change les résultats de 30% sans changer une seule série.", kind: "texte", category: "Chiffre choc" },
  { text: "1 client sur 2 fait cette erreur la première semaine.", kind: "texte", category: "Chiffre choc" },
  { text: "En 6 semaines, voilà ce qui a vraiment changé (pas ce qu'Instagram montre).", kind: "texte", category: "Chiffre choc" },
  // Texte — erreur commune
  { text: "Arrête de faire ça si tu veux vraiment progresser.", kind: "texte", category: "Erreur commune" },
  { text: "J'ai vu cette erreur chez presque tous mes clients débutants.", kind: "texte", category: "Erreur commune" },
  { text: "Cette habitude en apparence saine te fait en réalité stagner.", kind: "texte", category: "Erreur commune" },
  { text: "Tu penses bien faire, mais voilà ce que tu loupes.", kind: "texte", category: "Erreur commune" },
  { text: "Le conseil que tout le monde donne, et qui est faux dans 80% des cas.", kind: "texte", category: "Erreur commune" },
  { text: "Voilà pourquoi ton programme parfait sur le papier ne marche pas.", kind: "texte", category: "Erreur commune" },
  // Texte — affirmation contre-intuitive
  { text: "Manger plus peut te faire perdre du poids. Voilà comment.", kind: "texte", category: "Contre-intuitif" },
  { text: "Moins de séances, plus de résultats : voilà pourquoi ça marche.", kind: "texte", category: "Contre-intuitif" },
  { text: "Le repos compte plus que la séance elle-même. Preuve à l'appui.", kind: "texte", category: "Contre-intuitif" },
  { text: "Se peser tous les jours peut ralentir ta progression.", kind: "texte", category: "Contre-intuitif" },
  { text: "Le cardio n'est pas ton pire ennemi en prise de masse.", kind: "texte", category: "Contre-intuitif" },
  // Texte — storytelling personnel
  { text: "Il y a 2 ans, j'aurais donné ce conseil à l'envers.", kind: "texte", category: "Storytelling" },
  { text: "Un client m'a écrit un message qui m'a fait changer ma façon de coacher.", kind: "texte", category: "Storytelling" },
  { text: "J'ai fait cette erreur pendant 3 ans avant de comprendre.", kind: "texte", category: "Storytelling" },
  { text: "Voilà ce qui s'est vraiment passé la première fois qu'un client a abandonné avec moi.", kind: "texte", category: "Storytelling" },
  // Texte — urgence/actualité douce
  { text: "Si tu commences ta prépa cette semaine, lis ça d'abord.", kind: "texte", category: "Urgence" },
  { text: "Avant de reprendre après tes vacances, regarde ça.", kind: "texte", category: "Urgence" },
  { text: "Dans 30 jours tu vas soit regretter, soit être content d'avoir commencé aujourd'hui.", kind: "texte", category: "Urgence" },
  // Texte — controverse douce
  { text: "Je vais me faire des ennemis avec cette vidéo, mais voilà la vérité sur [SUJET].", kind: "texte", category: "Controverse" },
  { text: "Ton coach ne te le dira peut-être pas, mais voilà ce qui compte vraiment.", kind: "texte", category: "Controverse" },
  { text: "Ce que l'industrie du fitness ne veut pas que tu saches.", kind: "texte", category: "Controverse" },
  // Texte — liste/format
  { text: "3 signes que ton programme ne te correspond plus.", kind: "texte", category: "Liste" },
  { text: "5 choses que je changerais si je recommençais de zéro.", kind: "texte", category: "Liste" },
  { text: "Les 3 questions à te poser avant de changer de programme.", kind: "texte", category: "Liste" },
  { text: "4 signaux que ton corps t'envoie et que tu ignores.", kind: "texte", category: "Liste" },
  // Visuel — action immédiate
  { text: "Commencer le geste technique dès la 1re seconde, sans intro parlée.", kind: "visuel", category: "Action" },
  { text: "Filmer le \"avant\" (posture, charge, ressenti) puis couper direct sur le \"après\" corrigé.", kind: "visuel", category: "Action" },
  { text: "Zoomer brutalement sur le détail du mouvement qui pose problème.", kind: "visuel", category: "Action" },
  { text: "Montrer l'échec d'une tentative (rep ratée) avant d'expliquer pourquoi.", kind: "visuel", category: "Action" },
  { text: "Chronométrer à l'écran une action en cours (compte à rebours visible).", kind: "visuel", category: "Action" },
  // Visuel — texte à l'écran
  { text: "Un chiffre énorme en plein écran, sans autre contexte, 1 seconde avant de parler.", kind: "visuel", category: "Texte à l'écran" },
  { text: "Une question en gros texte blanc sur fond noir, silence total pendant 1 seconde.", kind: "visuel", category: "Texte à l'écran" },
  { text: "Le mot \"FAUX\" en rouge qui claque à l'écran sur une pratique courante montrée juste avant.", kind: "visuel", category: "Texte à l'écran" },
  { text: "Un avant/après écrit à l'écran (\"Semaine 1\" -> \"Semaine 8\") avant même de montrer les images.", kind: "visuel", category: "Texte à l'écran" },
  // Visuel — expression/réaction
  { text: "Visage neutre qui se fige en gros plan avant de parler (crée l'attente).", kind: "visuel", category: "Réaction" },
  { text: "Réaction de surprise/choc filmée en train de lire un message ou un commentaire réel.", kind: "visuel", category: "Réaction" },
  { text: "Regard caméra direct et silence de 1 seconde avant la première phrase.", kind: "visuel", category: "Réaction" },
  // Visuel — split-screen / opposition
  { text: "Split-screen : toi qui joues 2 avis opposés sur le même sujet (voir fiche technique \"clone\").", kind: "visuel", category: "Opposition" },
  { text: "Côte à côte : la mauvaise version du geste à gauche, la bonne à droite, en simultané.", kind: "visuel", category: "Opposition" },
  { text: "Avant/après en split-screen vertical plutôt qu'en séquence (impact immédiat).", kind: "visuel", category: "Opposition" },
  // Visuel — objet/décor
  { text: "Montrer l'objet du contenu en gros plan avant de montrer ton visage (plat, appareil, carnet...).", kind: "visuel", category: "Objet" },
  { text: "Écrire à la main sur un carnet/tableau ce qui va être expliqué, filmé en train de s'écrire.", kind: "visuel", category: "Objet" },
  { text: "Ouvrir une appli/un tableau de suivi à l'écran comme preuve concrète (chiffres réels).", kind: "visuel", category: "Objet" },
  // Texte — comparaison sociale douce
  { text: "Ce que font différemment les 10% qui progressent vraiment.", kind: "texte", category: "Comparaison" },
  { text: "La différence entre quelqu'un qui stagne et quelqu'un qui progresse n'est pas ce que tu crois.", kind: "texte", category: "Comparaison" },
  // Texte — promesse claire
  { text: "Dans cette vidéo, tu vas repartir avec un plan concret, pas juste de la théorie.", kind: "texte", category: "Promesse" },
  { text: "À la fin de cette vidéo, tu sauras exactement quoi faire cette semaine.", kind: "texte", category: "Promesse" },
  { text: "Voilà la méthode exacte, étape par étape, pas un résumé vague.", kind: "texte", category: "Promesse" },
];

export interface CTAExample {
  text: string;
  goal: string;
}

export const CTA_EXAMPLES: CTAExample[] = [
  { text: "Si t'as reconnu au moins 2 de ces signes, commente \"MOI\" et je t'envoie le plan complet.", goal: "Engagement + capture" },
  { text: "Abonne-toi si tu veux la suite de cette méthode la semaine prochaine.", goal: "Abonnement" },
  { text: "Le guide complet est en lien dans ma bio, gratuit, pas d'excuse.", goal: "Lead magnet" },
  { text: "Tu veux qu'on regarde ta situation ensemble ? Le lien pour un appel est en bio.", goal: "Prise de RDV" },
  { text: "Dis-moi en commentaire depuis combien de temps tu galères avec ça.", goal: "Engagement" },
  { text: "Sauvegarde cette vidéo, tu vas en avoir besoin la prochaine fois que tu doutes.", goal: "Sauvegarde/reach" },
  { text: "Partage-la à la personne qui a besoin de l'entendre aujourd'hui.", goal: "Partage/reach" },
  { text: "Si cette vidéo t'a aidé, la suivante répond à la question que tout le monde me pose après ça.", goal: "Rétention série" },
  { text: "Tu veux le tableau exact que j'utilise avec mes clients ? Il est gratuit, lien en bio.", goal: "Lead magnet" },
  { text: "3 places de coaching se libèrent ce mois-ci, le lien est en bio si tu veux candidater.", goal: "Vente (rare, avec vraie rareté)" },
  { text: "Écris ta réponse en commentaire, je réponds à chacune aujourd'hui.", goal: "Engagement fort" },
  { text: "Suis-moi si tu veux qu'on démonte un mythe comme celui-là chaque semaine.", goal: "Abonnement thématique" },
];

export interface TechnicalSheet {
  title: string;
  summary: string;
  steps: string[];
}

export const TECHNICAL_SHEETS: TechnicalSheet[] = [
  {
    title: "Sous-titres qui retiennent l'attention",
    summary: "Le son est souvent coupé au scroll, sans sous-titres lisibles, le hook ne sert à rien.",
    steps: [
      "Police épaisse, grande taille (au moins 1/12e de la hauteur d'écran), fort contraste avec le fond.",
      "2-4 mots affichés à la fois maximum, synchronisés précisément avec la voix, jamais une phrase entière d'un coup.",
      "Mettre en valeur (couleur ou surlignage) le mot clé de chaque segment, pas tout le texte de la même couleur.",
      "Placer les sous-titres dans le tiers central de l'écran, jamais collés en bas où l'UI de la plateforme les recouvre.",
      "Relire l'orthographe avant export, une faute visible casse la crédibilité plus vite qu'un mauvais montage.",
    ],
  },
  {
    title: "Overlays qui appuient le propos sans surcharger",
    summary: "Un overlay doit renforcer un point précis, jamais décorer juste pour \"faire dynamique\".",
    steps: [
      "Un overlay par idée clé, jamais plus de 2-3 par vidéo courte, sinon l'œil ne sait plus où regarder.",
      "Faire apparaître l'overlay pile au moment où le mot correspondant est prononcé, pas avant, pas après.",
      "Réserver les flèches/cercles de surlignage pour pointer un détail précis à l'écran (le geste, le chiffre), pas comme simple déco.",
      "Garder une charte visuelle cohérente (mêmes couleurs, même police) d'une vidéo à l'autre pour construire une identité reconnaissable.",
      "Tester la lisibilité en miniature (taille réelle du flux) avant de considérer le montage terminé.",
    ],
  },
  {
    title: "Technique du clone (split-screen, 2 personnages en opposition)",
    summary: "Se filmer 2 fois au même endroit pour jouer 2 points de vue opposés dans une même vidéo, très efficace pour les formats mythe/réalité ou débat.",
    steps: [
      "Filmer sur trépied fixe, caméra immobile entre les deux prises, même cadrage, même distance, même lumière, sinon le raccord casse l'illusion.",
      "Se placer clairement à gauche pour le premier personnage, puis rejouer la scène en se plaçant à droite pour le second. Ne jamais chevaucher la même zone.",
      "Garder le même arrière-plan et la même tenue entre les deux prises (sauf si le contraste de tenue sert exprès le contraste des 2 avis).",
      "En montage, poser un split simple (ligne verticale nette au milieu) plutôt qu'un fondu, la coupure nette vend mieux l'idée de 2 personnes distinctes.",
      "Faire parler les deux personnages en s'interrompant/se répondant (couper vite entre les deux) plutôt que 2 monologues séparés, c'est ce qui crée la dynamique de dialogue.",
    ],
  },
  {
    title: "Structure de montage, format court (Reel/Short/TikTok)",
    summary: "0 à 2 secondes décident si la personne reste ou scrolle : chaque seconde du montage doit le savoir.",
    steps: [
      "0-2s : hook visuel ET texte simultanés, jamais un plan neutre ou un logo d'intro qui fait perdre l'attention.",
      "Coupes rapides (1 plan toutes les 2-4s) dans la partie centrale pour maintenir le rythme, plans plus longs seulement sur un moment fort.",
      "Musique posée sous la voix, jamais au-dessus. Baisser le volume musique de moitié dès que la voix commence.",
      "Dernier plan = CTA + rappel visuel du bénéfice principal, jamais un simple fondu au noir.",
      "Exporter en 9:16 natif (pas un recadrage a posteriori d'un 16:9), texte et sujet toujours dans la zone centrale sûre.",
    ],
  },
  {
    title: "Structure de montage, vidéo longue (YouTube)",
    summary: "L'objectif n'est plus le premier coup d'œil mais la rétention sur la durée : rythme différent d'un format court.",
    steps: [
      "Accroche de 20-30s qui annonce clairement ce que la vidéo va apporter, sans sur-promettre ce qui n'est pas dedans.",
      "Une transition visuelle ou sonore claire à chaque changement de partie, pour que le spectateur sente la progression.",
      "Réinjecter un rappel du bénéfice toutes les 2-3 minutes (pourquoi continuer à regarder), surtout après une partie plus technique.",
      "Utiliser des chapitres YouTube correspondant exactement à la structure du script, améliore la rétention ET le référencement.",
      "Garder un rythme de coupe plus posé que le format court (1 plan toutes les 6-10s en moyenne), sauf sur les moments de démonstration.",
    ],
  },
];
