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
      "Tu es coach sportif/nutrition, marque EP Coaching, ton direct et sans blabla, jamais de tiret dans le texte. Écris-moi 10 hooks (première phrase d'une vidéo courte) sur le sujet suivant : [SUJET]. Contrainte : chaque hook doit créer une tension ou une curiosité en une phrase, sans jamais révéler la réponse. Varie les angles : question qui revient, faux problème (« tu penses que t'as un problème de X, c'est pas du tout le cas »), mythe à casser, paradoxe, ciblage (« si tu... t'es exactement sur la bonne vidéo »), aveu. Jamais de chiffre inventé. Numérote-les, une phrase par hook, pas de blabla explicatif autour.",
  },
  {
    title: "Script Reel/Short (30-60s)",
    category: "Script",
    prompt:
      "Écris-moi le script complet d'un Reel/Short de 30 à 45 secondes sur : [SUJET]. Structure imposée : hook (1 phrase, 0-2s), problème/tension (2-3 phrases), le point clé à retenir (le cœur du contenu, avec un exemple concret si possible), punchline courte, puis l'appel à commenter (numéro du guide ou mot clé, jamais « lien en bio »). Ton : coach direct, tutoiement, jamais de tiret. Indique aussi entre crochets ce qui doit être filmé/montré à chaque étape (ex. [face caméra], [démo geste technique], [texte à l'écran]).",
  },
  {
    title: "10 variantes de concept vidéo sur un thème",
    category: "Concept",
    prompt:
      "À partir de ce thème : [THÈME], propose-moi 10 concepts de vidéo totalement différents (pas 10 variations du même angle) : un format liste, un format mythe/réalité, un format \"j'ai testé X pendant Y jours\", un format réaction à une pratique courante, un format avant/après une erreur corrigée, un format question de communauté, un format duo (2 avis qui s'opposent), un format démonstration technique, un format storytelling personnel, un format calcul simple fait à l'écran (« regarde bien ce calcul »). Une phrase de pitch par concept.",
  },
  {
    title: "Description d'un reel ou d'une vidéo YouTube",
    category: "Description",
    prompt:
      "Écris-moi la description de cette vidéo : [RÉSUMÉ DE LA VIDÉO], plateforme : [REEL ou YOUTUBE]. REEL (Instagram, TikTok, Shorts, Facebook) : ligne 1 « Abonne toi », puis 3 à 4 lignes courtes en tu avec les mots de la vidéo (la fausse croyance, ce qu'elle coûte, le vrai déclic), dernière ligne : le même appel à commenter que dans la vidéo (« Commente [NUMÉRO DU GUIDE] pour recevoir le guide » ou un mot clé). Jamais de lien, jamais « lien en bio ». YOUTUBE : première ligne = le lien du guide gratuit [LIEN] avec une phrase qui donne envie, puis 2 ou 3 phrases simples, puis le lien de l'appli, puis 3 à 5 hashtags. Jamais de chapitres ni de timecodes.",
  },
  {
    title: "10 CTA différents pour la même offre",
    category: "CTA",
    prompt:
      "Écris-moi 10 appels à l'action différents (une phrase chacun) pour donner envie de [ACTION : recevoir le guide gratuit / essayer l'appli / prendre un appel], plateforme : [REEL / YOUTUBE / LINKEDIN / THREADS]. REEL : on fait commenter le numéro du guide ([NUMÉRO]) ou un mot clé en majuscules (PROG, DIETE, COACHING, APPLI...), ex. « Commente 131, ça prend 15 secondes, et je te l'envoie ». YOUTUBE : « le lien est dans la description ». LINKEDIN et THREADS : le lien seul sur sa ligne, ou une question, jamais les deux. Jamais « lien en bio ». Toujours relier l'appel à ce que la personne obtient tout de suite. Varie le registre : simple, curiosité, défi, question directe.",
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
      "Pour cette vidéo YouTube : [RÉSUMÉ DE LA VIDÉO, avec la douleur du spectateur et ce qu'il repart avec]. Propose-moi 8 titres, 2 par angle : curiosité (un manque à combler), résultat (ce qu'il repart avec), erreur (ce qu'il faut arrêter), contre-pied (on renverse une idée reçue). Chaque titre : moins de 60 caractères, une vraie phrase ou une vraie question (jamais un fragment coupé par deux-points), des mots simples du quotidien, un élément concret (chiffre ou objet), une promesse tenue dans la vidéo, aucun mot d'appât ni tiret cadratin. Note chacun sur 100 (longueur, phrase, tu, contraste, concret, mots simples, aucun appât) et garde les 3 meilleurs. Ensuite, pour le meilleur, deux miniatures A et B qui ne diffèrent que d'une variable : composition, émotion du visage, objet unique, contraste, et un texte facultatif de 2 à 4 mots qui crée une tension avec le titre au lieu de le répéter. Aucun logo, aucun chiffre qui ne soit pas dans la vidéo.",
  },
  {
    title: "Plan de vidéo YouTube longue (8-15 min)",
    category: "YouTube",
    prompt:
      "Écris-moi le plan détaillé (pas le script mot à mot) d'une vidéo YouTube de 10 à 14 minutes sur : [SUJET]. Chronologie : hook de 0 à 30 secondes (une douleur ou une question avec les mots du spectateur, la promesse du titre tenue dans les 10 premières secondes), présentation et promesse (ce qu'il repart avec, le nombre de parties, la ressource gratuite en description, une boucle ouverte : le point que tu révèles à la fin), 3 à 5 parties annoncées à l'oral avec pour chacune le problème, ce qui se passe vraiment, que faire, un exemple chiffré vérifiable et une transition qui donne envie de la suite, une relance toutes les 2 à 3 minutes (« regarde bien ce calcul », « retiens bien ça », « mets pause et fais-le »), un rappel de la description vers le milieu juste après un moment de forte valeur, la boucle refermée sur le dernier point, un récap (« donc si je devais récapituler »), puis 2 ou 3 demandes de fin (s'abonner, le guide gratuit et l'appel en description). Termine par un plan de chapitres horodatés pour le montage (jamais écrits dans le texte parlé). Public : pratiquants qui veulent des réponses fiables, pas du contenu marketing creux.",
  },
  {
    title: "3 hooks de types différents pour une vidéo YouTube",
    category: "YouTube",
    prompt:
      "Pour cette vidéo YouTube : [SUJET ET DOULEUR DU SPECTATEUR]. Écris 3 hooks parlés de 30 secondes maximum, de 3 types différents parmi : faux problème (« tu penses que ton problème, c'est X, en réalité c'est Y »), paradoxe (« tu peux X et ne jamais Y »), vérité qui dérange, mythe, ciblage (« si tu X mais que Y, t'es sur la bonne vidéo »), question directe, mise en garde, chiffre fermé (« il y a que trois raisons, pas dix »), comparaison visuelle, prédiction et choix, boucle ouverte. Chaque hook nomme la douleur la plus précise en moins de 2 secondes avec les mots du spectateur, sans « aujourd'hui on va parler de », sans « salut c'est », sans chiffre de résultat inventé. Indique le type de chacun, garde le plus fort et dis pourquoi.",
  },
  {
    title: "Audit de rétention d'un script YouTube",
    category: "YouTube",
    prompt:
      "Voici le script d'une vidéo YouTube : [SCRIPT]. Audite sa rétention comme un éditeur exigeant : le hook tient-il en 30 secondes, la promesse et le plan sont-ils clairs dans les 90 premières secondes, y a-t-il une boucle ouverte refermée avant la fin, une relance au moins toutes les 3 minutes (repère le plus long passage sans relance), la ressource gratuite annoncée tôt puis rappelée vers le milieu, un récap, 2 ou 3 demandes de fin. Cite les passages exacts qui perdent le spectateur et propose pour chacun une réécriture avec les mots du script, sans inventer de chiffre ni d'étude. Rends ensuite le plan de chapitres horodatés (estimés au nombre de mots, 2,3 mots par seconde).",
  },
  {
    title: "Clips pour reels tirés d'une vidéo longue",
    category: "Repurposing",
    prompt:
      "Voici le script d'une de mes vidéos YouTube : [SCRIPT]. Repère 4 à 6 passages de 30 à 60 secondes qui tiennent seuls, avec chacun une idée complète. Pour chaque clip : le passage exact, 4 titres hook de 3 à 7 mots sans aucune ponctuation faits uniquement avec les mots du passage (une mécanique différente chacun), et la description : ligne 1 « Abonne toi », 2 ou 3 lignes courtes avec les mots du passage, dernière ligne exactement « Commente « VIDEO » pour recevoir la vidéo complète ». Ne cite jamais YouTube dans cet appel à commenter.",
  },
  {
    title: "Description YouTube au modèle d'Emmanuel",
    category: "Description",
    prompt:
      "Écris la description de cette vidéo YouTube : [SCRIPT OU RÉSUMÉ] avec le guide [SLUG DU GUIDE]. Ordre exact : 1) une phrase qui donne envie puis le lien nu du guide (https://ep-coaching.vercel.app/ressources/[slug]) ; 2) un paragraphe « Tu penses que ton problème, c'est X. En réalité, il est en amont : Y. » puis « Dans cette vidéo, je te montre... » ; 3) une phrase règle qui claque ; 4) une question simple pour les commentaires ; 5) « Abonne-toi si tu veux plus de vidéos sur [thèmes]. Bon visionnage ! » ; 6) les liens nus un par ligne avec un libellé (appli avec essai gratuit, réserver un appel, site, Instagram) ; 7) « qui je suis » en 2 ou 3 phrases vraies ; 8) 3 à 5 hashtags. Pas de chapitre dans la description sauf demande, aucun chiffre de résultat inventé, aucune étude citée, pas de tiret cadratin. Les titres alternatifs et l'idée de miniature restent en note interne, jamais dans la description.",
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
      "Écris-moi un script court (30-45s) qui s'adresse spécifiquement à des coachs sportifs qui veulent plus de clients (pas à mes clients finaux), sur ce sujet : [SUJET, ex. un outil, une erreur de business, un chiffre à suivre]. Ton toujours direct et concret, jamais de langage \"business coach\" générique, un vrai retour d'expérience ou un vrai raisonnement, jamais de statistique ou de résultat client inventé.",
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
    title: "Adapter un reel en post LinkedIn",
    category: "Repurposing",
    prompt:
      "Voici le script ou le sujet d'un reel : [CONTENU/SUJET]. Réécris-le en post LinkedIn texte (pas de vidéo). Les 2 premières lignes font tout : une phrase courte qui frappe une douleur ou une idée reçue, puis une ligne qui donne envie de lire la suite. Une idée par ligne, beaucoup d'air, rythme parlé, du vécu réel (jamais inventé). Fin : UNE phrase qui donne une raison de cliquer puis le lien seul sur sa ligne, OU une question qui fait réagir. Zéro hashtag en rafale, zéro emoji décoratif.",
  },
  {
    title: "Adapter un reel en post Threads",
    category: "Repurposing",
    prompt:
      "Voici le script ou le sujet d'un reel : [CONTENU/SUJET]. Transforme-le en post Threads : 3 à 6 lignes maximum, tutoiement, une seule idée, une prise de position assumée dès la première ligne, comme si tu parlais à un pote à la salle. Pas de lien (sauf si je te le demande), pas de hashtag. Termine par une question courte ou une phrase qui marque. Donne-moi 3 versions avec un angle différent.",
  },
  {
    title: "5 titres hook + description à partir du transcript de mon reel",
    category: "Script",
    prompt:
      "Voici le transcript d'un reel que j'ai déjà tourné : [TRANSCRIPT]. Comprends d'abord de quoi parle VRAIMENT la vidéo et reste strictement dans ce sujet. Livre uniquement : 5 titres hook (texte à l'écran) de 3 à 7 mots, AUCUNE ponctuation, chacun sur une douleur précise et avec une mécanique différente ; puis la description : ligne 1 « Abonne toi », 3 à 4 lignes courtes avec les mots du transcript, dernière ligne = l'appel à commenter dit dans la vidéo. Uniquement des mots présents dans le transcript ou dans les règles d'écriture ci-dessus. Relis-toi et corrige avant de répondre.",
  },
  {
    title: "4 titres hook + description d'un clip tiré d'une vidéo YouTube",
    category: "Script",
    prompt:
      "Voici le transcript d'un clip découpé dans une de mes vidéos YouTube : [TRANSCRIPT]. Comprends d'abord de quoi parle VRAIMENT le clip et reste strictement dans ce sujet. Livre uniquement : 4 titres hook (texte à l'écran) de 3 à 7 mots, AUCUNE ponctuation, chacun sur une douleur précise avec une mécanique différente ; puis une description courte : ligne 1 « Abonne toi », 2 à 3 lignes courtes avec les mots du transcript, dernière ligne exactement : « Commente « VIDEO » pour recevoir la vidéo complète ». Le mot-clé reste toujours VIDEO, ne le change pas selon le sujet, et ne cite jamais YouTube dans cet appel à commenter. Uniquement des mots présents dans le transcript. Relis-toi et corrige avant de répondre.",
  },
];

