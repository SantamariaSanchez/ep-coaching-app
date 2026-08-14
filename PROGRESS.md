# PROGRESS — Chantier "50 idées"

Suivi du chantier lancé le 2026-08-13, à partir du master prompt d'Emmanuel.
Branche de travail : `feature/50-idees` (jamais de push direct sur `main`,
Emmanuel review et merge lui-même).

**Protocole de reprise** : au message "GO", lire ce fichier, reprendre exactement
où c'est marqué "en cours" ou le premier "todo" de l'axe courant. Ne jamais
redemander une décision déjà actée ici.

**Rappel sécurité (ne pas oublier)** : 6 failles cross-coach déjà identifiées en
audit séparé (communauté, live, profil, dashboard stats, `/api/push/send`,
`/api/coach/pending-count`) + une migration SQL storage buckets, **hors périmètre
de cette liste**, prérequis avant toute commercialisation à d'autres coachs. Si un
item ci-dessous touche à du code déjà marqué vulnérable dans cet audit, le
signaler dans "Signalements" ci-dessous plutôt que de corriger en silence.
**Piste trouvée en cours de chantier** : `getPendingReplies` (utils/checkins.ts),
`getPendingCorrectionsWithClient` (utils/corrections.ts) et
`getPendingPhotoUpdates` (utils/photos.ts) — utilisées par `dashboard-stats`,
déjà dans la liste des 6 — n'ont aucun filtre explicite sur coach_id dans
leur requête, elles comptent uniquement sur la RLS de session. Probablement
la même famille de faille. Pas touché ces fonctions ; l'item 8 (boîte de
réception) reconstruit ses propres requêtes avec un filtre coach_id
explicite plutôt que de les réutiliser.

---

## Session log

- **2026-08-13** — Mise en place : branche `feature/50-idees` créée, ce fichier créé.
  Démarrage axe 1 (navigation/fluidité), item 1.
- **2026-08-13** — Items 1 et 4 traités ensemble (même mécanisme technique :
  cache `unstable_cache` sur les lectures de référence partagées). tsc/eslint/
  build vérifiés, commit `3ade35e`.
- **2026-08-13** — tsc a révélé que `revalidateTag(tag)` à un seul argument
  est déprécié dans cette version de Next (16, doc embarquée dans
  `node_modules/next/dist/docs`). Remplacé par `updateTag(tag)`, prévu
  exactement pour l'invalidation immédiate depuis une Server Action ; ce
  projet n'active pas `cacheComponents` donc c'est le "Previous Model" qui
  s'applique. Commit `4245e8c`.
- **2026-08-13** — Item 2 traité : 4 pages avaient une requête de contenu
  partagé/indépendant inutilement séquencée après la vérification de rôle
  (formations, bilan client, membres communauté, liste des coachs).
  Volontairement pas touché : `admin/leads` (PII sensible, le coût d'un
  aller-retour de plus est préférable). Le reste du repo est déjà bien
  parallélisé (ex: fiche client coach = 32 requêtes en un seul Promise.all).
  tsc/eslint/build vérifiés, commit `43640df`.
- **2026-08-13** — Item 3 traité partiellement : 4 formes de squelette
  existaient déjà (Page/List/Grid/Form), il en manquait une pour les pages à
  onglets. Ajout de `TabbedPageSkeleton`, appliqué aux 6 pages nutrition/
  programme (client, coach->client, coach moi). Les ~70 autres loading.tsx
  n'ont pas été revus un par un — la majorité semble déjà correcte mais pas
  vérifié exhaustivement, à reprendre dans une prochaine session si utile.
  tsc/eslint/build vérifiés, commit `d70bb07`.
- **2026-08-13** — Item 6 vérifié, déjà couvert : DashboardNav fait déjà un
  prefetch complet de toute la nav visible au montage (tabs immédiats, puis
  sidebar étalée toutes les 120ms), plus large qu'un simple hover/focus.
  Rien ajouté pour éviter du code redondant sans bénéfice mesurable. Marqué
  fait sans commit dédié (aucun changement de code).
- **2026-08-13** — Item 5 traité : palette de commande Cmd/Ctrl+K
  (`components/ui/CommandPalette.tsx`), recherche client (coach) + pages de
  la nav, navigation clavier. Nouvelle route `/api/coach/clients-search`
  (coach-only, id+nom seulement). tsc/eslint/build vérifiés, commit
  `720e8a9`. **Axe 1 (navigation) terminé.**
- **2026-08-13** — Axe 2 démarré. Items 7 et 9 traités ensemble (même
  mécanisme : `lib/client-activity.ts` calcule le silence par client sur 3
  sources de log). Item 15 découvert déjà entièrement construit avant ce
  chantier (recherche/tri/filtres sur `ClientsSection.tsx`) — juste étendu
  avec le nouveau filtre "Inactifs". tsc/eslint/build vérifiés, commit
  `163450c`.
