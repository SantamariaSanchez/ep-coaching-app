// Bibliothèque de modèles d'e-mail pour l'onglet Mailing (retour direct
// 2026-09-10 : "améliore l'onglet, mets une centaine de templates, vraiment
// tout type"). Un coach choisit un modèle dans CoachMailingComposer, le
// sujet/corps préremplit le composeur, il choisit ensuite ses destinataires
// et envoie normalement — rien de nouveau côté envoi, cette bibliothèque
// alimente juste le composeur existant plus vite qu'une page blanche.
//
// {{contact.FIRSTNAME}} : syntaxe Brevo standard, remplacée automatiquement
// par le prénom réel de chaque destinataire à l'envoi (l'attribut FIRSTNAME
// est déjà synchronisé sur chaque contact, voir lib/brevo-mailing.ts). Pas
// besoin d'un système de personnalisation maison, Brevo le fait nativement.
//
// Contenu volontairement HTML simple (<b>, <a href>, <br>, <p>) : c'est ce
// que wrapBrandedEmail() habille automatiquement avec le bandeau de marque,
// jamais un document HTML complet (voir lib/mailing-audience.ts).

export interface MailTemplate {
  key: string;
  category: string;
  name: string;
  subject: string;
  body: string;
}

export const MAIL_CATEGORY_LABELS: Record<string, string> = {
  bienvenue: "Bienvenue",
  relance: "Relance",
  motivation: "Motivation",
  annonce_app: "Nouveauté app",
  contenu: "Nouveau contenu",
  evenement: "Événement",
  programme: "Programme & nutrition",
  avis: "Avis & témoignage",
  parrainage: "Parrainage",
  saison: "Saisonnier",
  reengagement: "Réengagement",
  anniversaire: "Anniversaire",
  paiement: "Paiement",
  competition: "Prep & compétition",
  business: "Coach à coach",
};

export const MAIL_CATEGORY_ORDER = Object.keys(MAIL_CATEGORY_LABELS);

