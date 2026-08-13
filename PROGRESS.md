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
| 5 | Palette de commande (Cmd/Ctrl+K) | todo | — | — | — |
| 6 | Préchargement au survol/focus | todo | — | — | — |

## Axe 2 — Outils coach (07–15)

| # | Item | Statut | Commit(s) | Date | Résumé |
|---|------|--------|-----------|------|--------|
| 7 | Tableau de bord santé des clients | todo | — | — | — |
| 8 | Boîte de réception coach unique | todo | — | — | — |
| 9 | Alerte "client silencieux" | todo | — | — | — |
| 10 | Bibliothèque de modèles (programme/diète/roadmap) | todo | — | — | — |
| 11 | Actions groupées multi-clients | todo | — | — | — |
| 12 | Suggestion de décharge entraînement (miroir rescale diète) | todo | — | — | — |
| 13 | Comparateur avant/après en un clic | todo | — | — | — |
| 14 | Suivi entonnoir onboarding + relance | todo | — | — | — |
| 15 | Recherche transversale clients | todo | — | — | — |

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
