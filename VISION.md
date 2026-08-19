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

**Statut : les 3 briques livrées (2026-08-14) — escalade anti-stagnation,
compensation calorique hebdomadaire, auto-ajustement des grammages. Axe
terminé.**

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

- ~~Système de compensation calorique glissante~~ **fait (2026-08-14)**.
  `ClientNutritionView.tsx` calcule `weeklyBank` à partir de `historyLogs`
  (déjà chargé, pas de fetch en plus) : cumul cible vs cumul réel du lundi
  à hier, plafonné à ±400 kcal, appliqué à `targets.calories`/`targets.
  carbs` en plus du `dayOffset` existant (orthogonal : l'un anticipe la
  journée, l'autre rattrape les jours passés). Toujours visible à l'écran
  quand actif (jamais un ajustement silencieux). Protéines/lipides restent
  stables, l'écart s'absorbe en glucides, même convention que le carb
  cycling déjà en place.
- ~~Système d'auto-ajustement des grammages~~ **fait (2026-08-14)**.
  (b) était déjà le cas : `planTotals` dans `DietPlanManager.tsx` est un
  `useMemo` réactif, le total affiché (barres `MacroCoverage`) recalcule
  déjà en direct à chaque grammage changé, rien à faire. (a) nouveau :
  bouton "Ajuster automatiquement les grammages sur la cible" — regroupe
  les aliments du jour par macro dominante (protéine/glucide/lipide, celle
  qui pèse le plus en kcal dans l'aliment), résout un système linéaire 3x3
  (un facteur d'échelle par groupe, règle de Cramer) pour que la somme
  tombe sur la cible protéines/glucides/lipides, garde les proportions
  relatives à l'intérieur d'un groupe. Facteurs plafonnés (x0.2 à x4) pour
  ne jamais proposer une quantité aberrante ; si un groupe macro est
  totalement absent du repas (système singulier, matrice à colonne nulle),
  message explicite plutôt qu'un résultat inventé — mieux vaut dire au
  coach qu'il manque un aliment que de deviner à sa place.

## Axe 2 — Poste de travail complet pour les coachs (CRM, mailing Brevo,
espace de création de contenu, productivité)

**Statut : espace de création de contenu + mailing livrés (2026-08-14).
CRM volontairement laissé de côté (décision explicite, détail plus bas).**

Citation du besoin : "pas juste coacher leur client mais aussi vraiment
travailler en tant que coach, avoir tout au même endroit". Sous-parties
identifiées dans le message :

- **Espace de création de contenu — fait.** `/dashboard/coach/studio`
  (groupe "Studio créatif" dans la sidebar) : idées/brouillons par
  plateforme (Instagram/YouTube/LinkedIn/Général), statut (idée → brouillon
  → prêt → publié), table `content_ideas` scopée par `coach_id` (RLS
  `coach_id = auth.uid()`, migration `20260814k_coach_content_ideas.sql`).
  Alimenté par les questions des clients : un bouton "→ Idée de contenu"
  sur chaque question dans l'onglet Communauté (`CommunityFeed.tsx`)
  envoie directement la question dans le studio du coach concerné, sans
  ressaisie (`createIdeaFromQuestion`). Volontairement pas de
  drag-and-drop (complexité/risque inutiles) — changement de statut par
  tap, plus rapide entre deux clients.
- **CRM coach — décision prise avec l'utilisateur (2026-08-14) : attendre
  un vrai 2e coach.** La table `leads` (captures des lead magnets publics)
  n'a aucune colonne d'attribution à un coach — construire la plomberie
  (liens personnalisés, `coach_id`) maintenant serait du travail spéculatif
  et invérifiable en pratique tant qu'un seul coach existe sur la
  plateforme (le fondateur). Reste `coaching_waitlist` (item 45) comme
  équivalent CRM minimal déjà fonctionnel et déjà par-coach. À reprendre
  quand un second coach rejoint réellement la plateforme.
- **Mailing Brevo par coach — fait.** Décision prise avec l'utilisateur
  (2026-08-14) : segmentation par tag/liste sous le compte Brevo unique
  existant, pas de sous-comptes séparés. `/dashboard/coach/mailing` : le
  coach compose un message, l'envoie d'abord en test à lui-même (email
  transactionnel déjà éprouvé), puis à tous ses clients actifs d'un coup
  (`lib/brevo-mailing.ts` — liste Brevo créée à la volée par coach,
  contacts synchronisés, campagne créée puis envoyée via l'API Brevo).
  Historique dans `coach_mailings` (RLS `coach_id = auth.uid()`).
  **Découverte importante en vérifiant le compte Brevo réel avant de
  construire** : plan gratuit, 300 envois/jour, PARTAGÉS avec les emails
  transactionnels critiques de l'appli (vérification de compte,
  notifications admin, relances). Un envoi groupé mal dimensionné pourrait
  vider le quota du jour et casser ces flux. Plafond défensif ajouté :
  `MAX_RECIPIENTS_PER_SEND = 200`, bloque l'envoi et l'explique dans
  l'interface plutôt que d'échouer silencieusement ou de risquer le quota.
- Espace documents/data personnels du coach, productivité générale : pas
  commencé, périmètre encore vague dans le message d'origine.

## Axe 3 — Suivi client sans faille même si le coach ne fait rien

**Statut : tableau de bord consolidé livré (2026-08-14). L'agenda
auto-mis-à-jour existait déjà (voir Axe 1).**

- Découverte en cours de route : `lib/coach-analytics.ts` avait déjà un
  système d'alertes par client bien plus riche que les 4 signaux de mon
  cron Axe 1 (check-in manquant, poids stagné 3 semaines, nutrition non
  loggée, calories trop basses, séances insuffisantes, technique faible,
  récupération insuffisante, aucun bilan envoyé) — `getTopUrgentAlerts`,
  déjà affiché sur l'accueil coach (`UrgentAlertsSection`) mais plafonné à
  3 résultats, et son lien "Voir tout" pointait vers la liste de clients
  brute, pas une vue priorisée.
- Nouveau : `getPrioritizedCoachView()` — même moteur d'alertes, mais sans
  plafond, PLUS une seconde catégorie "silencieux" : clients sans aucune
  alerte mais sans appel live (passé ou déjà programmé) depuis 30 jours ou
  plus. C'est la vraie réponse à "même si je fais rien, ne jamais laisser
  un client filer" pour ceux qui ne déclenchent aucun signal négatif.
- Page dédiée `/dashboard/coach/prioritaires` (nouvel item "Priorités"
  dans la sidebar, groupe Clients) : les deux catégories triées, "Voir
  tout" d'`UrgentAlertsSection` y pointe désormais.

### Reste à faire sur cet axe

- La proposition proactive d'audit/appel pour un client "silencieux" reste
  une action manuelle du coach depuis cette page (pas une notification
  automatique au client) — délibéré : le message d'origine demande de
  "lutter contre la stagnation" sans "spam", et il existe déjà l'escalade
  Axe 1 pour les signaux négatifs explicites. Ajouter une relance
  automatique aussi pour les clients "juste silencieux" (zéro signal
  négatif) mériterait d'abord un retour d'usage sur cette page avant
  d'automatiser — sinon risque réel de sur-solliciter des clients qui vont
  très bien mais n'ont simplement pas eu de call récemment.

## Axe 4 — Comptabilité et gestion financière pour les coachs

**Statut : v1 livrée (2026-08-14) — un journal, pas un logiciel de compta.**

Distinct de `lib/coach-billing.ts` (abonnement du coach À la plateforme) et
de `/dashboard/coach/finance` (MRR plateforme, fondateur uniquement) : ici
il s'agit de la compta DU coach pour SON activité.

- `/dashboard/coach/compta` (groupe "Comptabilité" dans la sidebar) :
  journal manuel revenus/dépenses (`coach_finance_entries`, RLS `coach_id =
  auth.uid()`, migration `20260814l_coach_finance_entries.sql`).
  Catégories fixes (`lib/coach-finance-categories.ts`) : côté revenus
  abonnements clients / coaching individuel / vente de formation / autre ;
  côté dépenses logiciels & outils / marketing / formation continue /
  matériel / déplacements / autre. Résumé du mois (revenus, dépenses,
  solde) + export CSV.
- **Pourquoi une v1 volontairement simple plutôt qu'attendre un cadrage** :
  contrairement au CRM (bloqué par une vraie question de modèle de
  données) et au mailing Brevo (bloqué par une vraie décision de compte
  externe), un journal déclaratif ne préjuge d'aucune architecture future
  — pas connecté à Stripe, pas de mouvement d'argent réel, juste des
  lignes qu'un coach saisit lui-même. Risque de devoir le refaire plus
  tard s'il faut du "hyper complet" (le mot du message d'origine) : faible,
  cette table s'étend sans casser l'existant.

### Reste à faire sur cet axe

- Lien avec Stripe (revenus automatiquement importés plutôt que ressaisis)
  et export au format attendu par un vrai logiciel de compta français : à
  cadrer si l'usage de la v1 montre que la saisie manuelle est le vrai
  point de friction.

## Axe 5 — Annuaire de coachs et spécialisation

**Statut : la brique annuaire livrée (2026-08-14). Reste : le flux de
redirection actif entre coachs (voir plus bas).**

- `lib/coach-specializations.ts` : taxonomie fixe (13 étiquettes —
  généraliste, prise de masse, perte de gras, force, bodybuilding
  compétition, blessures/rééducation, TCA, féminin, grossesse/post-partum,
  débutants, ados/jeunes athlètes, seniors, nutrition seule), même
  convention que `lib/resource-categories.ts`.
- `profiles.specializations` (`text[]`, index GIN) — migration
  `20260814j_coach_specializations.sql`. Vide = affiché comme généraliste
  par défaut côté annuaire (pas d'obligation de remplissage pour apparaître).
- Édition côté coach : `CoachSpecializationsCard` dans `/dashboard/coach/
  parametres` — chips à bascule, sauvegarde immédiate (même convention que
  `AcceptingClientsCard`), pas de bouton "Enregistrer" séparé.
- Annuaire public `/coachs` (`lib/coach-directory.ts` +
  `CoachDirectoryExplorer`) : liste les coachs actifs (même filtre
  d'éligibilité que `resolveCoachId()`, cf. app/auth/client/actions.ts),
  filtre par étiquette, coachs à capacité affichés en dernier avec un badge
  "Complet" et sans lien d'inscription direct (pour ne pas contourner
  `accepting_new_clients` — celui déjà en place depuis l'item 45). Chaque
  carte accepteuse pointe vers `/auth/client?coach=<invite_code>`,
  réutilisant `resolveCoachId()` tel quel, sans y toucher. Découvrable
  depuis `/ressources` (carte au même endroit que Outils/Réussites) et
  depuis la page d'accueil (lien discret sous le CTA principal).

### Reste à faire sur cet axe

- Un vrai flux de **redirection active** entre coachs de la plateforme
  (ex. un client contacte un coach non spécialisé TCA, qui souhaite le
  réorienter vers un collègue qui l'est) — nécessite une action côté coach
  ("réorienter ce prospect/client vers...") et une notification au coach
  cible, pas juste l'annuaire passif livré aujourd'hui. Devient plus
  pertinent depuis l'ajout des coachs IA ci-dessous (ex. un coach IA
  généraliste qui détecte un sujet TCA/blessure dans un message et voudrait
  orienter vers Santamaria plutôt que juste le dire dans sa réponse) — pas
  encore fait, le system prompt (lib/ai-coaches.ts) se contente pour
  l'instant de le dire en clair au client.

### Coachs IA (2026-08-19, demande directe)

10 comptes coachs IA (`lib/ai-coaches.ts`, `profiles.is_ai_coach`) ajoutés
au même annuaire, aux côtés de Santamaria et d'éventuels coachs tiers
humains — 19 agents IA "métier" internes (`lib/ai-agents.ts`, réservés au
propriétaire) + 10 coachs IA client-facing = 29 personas au total, deux
registres bien distincts. Toujours badgés "Coach IA" partout où ils
apparaissent (annuaire, choix de coach, messagerie) — jamais présentés
comme des humains, voir MASTERCLASS.md Axe AE pour le refus explicite de
la version indiscernable initialement demandée. Spécialisations
volontairement restreintes aux sujets non cliniques (jamais TCA, blessures
& rééducation, grossesse & post-partum, ados, seniors). Comportement
réellement autonome : message de bienvenue personnalisé à l'attribution
(`lib/ai-coach-welcome.ts`) et réponse automatique à chaque message reçu
(`app/dashboard/client/messages/actions.ts::triggerAICoachReply`), pas
seulement une fiche statique dans l'annuaire.

## Axe 6 — RÉACTIVÉ (2026-08-19) : espace entrepreneuriat pour les coachs

**Statut : confirmé "à terme" le 2026-08-14, explicitement RÉACTIVÉ et
élargi le 2026-08-19 ("un autre espace pour tout ce qui est
entreprenariat donc la construction de sa propre entreprise d'un coach,
pas juste gérer leurs clients mais aussi tout ce qui dev son business de
coaching"). En construction.**

Contexte posé par l'utilisatrice : EP Coaching (elle) est l'entreprise
"au-dessus" des entreprises individuelles de chaque coach de sa
structure — chaque coach qui rejoint la plateforme est lui-même un
entrepreneur (coach en ligne) qui doit construire SON business, pas
seulement suivre ses clients (déjà très poussé côté produit). Elle veut
un espace dédié à ça, avec un niveau d'exigence x100 par rapport à ce
qu'elle applique elle-même à EP Coaching.

Contenu attendu, dans l'ordre cité :
- **Création de contenu, avec de vrais process/systèmes** : déjà un
  Studio créatif (Idéation, scripts, inspirations) mais pensé pour EP
  Coaching elle-même — à décliner en version utilisable par CHAQUE coach
  pour SA propre marque. Séquences par plateforme (story/carrousel Insta,
  vidéo YouTube), par étage de funnel (TOF/MOF/BOF), pas juste une liste
  d'idées en vrac.
- **Personal branding** : construire une identité publique cohérente en
  tant que coach (pas juste "poster du contenu").
- **Vraies habitudes, un plan à suivre, une stratégie claire** : pas un
  simple contenu de référence à lire, un système qui organise ET fait
  progresser (checklist, rythme, étapes).

But explicite : "que ce soit hyper bien" comme résultat, avec liberté
totale laissée sur la forme (onglets, sections, boutons).

## Axe 7 — RÉACTIVÉ (2026-08-19) : cohérence légale + accueil

**Statut : évaluée "pas de refonte nécessaire" le 2026-08-14, condition de
réactivation posée à l'époque ("si Axe 6 redémarre") remplie le
2026-08-19. Repris en cohérence avec les Axes 6/8/9/10 ci-dessous.**

`app/page.tsx` reste une page d'entrée compacte, pas une refonte totale —
mais CGU/CGV/politique de confidentialité et la page d'accueil doivent
refléter les vrais ajouts déjà livrés depuis (coachs IA visibles des
clients réels, agents IA qui envoient de vrais messages/emails
automatiques) : transparence IA déjà appliquée dans l'UI (badge "Coach
IA", voir Axe 5 mis à jour), reste à vérifier qu'elle l'est aussi dans
les documents légaux eux-mêmes.

## Axe 8 — NOUVEAU (2026-08-19) : espace contraintes médicales & populations spécifiques

**Statut : en construction.**

Demande directe : "fait toute une partie sur le côté médical, blessure,
réhab etc, maladie, handicap, femme enceinte, ménopause etc, donc
vraiment toutes les contraintes comme ça."

Garde-fou non négociable (cohérent avec le refus déjà posé à l'Axe AE de
MASTERCLASS.md pour les coachs IA) : contenu de RÉFÉRENCE pour un coach
HUMAIN, jamais un système qui donne un diagnostic ou un traitement
médical directement à un client, et jamais confié à un coach IA — ces
terrains restent explicitement hors du périmètre des coachs IA
(`lib/ai-coaches.ts`), qui orientent déjà vers Santamaria ou un
professionnel de santé dès qu'un de ces sujets apparaît.

## Axe 9 — NOUVEAU (2026-08-19) : onboarding complet pour les coachs

**Statut : gap confirmé (aucun onboarding coach n'existait, seulement le
formulaire d'inscription + Stripe), en construction.**

Demande directe : "je crois que ya que l'onboarding pour le membre et
client... fait l'onboarding complet pour les coachs." Vérifié dans le
code : `/onboarding` (quiz objectif/niveau + fiche physique) n'existe que
côté client ; côté coach, `app/auth/coach/CoachSignupFlow.tsx` s'arrête
au paiement Stripe, rien ne guide ensuite un nouveau coach (profil,
spécialités, disponibilité, comment fonctionne la plateforme, agents IA
à sa disposition).

## Axe 10 — NOUVEAU (2026-08-19) : agents IA renforcés + attribution aux coachs humains

**Statut : en construction.**

Demande directe : "les agents IA donc renfloué ceux déjà dans ma
structure et en fonction des nouveaux coachs humains qui vont arriver
faudra aussi leur donner des agents IA." Deux volets : (1) donner plus de
capacité réelle aux 19 agents internes déjà en place (au-delà du Setter
sur les leads et de l'agent onboarding sur les clients à risque, déjà
livrés le 2026-08-19), (2) concevoir comment un nouveau coach humain qui
rejoint la plateforme (SaaS multi-coach, Axe 5/`20260729b_multi_coach_
foundation.sql`) reçoit lui aussi accès à des agents IA adaptés à SA
structure — actuellement les 19 agents et leurs conversations
(`ai_agent_messages`/`ai_agent_tasks`) sont scopés au seul propriétaire
de plateforme, à repenser en multi-tenant pour un vrai deuxième coach.

## Décision explicite (2026-08-19) sur la gouvernance de ces chantiers

"Je veux que toutes les décisions, ça soit principalement moi" —
confirmé : ce fichier documente ce qui est fait/en cours/proposé, les
audits et rapports (MASTERCLASS.md, rapports de session) restent le
canal de décision, jamais une automatisation qui déciderait à sa place
de la direction produit. Les agents IA agissent dans des périmètres
précis déjà validés (relances clients, qualification leads), pas sur des
choix de structure business.

## Ordre de travail proposé — chantier clos le 2026-08-14

Les 7 axes ont chacun un statut résolu, 7 jours avant l'échéance du
2026-08-21 :

1. ~~Axe 1~~ (escalade, compensation calorique, auto-solve des grammages)
   **fait**.
2. ~~Axe 5~~ (annuaire + tags de spécialisation) **fait** (reste seulement
   la redirection active entre coachs, non urgente à un seul coach).
3. ~~Axe 2~~ (poste de travail coach) **fait** : contenu (studio créatif)
   et mailing (segmentation Brevo, décidé avec toi) livrés ; CRM
   volontairement laissé de côté jusqu'à un vrai 2e coach (décidé avec
   toi — travail spéculatif sinon).
4. ~~Axe 3~~ (dashboard consolidé "qui a besoin de moi") **fait**.
5. ~~Axe 4~~ (comptabilité coach) **fait** : v1 volontairement simple
   (journal déclaratif, pas connecté à Stripe).
6. ~~Axe 6~~ (formation de coachs) **confirmé "à terme" avec toi**, retiré
   du travail actif, gardé documenté pour plus tard.
7. ~~Axe 7~~ (accueil) **évalué, pas de refonte justifiée pour l'instant**
   — les deux conditions qui l'auraient déclenchée (annuaire public,
   espace coach-vers-coach) sont soit déjà reflétées (annuaire), soit
   toujours dormantes (Axe 6).

Ce fichier reste vivant : si un des axes mis en pause redémarre (2e coach,
Axe 6, ou tout nouveau signal remonté par l'usage réel de l'appli),
reprendre directement la section correspondante ci-dessus plutôt que de
repartir de zéro.

**Mise à jour 2026-08-19** : exactement ce scénario — Axe 6 explicitement
réactivé et élargi par l'utilisatrice, entraînant la réactivation d'Axe 7
(cohérence légale/accueil) et l'ajout des Axes 8 (contraintes médicales),
9 (onboarding coach) et 10 (agents IA renforcés + multi-coach). Voir les
sections correspondantes plus haut, pas ce résumé daté du 2026-08-14 qui
ne reflète plus l'état courant de ces axes.