export interface Hook {
  text: string;
  kind: "visuel" | "texte";
  category: string;
}

// Banque refaite le 2026-10-13 avec le Dictionnaire EP Coaching (Notion) :
// uniquement des tournures réellement dites par les créateurs de la niche,
// adaptées au fitness. L'ancienne banque contenait des hooks qui sortaient
// des règles (« une étude sur N personnes », pourcentages inventés,
// témoignages client inventés) : retirés. Les hooks visuels restent, ce ne
// sont pas des mots mais des plans à filmer.
export const HOOK_BANK: Hook[] = [
  // Question ou douleur qui revient
  { text: "Comment [construire ta diète en sèche] ? C'est une question qui revient extrêmement souvent.", kind: "texte", category: "Question" },
  { text: "Tu sais c'est quoi le vrai problème aujourd'hui ?", kind: "texte", category: "Question" },
  { text: "C'est quoi la croyance qui t'a le plus bloqué ?", kind: "texte", category: "Question" },
  { text: "Qu'est-ce qui pourrait t'empêcher de [perdre tes 5 derniers kilos] ?", kind: "texte", category: "Question" },
  { text: "Ça fait [trois mois] que [tu t'entraînes dur] et rien ne bouge ?", kind: "texte", category: "Question" },
  // Faux problème, mythe
  { text: "Tu penses que t'as un problème de [motivation]. C'est pas du tout le cas.", kind: "texte", category: "Faux problème" },
  { text: "La majorité des gens pensent qu'ils ont un problème de [génétique]. C'est pas du tout le cas.", kind: "texte", category: "Faux problème" },
  { text: "Tu ne manques pas d'infos sur la muscu. Tu manques de priorités.", kind: "texte", category: "Faux problème" },
  { text: "J'aimerais casser un petit peu un mythe : [tu vas détruire ton métabolisme].", kind: "texte", category: "Mythe" },
  { text: "Et si ce qu'on te répète sur [la sèche] était faux ? Pas un peu faux. Complètement faux.", kind: "texte", category: "Mythe" },
  { text: "C'est probablement la phrase la plus répétée dans le coaching : [phrase].", kind: "texte", category: "Mythe" },
  { text: "Tu penses que [prendre du muscle] c'est compliqué. En vrai, c'est beaucoup plus simple que tu ne le penses.", kind: "texte", category: "Mythe" },
  { text: "La grosse chose évidente, c'est ça le problème. Pas les 100 détails.", kind: "texte", category: "Faux problème" },
  { text: "Une douleur n'arrive jamais sans raison.", kind: "texte", category: "Mise en garde" },
  { text: "Quand t'as une douleur en séance, c'est jamais normal.", kind: "texte", category: "Mise en garde" },
  // Paradoxe et règle courte
  { text: "Tu peux t'entraîner plus dur que tout le monde et ne rien voir bouger.", kind: "texte", category: "Paradoxe" },
  { text: "Proposer tout, c'est proposer rien.", kind: "texte", category: "Paradoxe" },
  { text: "Le meilleur plan, c'est celui que tu suis.", kind: "texte", category: "Règle courte" },
  { text: "Avant de changer de programme, fais mieux celui qui marche déjà.", kind: "texte", category: "Règle courte" },
  { text: "Ta diète se juge sur la semaine. Pas sur une journée.", kind: "texte", category: "Règle courte" },
  // Ciblage
  { text: "Si tu t'entraînes depuis un an et que rien ne bouge, t'es exactement sur la bonne vidéo.", kind: "texte", category: "Ciblage" },
  { text: "Si tu manges énormément et que tu prends rien, écoute bien cette courte vidéo jusqu'au bout.", kind: "texte", category: "Ciblage" },
  { text: "Coachs : si ton agenda est plein mais que tu gagnes pas ta vie, t'es sur la bonne vidéo.", kind: "texte", category: "Ciblage" },
  // Ton direct, aveu
  { text: "Je vais aller droit au but : [ta prise de masse] bloque pour une raison très simple.", kind: "texte", category: "Direct" },
  { text: "Ras le bol, on met les choses au clair : [un coach ne peut pas faire tes séances à ta place].", kind: "texte", category: "Direct" },
  { text: "Je me suis fait avoir aussi quand j'ai commencé. L'objectif, c'est que ça soit la dernière fois pour toi.", kind: "texte", category: "Aveu" },
  { text: "Tout le monde s'est fait avoir au moins une fois, et moi le premier.", kind: "texte", category: "Aveu" },
  { text: "Je suis désolé, mais je me dois de te dire quelque chose.", kind: "texte", category: "Direct" },
  // Promesse
  { text: "[Perdre du poids] et [perdre du gras], c'est pas la même chose. Et je vais t'expliquer pourquoi.", kind: "texte", category: "Promesse" },
  { text: "Tu vas plus jamais regarder [ta balance] de la même manière.", kind: "texte", category: "Promesse" },
  { text: "On va pas se soucier des opinions. On va regarder ce qui marche.", kind: "texte", category: "Promesse" },
  // Visuel — action immédiate
  { text: "Commencer le geste technique dès la 1re seconde, sans intro parlée.", kind: "visuel", category: "Action" },
  { text: "Filmer le \"avant\" (posture, charge, ressenti) puis couper direct sur le \"après\" corrigé.", kind: "visuel", category: "Action" },
  { text: "Zoomer brutalement sur le détail du mouvement qui pose problème.", kind: "visuel", category: "Action" },
  { text: "Montrer une rep ratée avant d'expliquer pourquoi.", kind: "visuel", category: "Action" },
  // Visuel — texte à l'écran
  { text: "Une question en gros texte sur fond noir, silence total pendant 1 seconde.", kind: "visuel", category: "Texte à l'écran" },
  { text: "Le mot \"FAUX\" qui claque à l'écran sur une pratique courante montrée juste avant.", kind: "visuel", category: "Texte à l'écran" },
  { text: "Le calcul écrit à l'écran pendant que tu le dis (« regarde bien ce calcul »).", kind: "visuel", category: "Texte à l'écran" },
  // Visuel — réaction, opposition
  { text: "Regard caméra direct et silence de 1 seconde avant la première phrase.", kind: "visuel", category: "Réaction" },
  { text: "Une personne en filme une autre en train d'utiliser l'appli, comme un snap (format duo).", kind: "visuel", category: "Réaction" },
  { text: "Split-screen : toi qui joues 2 avis opposés sur le même sujet (voir fiche technique \"clone\").", kind: "visuel", category: "Opposition" },
  { text: "Côte à côte : la mauvaise version du geste à gauche, la bonne à droite, en simultané.", kind: "visuel", category: "Opposition" },
  // Visuel — objet, preuve
  { text: "Filmer le téléphone avec un autre téléphone : l'appli en vrai, un hook par-dessus (jamais un enregistrement d'écran collé).", kind: "visuel", category: "Preuve" },
  { text: "Montrer l'assiette pesée en gros plan avant de montrer ton visage.", kind: "visuel", category: "Objet" },
  { text: "Écrire à la main sur un carnet ce qui va être expliqué, filmé en train de s'écrire.", kind: "visuel", category: "Objet" },
  { text: "Green screen sur une actu ou un post qui tourne, puis ta réponse face cam.", kind: "visuel", category: "Actu" },
];