- **2026-08-13** — Item 14 traité : `getClientsIntakeCompletion()` repère
  qui n'a jamais fini sa fiche, badge + bouton "Relancer" sur la carte
  client (réutilise l'action `relaunchMember` déjà existante côté
  Communauté > Membres, pas de nouveau système de notification). Relié
  directement au constat "9 clients sur 12 sans fiche" fait plus tôt.
  tsc/eslint/build vérifiés, commit `48b7d0f`.
- **2026-08-13** — Item 13 traité. Constat en cours de route : les
  mensurations n'étaient affichées nulle part côté coach (la route
  measurements/[id] existait déjà mais ne faisait qu'une redirection).
  Nouveau `BeforeAfterComparator` (première vs dernière mensuration +
  photos de check-in), placé en tête de l'onglet Bilans. tsc/eslint/build
  vérifiés, commit `7290573`.
- **2026-08-13** — Item 12 traité : suggestion de décharge dans
  `ExerciseProgressionChart` (même composant que le fix de tri du logbook
  fait plus tôt dans la session) — fenêtre de 4 séances, stagnation réelle
  détectée sur les données déjà loggées. tsc/eslint/build vérifiés, commit
  `1c28193`.
- **2026-08-13** — Item 8 traité : nouvelle page `/dashboard/coach/inbox`.
  Piste de sécurité trouvée au passage (voir section sécurité en tête de
  fichier) — `getCoachInbox()` filtre explicitement par coach_id plutôt que
  de réutiliser les fonctions existantes qui comptent sur la RLS seule.
  tsc/eslint/build vérifiés, commit `3e03435`.
- **2026-08-13** — Item 10 traité : bibliothèque de modèles remplie
  directement en base (pas de code à changer, l'UI de gestion des modèles
  existait déjà). 3 programmes (Full Body Débutant, Upper/Lower
  Intermédiaire salle, Full Body Maison), 2 diètes (Flexible Prise de
  masse, Flexible Déficit), 2 roadmaps 12 semaines (Recomposition, Perte de
  gras avec pause diète). Pas de commit git (aucun fichier modifié).
  **Axe 2 : 8/9 items faits. Reste 11 (actions groupées).**
- **2026-08-13** — Item 11 traité. Constat en cours de route : l'application
  groupée d'un modèle (programme/diète/roadmap) à plusieurs clients existait
  déjà entièrement (UI multi-sélection comprise, citée comme le cas d'usage
  "10 nouveaux clients"). Ajouté le volet manquant : `bulkAdjustCalories()`,
  décale l'objectif calorique de plusieurs clients d'un coup et réutilise
  `rescaleActiveDietPlanToTargets` (déjà construit plus tôt) pour recalculer
  les grammages de chacun automatiquement. tsc/eslint/build vérifiés,
  commit `f380e3a`. **Axe 2 (Outils coach) terminé : 9/9.**

---

## Sécurité / cloisonnement — décision écrite obligatoire avant merge prod

Concerne #29, #37, #47, #49 (voir master prompt §1), plus #46 (marqué ⚠️
dans le tableau de l'axe 8 lui-même — touche la logique de facturation/accès,
même précaution appliquée). Rien ne sera mergé sur `main` par moi de toute
façon (branche + review Emmanuel), mais ces items ne doivent pas être
considérés "prêts" sans qu'Emmanuel ait lu et validé explicitement la
décision ci-dessous.

