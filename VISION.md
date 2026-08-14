# Vision produit : de l'app de coaching à la plateforme EP Coaching

Demande du 2026-08-14 (message très large, verbatim résumé en intro de
chaque axe ci-dessous) : faire grandir l'app bien au delà du simple
coaching client/coach, sur plusieurs verticales. Objectif explicite : ne
jamais laisser un client stagner sans suivi, donner aux coachs un vrai
poste de travail complet (pas seulement un outil de coaching), et à terme
former les coachs eux-mêmes. Autorisation explicite de travailler en
autonomie sur la durée ("gooo en autonomie... travaille beaucoup").

Ce fichier segmente la demande en axes pour qu'aucune idée ne se perde,
avec un statut par axe. Il vit à côté de `PROGRESS.md` (chantier "50
idées", terminé) et `LEADMAGNETS.md` (chantier "1000 lead magnets", en
cours) : même logique de suivi.

**Différence importante avec le chantier lead magnets** : ce travail-ci
touche au code, au schéma de données et à la logique métier de l'app, pas
seulement à du contenu vérifié sur PubMed. Le risque d'une erreur
silencieuse en autonomie complète est plus élevé (une notification mal
calibrée, une migration mal pensée, un calcul de macro faux touchent
directement l'usage réel de clients payants). Ce chantier continue donc en
session interactive (moi + tes messages "go"/consignes), pas via une
routine cloud non supervisée comme pour les lead magnets.

## Axe 1 — Lutte contre la stagnation (priorité posée explicitement : "le
gros pour pas que quelqu'un stagne c'est les notifs et les rappels")

**Statut : premher étage livré aujourd'hui (2026-08-14).**

- Nouveau : `app/api/cron/stagnation-escalation` (cron quotidien 19h
  Paris, job pg_cron `stagnation-escalation`). Détecte, par client actif :
  logbook sans séance loggée depuis 7 jours, nutrition sans aucun repas
  loggé depuis 3 jours, une tâche en attente depuis plus de 7 jours, ou un
  check-in de la semaine manquant 2 jours après le jour prévu
  (`profiles.checkin_day`). Si au moins un signal est présent (et pas de
  relance envoyée à ce client dans les 7 derniers jours, garde-fou
  `profiles.last_stagnation_escalation_at`) :
  - notifie le client avec un lien direct vers la réservation d'un appel
    (`/dashboard/client/live/reserver`, système de réservation en
    libre-service déjà existant qui crée le `live_event` directement — donc
    l'agenda du coach se met à jour automatiquement dès que le client
    réserve, sans action du coach, exactement la demande) ;
  - notifie le coach assigné (si `coach_id` renseigné) pour qu'il aille
    vers le client plutôt que d'attendre.
- Complète (ne duplique pas) l'infrastructure de rappels déjà existante et
  assez mûre : `nag-tasks` (relance tâche jusqu'à faite), `missed-session-
  check` (séance planifiée non loggée), `nutrition-reminder` (< 30% des
  calories loggées à 20h), `meal-reminders` (par créneau repas), `weekly-
  reengagement` (relance hebdo générique), `weekly-progress-recap` /
  `weekly-sleep-recap` (récaps fermant la boucle), `coach-upsell`,
  `stale-messages` (alerte fondateur si message coach sans réponse 24-48h).
  Le vrai manque comblé aujourd'hui : l'**escalade** vers un appel concret
  quand les rappels du quotidien ne suffisent pas, et la notification
  **au coach**, pas seulement au client.

### Reste à faire sur cet axe
- Système de compensation calorique glissante ("si un jour -200kcal par
  rapport à l'objectif, le lendemain +200 pour compenser, moyenne hebdo
  toujours respectée") : nécessite de calculer l'écart quotidien réel
  (food_logs vs nutrition_profiles.calories_target ajusté du dayType),
  cumuler un solde glissant sur 7 jours, et ajuster l'affichage du target
  du jour en conséquence dans `ClientNutritionView.tsx`. Non trivial :
  il faut lisser (pas de swing brutal un jour où le solde est énorme) et
  bien articuler avec le système de carb cycling existant
  (`calories_offset_rest`/`calories_offset_high`, voir dayType dans
  `ClientNutritionView.tsx`). À concevoir proprement avant de coder.
- Système d'auto-ajustement des grammages d'un plan alimentaire :
  (a) changer un objectif macro doit recalculer automatiquement les
  grammages des aliments du plan pour coller à la nouvelle cible ;
  (b) changer un grammage doit recalculer le total calorique/macro affiché
  en direct. (b) est probablement déjà partiellement le cas dans
  `DietPlanManager.tsx` (à vérifier précisément) — (a) est un vrai
  problème de résolution (système sous-déterminé à N aliments pour 3
  cibles macro indépendantes + calories qui en découlent). Piste de design
  déjà réfléchie : grouper les aliments d'un repas par macro dominante
  (protéine/glucide/lipide) et résoudre un système 3x3 (facteur d'échelle
  par groupe) plutôt que de tout faire varier item par item. À prototyper.

## Axe 2 — Poste de travail complet pour les coachs (CRM, mailing Brevo,
espace de création de contenu, productivité)

**Statut : pas commencé, vision à préciser avant de coder.**

Citation du besoin : "pas juste coacher leur client mais aussi vraiment
travailler en tant que coach, avoir tout au même endroit". Sous-parties
identifiées dans le message :
- CRM coach : vue d'ensemble de tous les prospects/leads (existe déjà en
  partie : table `leads`, page `/dashboard/coach/admin/leads`, mais
  actuellement réservée au fondateur — à ouvrir/adapter par coach avec
  cloisonnement correct, cf. la discipline sécurité multi-coach déjà en
  place tout ce chantier).
- Mailing connecté à Brevo pour CHAQUE coach (aujourd'hui `sendBrevoEmail`
  utilise un compte Brevo unique, celui de la plateforme — un vrai mailing
  par coach demanderait soit des sous-comptes Brevo, soit une segmentation
  par tag/liste Brevo par coach, à trancher).
- Espace de création de contenu (Insta/YouTube/LinkedIn) : zone de travail
  avec prompts, idéation, sujets du moment, alimentée en partie par les
  questions des clients dans l'onglet Questions (matière première déjà en
  base). Nouveau : probablement un nouvel onglet dashboard coach avec un
  espace "brouillons"/"idées" et un historique.
- Espace documents/data personnels du coach, productivité générale.

## Axe 3 — Suivi client sans faille même si le coach ne fait rien

**Statut : la brique agenda auto-mis-à-jour existe déjà (voir Axe 1).**

Reste : proposer proactivement des audits/appels aux clients même hors
signal de stagnation explicite (cadence régulière, pas seulement réactif),
et un vrai tableau de bord coach "qui a besoin de moi cette semaine"
consolidant tous les signaux (Axe 1) en une seule vue priorisée plutôt que
dispersés en notifications.

## Axe 4 — Comptabilité et gestion financière pour les coachs

**Statut : pas commencé.** Budget, dépenses, suivi de revenus par coach.
Distinct de `lib/coach-billing.ts` (abonnement du coach À la plateforme) :
ici il s'agit de la compta DU coach pour SON activité. Chantier
entièrement nouveau, à cadrer (quel niveau de détail, lien avec Stripe
existant, export comptable ?) avant de commencer.

## Axe 5 — Annuaire de coachs et spécialisation

**Statut : pas commencé.**

Idée : étiquettes "spécialisé" / "généraliste" (et plus finement : blessure,
TCA, prise de masse, force, etc.) sur le profil coach, avec une recherche
publique pour qu'un visiteur trouve le bon coach pour SON profil — y
compris rediriger vers un autre coach de la plateforme si le premier
contacté n'est pas le bon interlocuteur (ex. blessure, TCA nécessitant une
expertise que le coach initial n'a pas). Nécessite : un système de tags
coach, une page annuaire publique, et un vrai flux de redirection/mise en
relation entre coachs de la plateforme.

## Axe 6 — Formation de coachs (accompagnement business/coaching-des-coachs)

**Statut : pas commencé.**

Vision à terme : au delà d'accompagner des clients, accompagner des COACHS
(business, coaching live, audits) — connaissances déjà couvertes par tes
formations existantes hors app, donc côté app il s'agit surtout de
structurer l'ACCOMPAGNEMENT (pas le contenu de formation lui même) :
coaching live pour coachs, audits d'activité, suivi structuré. Probablement
un nouveau rôle/tier de compte à modéliser (coach-qui-est-coaché-par-toi),
distinct du rôle coach actuel.

## Axe 7 — Page d'accueil et cohérence globale

**Statut : pas commencé.** Le message mentionne explicitement repenser la
toute première page d'accueil à la lumière de cette vision élargie
(aujourd'hui centrée coaching client, à faire évoluer si la plateforme
devient aussi un espace coach-vers-coach et un annuaire public).

## Ordre de travail proposé

1. ~~Axe 1, premier étage (escalade + notif coach)~~ fait.
2. Axe 1, reste (compensation calorique glissante, auto-solve des
   grammages) — le plus directement lié au coaching quotidien réel.
3. Axe 5 (annuaire + tags de spécialisation) — précède logiquement l'Axe 2
   (CRM) puisqu'il touche à comment un client arrive chez le bon coach.
4. Axe 2 (poste de travail coach) — le plus gros morceau, à découper en
   sous-livrables (CRM d'abord, contenu ensuite, mailing en dernier car
   nécessite une vraie décision d'architecture Brevo multi-coach).
5. Axe 3 (dashboard consolidé "qui a besoin de moi").
6. Axe 6 (formation de coachs) et Axe 4 (comptabilité) — les deux verticales
   les plus neuves, à cadrer avec toi avant de coder quoi que ce soit
   (périmètre pas assez précisé dans le message d'origine pour se lancer
   sans clarifier).
7. Axe 7 (accueil) — en dernier, une fois que la vision élargie a
   suffisamment pris forme pour savoir quoi y refléter.
