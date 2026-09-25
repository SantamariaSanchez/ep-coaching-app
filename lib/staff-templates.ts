// Modèles prêts à l'emploi de chaque métier (onglet Modèles de l'espace
// équipe). Écrits dans la voix EP Coaching : tutoiement, direct, jamais de
// tiret long, jamais de promesse de résultat ni de fausse urgence. Les
// crochets sont à remplacer avant envoi.

export interface StaffTemplate {
  title: string;
  channel: "sms" | "dm" | "email" | "appel" | "interne";
  when: string;
  body: string;
}

const T = (title: string, channel: StaffTemplate["channel"], when: string, body: string): StaffTemplate => ({ title, channel, when, body });

export const CHANNEL_LABELS: Record<StaffTemplate["channel"], string> = {
  sms: "SMS / WhatsApp",
  dm: "Message privé",
  email: "Email",
  appel: "Script d'appel",
  interne: "Interne",
};

const SALES_PAYMENT = T(
  "Lien de paiement après un oui",
  "sms",
  "Pendant ou juste après l'appel, quand c'est oui",
  "Top [prénom], comme on vient de le voir ensemble voici le lien pour démarrer : [lien]\nDès que c'est fait, tu reçois ton accès et on planifie ta première semaine. Si tu bloques sur quoi que ce soit, réponds ici."
);

