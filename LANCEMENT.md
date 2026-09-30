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
- [x] Recherche globale : pages, clients, bibliothèque + réponses rapides (reste : notes, scripts)
- [x] Réponses en 1 geste : poids, calories, sommeil, pas, séances, clients, bilans, leads
- [x] Réponse « combien payer mon Head of Sales » (paie de l'équipe)
- [x] Coquille native (Capacitor) : barre d'état, haptique, push natif (clés Firebase à poser),
      liens profonds, bouton retour, pas de chrome web visible (voir NATIVE.md)
- [ ] Icônes et écran de démarrage natifs (icône 1024 px)
- [x] Onglet Tournage (fondateur) remis au propre : entrée claire, plus de section vide

## Semaine 2 (07/10 au 13/10) : agenda vivant + écosystème relié

- [x] Agenda : déplacer un bloc décale automatiquement la suite de la journée (mode « ripple »)
- [x] Agenda : un bloc ouvre la bonne page (repas → nutrition du jour, contenu → scripts prêts à
      tourner, séance → programme du jour, live → salle, appel → fiche client/lead)
- [x] Journée en retard : bouton « réorganiser ma journée » en 1 tap
- [ ] Leads : origine par contenu (vidéo YouTube, reel) visible en 1 écran
- [x] Équipe : rémunération (fixe + commissions) calculée par membre et par mois

## Semaine 3 (14/10 au 20/10) : notes et savoir, tutoriels

- [x] Notes façon Obsidian/Tana : notes, captures, dictée transcrite, supertags, liens entre notes,
      recherche plein texte (aussi dans la loupe)
- [x] Visite d'accueil par profil (coach, client) + Aide et tutoriels (12 guides pas à pas)
- [ ] Visite d'accueil pour l'espace métier (/equipe)
- [ ] Tutos pas à pas : connecter Instagram/YouTube/TikTok (stats automatiques), relier Notion et
      Claude, installer l'appli, activer les notifications
- [x] Intégration Notion + Claude : connecteur MCP perso (testé en ligne) + tuto dans Notes

## Semaine 4 (21/10 au 30/10) : finition et publication

- [ ] Passe design complète écran par écran (cohérence, espacements, états vides, chargements)
- [ ] Accessibilité (tailles, contrastes, lecteurs d'écran, zones tactiles 44 px)
- [ ] Performances (temps de chargement, images, cache)
- [ ] Zéro contenu périmé dans l'appli (prix, noms, textes)
- [ ] Fiche App Store : captures, textes, politique de confidentialité, compte de démo
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