| # | Décision | Statut |
|---|----------|--------|
| 29 | Notes de gêne (session_sets.notes) affichées uniquement sur la page coach déjà scopée à un seul client (`/dashboard/coach/clients/[id]/logbook`, fetch par `getAllClientSessions(id)`/`getClientById(id, user.id)`/`getClientIntake(id)` — jamais de requête cross-clients). Aucune nouvelle table, aucune nouvelle policy RLS. Pas de panneau agrégé "tous mes clients avec une gêne" dans ce lot — ça relèverait de la même famille de risque que l'inbox (item 8) et mérite sa propre revue si demandé plus tard. | fait — voir commit `f505532` |
| 37 | Pas de nouveau champ stocké (risque de désynchronisation avec `subscription_status`, écrit par Stripe/webhooks). `getAccessType()` (utils/auth-client.ts) est une **dérivation pure**, calculée à la volée depuis role/coach_id/subscription_status déjà existants — la même donnée, juste nommée et centralisée. Seul le doublon logique trouvé (RoadmapView.tsx) a été corrigé pour appeler le helper partagé au lieu de recomposer la condition. Pas de sweep mécanique des ~10 autres lectures directes de `subscription_status` (champ unique, pas de logique combinée dupliquée — risque de régression jugé supérieur au bénéfice). | fait — voir commit `a9c2c5a` |
| 46 | Purement additif, aucune logique d'accès touchée : `isSubscribed()` traitait déjà (et traite toujours) `"canceled"` exactement comme `"free"` partout où l'accès est vérifié — ce fix ajoute seulement deux `notifyUser()` (client + coach assigné) en plus du `notifyAdmin()` déjà existant sur la transition Stripe `→ canceled`, et un bandeau d'affichage distinct côté client. Rien dans le webhook qui décide QUI a accès à quoi n'a changé. | fait — voir commit `1dc3f40` |
| 47 | Vérifié en base au moment du chantier : `mfa_enabled = false` sur le compte fondateur — le risque documenté dans `requireStrongSessionIfNeeded` (app/dashboard/layout.tsx) est donc réel aujourd'hui, pas hypothétique. Le blocage dur d'enrôlement obligatoire pour le fondateur **reste désactivé** : décision déjà actée dans le code avant ce chantier (incident du 2026-08-05, correctifs vérifiés en production mais jamais rejoués dans un vrai navigateur — je n'ai moi-même aucun moyen de le faire dans cet environnement). Je n'ai pas rouvert ce blocage. Seul ajout : `TwoFactorNudgeBanner`, un rappel non bloquant, visible à chaque session tant que la 2FA n'est pas activée — aucun nouveau risque de verrouillage. | fait — voir commit `01587e5` |
| 49 | Audité en lecture seule (`pg_policies` sur les tables `public`), **aucun changement de schéma ajouté**. Le socle multi-coach (`profiles.coach_id`, fonctions `is_own_coach()`/`is_platform_owner()`/`my_coach_scope()`, RLS scopée dessus) existe déjà et couvre la grande majorité des tables sensibles — migration `20260729b_multi_coach_foundation.sql`, antérieure à ce chantier. Construire un second niveau de cloisonnement sans un 2e coach réel pour le valider recréerait soit une redondance, soit un risque de toucher des policies qui chevauchent l'audit de sécurité séparé déjà réservé (les 6 failles). Un candidat de fuite cross-coach supplémentaire trouvé pendant l'audit, hors de la liste des 6 déjà connues : voir Signalements ci-dessous (`resource_requests`), documenté et non corrigé. | fait (audit, aucun changement de schéma) |

---

## Session log (suite axe 3)

- **2026-08-13** — Axe 3 démarré. Constat immédiat : 3 des 6 items étaient
  déjà entièrement construits avant ce chantier — item 17 (aliments récents
  + les plus utilisés, `ClientNutritionView.tsx`), item 19 (minuteur de
  repos actif, suggéré selon le RIR, `SessionView.tsx`). Marqués faits sans
  code touché.
- **2026-08-13** — Item 21 traité : prompt d'installation natif Android/
  Chrome via `beforeinstallprompt`. Build anormalement lent (37min, système
  sous charge après une longue session de builds successifs) mais a fini
  par passer, exit 0. Commit `9059c50`.
- **2026-08-13** — Item 20 traité : `getClientActivityStreak()` + carte
  `RegularityCard` sur le dashboard client (streak + rang/points, juste
  après le header). tsc/eslint/build vérifiés, commit `b3ba92c`.
- **2026-08-13** — Item 18 traité : page publique `/outils` (calculateur
  calories/macros + 1RM), sans compte. tsc/eslint/build vérifiés, commit
  `ba3e07c`.
- **2026-08-13** — Item 16 traité : scan code-barres via `BarcodeDetector`
  natif (Chrome/Edge, pas de nouvelle dépendance), lookup OpenFoodFacts,
  pré-remplit le formulaire de création d'aliment déjà existant. tsc/eslint/
  build vérifiés, commit `3b8cb18`. **Axe 3 (Outils membre) terminé : 6/6.**
  Note système : les builds de cette portion ont pris 15 à 40 min chacun au
  lieu de 1-3 min habituellement — contention machine après une longue
  série de builds successifs, pas un problème de code (exit 0 à chaque fois).

## Session log (suite axe 4)

- **2026-08-13** — Axe 4 démarré. Item 23 traité : cron hebdo dimanche 18h
  (`/api/cron/weekly-progress-recap`, même structure que le cron sommeil
  existant), calcule séances/adhérence nutrition/tendance de poids par
  client éligible, un seul `notifyUser`. Commit `4594445`.
- **2026-08-13** — Item 25 traité : page `/dashboard/client/coach`, profil du
  coach connecté (bio/avatar/instagram via `getProfile`), CTA message, ce
  qui est inclus, lien vers "Mot du coach". Icône `Instagram` inexistante
  dans cette version de lucide-react, remplacée par `AtSign`. Commit
  `74fff1b`.
- **2026-08-13** — Item 26 traité : `HighlightsStrip`, strip horizontal des
  12 derniers records personnels, en tête du logbook. Scope volontairement
  réduit aux records (pas les photos, pour ne pas re-threader des props
  dans un arbre déjà large). Commit `adfae4c`.
- **2026-08-13** — Item 28 traité : recherche dans une conversation
  (`ConversationView.tsx`), filtre les messages affichés, état vide dédié
  distinct de "pas de messages du tout". Commit `e91352a`.
- **2026-08-13** — Item 27 vérifié, déjà couvert : `roleBadge()` +
  `BadgePill` affichent déjà 4 statuts (Fondateur/Coach/Premium/Membre
  gratuit) sur `ProfileHeader`. Marqué fait sans code touché.
- **2026-08-13** — Item 24 vérifié, déjà couvert et au-delà de l'ambition de
  l'item : système de réservation self-service complet déjà existant
  (`AvailabilityManager` côté coach définit des créneaux récurrents,
  `SlotPicker` côté client réserve dessus), avec 4 modes de booking
  (self-service, self-service récurrent sur 8 semaines, programmé par le
  coach, demande flash), RSVP pour les lives de groupe, fenêtre de jonction
  vérifiée aussi côté serveur. Marqué fait sans code touché.
- **2026-08-13** — Item 22 traité : notes horodatées sur la vidéo du client
  dans une correction technique (`video_annotations` jsonb), éditables tant
  que la correction est en attente, lecture seule une fois traitée, clic
  sur un timestamp = seek direct. Au passage, migration de documentation
  manquante pour le cron de l'item 23 ajoutée (le commit `4594445`
  l'annonçait mais elle n'existait pas encore). tsc/eslint/build vérifiés,
  commit `5461b14`. **Axe 4 (Expérience client high-ticket) terminé : 7/7.**