export const TEMPLATES: Record<string, StaffTemplate[]> = {
  closer: [
    T("Confirmation de l'appel", "sms", "La veille de l'appel", "Salut [prénom], c'est [ton prénom] d'EP Coaching. On s'appelle demain à [heure] pour faire le point sur ton objectif. Prévois 30 minutes au calme. À demain !"),
    T("Rappel 1h avant", "sms", "Une heure avant l'appel", "Hello [prénom], on se parle dans 1h ([heure]). Voici le lien si c'est en visio : [lien]. À tout de suite."),
    SALES_PAYMENT,
    T("Relance sans décision", "sms", "48h après un appel tenu sans décision", "Salut [prénom], je repensais à ce que tu m'as dit sur [son objectif]. Tu en es où dans ta réflexion ? Si une question t'empêche de décider, pose-la moi ici, je te réponds franchement."),
    T("Relance du lien non payé", "sms", "24h après l'envoi du lien, si rien n'est arrivé", "Hello [prénom], je vois que ton inscription n'est pas encore passée. Souci technique ou tu as une hésitation ? Dans les deux cas, dis-moi, on règle ça."),
    T("Note de passation au coach", "interne", "Juste après une signature", "Nouveau client : [prénom nom]\nOffre : [offre]\nObjectif : [objectif précis]\nPoint sensible : [ce qui l'a fait hésiter]\nContraintes : [horaires, blessures, matériel]\nCe qui l'a convaincu : [raison]"),
  ],
  setter: [
    T("Premier message après un lead magnet", "dm", "Dans les 2h qui suivent le téléchargement", "Salut [prénom] ! J'ai vu que tu as récupéré le guide sur [sujet]. Qu'est-ce qui t'a donné envie de le lire, tu bloques sur quoi en ce moment ?"),
    T("Premier message après la préqualification", "dm", "Dans les 2h qui suivent le formulaire", "Salut [prénom], merci pour tes réponses ! Tu m'as dit viser [objectif]. Tu as pu réserver ton appel, ou tu veux que je te propose un créneau ?"),
    T("Proposition de créneaux", "dm", "Quand le lead est qualifié", "Ça me paraît vraiment cohérent qu'on en parle 30 minutes. Je te propose [jour 1 à heure] ou [jour 2 à heure], lequel t'arrange ?"),
    T("Relance sans réponse", "dm", "48h sans réponse", "Hello [prénom], je te relance une seule fois : tu cherches toujours à avancer sur [objectif] ? Si ce n'est plus le moment, aucun souci, dis-le moi simplement."),
    T("Relance no-show", "sms", "Le jour même d'un no-show", "Salut [prénom], on devait s'appeler tout à l'heure, j'espère que tout va bien. Tu veux qu'on replanifie ? Je te propose [créneau 1] ou [créneau 2]."),
    T("Lead non qualifié", "dm", "Quand ce n'est pas pour lui", "Merci pour ta franchise [prénom]. Pour l'instant je ne pense pas que le coaching soit la bonne étape pour toi. Les guides gratuits de l'appli te seront plus utiles : [lien]. La porte reste ouverte."),
  ],
  "head-of-sales": [
    SALES_PAYMENT,
    T("Retour de coaching", "interne", "Après la réécoute d'un appel", "Appel réécouté : [prospect, date]\nCe qui a marché : [1 point]\nÀ corriger : [2 points d'action précis]\nOn vérifie ensemble le : [date]"),
    T("Bilan hebdo au fondateur", "interne", "Chaque vendredi", "Semaine du [date]\nCA signé : [montant]\nVentes : [nombre] sur [appels tenus] appels\nRDV bookés : [nombre], no-show : [taux]\nGoulot de la semaine : [un seul]\nDécision proposée : [action]"),
  ],
  "createur-contenu-videaste": [
    T("Demande de validation", "interne", "Quand une vidéo passe En relecture", "Vidéo prête à valider : [titre]\nFormat : [reel / YouTube]\nLien : [lien]\nPoint à trancher : [s'il y en a un]"),
    T("Brief de tournage", "interne", "Avant un tournage", "Tournage : [sujet]\nDate et lieu : [date, lieu]\nPlans à obtenir : [liste]\nMessage clé en une phrase : [message]\nMatériel : [matériel]"),
  ],
  "community-manager": [
    T("Réponse à une question de prix", "dm", "Quand quelqu'un demande les tarifs du coaching", "Bonne question ! Le coaching est construit sur ta situation, alors on en parle d'abord 30 minutes pour voir si c'est adapté. Tu peux réserver ici : [lien préqualification]"),
    T("Remerciement commentaire", "dm", "Commentaire positif", "Merci [prénom] ! Ça fait plaisir de lire ça. Tu bosses sur quoi en ce moment ?"),
    T("Réponse à un commentaire hostile", "dm", "Critique publique", "Je comprends ton point de vue. Ce qu'on défend, c'est [fait vérifiable]. Si tu veux en discuter sérieusement, écris-nous en privé."),
    T("Question chaude à remonter", "interne", "Intention d'achat repérée", "Question chaude : [pseudo / plateforme]\nCe qu'il a demandé : [question]\nLien : [lien du commentaire]"),
  ],
  copywriter: [
    T("Structure d'email", "email", "Base de tout email", "Objet : [problème précis en moins de 8 mots]\n\n[Accroche : la situation que le lecteur reconnaît]\n\n[Pourquoi ça arrive, en 2 ou 3 phrases]\n\n[Ce qui marche vraiment, avec une preuve]\n\n[Une seule action : lien]"),
    T("Légende de reel", "dm", "Publication Instagram", "[Accroche qui reprend la première phrase de la vidéo]\n\n[Le point clé en 2 phrases]\n\n[Question pour faire commenter]"),
  ],
  "personal-brand-manager": [
    T("Demande d'intervention", "email", "Premier contact avec un podcast ou un média", "Bonjour [prénom],\n\nJe m'occupe de l'image de Santamaria Sanchéz, fondateur d'EP Coaching. Il prépare actuellement la Heroes Cup WNBF France en naturel et partage ce qu'il applique à lui-même : comprendre son corps plutôt que suivre des méthodes à l'aveugle.\n\nIl pourrait apporter à votre audience [angle précis pour ce média]. Seriez-vous ouvert à en parler ?\n\n[ton nom]"),
    T("Validation d'une prise de parole", "interne", "Avant de confirmer une intervention", "Opportunité : [nom]\nFormat et date : [format, date]\nAudience : [taille, profil]\nAngle proposé : [sujet]\nRisque éventuel : [s'il y en a]\nÀ valider par Santamaria avant le : [date]"),
  ],
  "growth-traffic-manager": [
    T("Hypothèse de test", "interne", "Avant de lancer un test", "Test : [nom]\nVariable testée : [audience / visuel / accroche]\nHypothèse : si [changement], alors [effet attendu] parce que [raison]\nBudget et durée : [montant, jours]\nCritère de coupe : [ex : coût par lead au dessus de X après Y €]"),
    T("Bilan hebdo des campagnes", "interne", "Chaque jeudi", "Dépense : [montant]\nLeads : [nombre], coût par lead : [montant]\nROAS : [valeur]\nGardé : [campagnes]\nCoupé : [campagnes et raison]\nProchain test : [test]"),
  ],
  "head-of-marketing": [
    T("Bilan hebdo au fondateur", "interne", "Chaque vendredi", "Contenus livrés : [nombre]\nLeads générés : [nombre]\nROAS : [valeur]\nCanal qui coince : [canal]\nDécision proposée : [action]"),
  ],
  "developpeur-saas": [
    T("Note de livraison", "interne", "À chaque mise en production", "Livré : [fonctionnalité]\nCe qui change pour les utilisateurs : [description]\nTesté sur : [cas testés]\nMigration à exécuter : [oui / non, fichier]\nPoint de vigilance : [s'il y en a]"),
  ],
  "product-manager": [
    T("Spécification", "interne", "Avant tout développement", "Problème : [qui, quoi, pourquoi maintenant]\nPour qui : [coach / client / membre / équipe]\nComportement attendu : [étapes]\nCas limites : [liste]\nHors périmètre : [liste]\nSuccès mesuré par : [indicateur]"),
  ],
  "support-client-tech": [
    T("Accusé de réception", "email", "Premier retour sur un ticket", "Salut [prénom], merci pour ton message. Je regarde ça tout de suite et je reviens vers toi aujourd'hui avec une solution ou un point d'avancement."),
    T("Demande de précisions", "email", "Il manque des infos pour reproduire", "Pour régler ça vite, peux-tu me dire : sur quel appareil (téléphone ou ordinateur), ce que tu faisais juste avant, et le message affiché ? Une capture d'écran m'aide beaucoup."),
    T("Problème résolu", "email", "Ticket résolu", "C'est réglé [prénom] : [ce qui a été fait]. Si ça recommence, réponds simplement à ce message."),
  ],
  "office-ops-manager": [
    T("Checklist d'arrivée d'une recrue", "interne", "Semaine 1 d'une recrue", "Accès créé et contrat signé : [oui / non]\nOutils ouverts : [liste]\nPremier point avec son responsable : [date]\nFormation commencée : [oui / non]\nQuestions en suspens : [liste]"),
  ],
  "secretaire-assistant": [
    T("Confirmation de rendez-vous", "email", "Rendez-vous organisé pour le fondateur", "Bonjour [prénom],\n\nJe vous confirme votre rendez-vous avec Santamaria Sanchéz le [date] à [heure], [lieu ou lien visio].\n\nEn cas d'empêchement, merci de me prévenir en répondant à ce message.\n\n[ton nom], EP Coaching"),
    T("Réponse d'attente", "email", "Demande qui prend plus de 48h", "Bonjour [prénom],\n\nNous avons bien reçu votre demande concernant [sujet]. Elle est en cours de traitement et nous revenons vers vous d'ici le [date].\n\n[ton nom], EP Coaching"),
  ],
  "finance-comptabilite": [
    T("Relance de paiement, niveau 1", "email", "Échéance dépassée de 3 jours", "Bonjour [prénom],\n\nSauf erreur de notre part, le paiement de [montant] prévu le [date] ne nous est pas encore parvenu. Pouvez-vous vérifier de votre côté ? Voici le lien si besoin : [lien].\n\nMerci, [ton nom], EP Coaching"),
    T("Relance de paiement, niveau 2", "email", "Échéance dépassée de 10 jours", "Bonjour [prénom],\n\nNous revenons vers vous au sujet du paiement de [montant] en attente depuis le [date]. Sans règlement d'ici le [date], l'accès à [service] sera suspendu. Si vous rencontrez une difficulté, parlons-en.\n\n[ton nom], EP Coaching"),
    T("Envoi des justificatifs à l'expert-comptable", "email", "Clôture du mois", "Bonjour,\n\nVous trouverez ci-joint les justificatifs de [mois] : [nombre] encaissements pour [montant], [nombre] dépenses pour [montant]. Points à signaler : [liste].\n\nBonne journée, [ton nom]"),
  ],
  "rh-people-ops": [
    T("Candidature retenue pour un entretien", "email", "Sous 48h après la candidature", "Bonjour [prénom],\n\nMerci pour ta candidature au poste de [poste]. Ton profil nous intéresse et nous aimerions en parler 20 minutes. Voici le lien pour choisir ton créneau : [lien].\n\n[ton nom], EP Coaching"),
    T("Candidature non retenue", "email", "Sous 48h, quand ce n'est pas le bon profil", "Bonjour [prénom],\n\nMerci pour le temps pris à candidater au poste de [poste]. Nous ne donnons pas suite pour le moment : [raison courte et honnête]. Nous gardons ton profil en tête pour la suite.\n\n[ton nom], EP Coaching"),
    T("Proposition de collaboration", "email", "Après une mise en situation réussie", "Bonjour [prénom],\n\nBonne nouvelle : nous aimerions travailler avec toi comme [poste]. Tu vas recevoir le lien de ton espace EP Coaching : tu y signeras ton contrat et tu trouveras ta formation d'intégration.\n\nBienvenue, [ton nom]"),
  ],
  "head-coach": [
    T("Retour d'audit au coach", "interne", "Après un audit", "Audit du [date] : [périmètre]\nNote : [x] sur 10\nPoints forts : [2 points]\nÀ corriger : [2 points précis]\nOn refait le point le : [date]"),
  ],
  "coach-onboarding-success": [
    T("Bienvenue J0", "sms", "Sous 24h après le paiement", "Bienvenue [prénom] ! Je suis [ton prénom], je t'accompagne sur tes 30 premiers jours chez EP Coaching. On se cale 10 minutes pour que tu prennes l'appli en main ? Je te propose [créneau 1] ou [créneau 2]."),
    T("Suivi J+7", "sms", "Une semaine après le démarrage", "Hello [prénom], ta première semaine est passée ! Ton premier bilan est fait ? Dis-moi ce qui te paraît le plus clair et ce qui te freine encore."),
    T("Suivi J+30", "sms", "Un mois après le démarrage", "Salut [prénom], ça fait un mois ! Qu'est-ce qui a changé pour toi depuis le début ? Et s'il y a une chose à améliorer dans ton suivi, c'est le moment de me le dire."),
  ],
};

export function templatesFor(roleKey: string): StaffTemplate[] {
  return TEMPLATES[roleKey] ?? [];
}