export interface CTAExample {
  text: string;
  goal: string;
}

// Refait le 2026-10-13 (règles du fondateur du 2026-10-08, Instagram et
// Threads de retour) : un reel fait COMMENTER (numéro du guide ou mot clé),
// une vidéo YouTube renvoie en description, un post écrit met un lien OU
// une question. Plus jamais « lien en bio ». Formules du Dictionnaire.
export const CTA_EXAMPLES: CTAExample[] = [
  { text: "Commente [131] et je te l'envoie.", goal: "Reel · guide gratuit (numéro du guide)" },
  { text: "Commente [131], ça prend 15 secondes, et je t'envoie le guide.", goal: "Reel · guide gratuit" },
  { text: "Mets [290] en commentaire, un seul, et je t'envoie la checklist.", goal: "Reel · guide gratuit" },
  { text: "Commente PROG, un seul mot, et je t'envoie ton programme dans l'appli.", goal: "Reel · appli (programme)" },
  { text: "Mets DIETE en commentaire et je t'envoie tout.", goal: "Reel · appli (diète)" },
  { text: "Commente COACHING si tu veux qu'on regarde ta situation ensemble.", goal: "Reel · coaching" },
  { text: "Le lien du guide gratuit est dans la description, c'est évidemment gratuit.", goal: "YouTube · guide" },
  { text: "Si tu veux qu'on regarde ta situation ensemble, le lien pour réserver un appel est dans la description. Sinon, applique ce que tu vois dans cette vidéo, c'est gratuit.", goal: "YouTube · appel" },
  { text: "Abonne-toi si c'est pas déjà fait, il y aura toujours quelque chose d'utile pour ta progression.", goal: "YouTube · abonnement" },
  { text: "Dis-moi en commentaire où tu bloques en ce moment.", goal: "Engagement (tous formats)" },
  { text: "Envoie cette vidéo à quelqu'un qui s'entraîne dur et qui ne voit rien bouger.", goal: "Partage" },
  { text: "Le guide qui fait tout le calcul pour toi est juste ici :\nep-coaching.vercel.app/ressources/[slug]", goal: "LinkedIn · lien seul sur sa ligne" },
  { text: "Et toi, c'est quoi la croyance qui t'a le plus bloqué ?", goal: "LinkedIn / Threads · question" },
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
      "Prévoir des chapitres horodatés qui suivent exactement les parties du script : ils guident le montage (une transition visuelle à chaque chapitre) et, si tu le décides, la description. Jamais écrits dans le texte parlé.",
      "Garder un rythme de coupe plus posé que le format court (1 plan toutes les 6-10s en moyenne), sauf sur les moments de démonstration.",
    ],
  },
];
