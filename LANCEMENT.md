# Lancement App Store (objectif : ~30 octobre 2026)

Mandat du fondateur (30/09/2026) : en 1 mois, une appli pro, cohérente, fluide, sans brouillon ni
contenu périmé, prête pour l'App Store puis proposée à des coachs. Objectif : la référence n°1 du
coaching en ligne (contenu, accompagnement, business, suivi perso).

Règle de travail : quand le fondateur écrit seulement « go », reprendre ici à la première case non
cochée, commit + push à chaque étape, cocher au fil de l'eau.

## Semaine 1 (30/09 au 06/10) : fondations appli mobile + navigation

- [x] Architecture des onglets repensée pour le téléphone (5 onglets max, logique claire)
  - [x] Coach : Aujourd'hui · Clients · Business · Moi · Plus (Business = Studio, stats réseaux,
        formations, ventes, équipe, compta, pilotage)
  - [x] Client : Aujourd'hui · Training · Suivi · Coach · Plus (Live, formations, communauté dans Plus)
  - [x] Page « Plus » claire, groupée, avec recherche
- [x] Recherche globale : pages, clients, bibliothèque, notes, scripts et idées du Studio (ouverts
      directement, mis en avant) + réponses rapides
- [x] Réponses en 1 geste : poids, calories, sommeil, pas, séances, clients, bilans, leads
- [x] Réponse « combien payer mon Head of Sales » (paie de l'équipe)
- [x] Coquille native (Capacitor) : barre d'état, haptique, push natif (clés Firebase à poser),
      liens profonds, bouton retour, pas de chrome web visible (voir NATIVE.md)
- [x] Icônes et écran de démarrage natifs (native/assets/icon-1024.png)
- [x] Onglet Tournage (fondateur) remis au propre : entrée claire, plus de section vide

## Semaine 2 (07/10 au 13/10) : agenda vivant + écosystème relié

- [x] Agenda : déplacer un bloc décale automatiquement la suite de la journée (mode « ripple »)
- [x] Agenda : un bloc ouvre la bonne page (repas → nutrition du jour, contenu → scripts prêts à
      tourner, séance → programme du jour, live → salle, appel → fiche client/lead)
- [x] Journée en retard : bouton « réorganiser ma journée » en 1 tap
- [x] Leads : origine par contenu (vidéo YouTube, reel) visible en 1 écran (lien suivi par script
      dans Studio, plateforme détectée à l'arrivée, écran Leads > « D'où viennent tes leads »)
- [x] Équipe : rémunération (fixe + commissions) calculée par membre et par mois

## Semaine 3 (14/10 au 20/10) : notes et savoir, tutoriels

- [x] Notes façon Obsidian/Tana : notes, captures, dictée transcrite, supertags, liens entre notes,
      recherche plein texte (aussi dans la loupe)
- [x] Visite d'accueil par profil (coach, client) + Aide et tutoriels (12 guides pas à pas)
- [x] Visite d'accueil pour l'espace métier (/equipe)
- [x] Raccourcis hors appli (appui long sur l'icône) + bouton flottant note rapide
- [x] Tutos pas à pas : stats réseaux (où trouver les chiffres), relier Notion et
      Claude, installer l'appli, activer les notifications
- [x] Intégration Notion + Claude : connecteur MCP perso (testé en ligne) + tuto dans Notes

## Semaine 4 (21/10 au 30/10) : finition et publication

- [ ] Passe design complète écran par écran (cohérence, espacements, états vides, chargements)
  - [x] Premier passage sur les captures : Nutrition, Messages (zone d'écriture), accueil client,
        stats réseaux, Studio, Mon équipe, Plus
- [ ] Accessibilité (tailles, contrastes, lecteurs d'écran, zones tactiles 44 px)
- [ ] Performances (temps de chargement, images, cache)
- [ ] Zéro contenu périmé dans l'appli (prix, noms, textes)
- [ ] Fiche App Store : captures, textes, politique de confidentialité, compte de démo
  - [x] Comptes de démo coach + client avec données (scripts/demo-accounts.ts)
  - [x] Captures iPhone automatiques (scripts/screenshots.ts)
  - [x] Suppression du compte dans l'appli (déjà en place)
  - [x] Achats numériques masqués dans l'appli iOS (règle 3.1.1), coaching humain conservé
  - [ ] Adresse pro support@<domaine> à la place de l'e-mail perso (légal, support, expéditeur des e-mails)
- [ ] Envoi en revue Apple

## En parallèle

- [ ] Notion : supprimer tout le contenu barré ou périmé (anciens prix, anciens prénoms...)
- [ ] Workflow d'améliorations (sommeil/pas, bilan tendances, agenda prévu/réel, cockpit acquisition,
      compte à rebours business) : relire et fusionner

## Après la sortie

- Site vitrine sur nom de domaine, modèle theprepdad.com (captures et série de prompts du fondateur)

## Fait

- [x] Mon appli : questionnaire de personnalisation (membres, clients, coachs)
- [x] Stats réseaux pour tous les coachs
- [x] Mon équipe : parcours coach modulable, équipe de coachs et staff
- [x] Formations pour tous les coachs (création, vente, accès)
- [x] Bilan « Forme du jour » (énergie, moral, eau, courbatures, FC repos, VFC)
- [x] Accueils coach et client personnalisés, Ma semaine personnalisée
- [x] Session du 07/10 (demande « grosse session ») :
  - Recherche tolérante aux fautes dans toutes les barres (pluriels, inversions, saisie partielle)
  - Courses : stock qui baisse tout seul à chaque repas noté (3 bananes, 1 mangée, il en reste 2),
    à racheter, besoins de la semaine
  - Studio : cartes de scripts compactes qui s'ouvrent en haut de l'écran
  - Performances par niche : course, Hyrox, CrossFit, force, rééducation, suivi santé, prépa
    compétition (posing, peak week), grossesse et post-partum ; onglets cachés si inutiles
  - Ma niche et mon avatar : positionnement pas à pas avec modèles par niche, bio, piliers
  - Claude pour tous (sans clé d'API) : page Claude et Notion, demandes prêtes par rôle,
    connecteur avec 16 outils (journée, repas, records, clients, stats réseaux, scripts, positionnement)
  - Paramètres refaits par rubriques avec recherche (langue, page d'ouverture, vibrations, repos,
    stock auto, cache, version)
  - Appli en français ou en anglais (~4 000 textes traduits, Paramètres > Langue)
  - Stats réseaux simplifiées (en bref, sans jargon technique)

## Reste à faire (anglais)

- [x] Pages de connexion et d'inscription en anglais (hors espace connecté)
- [x] Notifications (cloche et push) dans la langue de la personne qui les reçoit, même envoyées
      par un rappel automatique ou par le coach (~150 textes traduits)
- [ ] Récaps hebdo (sommeil, progrès) : texte calculé, encore en français
- [ ] E-mails et messages d'erreur des actions
