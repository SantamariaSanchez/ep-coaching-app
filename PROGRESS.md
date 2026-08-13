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

Concerne #29, #37, #47, #49 (voir master prompt §1). Rien ne sera mergé sur
`main` par moi de toute façon (branche + review Emmanuel), mais ces 4 items
en particulier ne doivent pas être considérés "prêts" sans qu'Emmanuel ait
lu et validé explicitement la décision ci-dessous.

| # | Décision | Statut |
|---|----------|--------|
| 29 | *(à écrire quand traité)* | todo |
| 37 | *(à écrire quand traité)* | todo |
| 47 | *(à écrire quand traité)* | todo |
| 49 | *(à écrire quand traité)* | todo |

---

## Signalements (code touchant une zone déjà marquée vulnérable)

- **`utils/science.ts` — `getScienceStudies`** (rencontré en traitant l'item 1,
  pas modifié) : son propre commentaire dans le code documente que la fonction
  peut renvoyer les études de TOUS les coachs de la plateforme à n'importe quel
  client dès qu'un 2e coach existera ("fuite inter-coachs"). Non exploitable
  avec un seul coach en prod aujourd'hui. Je n'y ai pas touché (ni mis en
  cache, ni "corrigé en silence") — à vérifier si c'est déjà une des 6 failles
  de l'audit séparé ou un doublon à traiter avec elles.

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
| 16 | Scan photo/code-barres tracker calories | todo | — | — | — |
| 17 | Aliments récents/favoris en un tap | todo | — | — | — |
| 18 | Calculateurs autonomes publics (macros, 1RM) | todo | — | — | — |
| 19 | Minuteur de repos dans le logbook | todo | — | — | — |
| 20 | Mise en avant points/régularité | todo | — | — | — |
| 21 | Statut PWA installée, comportement natif | todo | — | — | — |

## Axe 4 — Expérience client high-ticket (22–28)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 22 | Analyse vidéo de technique annotée | todo | — | — | — |
| 23 | Récap hebdo automatique personnalisé | todo | — | — | — |
| 24 | Prise de rendez-vous intégrée | todo | — | — | — |
| 25 | Espace "Mon coach" dédié | todo | — | — | — |
| 26 | Chronologie progression "highlight" | todo | — | — | — |
| 27 | Signal visuel statut premium | todo | — | — | — |
| 28 | Historique de discussion mis en valeur | todo | — | — | — |

## Axe 5 — Données & process sous-exploités (29–36)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 29 | ⚠️ Croiser blessures × notes de gêne exercices | todo | — | — | — |
| 30 | Décharge suggérée depuis données loggées | todo | — | — | — |
| 31 | Charge suggérée séance suivante (RIR) | todo | — | — | — |
| 32 | Suivi de cycle menstruel (activer) | todo | — | — | — |
| 33 | Score de forme du jour (insights biométriques) | todo | — | — | — |
| 34 | Compléments en checklist quotidienne | todo | — | — | — |
| 35 | Comparaison photo alignée automatiquement | todo | — | — | — |
| 36 | Score de constance hebdomadaire unique | todo | — | — | — |

## Axe 6 — Cohérence structurelle (37–40)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 37 | ⚠️ Champ "type d'accès" (membre vs client accompagné) | todo | — | — | — |
| 38 | Bibliothèque unique tout contenu + recherche | todo | — | — | — |
| 39 | Trancher le sort de la Roadmap | todo | — | — | — |
| 40 | États vides explicatifs | todo | — | — | — |

## Axe 7 — Croissance & monétisation (41–45)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 41 | Parrainage avec récompense | todo | — | — | — |
| 42 | Relance d'upsell contextuelle | todo | — | — | — |
| 43 | Essai coaching limité dans le temps | todo | — | — | — |
| 44 | Mur de réussites publiques | todo | — | — | — |
| 45 | Liste d'attente coaching | todo | — | — | — |

## Axe 8 — Failles & angles morts (46–50)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 46 | ⚠️ Parcours suspension abonnement | todo | — | — | — |
| 47 | ⚠️ Vérifier/pousser la 2FA fondateur | todo | — | — | — |
| 48 | Export complet données personnelles | todo | — | — | — |
| 49 | ⚠️ Bases schéma pour un 2e coach | todo | — | — | — |
| 50 | Heures de silence notifications | todo | — | — | — |