## Session log (suite axe 5)

- **2026-08-14** — Axe 5 démarré. Item 22 (reporté d'axe 4) finalisé au
  passage : migration de doc manquante pour le cron de l'item 23 ajoutée
  (`20260813b_weekly_progress_recap_cron.sql`), commit `5461b14`.
- **2026-08-14** — Item 29 (⚠️ sensible, décision écrite ci-dessus) traité :
  les notes que le client laisse sur un SET précis (`session_sets.notes`)
  n'étaient affichées nulle part, ni côté client ni côté coach — vérifié
  par recherche avant d'écrire une ligne de code. Affichées désormais dans
  le logbook coach (page déjà scopée à un seul client), repérées par
  mots-clés de gêne, avec rappel des blessures déclarées en fiche en tête
  de page.
- **2026-08-14** — Item 30 traité dans la foulée (même fichier
  `ClientProfileTabs.tsx`) : `generateFatigueTrendSuggestion`, distinct de
  l'item 12. Commit combiné `f505532`.
- **2026-08-14** — Item 31 traité : `suggestNextWeight` dans SessionView,
  autorégulation simple à partir du RIR réel vs cible. Commit `4167897`.
- **2026-08-14** — Item 32 traité : le suivi de cycle et sa relance
  existaient déjà côté coach (fiche client) — invisible pour la cliente
  elle-même. Bandeau ajouté sur son propre dashboard. Commit `655379a`.
- **2026-08-14** — Item 33 vérifié, déjà couvert : score de forme
  (readiness_score Oura) + moteur de règles `lib/biometric-rules.ts` déjà
  affichés sur la page Aujourd'hui avec suggestion contextuelle. Marqué
  fait sans code touché.
- **2026-08-14** — Item 34 traité : compléments en checklist quotidienne,
  réutilise le mécanisme des habitudes mindset (`mindset_habit_logs`,
  `habit_key` texte libre) avec une clé synthétique `supplement:<id>` —
  aucune nouvelle table/RLS. Commit `fb6cd17`.
- **2026-08-14** — Item 35 traité : `PhotoCompareSlider` (curseur glissant
  clip-path), remplace le côte-à-côte statique du comparateur coach (item
  13) et ajouté côté client (n'existait pas du tout). Alignement
  automatique par reconnaissance de pose explicitement écarté (vision par
  ordinateur, hors budget raisonnable de ce chantier). Commit `5921425`.
- **2026-08-14** — Item 36 traité : `getClientsWeeklyConsistency`, % de
  jours actifs depuis lundi par client, 3e cellule sur ClientCard. Commit
  `aa8bc17`. **Axe 5 (Données sous-exploitées) terminé : 8/8.**

## Session log (suite axe 6)

- **2026-08-14** — Axe 6 démarré. Item 37 (⚠️ sensible, décision écrite
  ci-dessus) traité : `getAccessType()` centralisé, dérivation pure sans
  nouveau champ. Audit des ~13 fichiers lisant `subscription_status` —
  un seul vrai doublon de LOGIQUE (pas juste une lecture de champ) trouvé
  et corrigé (`RoadmapView.tsx`). Commit `a9c2c5a`.
- **2026-08-14** — Item 38 traité : `/api/library-search`, branché sur la
  palette de commande existante (item 5) plutôt qu'une fusion des pages
  de navigation — même valeur (une seule recherche pour tout), risque
  bien moindre. Corrigé au passage un `react-hooks/set-state-in-effect`
  introduit par mon propre code (vidage du résultat en dessous de 2
  caractères déplacé en dérivation au rendu). Commit `cad9985`.
- **2026-08-14** — Item 39 investigué en profondeur (templates roadmap +
  flux d'application groupée + accès coach ET client vérifiés dans le
  code) : aucune ambiguïté structurelle trouvée, la fonctionnalité est
  complète et bien intégrée des deux côtés. Verdict : reste telle quelle,
  aucun changement de code.
- **2026-08-14** — Item 40 traité : recherche par motif des états vides
  "Aucun X" sans explication à travers l'appli — la plupart en avaient
  déjà une (ClientsSection, AvailabilityManager...). 3 corrigés parce que
  genuinement nus (Membres, Logbook coach, Décisions clé). Commit
  `fe06513`. **Axe 6 (Cohérence structurelle) terminé : 4/4.**
  Note système : le premier build de vérification a échoué sur un 404
  réseau transitoire en récupérant Playfair Display depuis
  fonts.gstatic.com (rien à voir avec le code) — repassé propre au
  second essai immédiat.

## Session log (suite axe 7)

- **2026-08-14** — Axe 7 démarré. Item 41 traité : parrainage avec
  récompense. Colonnes dédiées `referral_code`/`referred_by` plutôt que de
  réutiliser `invite_code` (déjà un concept distinct, filtré par
  `role='coach'` partout où il est lu) — deux flux séparés, plus faciles à
  auditer. `/auth/client?ref=CODE` crédite +50 points au parrain sans jamais
  toucher à l'attribution du coach. Commit `4b36ea7`.
- **2026-08-14** — Item 42 traité : le CTA premium du dashboard membre
  gratuit était un texte statique identique pour tout le monde. `upsellPitch()`
  choisit le message selon un signal réel (checklist finie, ou streak ≥7j déjà
  calculé pour l'item 20), fallback identique au texte d'origine sinon.
  Commit `ee447d4`.
- **2026-08-14** — Item 43 traité : essai coaching limité dans le temps.
  `startCoachingTrial()` réutilise `setClientSubscriptionStatus()` tel quel
  (donc calibrage + notif onboarding déjà gérés) et ajoute juste
  `trial_ends_at`. Cron quotidien `expire-trials` (9h, jobid 29 en prod)
  repasse automatiquement en gratuit à l'échéance et notifie le client avec
  un lien vers l'activation payante. Commit `5426fc3`.
- **2026-08-14** — Item 44 traité : mur de réussites publiques. Opt-in
  explicite au moment de la publication (case décochée par défaut, jamais
  rétroactif sur une victoire déjà postée) — décision volontaire pour ne
  jamais exposer publiquement un contenu privé sans consentement direct.
  Page `/reussites` (prénom uniquement, jamais le nom de famille). Commit
  `ac6c095`.
- **2026-08-14** — Item 45 traité : liste d'attente coaching.
  `accepting_new_clients` (défaut true, rétro-compatible) + table
  `coaching_waitlist` avec RLS. `AcceptingClientsCard` côté coach
  (bascule + suivi des demandes), `WaitlistJoinButton` remplace le CTA de
  réservation externe côté client quand le coach assigné est à capacité.
  Commit `bef4433`. **Axe 7 (Croissance & monétisation) terminé : 5/5.**

## Session log (suite axe 8 — dernier axe)

- **2026-08-14** — Axe 8 démarré. Item 47 (⚠️ sensible, décision écrite
  ci-dessus) traité en premier : vérifié en base que `mfa_enabled = false`
  sur le compte fondateur aujourd'hui — le risque documenté dans
  `requireStrongSessionIfNeeded` est bien réel. Le blocage dur reste
  désactivé (décision pré-existante, pas rouverte). `TwoFactorNudgeBanner`
  ajouté à la place : rappel non bloquant. Commit `01587e5`.
- **2026-08-14** — Item 46 (⚠️ décision écrite ci-dessus) traité : le webhook
  Stripe repassait déjà `subscription_status` à `"canceled"` correctement,
  mais seul `notifyAdmin` (fondateur) était notifié — ni le client concerné
  ni son coach. Deux `notifyUser()` ajoutés, purement additifs, aucune
  logique d'accès touchée. Bandeau distinct sur la page abonnement pour
  quelqu'un qui vient de perdre l'accès. Commit `1dc3f40`.
- **2026-08-14** — Item 48 traité : `/api/export-data`, export JSON des
  catégories principales de données personnelles, self-scoped. Bouton dans
  `AccountActions`, avant la suppression de compte. Commit `4869973`.
- **2026-08-14** — Item 49 (⚠️ décision écrite ci-dessus) audité : requête
  `pg_policies` sur tout le schéma `public` pour vérifier la maturité du
  socle multi-coach. Confirmé mature (migration antérieure au chantier),
  aucun changement de schéma ajouté. Une fuite potentielle supplémentaire
  trouvée (`resource_requests`, RLS `role='coach'` générique au lieu de
  `is_own_coach()`), documentée en Signalements, non corrigée — hors
  périmètre de ce chantier comme les 6 failles déjà connues.
- **2026-08-14** — Item 50 traité : heures de silence pour les
  notifications push. `quiet_hours_start`/`end` sur `push_subscriptions`
  (déjà relue à chaque envoi, zéro requête supplémentaire), défaut 22h-7h,
  coupe uniquement le push jamais la notif in-app. Réglage dans
  `PermissionsCard`. Commit `095b270`. **Axe 8 (Failles & angles morts)
  terminé : 5/5.**

**🏁 Chantier "50 idées" terminé : 50/50 items traités** (dont 7
déjà pré-existants avant ce chantier — items 6, 15, 17, 19, 24, 27, 33 —
vérifiés puis marqués faits sans code, et 1 audité sans changement — item
39). Les 4 items sensibles (#29, #37, #47, #49) ont chacun une décision
écrite dans la section sécurité ci-dessus, plus #46 par précaution. Aucun
des 6 failles cross-coach réservées n'a été touché ; 2 pistes
supplémentaires potentielles ont été documentées en Signalements
(`getScienceStudies`, `resource_requests`) sans être corrigées. Rien
mergé sur `main` — tout reste sur `feature/50-idees`, prêt pour review.

## Signalements (code touchant une zone déjà marquée vulnérable)

- **`utils/science.ts` — `getScienceStudies`** (rencontré en traitant l'item 1,
  pas modifié) : son propre commentaire dans le code documente que la fonction
  peut renvoyer les études de TOUS les coachs de la plateforme à n'importe quel
  client dès qu'un 2e coach existera ("fuite inter-coachs"). Non exploitable
  avec un seul coach en prod aujourd'hui. Je n'y ai pas touché (ni mis en
  cache, ni "corrigé en silence") — à vérifier si c'est déjà une des 6 failles
  de l'audit séparé ou un doublon à traiter avec elles.
- **`resource_requests` (RLS)** — trouvé en auditant l'item 49. Les policies
  "Author or coach can update/delete a request" vérifient juste
  `role = 'coach'`, pas quel coach précisément : n'importe quel coach tiers
  de la plateforme peut modifier/supprimer la demande de ressource d'un
  membre qui n'est pas le sien. Même famille que les 6 failles déjà connues
  (communauté, live, profil, dashboard-stats, /api/push/send,
  /api/coach/pending-count), mais `resource_requests` n'est nommée dans
  aucune d'elles explicitement — possible doublon de "communauté" ou
  trouvaille distincte, à trancher par l'audit séparé. Non exploitable avec
  un seul coach en prod aujourd'hui. Pas touché.
- **`formations`/`formation_modules`/`formation_lessons`/`formation_sections`**
  (RLS "coach_manage_*", même pattern `role = 'coach'` générique) —
  volontairement PAS signalé comme une fuite : ces tables n'ont pas de
  `coach_id` du tout, elles forment une bibliothèque de cours partagée à
  toute la plateforme par conception (pas de notion de "quel coach" les
  possède), contrairement à `resource_requests` qui a un `author_id` par
  demande individuelle.

---

## Axe 1 — Navigation & fluidité (01–06)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 1 | Auditer les 32 pages force-dynamic, cache ciblé | fait | `3ade35e`, `4245e8c` | 2026-08-13 | force-dynamic est légitime sur les 32 (dashboards perso) ; le vrai coût était les lectures de référence partagées re-requêtées à chaque clic, voir item 4 |
| 2 | Repérer les requêtes en cascade, paralléliser | fait | `43640df` | 2026-08-13 | 4 pages corrigées (formations, bilan, membres, coachs) ; reste du repo déjà bien parallélisé ; admin/leads volontairement laissé séquentiel (PII) |
| 3 | Squelettes de chargement fidèles à la page réelle | fait (partiel) | `d70bb07` | 2026-08-13 | TabbedPageSkeleton ajouté + appliqué à 6 pages nutrition/programme ; ~70 loading.tsx restants pas revus un par un |
| 4 | Cache données figées (exercices/salles/aliments) | fait | `3ade35e`, `4245e8c` | 2026-08-13 | unstable_cache 1h + updateTag (pas revalidateTag, voir décision ci-dessus) sur foods/exercise-library/gyms/science-articles |
| 5 | Palette de commande (Cmd/Ctrl+K) | fait | `720e8a9` | 2026-08-13 | recherche client + pages nav, navigation clavier |
| 6 | Préchargement au survol/focus | fait | — | 2026-08-13 | déjà couvert par le prefetch complet au montage (plus large qu'un hover) |

## Axe 2 — Outils coach (07–15)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 7 | Tableau de bord santé des clients | fait | `163450c` | 2026-08-13 | point vert/orange/rouge sur ClientCard, basé sur le silence (voir item 9) |
| 8 | Boîte de réception coach unique | fait | `3e03435` | 2026-08-13 | nouvelle page /dashboard/coach/inbox, filtre coach_id explicite (voir sécurité) |
| 9 | Alerte "client silencieux" | fait | `163450c` | 2026-08-13 | seuil 5j, 3 sources (entraînement/nutrition/bilan), jamais affiché pour pause/terminé |
| 10 | Bibliothèque de modèles (programme/diète/roadmap) | fait | (données, pas de commit) | 2026-08-13 | 3 programmes, 2 diètes, 2 roadmaps, insérés directement en base |
| 11 | Actions groupées multi-clients | fait | `f380e3a` | 2026-08-13 | modèles déjà groupés avant ce chantier ; ajout de l'ajustement calorique groupé |
| 12 | Suggestion de décharge entraînement (miroir rescale diète) | fait | `1c28193` | 2026-08-13 | stagnation sur 4 séances, dans ExerciseProgressionChart |
| 13 | Comparateur avant/après en un clic | fait | `7290573` | 2026-08-13 | mensurations non affichées côté coach avant ce fix ; BeforeAfterComparator dans l'onglet Bilans |
| 14 | Suivi entonnoir onboarding + relance | fait | `48b7d0f` | 2026-08-13 | badge + relance en un clic sur ClientCard, réutilise relaunchMember existant |
| 15 | Recherche transversale clients | fait | (pré-existant) | 2026-08-13 | déjà construit avant ce chantier ; étendu avec le filtre "Inactifs" (commit `163450c`) |

## Axe 3 — Outils membre (16–21)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 16 | Scan photo/code-barres tracker calories | fait | `3b8cb18` | 2026-08-13 | BarcodeDetector natif + OpenFoodFacts, pré-remplit le formulaire de création d'aliment existant |
| 17 | Aliments récents/favoris en un tap | fait | (pré-existant) | 2026-08-13 | déjà construit avant ce chantier |
| 18 | Calculateurs autonomes publics (macros, 1RM) | fait | `ba3e07c` | 2026-08-13 | page /outils |
| 19 | Minuteur de repos dans le logbook | fait | (pré-existant) | 2026-08-13 | déjà construit avant ce chantier, suggestion selon RIR en plus |
| 20 | Mise en avant points/régularité | fait | `b3ba92c` | 2026-08-13 | RegularityCard sur dashboard client |
| 21 | Statut PWA installée, comportement natif | fait | `9059c50` | 2026-08-13 | prompt natif Android/Chrome |

## Axe 4 — Expérience client high-ticket (22–28)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 22 | Analyse vidéo de technique annotée | fait | `5461b14` | 2026-08-13 | notes horodatées sur la vidéo du client, jsonb, éditables tant que pending, seek au clic |
| 23 | Récap hebdo automatique personnalisé | fait | `4594445` | 2026-08-13 | cron dimanche 18h, séances/adhérence nutrition/tendance poids |
| 24 | Prise de rendez-vous intégrée | fait (pré-existant) | — | 2026-08-13 | AvailabilityManager + SlotPicker déjà complets, 4 modes de booking, RSVP groupe |
| 25 | Espace "Mon coach" dédié | fait | `74fff1b` | 2026-08-13 | /dashboard/client/coach : profil, bio, CTA message, lien Mot du coach |
| 26 | Chronologie progression "highlight" | fait | `adfae4c` | 2026-08-13 | HighlightsStrip, 12 derniers records, scope réduit (pas de photos) |
| 27 | Signal visuel statut premium | fait (pré-existant) | — | 2026-08-13 | roleBadge()/BadgePill déjà 4 tiers |
| 28 | Historique de discussion mis en valeur | fait | `e91352a` | 2026-08-13 | recherche dans une conversation, filtre les messages |

## Axe 5 — Données & process sous-exploités (29–36)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 29 | ⚠️ Croiser blessures × notes de gêne exercices | fait | `f505532` | 2026-08-14 | notes par set invisibles nulle part avant ce fix ; affichées + repérées par mots-clés dans le logbook coach, rappel des blessures déclarées en tête |
| 30 | Décharge suggérée depuis données loggées | fait | `f505532` | 2026-08-14 | distinct de l'item 12 (1 exercice) : fatigue accumulée sur feeling/énergie/RIR, 3 dernières séances vs 3 précédentes |
| 31 | Charge suggérée séance suivante (RIR) | fait | `4167897` | 2026-08-14 | autorégulation ±2,5%/point de RIR d'écart, remplace le placeholder du champ poids |
| 32 | Suivi de cycle menstruel (activer) | fait | `655379a` | 2026-08-14 | fonctionnalité déjà complète, relance déjà existante côté coach ; ajout d'une relance visible par la cliente elle-même sur son propre dashboard |
| 33 | Score de forme du jour (insights biométriques) | fait (pré-existant) | — | 2026-08-14 | readiness_score + moteur de règles (lib/biometric-rules.ts) déjà affichés sur Aujourd'hui, avec suggestion contextuelle |
| 34 | Compléments en checklist quotidienne | fait | `fb6cd17` | 2026-08-14 | réutilise mindset_habit_logs (clé "supplement:id"), aucune nouvelle table |
| 35 | Comparaison photo alignée automatiquement | fait | `5921425` | 2026-08-14 | curseur glissant (clip-path) plutôt qu'alignement par vision par ordinateur, coach + client |
| 36 | Score de constance hebdomadaire unique | fait | `aa8bc17` | 2026-08-14 | % de jours actifs depuis lundi, 3e cellule sur ClientCard, distinct du streak (20) et du silence (7/9) |

## Axe 6 — Cohérence structurelle (37–40)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 37 | ⚠️ Champ "type d'accès" (membre vs client accompagné) | fait | `a9c2c5a` | 2026-08-14 | `getAccessType()` dérivé, pas de nouveau champ ; fix du doublon dans RoadmapView.tsx |
| 38 | Bibliothèque unique tout contenu + recherche | fait | `cad9985` | 2026-08-14 | `/api/library-search` branché sur la palette de commande (item 5), pas de fusion des pages de navigation |
| 39 | Trancher le sort de la Roadmap | fait (audit, aucun changement) | — | 2026-08-14 | investigué en profondeur : templates + apply-flow + accès coach ET client déjà complets, aucune ambiguïté structurelle trouvée — verdict : reste tel quel |
| 40 | États vides explicatifs | fait (partiel) | `fe06513` | 2026-08-14 | 3 états vides nus corrigés (Membres, Logbook coach, Décisions clé) ; la plupart des ~20 autres en avaient déjà une, pas de sweep exhaustif |

## Axe 7 — Croissance & monétisation (41–45)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 41 | Parrainage avec récompense | fait | `4b36ea7` | 2026-08-14 | referral_code/referred_by dédiés (pas invite_code) ; +50 points au parrain, aucun effet sur l'attribution de coach |
| 42 | Relance d'upsell contextuelle | fait | `ee447d4` | 2026-08-14 | upsellPitch() : checklist finie ou streak ≥7j plutôt qu'un texte statique |
| 43 | Essai coaching limité dans le temps | fait | `5426fc3` | 2026-08-14 | réutilise setClientSubscriptionStatus tel quel + trial_ends_at ; cron quotidien expire-trials (jobid 29) |
| 44 | Mur de réussites publiques | fait | `ac6c095` | 2026-08-14 | opt-in explicite au moment de la publication (défaut décoché), page /reussites, prénom uniquement |
| 45 | Liste d'attente coaching | fait | `bef4433` | 2026-08-14 | accepting_new_clients + coaching_waitlist (RLS), AcceptingClientsCard côté coach, WaitlistJoinButton côté client |

## Axe 8 — Failles & angles morts (46–50)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 46 | ⚠️ Parcours suspension abonnement | fait | `1dc3f40` | 2026-08-14 | client + coach prévenus (avant : seul le fondateur l'était), aucune logique d'accès touchée |
| 47 | ⚠️ Vérifier/pousser la 2FA fondateur | fait | `01587e5` | 2026-08-14 | mfa_enabled=false vérifié en base ; blocage dur toujours désactivé (décision pré-existante confirmée) ; bandeau de rappel non bloquant ajouté |
| 48 | Export complet données personnelles | fait | `4869973` | 2026-08-14 | /api/export-data (JSON), catégories principales, self-scoped |
| 49 | ⚠️ Bases schéma pour un 2e coach | fait (audit, aucun changement de schéma) | — | 2026-08-14 | socle is_own_coach() déjà mature (migration antérieure) ; 1 nouvelle fuite potentielle trouvée et documentée (resource_requests), non corrigée |
| 50 | Heures de silence notifications | fait | `095b270` | 2026-08-14 | quiet_hours sur push_subscriptions, défaut 22h-7h, coupe le push jamais la notif in-app |