export const MAIL_TEMPLATES: MailTemplate[] = [
  // ─────────────────────────── BIENVENUE ───────────────────────────
  {
    key: "bienvenue-01",
    category: "bienvenue",
    name: "Bienvenue nouveau client",
    subject: "Bienvenue chez EP Coaching, {{contact.FIRSTNAME}}",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ton compte est actif, ton programme et ton plan nutrition t'attendent dans l'appli. Première étape simple : fais ton premier bilan du jour, ça prend deux minutes et ça me permet de voir où tu en es vraiment.</p><p>Si un truc n'est pas clair dans l'appli, écris-moi direct en messagerie, je réponds.</p><p>On commence.</p>",
  },
  {
    key: "bienvenue-02",
    category: "bienvenue",
    name: "Bienvenue, les 3 premiers jours",
    subject: "Ce qu'il faut faire dans les 3 premiers jours",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Trois choses avant tout le reste :</p><p>1. Bilan du jour, chaque jour, même court.<br>2. Ton premier repas loggué dans Nutrition.<br>3. Ta première séance dans Training.</p><p>Le reste (recettes, formations, communauté) tu le découvres à ton rythme. Mais ces trois-là, c'est ce qui fait qu'un accompagnement marche ou pas.</p>",
  },
  {
    key: "bienvenue-03",
    category: "bienvenue",
    name: "Bienvenue coach tiers (accès app)",
    subject: "Ton accès EP Coaching est prêt",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ton compte coach est actif. Tu peux dès maintenant créer ton premier programme, ta première diète, et inviter ton premier client avec ton lien d'invitation (dans Paramètres).</p><p>Une question sur l'appli ou sur comment structurer ton offre dedans, je suis dispo.</p>",
  },
  {
    key: "bienvenue-04",
    category: "bienvenue",
    name: "Bienvenue, présentation rapide de l'appli",
    subject: "Un tour rapide de ce que tu as sous la main",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Vite fait, ce que tu as dans l'appli : ton programme de musculation, ta nutrition ajustée automatiquement, ton suivi (poids, sommeil, pas), tes formations, et moi en messagerie direct.</p><p>Pas besoin de tout explorer aujourd'hui. Commence par le bilan du jour, le reste suit naturellement.</p>",
  },
  {
    key: "bienvenue-05",
    category: "bienvenue",
    name: "Bienvenue après onboarding rempli",
    subject: "J'ai regardé ton profil, {{contact.FIRSTNAME}}",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Je viens de lire tes réponses d'onboarding. J'ai une idée claire de ta situation et de ton objectif, ton programme est construit en conséquence.</p><p>Si quelque chose a changé depuis (emploi du temps, matériel, douleur), dis-le-moi avant ta première séance, j'ajuste tout de suite.</p>",
  },
  {
    key: "bienvenue-06",
    category: "bienvenue",
    name: "Bienvenue membre gratuit",
    subject: "Bienvenue dans la communauté EP Coaching",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ton compte gratuit est actif : recettes, exercices, formations en libre accès, communauté. De quoi déjà bien avancer par toi-même.</p><p>Si à un moment tu sens que tu veux un vrai suivi personnalisé (programme sur-mesure, ajustements en continu, accès direct à un coach), tu sais où me trouver.</p>",
  },
  {
    key: "bienvenue-07",
    category: "bienvenue",
    name: "Bienvenue, check-in à J+7",
    subject: "Une semaine, comment ça se passe ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ça fait une semaine. Comment tu te sens sur le programme, sur la nutrition, sur l'appli en général ?</p><p>Réponds-moi honnêtement, même si c'est pour dire que quelque chose ne te convient pas. C'est exactement le moment où un ajustement change tout pour la suite.</p>",
  },

  // ─────────────────────────── RELANCE ───────────────────────────
  {
    key: "relance-01",
    category: "relance",
    name: "Relance bilan manquant (douce)",
    subject: "Tout va bien, {{contact.FIRSTNAME}} ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>J'ai remarqué que ton dernier bilan remonte à quelques jours. Aucun souci si la semaine a été chargée, je voulais juste prendre des nouvelles.</p><p>Un bilan même très court (30 secondes) me suffit pour rester à jour sur toi. Dis-moi où tu en es.</p>",
  },
  {
    key: "relance-02",
    category: "relance",
    name: "Relance nutrition non loguée",
    subject: "Ton suivi nutrition s'est arrêté",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ça fait quelques jours sans log nutrition de ton côté. C'est souvent le premier truc qui lâche quand le quotidien devient chargé, c'est normal.</p><p>Pas besoin d'être parfait, juste de reprendre un repas à la fois. Tu logues ton prochain repas aujourd'hui ?</p>",
  },
  {
    key: "relance-03",
    category: "relance",
    name: "Relance séance manquée",
    subject: "Séance manquée cette semaine, on ajuste ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>J'ai vu que la séance prévue n'a pas été faite. Si c'est ponctuel, aucun problème, ça arrive à tout le monde.</p><p>Si c'est le planning qui coince en ce moment, dis-le-moi, on peut réorganiser la semaine ensemble plutôt que de la sauter en silence.</p>",
  },
  {
    key: "relance-04",
    category: "relance",
    name: "Relance longue absence",
    subject: "{{contact.FIRSTNAME}}, on n'a plus de nouvelles",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ça fait un moment qu'on n'a plus de signal de ton côté sur l'appli. Je préfère te le dire directement plutôt que de laisser traîner : est-ce que tout va bien ?</p><p>Que ce soit pour reprendre, mettre en pause, ou juste parler de ce qui bloque, réponds-moi, même juste un mot.</p>",
  },
  {
    key: "relance-05",
    category: "relance",
    name: "Relance après plateau détecté",
    subject: "J'ai regardé ton logbook, on ajuste",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ta progression stagne depuis quelques semaines sur plusieurs mouvements. C'est le moment normal où on ajuste, pas un échec de ta part.</p><p>Réponds-moi avec ton ressenti général (fatigue, sommeil, stress) et je te fais un ajustement de plan cette semaine.</p>",
  },
  {
    key: "relance-06",
    category: "relance",
    name: "Relance paiement en attente",
    subject: "Petit point sur ton abonnement",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ton dernier paiement n'est pas passé. Ça arrive souvent pour une carte expirée ou un plafond atteint, rien de grave.</p><p>Peux-tu vérifier tes infos de paiement dès que possible pour ne pas perdre l'accès à ton suivi ? Dis-moi si tu as besoin d'aide.</p>",
  },
  {
    key: "relance-07",
    category: "relance",
    name: "Relance formation commencée non finie",
    subject: "Tu avais commencé cette formation",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Tu avais démarré une formation dans l'appli et tu t'es arrêté en cours de route. Pas de jugement, juste un rappel amical : le contenu qui reste peut vraiment t'aider sur ce que tu vis en ce moment.</p><p>Cinq minutes suffisent pour reprendre là où tu t'étais arrêté.</p>",
  },
  {
    key: "relance-08",
    category: "relance",
    name: "Relance ultime avant pause automatique",
    subject: "Dernière relance avant de te laisser tranquille",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Je t'ai relancé plusieurs fois sans réponse. Je respecte totalement si tu veux faire une pause ou arrêter, dis-le-moi juste pour que je sache où on en est.</p><p>Si tu veux reprendre, la porte reste ouverte quand tu veux, pas de pression.</p>",
  },

  // ─────────────────────────── MOTIVATION ───────────────────────────
  {
    key: "motivation-01",
    category: "motivation",
    name: "Félicitations record personnel",
    subject: "Bravo pour ce nouveau record, {{contact.FIRSTNAME}}",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>J'ai vu ton record personnel dans le logbook. C'est le résultat direct de la régularité que tu mets depuis le début, pas de la chance.</p><p>Continue comme ça, c'est exactement ce qui construit les résultats sur la durée.</p>",
  },
  {
    key: "motivation-02",
    category: "motivation",
    name: "Félicitations streak bilan",
    subject: "Ta régularité est impressionnante",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ça fait plusieurs semaines que tu ne loupes pas un bilan. C'est justement ce genre de constance, invisible au jour le jour, qui fait toute la différence sur 6 mois.</p><p>Je voulais juste te le dire, continue.</p>",
  },
  {
    key: "motivation-03",
    category: "motivation",
    name: "Encouragement après un coup dur",
    subject: "Une mauvaise semaine ne change rien au fond",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>J'ai vu que la semaine a été compliquée sur le suivi. C'est normal, ça arrive à tout le monde, y compris aux athlètes confirmés.</p><p>Ce qui compte, c'est de reprendre normalement dès demain, sans culpabiliser sur ce qui vient de se passer.</p>",
  },
  {
    key: "motivation-04",
    category: "motivation",
    name: "Rappel de l'objectif de départ",
    subject: "Tu te souviens pourquoi tu as commencé ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Petit rappel de ton objectif de départ : c'est celui que tu m'as donné dans ton onboarding. Où que tu en sois aujourd'hui, tu es plus proche qu'au jour zéro.</p><p>Garde le cap, les résultats arrivent toujours plus tard qu'on ne le voudrait, mais ils arrivent.</p>",
  },
  {
    key: "motivation-05",
    category: "motivation",
    name: "Félicitations transformation visible",
    subject: "Ta transformation se voit vraiment",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>J'ai comparé tes photos de progression, la différence est nette. C'est le genre de résultat qui prend du temps à se voir de l'intérieur, mais qui se voit très clairement de l'extérieur.</p><p>Fier de ce que tu as fait, continue.</p>",
  },
  {
    key: "motivation-06",
    category: "motivation",
    name: "Motivation mi-parcours objectif",
    subject: "Tu es à mi-chemin de ton objectif",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>D'après ta roadmap, tu es à mi-parcours de ton objectif actuel. C'est souvent le moment où la motivation initiale retombe un peu, avant que les résultats concrets prennent le relais.</p><p>Tiens bon sur la deuxième moitié, c'est celle qui compte le plus.</p>",
  },
  {
    key: "motivation-07",
    category: "motivation",
    name: "Motivation lundi de reprise",
    subject: "Nouvelle semaine, on repart",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Nouvelle semaine qui commence. Peu importe comment s'est terminée la précédente, aujourd'hui c'est une nouvelle occasion de cocher ton bilan et ta séance.</p><p>Une semaine à la fois, c'est comme ça que ça se construit.</p>",
  },
  {
    key: "motivation-08",
    category: "motivation",
    name: "Félicitations objectif de phase atteint",
    subject: "Objectif de phase atteint, {{contact.FIRSTNAME}}",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Tu viens d'atteindre l'objectif de ta phase actuelle. On va regarder ensemble la suite (nouvelle phase, ajustement d'objectif) dans les prochains jours.</p><p>En attendant, prends un moment pour réaliser le chemin parcouru depuis le début.</p>",
  },

  // ─────────────────────────── NOUVEAUTÉ APP ───────────────────────────
  {
    key: "annonce_app-01",
    category: "annonce_app",
    name: "Nouvelle fonctionnalité générale",
    subject: "Une nouveauté vient d'arriver dans l'appli",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Une nouvelle fonctionnalité est disponible dans ton espace. Je te laisse la découvrir directement dans l'appli, dans l'onglet concerné.</p><p>Dis-moi ce que tu en penses une fois testée, ton retour compte vraiment pour la suite.</p>",
  },
  {
    key: "annonce_app-02",
    category: "annonce_app",
    name: "Amélioration du tracker nutrition",
    subject: "Le suivi nutrition vient d'être amélioré",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Le suivi nutrition dans l'appli vient d'être amélioré (plus rapide, plus clair, moins d'étapes pour logger un repas). Va y jeter un œil au prochain repas que tu logues.</p><p>Si tu vois un souci, préviens-moi direct, je corrige vite.</p>",
  },
  {
    key: "annonce_app-03",
    category: "annonce_app",
    name: "Nouvel onglet ou nouvelle page",
    subject: "Un nouvel espace vient de s'ouvrir dans l'appli",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Un nouvel espace est disponible dans ton tableau de bord. Il répond à une demande qui revenait souvent, j'espère qu'il va vraiment te servir au quotidien.</p><p>Va y faire un tour quand tu as deux minutes.</p>",
  },
  {
    key: "annonce_app-04",
    category: "annonce_app",
    name: "Correctif de bug important",
    subject: "Un problème signalé a été corrigé",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Un bug que tu m'avais peut-être signalé (ou que d'autres ont remonté) vient d'être corrigé. Ferme complètement l'appli et rouvre-la pour être sûr de charger la dernière version.</p><p>Merci d'avoir remonté ce genre de souci, ça aide vraiment à améliorer l'appli pour tout le monde.</p>",
  },
  {
    key: "annonce_app-05",
    category: "annonce_app",
    name: "Rappel activer les notifications",
    subject: "Active tes notifications pour ne rien manquer",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Petit rappel : si tes notifications ne sont pas activées, tu peux rater tes rappels de repas, de séance, ou mes messages.</p><p>Ça se fait en un clic dans Paramètres, ça prend dix secondes et ça change vraiment le suivi au quotidien.</p>",
  },
  {
    key: "annonce_app-06",
    category: "annonce_app",
    name: "Nouvelle fonctionnalité gamification",
    subject: "De nouveaux rangs et récompenses sont dispos",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Le système de progression de l'appli (rangs, points, récompenses) vient d'évoluer. Chaque bilan, chaque séance, chaque repas loggué te fait avancer.</p><p>Regarde où tu en es dans ton profil, tu es sûrement plus avancé que tu ne le penses.</p>",
  },
  {
    key: "annonce_app-07",
    category: "annonce_app",
    name: "Installation de l'appli sur l'écran d'accueil",
    subject: "Installe l'appli sur ton téléphone",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Si ce n'est pas déjà fait, installe l'appli directement sur l'écran d'accueil de ton téléphone (pas besoin de passer par un store). Tu l'ouvres alors comme une vraie appli, en un clic.</p><p>Le bouton d'installation est visible dans Paramètres si ton navigateur le permet.</p>",
  },

  // ─────────────────────────── NOUVEAU CONTENU ───────────────────────────
  {
    key: "contenu-01",
    category: "contenu",
    name: "Nouvelle formation disponible",
    subject: "Une nouvelle formation vient d'être ajoutée",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Une nouvelle formation est disponible dans l'onglet Contenu. Elle répond à des questions que plusieurs d'entre vous m'ont posées récemment.</p><p>Prends le temps de la regarder cette semaine, elle est construite pour être appliquée tout de suite.</p>",
  },
  {
    key: "contenu-02",
    category: "contenu",
    name: "Nouvelles recettes ajoutées",
    subject: "De nouvelles recettes viennent d'arriver",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Plusieurs nouvelles recettes viennent d'être ajoutées dans l'onglet Recettes, filtrables par objectif, temps de préparation et budget.</p><p>De quoi varier un peu ton quotidien nutrition sans sortir de tes objectifs caloriques.</p>",
  },
  {
    key: "contenu-03",
    category: "contenu",
    name: "Nouvel article science",
    subject: "Un nouvel article vient d'être publié",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Un nouvel article, basé sur une vraie étude scientifique récente, vient d'être ajouté dans l'onglet Science. Résumé en français, sans jargon inutile.</p><p>Si le sujet te concerne directement, ça vaut clairement les cinq minutes de lecture.</p>",
  },
  {
    key: "contenu-04",
    category: "contenu",
    name: "Nouvelle ressource / guide gratuit",
    subject: "Un nouveau guide gratuit est disponible",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Un nouveau guide gratuit vient d'être ajouté dans l'onglet Ressources. Direct, concret, sans blabla, comme d'habitude.</p><p>Télécharge-le, garde-le sous la main, il peut te servir de référence rapide au quotidien.</p>",
  },
  {
    key: "contenu-05",
    category: "contenu",
    name: "Module de formation complété (félicitations)",
    subject: "Tu as terminé un module, bravo",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Tu viens de terminer un module de formation en entier. C'est le genre d'investissement en toi-même qui paie sur la durée, même si ça ne se voit pas tout de suite.</p><p>Le module suivant t'attend quand tu es prêt.</p>",
  },
  {
    key: "contenu-06",
    category: "contenu",
    name: "Rappel bibliothèque d'exercices",
    subject: "Tu connais la bibliothèque d'exercices ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Chaque exercice de ton programme a sa fiche technique dans l'appli (exécution, muscles ciblés, vidéo si disponible). Un doute sur un mouvement, va vérifier avant de forcer une mauvaise exécution.</p><p>Mieux vaut deux minutes de lecture qu'une blessure évitable.</p>",
  },
  {
    key: "contenu-07",
    category: "contenu",
    name: "Nouveau contenu mindset",
    subject: "Un nouveau contenu sur le mental vient d'arriver",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Un nouveau contenu sur le mindset (motivation, discipline, gestion du mental) vient d'être ajouté. Le physique ne suit jamais longtemps sans la tête derrière.</p><p>Dix minutes de lecture, potentiellement un vrai déclic.</p>",
  },

  // ─────────────────────────── ÉVÉNEMENT ───────────────────────────
  {
    key: "evenement-01",
    category: "evenement",
    name: "Annonce live à venir",
    subject: "Un live est prévu cette semaine",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Un live est programmé cette semaine dans l'appli, dans l'onglet Live. Viens avec tes questions, c'est justement l'occasion d'avoir une vraie réponse en direct.</p><p>Le créneau exact est visible dans l'appli, mets-toi un rappel.</p>",
  },
  {
    key: "evenement-02",
    category: "evenement",
    name: "Rappel live dans 24h",
    subject: "Le live c'est demain",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Petit rappel : le live prévu a lieu demain. Prépare tes questions dès maintenant si tu en as, ça évite de les chercher au dernier moment.</p><p>On se retrouve là-bas.</p>",
  },
  {
    key: "evenement-03",
    category: "evenement",
    name: "Session Questions-Réponses",
    subject: "Session Questions-Réponses ouverte",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Une session Questions-Réponses est ouverte cette semaine. Pose ta question directement en messagerie ou pendant le créneau live, peu importe le sujet (entraînement, nutrition, mental, business si tu es coach).</p><p>Aucune question n'est trop simple ou trop basique.</p>",
  },
  {
    key: "evenement-04",
    category: "evenement",
    name: "Invitation à réserver un appel",
    subject: "On fait le point en appel ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ça fait un moment qu'on n'a pas fait un vrai point de vive voix. Réserve un créneau directement dans l'appli (section Coach), ça permet d'aller plus loin qu'un échange écrit sur certains sujets.</p><p>Trente minutes suffisent en général.</p>",
  },
  {
    key: "evenement-05",
    category: "evenement",
    name: "Recap d'un live passé",
    subject: "Le récap du dernier live",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Tu as manqué le dernier live ? Le récap est disponible dans l'appli, avec les points clés abordés.</p><p>Pas besoin de tout revoir en entier, l'essentiel est déjà résumé pour toi.</p>",
  },
  {
    key: "evenement-06",
    category: "evenement",
    name: "Invitation webinaire formation",
    subject: "Un webinaire est organisé prochainement",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Un webinaire est organisé prochainement sur un sujet précis (détail dans l'appli). Format plus long qu'un live classique, pensé pour aller vraiment au fond d'un sujet.</p><p>Réserve ta place si le thème te parle.</p>",
  },
  {
    key: "evenement-07",
    category: "evenement",
    name: "Merci après un événement",
    subject: "Merci d'être venu au live",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Merci d'avoir été présent au dernier live. Les échanges en direct comme ça, c'est ce qui rend tout le reste plus concret.</p><p>À la prochaine session, avec plaisir.</p>",
  },

  // ─────────────────────────── PROGRAMME & NUTRITION ───────────────────────────
  {
    key: "programme-01",
    category: "programme",
    name: "Nouveau programme livré",
    subject: "Ton nouveau programme est prêt",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ton nouveau programme est disponible dans l'appli, construit à partir de tes dernières données (progression, retours, objectif actuel).</p><p>Regarde-le avant ta prochaine séance, dis-moi si un mouvement pose problème avant de commencer.</p>",
  },
  {
    key: "programme-02",
    category: "programme",
    name: "Nouveau plan nutrition livré",
    subject: "Ton plan nutrition vient d'être mis à jour",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ton plan nutrition vient d'être ajusté dans l'appli, en fonction de ta progression récente et de ton objectif actuel.</p><p>Les nouveaux chiffres sont visibles dès maintenant dans l'onglet Nutrition.</p>",
  },
  {
    key: "programme-03",
    category: "programme",
    name: "Changement de phase (surplus/déficit/maintien)",
    subject: "On change de phase, {{contact.FIRSTNAME}}",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>D'après tes chiffres, on passe à une nouvelle phase. Ton plan a été ajusté en conséquence dans l'appli, avec de nouveaux objectifs caloriques.</p><p>C'est normal si le changement demande un temps d'adaptation les premiers jours.</p>",
  },
  {
    key: "programme-04",
    category: "programme",
    name: "Ajustement calorique post-plateau",
    subject: "Ajustement de tes calories cette semaine",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Vu ta progression des dernières semaines, j'ai ajusté ton objectif calorique par palier, comme toujours, jamais de changement brutal.</p><p>Les nouveaux chiffres sont déjà dans l'appli, applique-les dès ton prochain repas.</p>",
  },
  {
    key: "programme-05",
    category: "programme",
    name: "Deload / semaine de récupération",
    subject: "Cette semaine, on lève le pied",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ton programme de cette semaine intègre une semaine de décharge, volume et intensité réduits volontairement. C'est une étape normale du cycle, pas un recul.</p><p>Profites-en pour bien récupérer, la reprise n'en sera que meilleure.</p>",
  },
  {
    key: "programme-06",
    category: "programme",
    name: "Explication d'un changement d'exercice",
    subject: "J'ai remplacé un exercice dans ton programme",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>J'ai remplacé un mouvement dans ton programme par un équivalent plus adapté à ta situation actuelle. Le détail (pourquoi, ce que ça change) est visible directement sur la fiche exercice.</p><p>Si tu ressens une gêne particulière, dis-le-moi avant ta prochaine séance.</p>",
  },

  // ─────────────────────────── AVIS & TÉMOIGNAGE ───────────────────────────
  {
    key: "avis-01",
    category: "avis",
    name: "Demande d'avis simple",
    subject: "Deux minutes pour un retour honnête ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ça fait un moment qu'on travaille ensemble. Un retour honnête de ta part m'aiderait vraiment, que ce soit positif ou critique : réponds simplement à cet email avec ce qui fonctionne et ce qui pourrait être amélioré.</p><p>Merci d'avance pour le temps que tu y consacres.</p>",
  },
  {
    key: "avis-02",
    category: "avis",
    name: "Demande de témoignage après résultat",
    subject: "Ton témoignage pourrait aider d'autres personnes",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Vu les résultats que tu as obtenus, ton témoignage pourrait vraiment parler à d'autres personnes qui hésitent encore à se lancer.</p><p>Si tu es d'accord, réponds-moi avec quelques lignes sur ton expérience (ou même juste un appel rapide), aucune obligation.</p>",
  },
  {
    key: "avis-03",
    category: "avis",
    name: "Demande d'avis Google/Instagram",
    subject: "Un avis en ligne, ça m'aiderait beaucoup",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Si tu es satisfait de ton accompagnement, un avis rapide en ligne m'aiderait énormément à me faire connaître. Ça prend deux minutes et ça compte vraiment pour moi.</p><p>Le lien est disponible sur simple demande en réponse à cet email.</p>",
  },
  {
    key: "avis-04",
    category: "avis",
    name: "Sondage satisfaction rapide",
    subject: "Une question rapide sur ton expérience",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Une seule question : sur 10, comment tu noterais ton expérience avec l'accompagnement jusqu'ici ? Réponds juste avec un chiffre, et un mot si tu veux détailler.</p><p>Ça m'aide à savoir concrètement où ajuster.</p>",
  },
  {
    key: "avis-05",
    category: "avis",
    name: "Merci après un avis laissé",
    subject: "Merci pour ton retour",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Merci d'avoir pris le temps de laisser ton retour, ça compte vraiment, positif comme constructif.</p><p>Je le lis attentivement et j'en tiens compte pour la suite de l'accompagnement.</p>",
  },
  {
    key: "avis-06",
    category: "avis",
    name: "Demande de photo avant/après (consentement)",
    subject: "Utiliser ta transformation en exemple ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ta transformation est vraiment marquante. Serais-tu d'accord pour que je l'utilise (anonymisée ou avec ton nom, comme tu préfères) comme exemple dans du contenu ?</p><p>Réponds-moi simplement oui ou non, ton accord explicite est indispensable avant quoi que ce soit.</p>",
  },

  // ─────────────────────────── PARRAINAGE ───────────────────────────
  {
    key: "parrainage-01",
    category: "parrainage",
    name: "Présentation du programme de parrainage",
    subject: "Parraine un proche, gagne du crédit",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Si tu connais quelqu'un qui pourrait bénéficier d'un accompagnement comme le tien, ton lien de parrainage (dans Paramètres) te crédite dès que la personne devient cliente.</p><p>Simple à partager, gagnant pour vous deux.</p>",
  },
  {
    key: "parrainage-02",
    category: "parrainage",
    name: "Relance parrainage doux",
    subject: "Ton lien de parrainage t'attend",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Petit rappel que ton lien de parrainage personnel est toujours actif dans Paramètres. Si une personne de ton entourage te demande des conseils, c'est l'occasion parfaite de la rediriger vers l'appli.</p><p>Aucune pression, juste un rappel.</p>",
  },
  {
    key: "parrainage-03",
    category: "parrainage",
    name: "Merci après un parrainage réussi",
    subject: "Merci pour ce parrainage, {{contact.FIRSTNAME}}",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>La personne que tu as parrainée vient de devenir cliente. Ton crédit a été appliqué automatiquement sur ton compte.</p><p>Merci pour la confiance que ça représente, ça compte beaucoup.</p>",
  },
  {
    key: "parrainage-04",
    category: "parrainage",
    name: "Parrainage entre coachs",
    subject: "Tu connais un autre coach que ça pourrait intéresser ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Si tu connais un autre coach sportif qui galère avec la gestion de ses clients (suivi, programmes, nutrition), l'appli pourrait vraiment lui servir.</p><p>Partage-lui simplement ton retour d'expérience, ça parle souvent plus qu'une présentation formelle.</p>",
  },
  {
    key: "parrainage-05",
    category: "parrainage",
    name: "Rappel avantages parrainage",
    subject: "Ce que le parrainage te rapporte concrètement",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Pour rappel, chaque parrainage réussi crédite ton compte directement, sans démarche supplémentaire de ta part une fois le lien partagé.</p><p>Si tu as déjà pensé à quelqu'un sans passer à l'action, c'est le bon moment.</p>",
  },
  {
    key: "parrainage-06",
    category: "parrainage",
    name: "Fin de période promotionnelle parrainage",
    subject: "Derniers jours pour ce bonus de parrainage",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Le bonus de parrainage actuel se termine bientôt. Si tu as quelqu'un en tête, c'est le moment d'envoyer ton lien avant la fin de la période.</p><p>Après ça revient au fonctionnement standard, toujours actif mais sans le bonus.</p>",
  },

  // ─────────────────────────── SAISONNIER ───────────────────────────
  {
    key: "saison-01",
    category: "saison",
    name: "Nouvelle année, nouvel objectif",
    subject: "Nouvelle année, on redéfinit l'objectif ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Nouvelle année, bon moment pour reprendre ton objectif et voir s'il a besoin d'être ajusté ou confirmé tel quel.</p><p>Dis-moi où tu en es dans ta tête, on structure la suite ensemble.</p>",
  },
  {
    key: "saison-02",
    category: "saison",
    name: "Rentrée de septembre",
    subject: "La rentrée, le bon moment pour reprendre un rythme",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>La rentrée est souvent le moment où tout le monde reprend un vrai rythme après l'été. Si ton suivi a été plus relâché ces dernières semaines, c'est totalement normal.</p><p>On repart sur des bases solides dès cette semaine.</p>",
  },
  {
    key: "saison-03",
    category: "saison",
    name: "Préparation été / plage",
    subject: "L'été approche, on ajuste le plan ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Si ton objectif est lié à l'été, c'est le moment de regarder concrètement le temps qu'il reste et d'ajuster le plan en conséquence, sans précipitation ni raccourci dangereux.</p><p>Dis-moi ta deadline réelle, on structure à partir de là.</p>",
  },
  {
    key: "saison-04",
    category: "saison",
    name: "Fêtes de fin d'année, gestion sans culpabilité",
    subject: "Les fêtes approchent, voici comment les gérer",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Les repas de fêtes arrivent. Pas besoin de les éviter ni de culpabiliser après coup : profite du moment, et reprends normalement le lendemain, comme n'importe quel autre jour.</p><p>Un repas ne défait jamais des mois de régularité.</p>",
  },
  {
    key: "saison-05",
    category: "saison",
    name: "Vœux de fin d'année",
    subject: "Merci pour cette année, {{contact.FIRSTNAME}}",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Merci pour la confiance que tu as accordée à l'accompagnement cette année, résultats ou pas, chaque effort mis compte.</p><p>Je te souhaite une bonne fin d'année, on repart fort dès la reprise.</p>",
  },
  {
    key: "saison-06",
    category: "saison",
    name: "Vacances, garder un minimum de suivi",
    subject: "Tu pars en vacances ? Voici comment rester régulier",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Si tu pars bientôt en vacances, pas besoin de tout arrêter : un bilan rapide chaque jour, même sans entraînement structuré, suffit à garder le fil.</p><p>Profite pleinement, la régularité minimale suffit à éviter de repartir de zéro au retour.</p>",
  },
  {
    key: "saison-07",
    category: "saison",
    name: "Retour de vacances, reprise en douceur",
    subject: "De retour de vacances ? On reprend en douceur",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Bon retour. Pas besoin de reprendre à 100% dès le premier jour, une reprise progressive sur la première semaine suffit largement.</p><p>Dis-moi comment se sont passées les vacances, on ajuste le programme si besoin.</p>",
  },

  // ─────────────────────────── RÉENGAGEMENT ───────────────────────────
  {
    key: "reengagement-01",
    category: "reengagement",
    name: "Réengagement ancien lead froid",
    subject: "Toujours intéressé par un accompagnement ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Tu avais montré de l'intérêt pour un accompagnement il y a quelque temps. Je me permets de reprendre contact au cas où ce serait toujours d'actualité pour toi.</p><p>Si oui, réponds-moi simplement et on regarde ensemble où tu en es aujourd'hui.</p>",
  },
  {
    key: "reengagement-02",
    category: "reengagement",
    name: "Réengagement ancien client parti",
    subject: "Ça fait un moment, {{contact.FIRSTNAME}}",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ça fait un moment qu'on n'a plus travaillé ensemble. Je voulais juste prendre des nouvelles, sans arrière-pensée commerciale.</p><p>Si un jour tu veux reprendre, la porte est ouverte, sinon j'espère simplement que tout va bien pour toi.</p>",
  },
  {
    key: "reengagement-03",
    category: "reengagement",
    name: "Nouveauté depuis le départ",
    subject: "Beaucoup de choses ont changé depuis",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Depuis que tu es parti, pas mal de choses ont évolué dans l'appli et dans l'accompagnement. Si tu veux jeter un œil à ce qui a changé, je peux te faire un point rapide.</p><p>Aucune obligation, juste une porte ouverte si l'envie revient.</p>",
  },
  {
    key: "reengagement-04",
    category: "reengagement",
    name: "Offre de reprise avec avantage",
    subject: "Une offre de reprise pour toi",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Si tu envisages de reprendre un accompagnement, j'ai une offre de reprise spécifique pour les anciens clients. Réponds-moi si le sujet t'intéresse, on en discute directement.</p><p>Pas de pression, juste une option qui existe si le moment est bon pour toi.</p>",
  },
  {
    key: "reengagement-05",
    category: "reengagement",
    name: "Question ouverte sur les raisons du départ",
    subject: "Une question honnête sur ton départ",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Je me permets une question directe : qu'est-ce qui a fait que tu as arrêté l'accompagnement ? Ta réponse, même critique, m'aide vraiment à m'améliorer pour la suite.</p><p>Merci d'avance si tu prends le temps d'y répondre.</p>",
  },
  {
    key: "reengagement-06",
    category: "reengagement",
    name: "Relance lead qualifié jamais converti",
    subject: "On avait échangé, tu en es où aujourd'hui ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>On avait échangé il y a quelque temps sans que ça aboutisse. Je me demandais simplement où tu en es aujourd'hui sur ton objectif.</p><p>Si le moment est mieux choisi maintenant, dis-le-moi.</p>",
  },
  {
    key: "reengagement-07",
    category: "reengagement",
    name: "Dernière relance avant suppression contact",
    subject: "Dernier message de ma part",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Je t'ai contacté plusieurs fois sans retour, donc je vais arrêter de te relancer pour ne pas t'encombrer inutilement.</p><p>Si un jour l'envie revient, tu sais comment me trouver, avec plaisir.</p>",
  },

  // ─────────────────────────── ANNIVERSAIRE ───────────────────────────
  {
    key: "anniversaire-01",
    category: "anniversaire",
    name: "Joyeux anniversaire client",
    subject: "Joyeux anniversaire, {{contact.FIRSTNAME}} !",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Joyeux anniversaire ! Profite bien de ta journée, le programme peut attendre un jour, c'est fait pour ça aussi.</p><p>Passe une belle journée.</p>",
  },
  {
    key: "anniversaire-02",
    category: "anniversaire",
    name: "Anniversaire 1 an de coaching",
    subject: "Un an ensemble, {{contact.FIRSTNAME}}",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ça fait un an qu'on travaille ensemble. Le chemin parcouru depuis le premier jour est réel, même si on ne le voit pas toujours de l'intérieur.</p><p>Merci pour ta confiance et ta régularité sur cette première année.</p>",
  },
  {
    key: "anniversaire-03",
    category: "anniversaire",
    name: "Anniversaire du compte (membre gratuit)",
    subject: "Ça fait un moment que tu es avec nous",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ça fait maintenant un moment que tu fais partie de la communauté EP Coaching. Merci de rester actif, ça compte vraiment.</p><p>Si tu veux passer un cap avec un accompagnement personnalisé, on peut en discuter quand tu veux.</p>",
  },
  {
    key: "anniversaire-04",
    category: "anniversaire",
    name: "Rappel bilan anniversaire de transformation",
    subject: "Un an après, regarde le chemin parcouru",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ça fait un an depuis tes premières photos de progression. Ça vaut le coup de les reregarder aujourd'hui, la différence est souvent plus grande qu'on ne le pense au jour le jour.</p><p>Bravo pour la constance sur cette année.</p>",
  },
  {
    key: "anniversaire-05",
    category: "anniversaire",
    name: "Anniversaire EP Coaching (marque)",
    subject: "EP Coaching fête un anniversaire",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>EP Coaching fête un anniversaire aujourd'hui. L'occasion de te remercier de faire partie de cette aventure, que tu sois client depuis le premier jour ou récemment arrivé.</p><p>Merci pour ta confiance.</p>",
  },

  // ─────────────────────────── PAIEMENT ───────────────────────────
  {
    key: "paiement-01",
    category: "paiement",
    name: "Confirmation de paiement reçu",
    subject: "Paiement bien reçu, merci",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ton paiement a bien été reçu, ton accès reste actif sans interruption.</p><p>Merci pour ta confiance renouvelée.</p>",
  },
  {
    key: "paiement-02",
    category: "paiement",
    name: "Rappel avant renouvellement",
    subject: "Ton abonnement se renouvelle bientôt",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ton abonnement actuel arrive bientôt à échéance et se renouvelle automatiquement. Aucune action nécessaire de ta part si tu souhaites continuer.</p><p>Si tu veux en discuter avant, réponds-moi simplement.</p>",
  },
  {
    key: "paiement-03",
    category: "paiement",
    name: "Échec de paiement, action requise",
    subject: "Ton dernier paiement a échoué",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ton dernier paiement n'a pas pu être traité. Peux-tu vérifier tes informations bancaires dès que possible pour éviter une interruption d'accès ?</p><p>Écris-moi si tu rencontres un souci technique pour mettre à jour tes infos.</p>",
  },
  {
    key: "paiement-04",
    category: "paiement",
    name: "Changement de formule tarifaire",
    subject: "Une nouvelle formule pourrait mieux te convenir",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Vu ton usage actuel de l'accompagnement, une autre formule tarifaire pourrait mieux correspondre à ta situation.</p><p>Réponds-moi si tu veux qu'on en parle, aucune obligation de changer quoi que ce soit.</p>",
  },
  {
    key: "paiement-05",
    category: "paiement",
    name: "Fin d'essai gratuit",
    subject: "Ta période d'essai se termine bientôt",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ta période d'essai gratuite touche bientôt à sa fin. J'espère que ce que tu as pu tester t'a donné une vraie idée de ce que l'accompagnement peut t'apporter.</p><p>Dis-moi si tu as des questions avant que ça bascule sur la formule payante.</p>",
  },
  {
    key: "paiement-06",
    category: "paiement",
    name: "Remerciement fidélité longue durée",
    subject: "Merci pour ta fidélité, {{contact.FIRSTNAME}}",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ça fait maintenant longtemps que tu fais partie des clients de l'accompagnement. Ce genre de fidélité ne se prend jamais pour acquis de mon côté.</p><p>Merci sincèrement pour ta confiance sur la durée.</p>",
  },

  // ─────────────────────────── PREP & COMPÉTITION ───────────────────────────
  {
    key: "competition-01",
    category: "competition",
    name: "Annonce début de prep compétition",
    subject: "La prep commence officiellement",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Ta préparation de compétition démarre officiellement. Le plan est structuré sur plusieurs semaines, chaque ajustement viendra en fonction de ta progression réelle, jamais au hasard.</p><p>Rigueur sur le suivi à partir de maintenant, chaque donnée compte.</p>",
  },
  {
    key: "competition-02",
    category: "competition",
    name: "Point à mi-prep",
    subject: "Point à mi-parcours de ta prep",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>On est à mi-parcours de ta préparation. Les chiffres sont cohérents avec l'objectif du jour J, on continue sur la même trajectoire avec les ajustements habituels par palier.</p><p>Tiens bon, c'est souvent la partie la plus exigeante mentalement.</p>",
  },
  {
    key: "competition-03",
    category: "competition",
    name: "Dernière ligne droite avant compétition",
    subject: "Dernière ligne droite avant le jour J",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>On entre dans la dernière ligne droite avant la compétition. Les prochains jours demandent une précision totale sur le suivi, pas de place pour l'approximation.</p><p>Je reste disponible en priorité sur cette période, n'hésite pas.</p>",
  },
  {
    key: "competition-04",
    category: "competition",
    name: "Félicitations après compétition",
    subject: "Félicitations pour ta compétition, {{contact.FIRSTNAME}}",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Bravo pour être monté sur scène. Peu importe le classement final, avoir mené une prep complète jusqu'au bout est déjà un vrai accomplissement.</p><p>On regarde la suite (repos, reverse diet, prochain objectif) dès que tu es prêt.</p>",
  },
  {
    key: "competition-05",
    category: "competition",
    name: "Reverse diet post-compétition",
    subject: "La reverse diet commence maintenant",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>La reverse diet post-compétition démarre. Les calories remontent progressivement, par palier, pour éviter une reprise de graisse rapide et protéger ton métabolisme.</p><p>Patience sur cette phase, elle est aussi importante que la prep elle-même.</p>",
  },
  {
    key: "competition-06",
    category: "competition",
    name: "Choix de la prochaine compétition",
    subject: "On parle de ta prochaine compétition ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Maintenant que tu as récupéré, c'est le bon moment de discuter d'un prochain objectif de compétition si c'est dans tes plans.</p><p>Réponds-moi avec tes envies (fédération, catégorie, période visée), on structure à partir de là.</p>",
  },

  // ─────────────────────────── COACH À COACH ───────────────────────────
  {
    key: "business-01",
    category: "business",
    name: "Annonce interne aux coachs",
    subject: "Info importante pour les coachs de la plateforme",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Une information importante concernant votre activité de coach sur la plateforme (détail ci-dessous). Merci de la prendre en compte pour la suite.</p><p>N'hésite pas à revenir vers moi si tu as des questions.</p>",
  },
  {
    key: "business-02",
    category: "business",
    name: "Nouvelle fonctionnalité côté business coach",
    subject: "Un nouvel outil business vient d'arriver",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Un nouvel outil est disponible dans l'espace Mon business de l'appli, pensé pour t'aider à structurer ou faire grandir ton activité de coach.</p><p>Va y jeter un œil, dis-moi ce que tu en penses.</p>",
  },
  {
    key: "business-03",
    category: "business",
    name: "Invitation formation business pour coachs",
    subject: "Une formation business vient d'être ajoutée",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Une nouvelle formation orientée business (scaler ton activité de coach, structurer ton offre) vient d'être ajoutée dans l'appli.</p><p>Que tu débutes ou que tu sois déjà bien lancé, il y a de quoi en tirer quelque chose de concret.</p>",
  },
  {
    key: "business-04",
    category: "business",
    name: "Demande de retour sur l'espace coach",
    subject: "Ton avis sur l'espace coach m'intéresse",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>En tant que coach utilisant la plateforme, ton retour sur l'espace qui t'est dédié (outils, organisation, ce qui manque) m'intéresse vraiment.</p><p>Réponds-moi directement, chaque retour concret influence les prochaines évolutions.</p>",
  },
  {
    key: "business-05",
    category: "business",
    name: "Rappel checklist marque personnelle",
    subject: "Où en es-tu sur ta marque personnelle ?",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>La checklist de construction de marque personnelle, dans ton espace business, est faite pour avancer étape par étape, pas tout d'un coup.</p><p>Regarde où tu t'es arrêté et reprends une étape cette semaine.</p>",
  },
  {
    key: "business-06",
    category: "business",
    name: "Mise en avant d'un coach de la plateforme",
    subject: "Ton profil pourrait être mis en avant",
    body: "<p>Salut {{contact.FIRSTNAME}},</p><p>Vu ton activité sur la plateforme, ton profil coach pourrait être mis en avant dans l'annuaire public. Ça t'apporterait de la visibilité supplémentaire sans rien changer de ton côté.</p><p>Dis-moi si tu es partant.</p>",
  },
];

export function getMailTemplatesByCategory(): { category: string; label: string; templates: MailTemplate[] }[] {
  return MAIL_CATEGORY_ORDER.map((category) => ({
    category,
    label: MAIL_CATEGORY_LABELS[category],
    templates: MAIL_TEMPLATES.filter((t) => t.category === category),
  })).filter((g) => g.templates.length > 0);
}
