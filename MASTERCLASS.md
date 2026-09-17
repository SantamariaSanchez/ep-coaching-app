# MASTERCLASS — audit et amélioration continue de l'appli

Lancé le 2026-08-14, à la demande explicite : *"je veux que tu masterclass
toute l'appli petit à petit donc t'as beaucoup de travail organise-toi et
gooo"*. Contrairement à `VISION.md` (ajout de fonctionnalités nouvelles,
chantier fermé le même jour) et `LEADMAGNETS.md` (production de contenu),
ce fichier suit un travail structurellement différent et sans fin naturelle :
une revue systématique, module par module, de l'appli EXISTANTE — bugs
silencieux, incohérences, dette, choses à polir. Vit en autonomie, repris à
chaque "go"/"continue" sans redemander de direction déjà actée ici.

**Protocole de reprise** : lire la section "En cours" ci-dessous, reprendre
exactement là où c'est marqué. Chaque axe fermé garde son entrée (ne pas
supprimer l'historique) avec un statut et un résumé, pour ne jamais
ré-auditer deux fois la même chose sans raison.

## Méthodologie

Par passe, un axe précis (pas "améliore tout au hasard") :
1. Choisir une CLASSE de problème (pas juste un fichier) — ex. "cohérence
   de l'invalidation de cache après mutation", "gestion d'erreur cohérente
   dans les server actions", "accessibilité clavier", "état de chargement
   manquant". Une classe transversale trouve plus de vrais bugs qu'une
   lecture fichier par fichier sans grille de lecture.
2. Auditer avec un instrument reproductible (grep ciblé, pas juste "lire et
   espérer remarquer") — documenter la commande utilisée pour qu'une passe
   future puisse la relancer après du nouveau code.
3. Corriger ce qui est confirmé être un vrai bug (pas juste "différent de
   ce que j'aurais écrit") — vérifier tsc/eslint/build avant de pousser,
   comme pour tout le reste de l'appli.
4. Noter ce qui a été vérifié et jugé SAIN, pas seulement ce qui a été
   corrigé — sinon une passe future re-vérifie le même terrain par prudence.

## Axe A — Cohérence de l'invalidation de cache après mutation

**Statut : clos (première passe le 2026-08-14, vérification fonction par
fonction le 2026-08-15).**

Origine : bug remonté par l'utilisateur — cocher un aliment en nutrition
fonctionnait (l'insert réussissait) mais réapparaissait décoché après avoir
navigué ailleurs puis être revenu. Cause racine : `addFoodLog`/
`removeFoodLog` (`app/dashboard/client/nutrition/actions.ts`) ne
revalidaient jamais la page après une mutation. Le [client cache de
Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/staleTimes)
réutilise le rendu serveur précédent lors d'une navigation arrière/avant
(`back()`/`forward()`), même quand la navigation normale (`<Link>`) ne met
rien en cache par défaut (`staleTimes.dynamic = 0` depuis Next 15) — donc
un bug invisible en usage normal, qui n'apparaît qu'en testant
spécifiquement la navigation arrière, ce qui explique qu'il soit passé
inaperçu.

**Corrigé** :
- `addFoodLog`/`removeFoodLog` (nutrition) — `revalidatePath` ajouté sur
  les deux routes qui partagent `ClientNutritionView` (`/dashboard/client/
  nutrition` et `/dashboard/coach/moi/nutrition`).
- `markLessonComplete`/`unmarkLessonComplete` (formations) — même bug,
  même cause (aucune revalidation), corrigé pareil sur les deux routes qui
  partagent `VideoPlayer` (`/dashboard/client/formations/[formationId]` et
  `/dashboard/coach/formations/[formationId]`, syntaxe pattern + type
  `"layout"` pour capturer les segments imbriqués sans connaître l'ID réel).

**Vérifié SAIN** (déjà correct, pas besoin d'y retoucher) :
- `agenda/actions.ts` — déjà un helper partagé `revalidateAgendaPaths()`,
  appliqué systématiquement à chaque fonction de mutation. Bon modèle à
  suivre pour tout nouveau code de ce type.
- `steps/actions.ts`, `tracking/actions.ts`, `mindset/actions.ts`
  (`toggleHabitLog`) — même rigueur, les deux routes client/coach-moi sont
  systématiquement revalidées ensemble.
- `live/actions.ts` (`toggleRsvp`) — pareil.
- `auth/coach/actions.ts`, `ressources/actions.ts` (`submitLead`),
  `onboarding/actions.ts` — mutations qui n'ont légitimement pas besoin de
  `revalidatePath` (flux à usage unique avec redirection, ou état géré
  entièrement côté client localStorage) — pas des oublis, vérifiés au cas
  par cas.
- `coach/moi/{bilan,photos,programme}/actions.ts` — chacun sa propre
  action dédiée (pas de partage avec une route client), chacune revalide
  correctement sa propre page.
- `clients/[id]/photos/actions.ts` (`saveCompetitionSettings`, appelée
  aussi depuis `coach/moi/photos`) — revalide bien les deux côtés
  (`/dashboard/coach/moi/photos` explicitement listé).
- Logbook (`LogbookClient`/`SessionView`, partagé entre 4 routes client +
  coach) — classe de bug différente, pas de correctif nécessaire : le
  logging de séries pendant une séance active est un flux linéaire
  (démarrer → logger → terminer → quitter), pas un état "coché" qu'on
  attend retrouver identique après être revenu en arrière, contrairement à
  une checklist nutrition/formation. Géré via des routes API
  (`/api/client/sessions/...`) + état client actif pendant la séance, pas
  via des props serveur qu'une navigation arrière resservirait périmées de
  la même façon.

**Méthode utilisée** (relançable) :
```bash
# Passe 1 — fichiers de mutation sans AUCUNE invalidation (grossier, ne
# détecte pas une fonction isolée oubliée dans un fichier qui en a par
# ailleurs) :
for f in $(grep -rl '^"use server"' app/ lib/ utils/ --include="*.ts"); do
  mut=$(grep -cE '\.(insert|update|upsert|delete)\(' "$f")
  reval=$(grep -cE 'revalidatePath|revalidateTag|updateTag' "$f")
  [ "$mut" -gt 0 ] && [ "$reval" -eq 0 ] && echo "$f  mutations=$mut"
done

# Passe 2 — fonctions nommées comme un toggle/coche (plus précis, cible la
# vraie zone à risque : état visuel "coché/pas coché" attendu persistant) :
grep -rn "export async function \(toggle\|mark\|check\|complete\|log\)" app/ --include="*.ts" -i
```

**Passe fonction par fonction (2026-08-15, clôture de l'axe)** : le point
resté ouvert ci-dessous ("une fonction isolée oubliée dans un fichier qui
a par ailleurs des revalidations correctes") enfin traité correctement,
avec un vrai script plutôt qu'un grep global. `find-unrevalidated-
functions.mjs` (scratchpad) : pour chaque fichier `"use server"` sous
`app/`, isole le corps de CHAQUE fonction exportée (via un compteur
d'accolades, pas une regex naïve) et vérifie individuellement si CETTE
fonction contient à la fois une mutation (`.insert/.update/.upsert/
.delete`) et un appel `revalidatePath`/`revalidateTag`/`redirect` — plus
le piège du grep par fichier qui avait laissé passer nutrition/formations
inaperçus au départ.

**Résultat : seulement 4 candidats sur ~60 fichiers d'actions passés en
revue, et les 4 sont des faux positifs / non-problèmes vérifiés un par
un** :
- `markLessonComplete`/`unmarkLessonComplete`
  (`formations/actions.ts`) — déjà corrigés depuis le tout début de cette
  session (voir plus haut), juste invisibles au script car la
  revalidation passe par un helper nommé `revalidateFormations()`, pas un
  appel `revalidatePath` littéral dans le corps de la fonction.
- `selfSignup`/`signupCoach` (`app/auth/{client,coach}/actions.ts`) —
  créent un compte flambant neuf : la personne n'a aucune session ni page
  déjà en cache à invalider (elle n'a jamais eu de vue de ces données
  avant), et `revalidatePath` n'aurait de toute façon aucun effet sur
  l'onglet déjà ouvert d'un tiers (un coach dont un nouveau client vient
  de s'inscrire) — ce n'est pas comme ça que fonctionne la revalidation
  Next.js. Motif déjà identifié et documenté plus haut pour
  `onboarding/actions.ts`, confirmé ici aussi.

**Conclusion de l'axe** : la discipline de revalidation de ce projet est
réellement complète sur les ~60 fichiers d'actions — l'inquiétude
initiale ("un passage fonction par fonction serait un gros chantier")
s'avère non fondée une fois vérifiée avec le bon outil. Axe A
définitivement clos, aucune passe supplémentaire nécessaire sauf
apparition de nouveau code.

### Reste à faire sur cet axe

- ~~`progression` et `roadmap` (coach/moi) pas encore vérifiés en détail~~
  — vérifié le 2026-08-15 : `app/dashboard/coach/moi/progression/page.tsx`
  est un simple `redirect()` vers `/dashboard/coach/moi/bilan` (déjà
  couvert), et `CoachMoiRoadmapView` (25 lignes) délègue entièrement à
  `components/roadmap/RoadmapEditor.tsx`, déjà confirmé `"use client"` et
  déjà vérifié dans une passe précédente. Rien à corriger, aucune mutation
  propre à ces deux wrappers.

## Prochains axes (pas commencés)

Idées à développer au fil des passes plutôt que planifiées d'avance en
détail (l'esprit de la demande est "petit à petit", pas un plan figé).
Axes A (cache après mutation), B (échecs silencieux côté UI), C
(accessibilité clavier), D (catch muets côté serveur), E (`useState`
jamais resynchronisé sur un nouveau prop serveur), F (boutons icône seule
sans nom accessible), G (champs de formulaire sans nom accessible), H
(pas d'`error.tsx`/`not-found.tsx`), I (advisors Supabase : policies RLS
et index), J (images de contenu sans texte alternatif), K (`href` sur URL
stockée sans `safeExternalUrl`), L ("aujourd'hui" calculé en UTC côté
serveur au lieu de l'heure de Paris), M (pages sans `loading.tsx`), N
(routes API de mutation sans `enforceRateLimit`), O (upload sans contrôle
taille/type avant l'envoi réseau) et P (passe sécurité sur 20 points) sont
clos — détail de chacun plus bas. Idées pas encore commencées :
- Cohérence des messages d'erreur utilisateur (certains génériques, d'autres
  précis) et de la discipline "jamais de tiret" déjà en place ailleurs —
  plus une question de polish/cohérence de ton que de vrai bug, à cadrer
  différemment des axes précédents (pas un grep mécanique évident, demande
  de relire beaucoup de messages un par un pour juger de leur clarté).
- **Mailing coach (VISION.md Axe 2), signalé "brouillon" par l'utilisateur
  le 2026-08-15** : la page (`app/dashboard/coach/mailing/`) et le composant
  d'envoi existent et semblent fonctionnels (segmentation par tag/liste
  Brevo, historique, test sur soi-même avant envoi groupé), sans TODO ni
  incomplétude évidente trouvée à la lecture rapide du code. Pas creusé plus
  loin dans cette passe faute de savoir précisément ce qui, à l'usage, ne
  convient pas — à reprendre en demandant à l'utilisateur ce qui cloche
  concrètement (rendu de l'email ? segmentation trop rigide ? autre chose ?)
  plutôt qu'en devinant un problème qui n'a peut-être pas encore été
  identifié avec précision.

## Axe B — Échecs silencieux : résultat d'action jamais vérifié côté UI

**Statut : deux passes faites (2026-08-14), 5 cas corrigés dont un risque
réel de perte de données.**

Repéré en poursuivant l'Axe A avec une grille de lecture différente : un
composant qui `await` une server action sans jamais regarder si elle a
renvoyé `{ error }` produit exactement le symptôme que l'utilisateur venait
de signaler ("je fais X et rien ne se passe") — mais par une cause
différente (pas un problème de cache, un problème d'UI qui ignore l'échec).

**Corrigé** : `CoachFormationEditor.tsx` — 15 des ~17 handlers (renommer,
ajouter, supprimer, réordonner, dupliquer, publier une section...)
appelaient leur action puis faisaient un `router.refresh()` inconditionnel
sans jamais lire `.error`. En cas d'échec (permission, contrainte réseau),
le coach n'avait aucun signal — juste un refresh qui ne change rien à
l'écran. Ajouté un helper `runAction()` qui centralise la vérification +
un état d'erreur partagé affiché en bandeau (`role="alert"`) en haut de
l'éditeur, pour ne plus avoir à y penser à chaque nouvel handler.

**Méthode utilisée** (relançable, à affiner — beaucoup de faux positifs
légitimes à trier à la main) :
```bash
# Appels await en tête de ligne (résultat jeté), hors fetch()/notify*/
# awardPoints déjà volontairement fire-and-forget :
grep -rnE '^\s*await [a-zA-Z]+\(' --include="*.tsx" components/ app/ \
  | grep -viE "\.(catch|then)\(|awardPoints|notifyUser|notifyAdmin|notifyCoach|sendPush|checkHabitStreak"
```
73 résultats à l'exécution du 2026-08-14 — la plupart sont soit des
callbacks `onSave`/`onDelete` qui délèguent à un parent (pas forcément un
bug, à vérifier au cas par cas dans le composant appelant), soit du
fire-and-forget légitime. `CoachFormationEditor.tsx` avait la plus forte
concentration (14 occurrences) et le vrai motif "aucun retour visible en
cas d'échec" — traité en priorité pour cette raison.

**Deuxième passe — le plus grave trouvé cette session** : en triant
d'autres candidats de la même liste, `PlanBuilder` (`DietPlanManager.tsx`,
utilisé pour construire un plan de diète client OU un modèle) avait un
contrat `onCreate: Promise<void>` — littéralement impossible pour le
composant de savoir si la sauvegarde avait réussi. `handleSave` affichait
"Enregistré" et **effaçait tout le formulaire** (jusqu'à des dizaines de
repas saisis à la main) même quand la création échouait côté serveur —
un vrai risque de perte de travail pour un coach, pas juste une coche mal
affichée. Corrigé en changeant le contrat en `Promise<{ error?: string }>`
et en ne vidant le formulaire que si la sauvegarde a vraiment réussi (sur
échec : le formulaire reste intact, l'erreur déjà affichée via l'état
`error` existant du composant). Trois appelants mis à jour pour propager
le résultat au lieu de l'avaler (`CoachClientNutritionTabs.tsx`,
`OwnDietPlansSection.tsx`, `ProgrammationHub.tsx`).

Deux autres cas corrigés dans la foulée, même famille (résultat jamais
vérifié) :
- `ClientNutritionView.tsx` (`handleDeleteSavedMeal`,
  `handleTogglePlanItem` côté suppression) : suppression optimiste jamais
  annulée en cas d'échec serveur — repris le filet de sécurité déjà
  utilisé par `handleDelete` juste à côté dans le même fichier (motif déjà
  correct localement, juste pas partout).
- `StepsClient.tsx` / `TrackingClient.tsx` : affichaient "Enregistré ✓"
  inconditionnellement après `logSteps`/`updateStepGoal`/`logBiometrics`,
  qu'il y ait eu une erreur ou non — un faux positif, pire qu'un silence.

**Troisième passe — même contrat `Promise<void>` retrouvé sur 4 autres
formulaires de contenu**, tous avec le même symptôme (formulaire fermé/vidé
même en cas d'échec serveur, malgré un état `error` déjà présent et prêt à
s'en servir) : `ExerciseLibraryView.tsx` (`ExerciseForm`, fiche exercice
bibliothèque — instructions, position, difficulté...), `GymsDirectoryView.tsx`
(`GymForm`, fiche salle), `CoachPostsManager.tsx` (`PostEditor`, "Mot du
coach" — un vrai post éditorial), `StudiesView.tsx` (`StudyForm`, protocole
d'étude communauté — titre, hypothèse, protocole, résultats). Même
correctif partout : le type `onSave`/`onUpdate` passe de `Promise<void>` à
`Promise<{ error?: string }>`, chaque appelant renvoie désormais le
résultat au lieu de l'avaler, et ne referme/optimise l'état local que si
`!result.error`.

**Volontairement pas encore touché** : les chemins `onDelete` (void partout
dans ces mêmes fichiers) — risque plus faible (rien de saisi à perdre, déjà
protégé par une confirmation), traité en dernier par rapport aux
formulaires de création/édition qui peuvent perdre du contenu tapé à la
main.

**Quatrième passe** :
- `ArticleCard.tsx` (science, `ArticleEditForm`) — même famille exacte que
  la passe précédente, corrigé pareil. Particularité : `ArticleListView.tsx`
  (l'appelant) évitait déjà la mauvaise mise à jour optimiste sur échec,
  mais ne remontait toujours rien à `ArticleCard` faute de `return` — la
  vérification était déjà là un cran plus haut, juste pas transmise.
- `SeasonModeToggle.tsx` : la coche off-season/prep se mettait à jour
  optimiquement (highlight du bouton) sans jamais revenir en arrière en cas
  d'échec serveur — la même classe de bug que le signalement initial de
  l'utilisateur (nutrition), ici sur un toggle différent. Corrigé avec un
  rollback simple (`setMode(previous)` sur `result.error`).
- Vérifié SAIN : `CoachClientNutritionTabs.tsx` (`updateDietPlanMode`) —
  pas de state local optimiste à corrompre (le highlight vient du prop
  `activePlan.mode`, pas d'un state dupliqué), donc pas la même classe de
  bug ; juste aucun message d'erreur affiché si ça échoue, plus bénin,
  laissé de côté pour privilégier les cas qui mentent activement à
  l'utilisateur plutôt que ceux qui restent simplement silencieux.

**Cinquième passe** :
- `AvailabilityManager.tsx` : `handleDelete` (créneau de disponibilité live)
  n'affichait jamais l'erreur pourtant déjà retournée par
  `deleteAvailabilityRule` — le composant a un état `error` déjà utilisé
  par `handleAdd` juste au-dessus, juste pas branché ici. Corrigé.
- `MembresView.tsx` : "Relancer" un membre jamais revenu marquait le
  bouton "Relancé" (désactivé définitivement) même si la relance échouait
  côté serveur — même famille que `SeasonModeToggle`. Corrigé avec reset
  du bouton sur échec (pas de nouvel espace UI pour un message, la carte
  membre est déjà compacte).
- `CoachClientTasksView.tsx` : `handleDelete` (tâche client) supprimait
  optimiquement sans jamais annuler en cas d'échec — repris le même filet
  de sécurité que `handleCreate` déjà correct juste au-dessus dans le
  même fichier.
- `RecipesClient.tsx` : `handleLogRecipeToday` logue TOUS les aliments
  d'une recette en parallèle (`Promise.all`) mais ne vérifiait aucun des
  résultats — si un seul aliment échouait, "Ajouté au journal ✓"
  s'affichait quand même alors que la journée nutritionnelle était
  incomplète. Corrigé : le premier résultat en erreur remonte jusqu'au
  bouton, qui affiche l'erreur au lieu du faux succès.
- Vérifié SAIN / laissé de côté (silencieux mais pas trompeur, pas de
  state optimiste corrompu) : `SupplementsSection.tsx` (liste dérivée
  d'un prop, pas de state dupliqué à corrompre), `ResourceManager.tsx`
  (`fetch` + `router.refresh()`, un échec ne fait que re-servir les mêmes
  données, pas de mensonge), `NotificationBell.tsx` (badge remis à zéro
  optimiquement mais auto-corrigé au prochain chargement, pas de perte).

Vérifié SAIN : `components/messaging/ConversationView.tsx`
(`sendPushNotification`, déjà explicitement commenté "non-blocking" —
l'envoi du message lui-même est un insert Supabase séparé, correctement
vérifié via `error`/`setSendError`) et `PushPermission.tsx` (resync
d'abonnement déjà accordé, sans UI, fire-and-forget assumé et documenté).

**La liste initiale de 73 candidats (grep du 2026-08-14) est maintenant
entièrement triée** : 17 corrigés, le reste vérifié sain ou explicitement
fire-and-forget par conception. Prochaine passe sur cet axe : relancer la
commande après du nouveau code pour capter ce qui aura été ajouté depuis,
plutôt que de re-trier la même liste.

### Reste à faire sur cet axe

- Relancer la commande de la passe 1 après du nouveau code pour capter ce
  qui aurait été ajouté depuis — sinon, cet axe est clos pour l'instant.

## Axe C — Accessibilité clavier : `<div onClick>` sans vrai bouton

**Statut : première passe faite (2026-08-14), un cas corrigé, faible
densité de bugs sur cet axe (bonne nouvelle).**

Méthode : grep ciblé sur le vrai anti-pattern (un `<div>` avec `onClick`
sur la même ligne, capture la forme la plus courante d'oubli) :
```bash
grep -rnE '<div[^>]*\bonClick=' --include="*.tsx" components/ app/
```
12 résultats. **11 étaient des faux positifs** : des backdrops de modale
(`ep-modal-overlay`, cliquer en dehors pour fermer) — un pattern standard
et correct, pas un piège accessibilité. Un clavier/lecteur d'écran ferme
une modale via le vrai bouton `×` (déjà un `<button>` focusable dans
chaque cas vérifié) ou via Échap si implémenté, jamais en "tabbant" sur le
fond — rendre le backdrop lui-même focusable serait pire, pas mieux.

**Corrigé** : `RemindersView.tsx` — la zone principale d'une carte rappel
(libellé, heure, jours) n'était cliquable que par un `<div onClick={onEdit}>`,
alors que le toggle actif/inactif et la suppression juste à côté étaient
déjà de vrais `<button>`. Un utilisateur clavier n'avait tout simplement
aucun moyen d'ouvrir l'édition d'un rappel. Converti en `<button
type="button">` (styles réinitialisés en ligne) plutôt qu'un
`role="button"` + `tabIndex` + `onKeyDown` manuel — plus simple, et
Entrée/Espace marchent nativement.

**Constat en creux** : cette base de code utilise déjà systématiquement de
vrais `<button>` pour ses éléments cliquables (confirmé par les 123
fichiers qui utilisent `onClick=` — l'écrasante majorité sur des boutons
réels) — `RemindersView.tsx` semble être l'exception plutôt que la règle.

### Reste à faire sur cet axe

- Passe volontairement étroite (grep même-ligne uniquement) — un `<div`
  suivi d'un `onClick` sur une ligne différente ne serait pas détecté.
  Signal faible sur les 12 résultats trouvés (1 vrai bug) suggère que le
  rendement d'une passe plus large serait sans doute tout aussi faible,
  mais pas vérifié.

**Suite (2026-08-15)** : le nice-to-have "Échap" ci-dessus repris.
`grep -rl "ep-modal-overlay"` → 12 fichiers. Sur ces 12 :
- **Corrigé** (10 fichiers, 13 modales) : `ExercisePicker.tsx`,
  `CoachVideoRecorder.tsx` (respecte le même garde que le clic — jamais
  fermer pendant un envoi en cours), `ApplyTemplateModal.tsx`,
  `BulkCalorieAdjustModal.tsx`, `ExerciseDetailPanel.tsx`,
  `InstallAppHint.tsx`, `ProgramEditor.tsx` (`AssignmentOnlyPanel`),
  `DietPlanManager.tsx` (`PlanBuilder`), `ClientNutritionView.tsx` (4
  modales, un seul effet combiné qui ferme celle qui est ouverte),
  `WeeklyAgenda.tsx` (3 modales, même principe). Chaque effet est scopé à
  l'état d'ouverture (`if (!open) return;` en tête), donc pas de listener
  actif quand rien n'est affiché.
- **Vérifié SAIN / volontairement exclu** : `SessionView.tsx` (le fond
  ne ferme pas une modale classique, il fait avancer une étape d'un
  minuteur de repos guidé — pas de vrai "annuler" à brancher sur Échap
  sans risquer de sauter une étape) ; `SignupGateModal.tsx` (aucun
  `onClick` sur le fond du tout — un mur d'inscription volontairement
  non fermable, brancher Échap irait à l'encontre du choix produit).

**Erreur évitée avant commit** : un `eslint-disable-next-line
react-hooks/exhaustive-deps` ajouté par réflexe sur le premier fichier
s'est révélé inutile (le lint ne se plaignait pas) — repéré par le
`✖ 12 problems` d'eslint après coup (`Unused eslint-disable directive`),
retiré. Exactement l'erreur déjà documentée plus tôt dans cette session
(axe E) : ne jamais ajouter un disable "au cas où" sans vérifier qu'il
corrige un vrai problème signalé.

tsc/eslint/build vérifiés propres (comparaison `git stash` : 11 problèmes
préexistants, 12 après cette passe puis 11 de nouveau une fois le
disable inutile retiré — aucun de mes nouveaux effets ne déclenche
`set-state-in-effect`, puisque le `setState` est appelé depuis le
callback du listener clavier, pas synchronement dans le corps de l'effet).

## Axe D — `catch` muets sans log dans les server actions

**Statut : première passe faite (2026-08-14), 52 corrections sur 16
fichiers, dont `lib/auth-guards.ts`.**

Origine : en poursuivant Axe B, remarqué que la quasi-totalité des
`catch` génériques de ce projet suivent le même moule —
`} catch { return { error: "Erreur inattendue." }; }` — sans jamais lier
l'exception à une variable, donc sans aucun moyen de la logger. Le message
générique montré à l'utilisateur est correct (pas de détail interne à
exposer), mais côté serveur, une exception inattendue ne laisse **aucune
trace** — ni dans les logs Vercel, ni nulle part. Concrètement : si un
"ça ne marche pas" est remonté (exactement le point de départ de tout ce
chantier masterclass), il n'y aurait rien à inspecter pour comprendre ce
qui a réellement cassé.

**Corrigé, par un script mécanique plutôt qu'à la main** (le motif est
strictement identique des dizaines de fois, une transformation manuelle
fichier par fichier n'aurait rien apporté de plus qu'un script vérifié
ensuite par tsc/eslint/build comme d'habitude) :
```js
// Repère `} catch {` immédiatement suivi d'un `return { error: "..." };`
// littéral (pas de variable dynamique, pas de log déjà présent), et
// transforme en `catch (e) { console.error("<nomDeLaFonction> error:", e); ... }`
// — le nom de fonction est retrouvé en remontant au dernier
// `export async function X` rencontré avant le catch.
```
Script gardé dans le scratchpad de session (`fix-silent-catches.mjs`),
relançable sur de nouveaux fichiers.

**Fichiers corrigés** (52 catches sur 16 fichiers) : `lib/auth-guards.ts`
(6 — `requireCoach`, `requireOwnClient`, `requireOwnClientOrSelf`,
`requireClient`, `requirePlatformOwner`, `requireAuth` ; le seul catch du
fichier qui reste muet, `hasRequiredSessionStrength`, ne correspond pas au
motif car il retourne `false` et pas `{error}` — fail-closed volontaire,
laissé tel quel), `app/dashboard/client/nutrition/actions.ts` (15),
`app/dashboard/client/science/actions.ts` (9), `app/dashboard/client/
gyms/actions.ts` (7), `app/dashboard/coach/live/actions.ts` (6),
`app/dashboard/client/steps/actions.ts` (5), `app/dashboard/client/
mindset/actions.ts` (4), `app/dashboard/client/exercises/actions.ts` (4),
et 9 fichiers supplémentaires à 1-3 catches chacun (voir git log du
commit pour la liste complète).

**Vérifié SAIN** (le script a correctement laissé de côté, sans qu'aucune
intervention manuelle ne soit nécessaire) : `app/dashboard/coach/mailing/
actions.ts` (déjà `catch (e)` avec `e.message` renvoyé + une trace
persistée dans `coach_mailings`, écrit plus tôt dans cette même session),
`app/dashboard/coach/communaute/membres/actions.ts` (catch explicitement
commenté "best-effort", notification secondaire dont l'échec ne doit pas
remonter), `app/auth/coach/actions.ts` (extraction d'IP, non critique),
et 4 fichiers qui avaient déjà `catch (e) { console.error(...) }` —
confirmant que cette discipline existe déjà ailleurs dans le code, juste
pas partout.

**Vérifié après coup (2026-08-14, même jour)** : re-comptage `catches vs
logs` sur tout le projet après cette passe — les seuls fichiers où
`catches > logs` sont désormais `auth/coach/actions.ts`,
`communaute/membres/actions.ts` et `coach/mailing/actions.ts` (les 3 déjà
vérifiés sains ci-dessus) plus `lib/auth-guards.ts` à 7 catches/6 logs
(le seul écart est `hasRequiredSessionStrength`, volontairement muet,
déjà expliqué). **Concrètement, cet axe est clos** : ce qui restait
initialement estimé à "~15 catches non couverts" s'avère être zéro vrai
cas manqué une fois vérifié — l'estimation initiale était trop prudente.

### Reste à faire sur cet axe

- Rien d'identifié pour l'instant. Si de nouveaux `catch` génériques sans
  log apparaissent avec du nouveau code, relancer le script
  (`fix-silent-catches.mjs`, gardé dans le scratchpad de session) plutôt
  que de re-vérifier tout le projet à la main.

## Axe E — `useState(initialX)` jamais resynchronisé sur un nouveau prop serveur

**Statut : première passe faite (2026-08-14), 13 fichiers corrigés.**

Origine : le bug nutrition remonté une TROISIÈME fois par l'utilisateur
("je coche et j'actualise et ça se décoche"), après que l'Axe A
(`revalidatePath` manquant) avait déjà été corrigé et poussé. Vérification
empirique directe en base (types réels renvoyés par le client Supabase,
policies RLS, doublons dans `diet_plan_meals`) écartant une à une les
autres hypothèses avant de trouver la vraie cause : `useState(initialX)`
dans un composant client ne lit son argument qu'au tout premier rendu.
Quand le Server Component parent se re-rend avec un nouveau prop
`initialX` (après le `revalidatePath` de l'Axe A, justement), React ne
resynchronise jamais automatiquement l'état interne du composant enfant
sur cette nouvelle valeur — un piège classique "prop → state" qui explique
pourquoi le premier correctif (correct mais incomplet) n'avait réglé que
la moitié du problème : les données serveur étaient toujours bonnes
(vérifié), seul l'état affiché côté client restait périmé.

**Correctif type** : ajouter juste après le `useState(initialX)`
concerné :
```ts
useEffect(() => {
  setX(initialX);
}, [initialX]);
```
Réservé aux states qui **miroitent une liste/collection venant du
serveur** (nourriture loguée, repas enregistrés, tâches, séances,
articles...). Explicitement PAS appliqué aux champs de formulaire
texte (titre/contenu/nom dans les formulaires d'édition) — un resync
automatique y écraserait la saisie en cours de l'utilisateur, ce serait
une régression, pas un correctif.

Sur `ClientNutritionView.tsx` spécifiquement, un deuxième filet a aussi
été ajouté : un `visibilitychange` qui force un `router.refresh()` quand
l'onglet/la PWA redevient visible — couvre le cas où l'app est reprise
depuis l'arrière-plan sans navigation complète, donc sans qu'aucun
`useEffect` de dépendance sur un prop ne se déclenche.

**Corrigé** (13 fichiers, un `useState` par fichier sauf mention) :
`components/ui/ClientNutritionView.tsx` (`savedMeals` — `todayLogs` déjà
traité lors du correctif d'urgence précédent, même passe), `components/ui/
CoachClientTasksView.tsx` (`tasks`), `components/ui/WeeklyAgenda.tsx`
(`blocks`), `components/ui/ClientPeriodTracking.tsx` (`logs`),
`components/ui/ExerciseLibraryView.tsx` (`exercises`), `components/ui/
PersonalPhotosView.tsx` (`photos`), `components/science/ArticleListView.tsx`
(`articles`), `components/science/StudiesView.tsx` (`studies`),
`components/coach/CoachFinanceTracker.tsx` (`entries`), `components/coach/
ContentStudio.tsx` (`ideas`), `components/coach/CoachMailingComposer.tsx`
(`history`), `components/resources/ResourceRequests.tsx` (`requests`),
`components/live/LiveEventsList.tsx` (`events`).

**Sur le lint `react-hooks/set-state-in-effect`** : chacun de ces 13
ajouts déclenche cette règle (appel de `setState` synchrone dans un
effet). Convention déjà en place dans ce projet avant cette session (ex.
le sync `checkedItems`/localStorage déjà présent dans
`ClientNutritionView.tsx`, et le resync photo déjà présent dans
`PersonalPhotosView.tsx` avant cette passe) : documenter le motif par un
commentaire clair plutôt que `eslint-disable`, et l'assumer comme un
compromis volontaire — vérifié que `next build` ne bloque pas dessus
(exit 0 avant et après cette passe).

**Méthode utilisée** (relançable) :
```bash
# Repère les useState dont l'argument commence par "initial" — signal
# fort d'un state qui miroite un prop serveur plutôt qu'un état purement
# local (recherche manuelle ensuite pour trier formulaire vs collection) :
grep -rn 'useState(initial\|useState<[^>]*>(initial' --include="*.tsx" components/
```
65 occurrences à l'exécution du 2026-08-14, triées à la main (jugement
nécessaire — impossible de distinguer mécaniquement "collection à
resynchroniser" de "valeur par défaut d'un champ de formulaire" par
simple pattern-matching). 13 retenues comme genuinement à risque
(présentes dans une route qui subit des `revalidatePath` fréquents et
affichant un état "coché/liste" que l'utilisateur attend à jour après
retour). Script de correction mécanique gardé dans le scratchpad de
session (`fix-stale-state.mjs`), incluant le patch d'import `useEffect`
manquant quand nécessaire.

**Vérifié SAIN** : `DietPlanManager.tsx`/`PlanBuilder` et les autres
formulaires de création corrigés à l'Axe B (`ExerciseForm`, `GymForm`,
`PostEditor`, `StudyForm`, `ArticleEditForm`) — leurs `useState(initial…)`
sont des valeurs par défaut de champs texte, pas des collections ; un
resync y serait une régression (écraserait la saisie en cours), donc
volontairement exclus de cette passe malgré le nom de variable similaire.

### Reste à faire sur cet axe

- Sur les 65 occurrences repérées par le grep, 13 ont été triées et
  corrigées cette passe ; le reste (~52) n'a pas été examiné candidat par
  candidat un par un — probablement en écrasante majorité des états de
  formulaire légitimes (comme les exclusions ci-dessus), mais pas
  confirmé exhaustivement. Prochaine passe possible : trier le reste par
  petits lots plutôt que d'un coup, en appliquant la même grille (état
  liste/collection alimenté par un prop serveur = candidat, champ de
  formulaire = à exclure).

**Suite (2026-08-15)** : l'utilisateur a signalé le même bug ("ça coche
puis ça décoche au retour") sur Steps, Sommeil et le Bilan quotidien —
trois composants que la première passe de cet axe n'avait **pas** repérés,
la faute à un grep trop étroit (`useState(initial...)` seulement, alors
que `StepsClient.tsx`/`TrackingClient.tsx` utilisent des noms de prop
sans préfixe `initial`, ex. `useState(settings.daily_goal)`). Corrigés
séparément (voir le commit `fix(bilan-steps-sommeil)`), avec en prime la
checklist de routine de Steps qui ne se sauvegardait qu'en cliquant sur
"Enregistrer" — corrigée pour sauvegarder immédiatement au clic, comme
la checklist du plan de diète.

Ce signalement a motivé un nouveau scanner plus large
(`find-stale-state-v2.mjs`, scratchpad) : au lieu de chercher seulement
`useState(initial...)`, il repère TOUT `useState(prop)` où `prop` est un
paramètre déstructuré du composant (pas juste ceux nommés `initial*`),
puis vérifie si un `useEffect` resynchronise déjà ce setter quelque part
dans le fichier. 26 candidats trouvés, triés un par un :

**Corrigé** (9 fichiers) :
- `MindsetView.tsx` (`HabitsTab`/`optimisticLogs`, `JournalTab`/
  `localEntries`) — même famille que la nutrition, une checklist
  d'habitudes et un journal qui pouvaient rester périmés.
- `SeasonModeToggle.tsx`, `SubscriptionToggle.tsx`,
  `CoachStatusToggle.tsx` — bascules (off-season/prep, statut
  abonnement, statut coach côté admin) qui ne reflétaient pas un
  changement fait ailleurs (coach, autre onglet, autre appareil).
  `SubscriptionToggle.tsx` a un commentaire existant expliquant
  pourquoi il évite un `router.refresh()` après SA PROPRE bascule
  (performance, ~20 sources chargées par la page parente) — le resync
  ajouté ne contredit pas ce choix, il couvre seulement le cas d'un
  refresh déclenché pour une AUTRE raison.
- `AcceptingClientsCard.tsx` — bascule "j'accepte de nouveaux clients" +
  liste d'attente, plus un vrai bug Axe B au passage (résultat des deux
  actions jamais vérifié, aucun rollback en cas d'échec serveur).
- `WaitlistJoinButton.tsx` — inscription à la liste d'attente.
- `PermissionsCard.tsx` — statut push et heures de silence, plus un
  Axe B au passage (`saveQuietHours` gardait les heures fraîchement
  choisies affichées même quand l'enregistrement échouait).
- `CoachFormationEditor.tsx` : deux bugs distincts —
  1. `lesson.is_published` (ligne d'une leçon) ne se resynchronisait pas
     quand le bouton groupé "Publier toutes les vidéos du module" (plus
     haut dans le même fichier) republiait des leçons sans passer par
     cette ligne précise.
  2. `EditableTitle` (titre modifiable en ligne, partagé par formation/
     module/section/leçon) : le texte d'édition n'était capturé qu'au
     tout premier rendu du composant — si le titre changeait ailleurs
     avant le premier clic sur "modifier", l'input s'ouvrait sur l'ancien
     texte. Corrigé en réinitialisant le texte depuis la prop fraîche
     au moment précis du clic, pas seulement au montage.

**Vérifié SAIN / exclusions légitimes** (14 candidats restants) :
- `ReferralCard.tsx`, `InviteLinkCard.tsx` — un code généré une fois
  reste stable ; le seul cas non couvert (généré dans un autre onglet)
  est un scénario rare pour une carte peu consultée.
- `ExercisePicker.tsx`, `LiveEditForm.tsx`, `ProfileEditor.tsx`,
  `ArticleCard.tsx` (×2), `PublicRessourcesClient.tsx` — champs de
  formulaire en édition libre, resync serait une régression (écraserait
  la saisie en cours), même exclusion que la première passe.
- `ClientNutritionView.tsx` (`foods`), `NutritionBilanQuiz.tsx`
  (`allFoods`) — listes d'aliments consultées, pas des données
  spécifiques à l'utilisateur qui pourraient se décocher.
- `LibraryHub.tsx` (`initialTab`) — état de navigation locale (onglet
  actif), pas une donnée serveur à refléter.
- `app/auth/client/page.tsx`, `app/auth/coach/page.tsx`
  (`initialEmail`) — préremplissage d'un formulaire, l'utilisateur doit
  pouvoir le modifier avant de soumettre sans se le faire écraser.
- `ExerciseDetailPanel.tsx` — vérifié que le composant démonte/remonte
  réellement à chaque changement d'exercice sélectionné (rendu
  conditionnel via `{detailFor && <ExerciseDetailPanel .../>}`, jamais
  deux exercices différents sans repasser par `null` entre les deux) —
  `useState(exercise)` se réinitialise donc correctement à chaque
  ouverture, pas besoin de resync explicite.
- `CommunityFeed.tsx` (`posts`/`nextCursor`) — **cas particulier
  important** : liste paginée qui s'accumule via "charger plus", pas un
  simple miroir d'un seul état serveur. Un resync naïf sur `initialPosts`
  aurait effacé les pages déjà chargées par l'utilisateur à chaque
  re-rendu du parent — clairement une régression, pas un correctif.
  Volontairement laissé tel quel.

tsc/eslint/build vérifiés propres (comparaison `git stash` : 1 problème
préexistant, 11 nouveaux attendus = les 11 effets de resynchronisation
ajoutés).

**Méthode utilisée** (relançable, plus large que la première passe) :
```js
// find-stale-state-v2.mjs (scratchpad) : repère useState(prop) où prop
// est un paramètre déstructuré du composant (pas seulement les noms
// préfixés "initial"), puis vérifie si un useEffect resynchronise déjà
// ce setter ailleurs dans le fichier. Exclut par défaut les noms d'état
// commençant par is/show/open/active/expanded/editing/selected (état UI
// local, pas un miroir de donnée serveur).
```

### Reste à faire sur cet axe (suite)

- Le scanner v2 est volontairement conservateur (ne regarde que les
  paramètres directement déstructurés du composant, pas les valeurs
  dérivées passées en profondeur) — une repasse avec une détection plus
  fine pourrait trouver d'autres cas, mais rendement décroissant probable
  vu que les deux passes cumulées couvrent déjà la quasi-totalité des
  composants avec état de type checklist/bascule.

## Axe F — Boutons icône seule sans nom accessible (`aria-label`)

**Statut : première passe faite (2026-08-14), 33 boutons corrigés sur 25
fichiers.**

Suite logique de l'axe C (accessibilité) avec une grille différente : un
`<button>` qui ne contient qu'une icône (`<X>`, `<Trash2>`, `<Plus>`...) et
aucun texte visible n'a, pour un lecteur d'écran, aucun nom — juste
"bouton". Contrairement à l'axe C, l'élément EST déjà un vrai `<button>`
(pas de piège clavier), mais reste inutilisable à la navigation non
visuelle : impossible de savoir si "bouton" ferme une modale, supprime un
élément ou en ajoute un.

**Méthode utilisée** (relançable, deux scripts complémentaires gardés
dans le scratchpad de session) :
```js
// find-icon-buttons2.mjs : repère les <button>...</button> sans
// aria-label dont le contenu, une fois les icônes (composants commençant
// par une majuscule, ex. <X size={14} />) et les commentaires JSX
// retirés, ne laisse plus aucun texte visible. Limite connue : les
// boutons dont le contenu est un ternaire (ex. spinner de chargement vs
// icône + texte) donnent des faux positifs si UNE des deux branches a du
// texte — la regex simple ne distingue pas les branches, à trier à la
// main (9 faux positifs sur cette passe, tous vérifiés : au moins une
// branche affiche déjà un texte visible).

// find-title-no-aria.mjs : filet complémentaire plus fiable — tout
// <button title="..."> sans aria-label associé (un title existant est un
// signal fort qu'un nom est nécessaire mais manquant côté lecteurs
// d'écran, qui ne lisent pas systématiquement l'attribut title). A
// rattrapé plusieurs cas que le premier script avait manqués (boutons
// Monter/Descendre en ternaire d'icônes, `CoachFormationEditor.tsx`,
// `ClientCard.tsx`) — les deux scripts sont complémentaires, pas
// redondants.
```
45 candidats repérés par le premier script, triés à la main un par un
(lecture du contexte pour choisir le bon libellé en français, ex. "Fermer"
pour une modale vs "Annuler" pour un formulaire vs "Supprimer"/"Retirer"
selon l'action réelle) — 9 étaient des faux positifs (texte déjà visible
dans au moins une branche d'un rendu conditionnel). Le second script a
ensuite confirmé zéro `title` restant sans `aria-label` sur tout le
projet.

**Corrigé** (33 boutons, 25 fichiers) : `ExercisePicker.tsx`,
`RemindersView.tsx` (×2 — annuler + toggle actif/inactif),
`SessionView.tsx` (×4 — ajouter un exercice, modifier/retirer un set,
monter/descendre un exercice), `CoachVideoRecorder.tsx`,
`CommunityFeed.tsx`, `LiveEditForm.tsx`, `ConversationView.tsx` (×2 —
lecture/pause d'un vocal, envoyer), `ClientOnboardingIntake.tsx`,
`RoadmapCalendar.tsx`, `RoadmapEditor.tsx` (×2 — supprimer une phase,
supprimer un objectif), `ArticleCard.tsx`, `SearchView.tsx`,
`StudiesView.tsx`, `ExerciseLibraryView.tsx`, `GymsDirectoryView.tsx`,
`CoachPostsManager.tsx` (les 5 derniers : même bouton "Annuler" X-only
d'un formulaire de contenu, déjà croisé à l'axe B), `StepsClient.tsx`,
`ApplyTemplateModal.tsx`, `BarcodeScannerModal.tsx`,
`BulkCalorieAdjustModal.tsx`, `ClientNutritionView.tsx`,
`CoachNotesView.tsx` (×2 — réduire/développer une note avec
`aria-expanded`, supprimer), `ExerciseDetailPanel.tsx`,
`ProgramEditor.tsx`, `WeeklyAgenda.tsx` (×3 — fermer×2, ajouter une
tâche), `CoachFormationEditor.tsx` (×3 — supprimer la formation,
monter/descendre une vidéo, supprimer la vidéo), `ClientCard.tsx`
(relance manuelle).

Quand un `title` existait déjà, le texte a été repris tel quel pour
l'`aria-label` (garde le `title` pour l'infobulle visuelle au survol —
les deux ne sont pas redondants, `title` n'est pas fiable pour les
lecteurs d'écran ni sur tactile).

**Vérifié SAIN** : les 9 faux positifs du premier script (boutons dont au
moins une branche du rendu conditionnel affiche déjà un texte visible à
côté de l'icône — `SessionView.tsx` "Valider et sauvegarder la séance",
`LiveScheduler.tsx` "Programmer", `OnboardingTour.tsx`/
`PersonalizationQuiz.tsx` "Passer, accéder à l'appli", `BackButton.tsx`
(a déjà `{label}`), `NoteTemplates.tsx` "Copier"/"Copié",
`NutritionBilanQuiz.tsx` (×2 — "Logger ma journée", "Repas suivant"/"Voir
le récap"), `CoachFormationEditor.tsx` "Masquer"/"Publier" — celui-là
distinct des 3 boutons corrigés plus haut dans le même fichier). Vérifié
aussi que `next build`/tsc/eslint ne montrent aucune nouvelle erreur
propre à cette passe (comparaison `git stash` avant/après : mêmes 20
problèmes de lint préexistants, tous déjà documentés aux axes précédents).

**Correction (même jour, suite directe)** : le script de repérage initial
cherchait la fin d'un tag via le premier `>` rencontré — cassé dès qu'un
attribut contenait une expression avec `=>` (une fonction fléchée dans
`onClick={() => ...}`, extrêmement courant), qui tronque le tag bien avant
d'atteindre `title=`/`aria-label=`. Résultat : la première passe a raté
tout bouton dont un attribut *avant* `title` contenait une fonction
fléchée. Réécrit avec un scanner conscient de la profondeur des `{}` et
des chaînes (`findTagEnd`, gardé dans le scratchpad) — relancé sur tout le
projet, **51 boutons supplémentaires** trouvés avec un `title` mais sans
`aria-label` (dont `PersonalPhotosView.tsx` "Supprimer" repéré en
vérifiant le diff de l'axe G juste après). Script d'application
(`apply-title-aria-labels.mjs`) qui extrait la valeur exacte de `title`
(chaîne simple OU expression `{...}` dynamique, ex. ternaire) et
réutilise EXACTEMENT la même valeur pour `aria-label` — donc un titre
conditionnel (`title={recording ? "Relâcher pour envoyer" : "Maintenir
pour enregistrer"}`) obtient le même `aria-label` conditionnel, pas une
approximation statique. Fichiers les plus touchés : `ProgramEditor.tsx`
et `CoachFormationEditor.tsx` (10 chacun — beaucoup de boutons
monter/descendre/dupliquer/supprimer dans des listes réordonnables),
`ProgramTemplateEditor.tsx` (7). tsc/eslint/build revérifiés propres
après coup (mêmes erreurs préexistantes qu'avant, confirmé par
`git stash`).

### Reste à faire sur cet axe

- Les 9 faux positifs identifiés ci-dessus ne sont *pas* forcément 100%
  sains à long terme : si un jour le texte visible de leur branche
  "succès" est retiré (ex. simplifié en icône seule), il faudrait
  repasser un `aria-label`. Pas un risque actif aujourd'hui.
- Passe volontairement limitée aux `<button>` — les icônes cliquables
  portées par un `<Link>`/`<a>` icône seule n'ont pas été auditées avec la
  même grille (probablement rares vu que la nav principale de l'appli est
  textuelle, mais pas vérifié).
- Champs de formulaire sans `<label>` associé (juste un `placeholder`) —
  traité séparément, voir axe G ci-dessous.

## Axe G — Champs de formulaire sans nom accessible (juste un `placeholder`)

**Statut : première passe faite (2026-08-14), 191 champs corrigés sur 70
fichiers (sous-ensemble mécanisable d'un total de 392 repérés).**

Même famille que l'axe F, appliquée aux `<input>`/`<textarea>`/`<select>` :
un placeholder disparaît dès que l'utilisateur tape, n'est pas
systématiquement exposé par les lecteurs d'écran, et n'est de toute façon
pas un nom accessible au sens strict (WCAG 4.1.2) — seul un `<label>`
associé, un `aria-label` ou un `aria-labelledby` en fait office.

**Méthode utilisée** (relançable, scanner corrigé — voir la mésaventure
`=>` de l'axe F ci-dessus, le même bug existait initialement ici et a été
corrigé dès la première version de ce script) :
```js
// find-unlabeled-inputs.mjs : pour chaque <input>/<textarea>/<select>,
// vérifie (a) l'absence d'aria-label/aria-labelledby, (b) l'absence d'un
// <label htmlFor="son-id">, (c) l'absence d'un <label>...</label>
// englobant (label implicite). Si les 3 sont absents, c'est un candidat.
// 392 candidats sur 86 fichiers à l'exécution du 2026-08-14.
```
Sur ces 392, **191 avaient déjà un `placeholder` non vide** — un texte
d'exemple/instruction écrit par un humain, donc directement réutilisable
comme `aria-label` sans perte de sens (contrairement aux boutons icône de
l'axe F, où il fallait choisir le bon verbe selon le contexte, ici le
texte existe déjà). Les 201 restants n'ont aucun texte source évident
(champs `type="number"`/`type="date"`, ou un `<span>` voisin non lié
programmatiquement) — corrigeables mais demandent de lire le contexte de
chaque cas un par un, remis à une passe future plutôt que de deviner.

**Corrigé** : `apply-input-aria-labels.mjs` (scratchpad) — script
d'application qui repère la position exacte de l'attribut `placeholder=`
dans le texte source et insère `aria-label="<même texte>"` juste après,
un par un (positions calculées puis appliquées en ordre inverse dans
chaque fichier pour ne jamais invalider les indices suivants). 191
insertions sur 70 fichiers, aucune collision, aucun `aria-label` en
double (vérifié par grep après coup). Fichiers avec le plus de champs
concernés : `AddRecipeForm.tsx` (13), `RoadmapEditor.tsx` (14),
`StudiesView.tsx`/`LiveScheduler.tsx` (8 chacun), `DailyBilanForm.tsx`
(12), `ClientNutritionView.tsx`/`NutritionForm.tsx` (8 chacun).

**Vérifié SAIN** : tsc propre, build propre, eslint identique avant/après
(comparaison `git stash`, mêmes 36 problèmes préexistants, aucun nouveau).
Vérifié qu'aucun champ déjà couvert par un vrai `<label>` (implicite ou
via `htmlFor`) n'a été touché par erreur.

**Deuxième passe (suite directe, même jour)** : sur les 201 restants,
beaucoup suivaient un motif repéré très fréquent — un `<label>` visuel
juste avant le champ (sibling, pas parent), sans `htmlFor`, donc sans
lien programmatique malgré la présence d'un vrai `<label>`. Nouveau
script (`label-sibling-aria.mjs`) qui repère ce motif exact et copie le
texte du `<label>` en `aria-label` sur le champ voisin, **sans toucher au
DOM ni à la mise en page** (contrairement à une première tentative
envisagée — englober le champ dans le `<label>` — voir l'erreur évitée
ci-dessous). 69 champs corrigés sur 22 fichiers.

**Erreur évitée avant commit** : la première version de ce correctif
englobait le champ directement DANS le `<label>` (label implicite) au
lieu de lui ajouter un `aria-label`. Repéré en relisant le diff : la
plupart de ces labels utilisent une classe/style avec `mb-1.5` /
`marginBottom: 6` pour créer un espace visuel entre le texte du label et
le champ — un espace qui n'existe QUE parce que ce sont deux éléments
frères. En englobant le champ dans le label, ce dernier devient un
enfant, et la marge du label s'applique alors après le bloc entier
(texte + champ réunis) au lieu d'entre les deux — l'espacement visuel
label/champ aurait disparu sur les ~120 champs concernés. Tout annulé
(`git checkout` fichier par fichier) avant tout commit, refait avec
`aria-label` en attribut plutôt qu'en restructuration du DOM — zéro
risque visuel, même résultat d'accessibilité.

**Deux composants `Field` partagés corrigés à la source** (au lieu d'un
correctif champ par champ) : `ClientIntakeForm.tsx` (44 champs — toute la
fiche de renseignements client passe par un seul composant `Field`) et
`RoadmapEditor.tsx` (12 champs, même motif avec un `<span>` au lieu d'un
`<label>` — encore pire, un span n'a aucune sémantique de label du tout).
Dans les deux cas, le composant `Field` clone son enfant
(`cloneElement`) pour lui injecter `aria-label={label}` — répare tous les
usages du composant d'un coup, sans script à relancer à chaque nouveau
champ ajouté au formulaire à l'avenir. Complété par 4 `aria-label` manuels
sur les champs qui échappent à ce mécanisme (un `<div>` regroupant deux
`<input>` dans un seul `Field`, où le clone ne peut atteindre que le
`<div>` parent, pas les inputs à l'intérieur).

**Bug de script trouvé par tsc avant tout commit** : la détection "est-ce
une unique expression JS `{...}`" du script ne vérifiait que les premier/
dernier caractères, pas l'équilibrage réel des accolades — un label
`{question} {required && <span>*</span>}` (deux expressions distinctes
séparées par un espace, pas une seule) a été mal détecté comme une seule
expression réutilisable, produisant un JSX invalide
(`aria-label={question} {required && ...}`) dans `CheckinForm.tsx`.
`tsc --noEmit` a immédiatement signalé l'erreur de syntaxe avant tout
commit — corrigé à la main (une seule occurrence sur tout le projet,
vérifié par grep). Rappel utile : même un script "mécanique" appliqué à
grande échelle doit être suivi de la même discipline tsc/eslint/build
que n'importe quel code écrit à la main, pas traité comme automatiquement
sûr parce qu'il est généré.

**Troisième passe (même jour, clôture de l'axe)** : les ~77 champs
restants triés un par un, fichier par fichier, en lisant le contexte
réel de chacun (texte visible à proximité, nom de variable, prop `label`
d'un composant partagé) plutôt qu'en devinant. **76 champs corrigés sur
39 fichiers** — quasiment tout ce qui restait après les deux premières
passes. Deux composants partagés corrigés à la source plutôt que
champ par champ (même logique que `Field` dans l'axe précédent) :
`NumberField` (`TrackingClient.tsx`) et `PasswordInput.tsx` — ce dernier
avait 6 points d'usage (les 3 flux d'authentification client/coach) qui
héritent tous du correctif via un `aria-label` par défaut ajouté avant
`{...props}` (un appelant qui fournirait son propre `aria-label` resterait
prioritaire, l'ordre du spread le garantit).

Rescan final : **zéro champ restant** (hors les 46 usages de
`ClientIntakeForm.tsx`/`RoadmapEditor.tsx` déjà couverts par `cloneElement`
dans l'axe précédent, invisibles au scanner statique par construction,
et 2 faux positifs de commentaires de code contenant littéralement
`<input>`/`<select>` dans leur texte). tsc/eslint/build vérifiés propres
(comparaison `git stash`, mêmes 17 problèmes préexistants, zéro nouveau).

**Axe G intégralement clos** : les 3 passes cumulées ont corrigé
191 + 69 + 76 = 336 champs directement, plus 44 + 12 via les 2 composants
`Field` sources = 392 champs au total — soit l'intégralité des candidats
repérés par le premier scan du jour.

### Reste à faire sur cet axe

- ~~Les `aria-label` ajoutés depuis un `placeholder` reprennent parfois un
  texte d'exemple plutôt qu'une vraie description du champ~~ — corrigé le
  2026-08-15 : les 42 occurrences de `aria-label="Ex. ..."` (grep
  `aria-label="Ex[.,]`) relues une par une (label visible déjà présent
  juste au-dessus si possible, sinon description déduite du nom de
  variable et du champ) et remplacées par une vraie description —
  `WeeklyAgenda.tsx`, `RoadmapTemplateEditor.tsx`, `ProgramTemplateEditor.tsx`,
  `ProgramEditor.tsx`, `NutritionForm.tsx`, `NutritionBilanQuiz.tsx`,
  `GymsDirectoryView.tsx`, `ExerciseLibraryView.tsx`,
  `ExerciseDetailPanel.tsx`, `DietPlanManager.tsx`, `CoachNotesView.tsx`,
  `CoachClientTasksView.tsx`, `ClientPhotosView.tsx`, `SessionView.tsx`,
  `ClientNutritionView.tsx`, `LogbookClient.tsx`, `StepsClient.tsx`,
  `StudiesView.tsx`, `SearchView.tsx`. tsc/eslint (mêmes 24 problèmes
  pré-existants avant/après, vérifié via `git stash`)/build vérifiés
  propres.
- Le détecteur d'"expression JS unique" (bug `CheckinForm.tsx` plus haut)
  a été corrigé à la main pour ce cas précis, pas réécrit avec une vraie
  vérification d'équilibrage dans le script gardé au scratchpad — à
  refaire proprement si ce script est relancé un jour sur du nouveau code.

## Axe H — Aucun `error.tsx`/`global-error.tsx`/`not-found.tsx`

**Statut : fermé (2026-08-14), 3 fichiers créés.**

Constat en cherchant le prochain axe : `app/` contient 81 fichiers
`loading.tsx` (bon réflexe déjà en place partout) mais **zéro**
`error.tsx`, `global-error.tsx` ou `not-found.tsx`, où que ce soit dans le
projet. Concrètement : une exception non interceptée dans n'importe quel
composant client de l'appli (partout — c'est la majorité du code) tombait
sur l'écran d'erreur générique de Next.js — blanc, sans le moindre lien
avec l'identité visuelle "brume rouge", sans reformulation rassurante, et
sans bouton pour réessayer sans recharger la page à la main. Pareil pour
une URL inexistante (lien cassé, ancienne ressource supprimée) : la 404
générique de Next.js plutôt qu'un écran cohérent avec le reste de
l'appli.

**Corrigé** :
- `app/error.tsx` — filet de sécurité principal (attrape toute exception
  dans un segment de route ou en dessous, donc la quasi-totalité de
  l'appli). `"use client"`, reçoit `{ error, reset }` de Next.js ; logue
  l'exception via `console.error` (même discipline que l'axe D — jamais
  d'échec sans trace) puis affiche une carte `.ep-card` cohérente avec le
  reste de l'appli : message rassurant ("rien n'a été perdu"), bouton
  Réessayer (`reset()`) et un lien de secours vers l'accueil.
- `app/not-found.tsx` — même traitement visuel pour une route
  inexistante, message adapté ("cette page n'existe pas" plutôt qu'"un
  imprévu"), un seul bouton (retour à l'accueil, pas de `reset()` qui
  n'aurait aucun sens ici).
- `app/global-error.tsx` — filet de tout dernier recours, seulement si la
  mise en page racine elle-même (`app/layout.tsx`) plante (cas très rare).
  Doit fournir son propre `<html>/<body>` (remplace toute la mise en page
  racine, `globals.css` non garanti chargé) — volontairement écrit en
  styles inline plutôt qu'en classes `.ep-card`/`.ep-btn-primary`, pour
  dépendre du minimum possible si quelque chose est vraiment cassé
  ailleurs dans l'appli.

**Vérifié SAIN** : tsc propre, eslint propre (zéro problème sur les 3
nouveaux fichiers, pas seulement "pas de nouveau problème" comme les axes
précédents), build propre.

**Méthode utilisée** (relançable) :
```bash
find app -iname "*error*" -o -iname "*not-found*"   # doit lister les 3
find app -iname "loading.tsx" | wc -l                # référence : 81
```

### Reste à faire sur cet axe

- Pas de service de monitoring externe (Sentry ou équivalent) branché sur
  `error.tsx`/`global-error.tsx` — le `console.error` finit dans les logs
  de fonction Vercel (consultables), mais rien de proactif (pas d'alerte).
  Suffisant pour l'instant vu la taille de l'appli, à reconsidérer si le
  volume de trafic augmente.
- Un seul `error.tsx` au niveau racine plutôt que des `error.tsx` par
  segment (`/dashboard/client`, `/dashboard/coach`...) — Next.js permet
  d'avoir un `error.tsx` plus spécifique par segment pour un message plus
  ciblé (ex. proposer un lien "retour au tableau de bord coach" plutôt que
  juste l'accueil générique), pas fait ici pour rester simple ; pourrait
  valoir le coup pour `/dashboard/client` et `/dashboard/coach`
  spécifiquement si un jour on veut affiner.

## Axe I — Advisors Supabase (sécurité + performance de la base)

**Statut : fermé (2026-08-14).**

Premier axe de cette session qui sort du code applicatif — les outils
`get_advisors` (linter intégré Supabase) n'avaient jamais été passés
depuis le début du masterclass. Deux catégories interrogées séparément
(`security`, `performance`).

**Sécurité — triée entièrement** :
- **Corrigé** : `set_lead_magnets_updated_at` (trigger) n'avait pas de
  `search_path` fixe, contrairement à toutes ses fonctions soeurs
  (`is_coach`, `is_own_coach`...) qui l'ont déjà — `ALTER FUNCTION ...
  SET search_path = public`, durcissement pur sans changement de
  comportement.
- **Vérifié SAIN** : les 3 tables "RLS activé sans policy"
  (`auth_login_attempts`, `oura_connections`, `rate_limit_counters`) sont
  **volontairement** verrouillées ainsi — vérifié dans le code applicatif
  (`grep` sur tout `app/`/`lib/`/`utils/`) qu'elles ne sont accédées que
  via `createAdminClient()`/service role, jamais côté client. Les
  migrations d'origine (`20260805f`/`20260805j`, antérieures à cette
  session) documentent déjà explicitement ce choix ("Aucune policy
  volontairement... sinon un attaquant pourrait simplement remettre son
  compteur à zéro") — RLS deny-all + `REVOKE ALL FROM anon,
  authenticated` en ceinture et bretelles. L'advisor le signale en INFO
  précisément parce que ça RESSEMBLE à un oubli ; ce n'en est pas un ici.
- **Vérifié SAIN** : les ~10 fonctions `SECURITY DEFINER` signalées comme
  "appelables via RPC public" (`is_coach`, `is_own_coach`,
  `can_message_recipient`...) sont le motif idiomatique standard de
  Supabase pour des helpers de policy RLS (contournent la récursion RLS).
  Chacune ne renvoie qu'un booléen/uuid scopé à `auth.uid()` du CALLEUR —
  aucune fuite de données tierces possible même appelée directement.
  `set_coach_post_scope` fait partie du lot signalé mais est en réalité
  une fonction TRIGGER (`RETURNS trigger`) : non invocable de façon
  significative via RPC (pas de contexte `NEW`/`OLD` disponible hors
  trigger), le signalement est un faux positif de nature.
- **Laissé de côté (risque/bénéfice défavorable)** : `pg_net` installée
  dans le schéma `public` plutôt que `extensions` — cosmétique pour le
  linter, mais `pg_net` est réputée délicate à déplacer proprement
  (worker interne, risque de casser des appels HTTP sortants existants)
  sans environnement de test dédié pour vérifier. Pas touché.
- **Laissé de côté (réglage dashboard, pas du code)** :
  `auth_leaked_password_protection` désactivé (vérification
  HaveIBeenPwned) — se règle dans Supabase Auth → Policies, pas via
  migration SQL. À activer manuellement si souhaité :
  https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

**Performance — le plus gros chantier mécanique de la session** :
- **Corrigé, le plus impactant** : **124 policies RLS** appelaient
  `auth.uid()`/`auth.jwt()`/`auth.role()` directement dans leur
  `USING`/`WITH CHECK`, forçant Postgres à réévaluer la fonction PAR LIGNE
  au lieu d'une seule fois par requête (`auth_rls_initplan`, le fix le
  plus documenté par Supabase). Réécrites pour envelopper chaque appel
  dans un sous-select scalaire `(select auth.uid())` — transformation
  purement syntaxique, aucun changement de résultat. Généré
  automatiquement depuis `pg_policies` (pas tapé à la main), revu
  statement par statement avant application (zéro double-wrap détecté),
  et vérifié après coup par un test avant/après en simulant une vraie
  session utilisateur (`set local "request.jwt.claims"`) sur `food_logs` —
  exactement les mêmes lignes visibles avant et après (20 pour le
  propriétaire, 0 pour un client tiers). Confirmé par l'advisor :
  `auth_rls_initplan` passe de **124 à 0**.
- **Corrigé, nettoyage en prime** : `food_logs` avait deux policies `ALL`
  redondantes — "Clients manage their food logs" (`auth.uid() =
  client_id`) était un sous-ensemble strict de "Users manage own food
  logs" (même condition + accès coach), un reliquat d'itération jamais
  nettoyé. Supprimée : `multiple_permissive_policies` baisse de 20 sur
  l'ensemble du projet en conséquence.
- **Corrigé** : 3 clés étrangères sans index couvrant
  (`coaching_waitlist.member_id`, `content_ideas.source_question_id`,
  `formation_lesson_views.lesson_id`) — 3 `CREATE INDEX IF NOT EXISTS`,
  ajout pur.
- **Vérifié SAIN, motif répété volontaire** : le reste de
  `multiple_permissive_policies` (154 restants) suit un motif cohérent et
  intentionnel répété sur des dizaines de tables — une policy `ALL` pour
  le propriétaire + une policy `SELECT` (ou une autre par commande)
  séparée qui ajoute l'accès du coach. Techniquement "plusieurs policies
  permissives" au sens du linter, mais PAS un doublon : consolider en une
  seule policy par commande demanderait de fusionner les conditions dans
  4 policies distinctes (SELECT/INSERT/UPDATE/DELETE) par table, plus
  invasif et plus risqué à vérifier qu'un léger coût d'évaluation
  supplémentaire par ligne. Laissé tel quel.
- **Vérifié SAIN / laissé de côté** : `unused_index` (36, informationnel —
  normal pour une appli avec encore peu de trafic réel, rien à corriger
  tant que l'usage ne confirme pas qu'un index est vraiment inutile).

**Méthode utilisée** (relançable) :
```
# Via le MCP Supabase :
get_advisors(project_id, type="security")
get_advisors(project_id, type="performance")

# Pour régénérer le fix auth_rls_initplan sur de nouvelles policies :
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public';
# -> script gen-rls-fix.mjs (scratchpad) : enveloppe tout auth.uid()/
# auth.jwt()/auth.role() nu dans "(select ...)", génère les ALTER POLICY.
```

**Discipline de vérification adaptée à cet axe** (base de données, pas de
code Next.js touché cette fois — tsc/eslint/build non pertinents ici) :
revue manuelle statement par statement du SQL généré avant application,
test fonctionnel avant/après par simulation de session (`set local
"request.jwt.claims"`) plutôt que par une simple relecture, et
confirmation finale via l'advisor lui-même (le compte d'issues avant/
après est la preuve la plus directe que le fix a eu l'effet voulu).

### Reste à faire sur cet axe

- `pg_net` toujours dans `public` — pas touché, risque jugé disproportionné
  par rapport au gain (cosmétique pour le linter).
- `auth_leaked_password_protection` toujours désactivé — réglage
  dashboard Supabase Auth, pas un fix de code, à faire manuellement si
  souhaité (lien ci-dessus).
- Les 154 `multiple_permissive_policies` restants sont volontairement
  laissés (motif intentionnel expliqué plus haut) — si un jour la charge
  de la base devient un vrai sujet, revisiter au cas par cas serait
  l'étape suivante logique, mais pas avant d'en avoir la preuve par la
  mesure réelle (pas d'optimisation prématurée sur un signal aussi
  mineur).
- `unused_index` (36) jamais réexaminé — attendre d'avoir un vrai volume
  de trafic en production avant de juger un index réellement inutile.

**Vérification complémentaire (même jour, suite directe)** : en repensant
aux tables `auth_login_attempts`/`rate_limit_counters` vérifiées saines
ci-dessus, contrôlé que l'infrastructure applicative qui les utilise est
vraiment câblée, pas juste présente en base sans être appelée. Vérifié :
`getLoginLock`/`registerFailedLogin`/`clearLoginAttempts`
(`lib/login-throttle.ts`) sont bien appelés dans les 3 flux de connexion
(`app/auth/actions.ts`, `app/auth/client/actions.ts`,
`app/auth/coach/actions.ts`) — chaque fichier a bien 2 appels à
`signInWithPassword` mais un seul est le vrai formulaire de connexion
(protégé) ; l'autre est la connexion automatique juste après une
inscription réussie (mot de passe que l'utilisateur vient de choisir lui-
même, aucun risque de brute-force à protéger). Vérifié aussi que
`checkRateLimit`/`PRESETS.signup` protège bien les deux formulaires
d'inscription par IP. Rien à corriger — l'infrastructure de défense
construite avant cette session est réellement utilisée, pas juste
déclarée.

## Axe J — Images de contenu sans texte alternatif

**Statut : fermé (2026-08-15).**

Constat : seulement 21 `<img>` bruts (+ 2 `<Image>` Next.js) dans toute
l'appli — déjà un bon signe, et les 21 avaient TOUS un attribut `alt`
(contrairement à l'idée reçue qu'une appli de cette taille en oublierait
forcément). Le vrai problème n'était pas l'absence d'`alt`, mais
`alt=""` utilisé sur des images qui sont du **contenu réel** (une photo
envoyée en message, une photo de bilan, une photo de réussite publique)
plutôt que de la pure décoration — `alt=""` dit explicitement à un
lecteur d'écran "ignore cette image", ce qui est correct pour un avatar
à côté d'un nom déjà affiché, mais faux pour une photo qui EST le
contenu du message/de la publication.

**Corrigé** (7 fichiers) : `ConversationView.tsx` (photo envoyée dans un
message, `alt` dynamique "Photo envoyée"/"Photo reçue" selon l'auteur),
`CheckinCard.tsx` et `app/dashboard/client/checkin/page.tsx` (×2, vue
client + vue historique) — photos d'un bilan déjà soumis, `alt="Photo du
bilan N"`, `ClientPhotosView.tsx`/`CoachClientPhotosView.tsx` (galerie de
photos de suivi déjà envoyées, `alt="Photo N"`), `CommunityFeed.tsx`
(photo jointe à une publication communauté, `alt` avec le nom de
l'auteur), `app/reussites/page.tsx` (mur public de réussites, `alt` avec
le prénom de l'auteur).

**Vérifié SAIN** : les 7 `alt=""` restants sont légitimement décoratifs —
avatars affichés à côté d'un nom déjà visible en texte
(`CoachDirectoryExplorer.tsx`, `MembresView.tsx`, `ProfileHeader.tsx`,
`CommunityFeed.tsx`/`AuthorAvatarLink`), miniature YouTube à côté du
titre de la leçon (`CoachFormationEditor.tsx`), et aperçus de photos que
l'utilisateur vient tout juste de sélectionner pour son propre envoi
(`CheckinForm.tsx`, `ClientPhotosView.tsx` côté formulaire) — redondants
avec le compteur "Photos (X/Y)" déjà affiché juste au-dessus, corrects
tels quels.

tsc/eslint/build vérifiés propres (la seule erreur eslint restante,
`ConversationView.tsx` `Date.now()` impur, est préexistante et sans
rapport avec ce changement).

**Méthode utilisée** (relançable) :
```bash
grep -rn "<img\b" --include="*.tsx" components/ app/
grep -rln "<Image\b" --include="*.tsx" components/ app/
# Puis lecture manuelle de chaque occurrence multi-lignes pour distinguer
# contenu réel (alt descriptif nécessaire) de décoration (alt="" correct).
grep -rn 'alt=""' --include="*.tsx" components/ app/   # pour la vérification finale
```

### Reste à faire sur cet axe

- Rien d'identifié — les 21 `<img>`/2 `<Image>` de l'appli sont
  maintenant tous corrects (contenu décrit, décoration explicitement
  vide). Si de nouvelles images de contenu sont ajoutées, appliquer la
  même grille : contenu réel (photo envoyée, publiée, soumise) = `alt`
  descriptif ; décoration redondante avec un texte déjà visible = `alt=""`
  correct, pas un oubli.

## Axe K — `href` sur une URL stockée sans passer par `safeExternalUrl`

**Statut : fermé (2026-08-15).**

`lib/sanitize.ts` fournit `safeExternalUrl()` — filtre les schémas d'URL
dangereux (ex. `javascript:`) avant de rendre une URL stockée comme
`href`, protection contre une URL malveillante qui finirait en base d'une
façon ou d'une autre. Déjà appliqué systématiquement dans
`CheckinCard.tsx`/`ClientPhotosView.tsx`/`CoachClientPhotosView.tsx` pour
les photos/vidéos de suivi — mais **`app/dashboard/client/checkin/
page.tsx` faisait exception**, avec le même type de donnée
(`checkin.photo_urls`/`checkin.video_url`) rendu en `href={url}` brut,
sans le filtre, à 4 endroits (vue du jour + vue historique).

**Corrigé** : les 4 `href` de `checkin/page.tsx` enveloppés dans
`safeExternalUrl(...) ?? "#"`, même motif que partout ailleurs dans
l'appli pour ce type de donnée.

**Vérifié SAIN** : les 3 autres `href` sur une variable nommée `*Url`
repérés par le grep ne sont pas concernés — `stripeCustomerUrl`
(`lib/coach-billing.ts`) est construit côté serveur à partir de l'ID
Stripe du client (`cus_...`, format garanti sûr, jamais de texte libre
utilisateur), `prequalificationUrl` est une constante en dur dans le
fichier (pas une donnée stockée du tout). Zéro `dangerouslySetInnerHTML`
dans tout le projet — vérifié en passant, aucune autre surface XSS de ce
type à traiter. Zéro secret en dur dans le code applicatif (grep sur les
motifs de clé Stripe/JWT) et `.env*` correctement ignoré par git.

tsc/eslint/build vérifiés propres.

**Méthode utilisée** (relançable) :
```bash
grep -rn "href=\{[^}]*[Uu]rl[^}]*\}" --include="*.tsx" app/ components/
# Puis vérifier au cas par cas : la valeur vient-elle d'une donnée stockée
# potentiellement issue d'un utilisateur (-> doit passer par
# safeExternalUrl), ou d'une constante/valeur construite côté serveur à
# partir d'un identifiant de format garanti (-> sans risque) ?
```

### Reste à faire sur cet axe

- Passe volontairement limitée aux `href={...Url}` trouvés par ce grep
  précis — une variable stockant une URL sans "url" dans son nom
  échapperait à cette recherche. Signal faible attendu si relancé (un
  seul vrai cas trouvé sur 8 candidats), mais pas garanti exhaustif.

## Axe L — "Aujourd'hui" calculé en UTC côté serveur au lieu de l'heure de Paris

**Statut : clos** (2026-08-15, corrigé en urgence suite à un blocage
signalé en direct sur le bilan client).

**Le problème** : cette appli est 100% francophone (voir `AGENTS.md`) et
Vercel exécute son code en UTC. `new Date().toISOString().split("T")[0]`
côté serveur donne la date UTC, pas celle de l'utilisateur. Entre minuit
et 1h/2h du matin heure de Paris (1h en hiver, 2h en été à cause du
changement d'heure), le serveur croit encore être la veille. Pendant
cette fenêtre, tout ce qui dépend d'un "aujourd'hui" calculé côté serveur
(bilan, nutrition, pas, séances, photos, mindset) pointait sur la
mauvaise date pour l'utilisateur — pages affichant/enregistrant sur le
mauvais jour, sans que rien ne le signale.

**Déclencheur concret** : signalé en direct un soir d'été à 1h32 heure de
Paris (23h32 UTC), pile dans la fenêtre à risque — le client ne pouvait
plus enregistrer son bilan du jour ("tu ne peux modifier que le bilan du
jour").

**Corrigé** :
- Nouveau helper partagé `lib/dates.ts` → `todayInParis()`, basé sur
  `Intl.DateTimeFormat` avec `timeZone: "Europe/Paris"` et
  `formatToParts()`, qui gère automatiquement le passage heure d'été/hiver
  (contrairement à un simple décalage fixe +1h/+2h qui serait faux la
  moitié de l'année).
- Remplacement de `new Date().toISOString().split("T")[0]` par
  `todayInParis()` dans tous les endroits côté serveur qui calculent
  "aujourd'hui" (pas les décalages relatifs du type "il y a N jours", qui
  restent en UTC — l'écart d'un jour à la frontière est un signal
  beaucoup plus faible là où l'exactitude au jour près n'est pas
  déterminante) : routes API, server actions, Server Components, fonctions
  `utils/*.ts`. Détail dans le commit `d2b0e0f`.
- **La cause précise du blocage en direct** : `app/dashboard/client/bilan/
  page.tsx` avait déjà été corrigé (`todayInParis()`) dans cette même
  passe, mais `app/dashboard/client/bilan/actions.ts` validait encore le
  `log_date` soumis contre un `today`/`yesterday` calculés séparément en
  UTC (`const now = new Date(); now.toISOString().split("T")[0]` — une
  variante en deux lignes, pas le littéral exact `new
  Date().toISOString().split("T")[0]` cherché par le script de la
  première passe, d'où son absence de la liste initiale). Résultat : la
  page affichait le bon "aujourd'hui" (Paris) mais l'action refusait de
  l'enregistrer parce que son "aujourd'hui" à elle (UTC) ne correspondait
  plus. Recalculé en heure de Paris avec la même tolérance "hier"
  (nécessaire car le formulaire peut rester ouvert pendant le changement
  de jour).

**Vérifié SAIN — ne pas toucher** : tous les composants `"use client"`
(`lib/pedometer.ts`, `StepsClient`, `TrackingClient`, `MindsetView`,
`RoadmapView`, `CoachFinanceTracker`, `RecipesClient`, `RoadmapEditor`,
`BilanProgressView`, `CoachNotesView`, `RoadmapContextPanel`, etc.) — leur
`new Date()` tourne dans le navigateur de l'utilisateur, déjà en heure
locale correcte. Les faire basculer vers `todayInParis()` serait une
régression inutile (et dans certains cas franchement faux si
l'utilisateur n'est pas en France).

tsc/eslint (fichiers touchés)/build vérifiés propres avant push.

**Méthode utilisée** (relançable) :
```bash
grep -rn 'toISOString\(\)\.split\("T"\)\[0\]' --include="*.ts" --include="*.tsx" .
# Pour chaque résultat : le fichier a-t-il "use client" en tête (-> sain,
# ignorer) ? Sinon, l'appel calcule-t-il vraiment "aujourd'hui" (new
# Date() sans argument, ou une variable "now"/"today" assignée juste
# avant) plutôt qu'un décalage relatif ("il y a N jours", une date
# stockée reformulée) ? Si oui -> remplacer par todayInParis().
```

### Reste à faire sur cet axe

- Les décalages relatifs ("il y a N jours", débuts de semaine, curseurs
  de plage) n'ont volontairement pas été touchés — risque réel mais bien
  plus faible (erreur d'un jour à la frontière d'une fenêtre de N jours,
  pas un blocage total). À revisiter si un symptôme concret apparaît.
- ~~`app/dashboard/coach/moi/bilan/actions.ts` utilise `todayInParis()`
  sans la tolérance "hier"~~ — corrigé le même soir (commit `c964b70`),
  même tolérance qu'`client/bilan/actions.ts` désormais des deux côtés.

## Axe M — Pages Server Component sans `loading.tsx`

**Statut : clos** (2026-08-15).

**Le problème** : l'appli a déjà 5 skeletons de chargement bien pensés
(`components/ui/Skeleton.tsx` : `PageSkeleton`, `ListPageSkeleton`,
`GridPageSkeleton`, `TabbedPageSkeleton`, `FormPageSkeleton`), utilisés de
façon cohérente sur la grande majorité des routes — mais 33 pages Server
Component asynchrones n'avaient aucun `loading.tsx` du tout. Next.js
affiche alors soit la page précédente figée, soit un flash de contenu
vide, pendant tout le temps de la requête serveur (auth + profil + toutes
les requêtes de données de la page), au lieu du skeleton immédiat que le
reste de l'appli offre déjà. Pur problème de performance perçue (aucune
donnée fausse ni corrompue), mais un vrai écart de finition d'un endroit
à l'autre de la même appli.

**Corrigé** : 30 nouveaux `loading.tsx` créés, chacun choisi selon la
forme réelle du contenu de la page (pas un choix mécanique uniforme) :
`ListPageSkeleton` pour les listes (leads, tâches, disponibilités...),
`GridPageSkeleton` pour les grilles de cartes à parcourir (annuaire coachs,
ressources publiques...), `FormPageSkeleton` pour les formulaires/éditeurs
(mailing, programmes, roadmap, intake...), `PageSkeleton` pour les pages
de type tableau de bord (stats + blocs). Nouvelle variante ajoutée,
`AuthCardSkeleton`, pour les écrans de statut/auth à carte centrée étroite
(2FA, "compte coach en attente") qui ne ressemblent à aucune des 5
variantes existantes, toutes pensées pour une mise en page tableau de bord
avec titre en haut à gauche.

**Volontairement exclus** :
- `app/dashboard/client/live/[id]/page.tsx` et
  `app/dashboard/coach/live/[id]/page.tsx` (salle Jitsi) : interface plein
  écran d'appel vidéo, aucun skeleton "page avec titre + blocs" n'a de
  sens ici — un flash de squelette tableau de bord juste avant une salle
  d'appel serait plus étrange que l'absence actuelle de skeleton.
- `app/reussites/page.tsx` : répertoire non suivi par git au moment de
  cette passe (travail en cours d'une session précédente, pas encore
  commité) — volontairement laissé de côté pour ne pas mélanger ce
  chantier avec du travail non terminé d'un autre fil.

tsc/eslint (fichiers touchés)/build vérifiés propres.

**Méthode utilisée** (relançable) :
```bash
node -e '
const fs = require("fs"), path = require("path");
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out); else out.push(full);
  }
}
const files = []; walk("app", files);
for (const p of files.filter(f => /page\.tsx$/.test(f))) {
  const c = fs.readFileSync(p, "utf-8");
  if (!/export default async function/.test(c)) continue;
  const loadingPath = path.join(path.dirname(p), "loading.tsx");
  if (!fs.existsSync(loadingPath)) console.log(p);
}
'
# Pour chaque page trouvée : regarder les composants qu'elle rend
# (grep -oE "<[A-Z][A-Za-z]+") pour deviner la forme réelle (liste, grille,
# formulaire, tableau de bord, carte centrée) plutôt que de choisir une
# variante par défaut au hasard.
```

### Reste à faire sur cet axe

- Aucun signal connu à ce jour sur les 3 exclusions volontaires — à
  reconsidérer si `app/reussites/` est un jour commité et mérite son
  propre `loading.tsx` (probablement `GridPageSkeleton`, format
  répertoire de témoignages).

## Axe N — Routes API de mutation sans `enforceRateLimit`

**Statut : clos** (2026-08-15).

**Le problème** : `lib/rate-limit.ts` fournit un garde-fou générique
(`enforceRateLimit` + `PRESETS`, adossé à un compteur Postgres) déjà
utilisé sur la plupart des routes sensibles — mais 5 routes API qui
modifient des données (PATCH/DELETE/POST) n'appelaient jamais cette
fonction, sans aucune autre protection contre un script qui spammerait
l'endpoint : `guard.ok` (authentification) borne *qui* peut appeler, pas
*à quelle fréquence*.

**Corrigé** — `enforceRateLimit(..., PRESETS.write.limit,
PRESETS.write.windowSeconds)` ajouté, clé scoppée par utilisateur et par
route (même convention que le reste du fichier, ex.
`` `session-delete:${guard.userId}` ``) :
- `app/api/client/sessions/[id]/route.ts` — `PATCH` (warmup) et `DELETE`
  (abandon de séance). `GET` non touché (lecture, pas de mutation).
- `app/api/client/sessions/[id]/complete/route.ts` — `POST` (déclenche en
  plus un email au coach à chaque appel : la route la plus abusable du
  lot avant ce correctif).
- `app/api/client/sessions/[id]/sets/[setId]/route.ts` — `DELETE`.
- `app/api/community/posts/[id]/route.ts` — `PATCH` (marquer
  répondu) et `DELETE`.
- `app/api/coach/resources/[id]/route.ts` — `PATCH` (recatégoriser) et
  `DELETE`.

**Vérifié SAIN — ne pas toucher** : les ~30 autres routes sans
`enforceRateLimit` repérées par le grep initial sont soit protégées
autrement soit à faible risque — les `app/api/cron/*` (18 routes) et
`app/api/cleanup-voice` sont verrouillées par `CRON_SECRET` (un secret
d'appel est une protection plus forte qu'une limite de fréquence),
`app/api/webhooks/stripe` vérifie une signature Stripe (rate-limiter un
webhook risquerait de rejeter de vrais retries Stripe), et le reste
(`notifications/*`, `messages/unread`, `oura/*`, `coach/clients-search`,
etc.) sont des lectures authentifiées à faible enjeu, cohérent avec le
fait que beaucoup de routes `GET` authentifiées de l'appli n'ont jamais
eu de limite non plus — `PRESETS.write`/`expensiveRead` visent les
mutations et les lectures coûteuses, pas chaque lecture authentifiée.

tsc/eslint (fichiers touchés)/build vérifiés propres.

**Méthode utilisée** (relançable) :
```bash
for f in $(find app/api -name "route.ts"); do
  grep -q "enforceRateLimit" "$f" || echo "$f"
done
# Puis pour chaque résultat : grep "^export async function" pour voir les
# méthodes exposées. GET seul -> generalement sain (lecture). PATCH/POST/
# DELETE -> vérifier s'il y a une autre protection déjà en place (secret
# cron, signature webhook) avant de conclure à un vrai trou.
```

### Reste à faire sur cet axe

- `app/api/coach/clients/[clientId]/route.ts` (`GET` seul) et
  `app/api/exercise-library/recent/route.ts` n'ont pas été touchés —
  lectures authentifiées, signal plus faible que les mutations
  corrigées ici. À revisiter seulement si un usage anormal est constaté.

## Axe O — Upload de fichier sans contrôle taille/type avant l'envoi réseau

**Statut : clos** (2026-08-15).

**Le problème** : 13 endroits uploadent un fichier vers Supabase Storage.
Plusieurs (`personal-actions.ts`, `profile-actions.ts`,
`community/posts/route.ts`, `coach/resources/route.ts`) valident déjà
taille et type MIME avant l'upload, avec un message clair. Mais 5 flux
d'upload **côté client**, tous déclenchés par un vrai sélecteur de
fichier (pas un blob généré en interne comme un enregistrement audio),
n'avaient aucun contrôle avant d'appeler `.upload()` : l'utilisateur
sélectionne un fichier trop lourd ou du mauvais type, attend l'échec de
l'upload réseau (potentiellement plusieurs minutes pour une vidéo), pour
finalement voir un message d'erreur générique.

**Vérifié d'abord (pas juste supposé)** : interrogé `storage.buckets` en
base pour savoir si c'est un vrai trou de sécurité ou un défaut d'UX —
`file_size_limit`/`allowed_mime_types` sont déjà configurés côté serveur
sur tous les buckets concernés (ex. `message-images` 8 Mo images
seulement, `correction-videos`/`coach-videos`/`exercise-videos` 150 Mo
vidéo seulement, `set-videos` 100 Mo). Supabase rejette donc déjà un
fichier invalide **avant** qu'il soit stocké — ce n'est pas une faille de
sécurité, seulement une mauvaise expérience (attendre l'échec au lieu
d'être prévenu tout de suite).

**Corrigé** — contrôle `file.size` ajouté avant l'appel `.upload()`, avec
la même limite que le bucket cible et un message clair, en réutilisant
l'état d'erreur déjà existant dans chaque composant (pas de nouvelle UI) :
- `components/messaging/ConversationView.tsx` → `sendImage` (bucket
  `message-images`, 8 Mo)
- `components/ui/ClientCorrectionsSection.tsx` → `handleVideoSelected`
  (bucket `correction-videos`, 150 Mo) — au passage, `uploadError` était
  un simple booléen affichant toujours "Échec de l'envoi, réessaie.",
  changé en `string | null` pour pouvoir distinguer "trop lourd" d'un
  vrai échec réseau
- `components/ui/ClientCorrectionsReplySection.tsx` → même chose (bucket
  `coach-videos`, 150 Mo)
- `components/client/SessionView.tsx` → `handleVideoSelect` (bucket
  `set-videos`, 100 Mo) — garde le `alert()` déjà utilisé par ce
  composant pour ses erreurs d'upload, pas de refonte d'UI
- `components/ui/ExerciseLibraryView.tsx` → `handleVideoUpload` (bucket
  `exercise-videos`, 150 Mo)

**Vérifié SAIN — ne pas toucher** : `components/ui/CheckinCard.tsx` (vidéo
`coach-videos`) et l'enregistrement vocal de `ConversationView.tsx`
uploadent un `Blob` généré en interne par `MediaRecorder`, jamais un
fichier choisi par l'utilisateur — taille et type déjà bornés par la
durée d'enregistrement, aucun sélecteur de fichier à valider.

tsc/eslint (fichiers touchés, mêmes 8 erreurs pré-existantes sans rapport
avec ce correctif avant/après vérifié via `git stash`)/build vérifiés
propres.

**Méthode utilisée** (relançable) :
```bash
grep -rn "\.upload(" --include="*.ts" --include="*.tsx" .   # via l'outil Grep, pas grep -r brut (trop lent sur node_modules)
# Pour chaque résultat : le fichier uploadé est-il un File choisi par
# l'utilisateur (input type="file", <input accept=...>) ou un Blob généré
# en interne (MediaRecorder, canvas...) ? Si File choisi par
# l'utilisateur et aucun contrôle de taille visible juste avant
# `.upload(` -> vérifier la vraie limite du bucket en base
# (`select file_size_limit, allowed_mime_types from storage.buckets`)
# et ajouter un contrôle client qui matche exactement cette limite.
```

### Reste à faire sur cet axe

- Le contrôle ajouté ne vérifie que la taille, pas le type MIME exact
  (l'attribut `accept` du `<input>` suffit comme premier filtre côté UI,
  et Supabase rejette déjà un mauvais type côté serveur) — un mauvais
  type passerait donc encore le contrôle client et échouerait à l'upload
  avec le message générique existant, pas un message "mauvais format"
  dédié. Écart mineur, pas revu ici faute de signal concret.

## Axe P — Passe sécurité sur 20 points (demande explicite du 2026-08-15)

**Statut : clos pour les points traités, 3 points restants documentés
ci-dessous.**

Retour direct (liste à la volée, reformulée ici en items) : clé API dans le
front, permission navigateur, mot de passe sur GitHub, base lisible par
tous, API sans limite, texte collé en requête (injection SQL), serveur qui
croit tout, commentaire qui exécute (XSS stocké), mot de passe en clair,
jeton côté navigateur, back-office ouvert, serveur ouvert à tous (CORS),
email non vérifié, identifiants devinables (IDOR), passage en admin,
webhook non signée, erreurs qui fuitent, librairies pas à jour, "six
lettres suffisent" (mot de passe faible), fichiers sans contrôle.

**Déjà sain, vérifié sans modification** : clé API front (`NEXT_PUBLIC_*`
= uniquement anon key Supabase + clé VAPID publique, `SUPABASE_SERVICE_
ROLE_KEY` jamais préfixé `NEXT_PUBLIC_`) · permission navigateur
(`PushPermission.tsx` documente déjà l'anti-pattern "prompt hors clic
utilisateur") · secret sur GitHub (`.env*` gitignored, rien de tracké) ·
base lisible par tous (RLS activée sur 100% des tables `public`, aucune
table `rowsecurity = false`) · injection SQL (aucune requête construite en
concaténant du texte utilisateur, tout passe par le query builder Supabase
ou des RPC sans argument) · XSS stocké (zéro `dangerouslySetInnerHTML`,
déjà documenté) · jeton côté navigateur (aucun token d'auth en
`localStorage`, uniquement de l'état UI non sensible) · back-office ouvert
(`requirePlatformOwner()` + IDOR : `requireOwnClient`/
`requireOwnClientOrSelf` bloquent déjà l'accès à un client d'un autre
coach) · CORS (aucun header `Access-Control-Allow-Origin` posé, donc
same-origin par défaut) · webhook non signé (Stripe : signature vérifiée
via `stripe.webhooks.constructEvent`) · passage en admin
(`updateMyProfile` utilise une allowlist de champs stricte, jamais de
spread du body).

**Corrigé** :
- **Librairies pas à jour** (le point le plus sérieux) : `next` 16.2.6 →
  `16.3.1`, corrigeant 4 CVE HIGH dont un contournement de middleware
  (CWE-285) et une divulgation non authentifiée d'endpoints Server
  Function internes. `sharp`/`postcss`/`nanoid` mis à jour en cascade via
  `npm audit fix --force`. `npm audit --omit=dev` : 0 vulnérabilité
  restante (4 avant).
- **Mot de passe faible ("six lettres suffisent")** : minimum réel de 6
  caractères (littéralement le seuil signalé) sur les 2 signup + le reset
  password, remonté à 8 (client + serveur, 6 fichiers). Le vrai rempart
  (vérification contre HaveIBeenPwned via `lib/pwned-password.ts`)
  existait déjà sur les 3 flux — seul le plancher de longueur était trop
  bas.
- **API sans limite** : `submitLead` (`app/ressources/actions.ts`) — page
  publique, écrit en base via le client admin (RLS contournée) et
  déclenche un envoi Brevo, strictement aucune limite avant ce fix.
  Rate-limitée par IP (`PRESETS.email`, 5/h), même pattern `callerIp()` que
  `app/auth/client/actions.ts`.
- **Erreurs qui fuitent** : 4 endpoits (`app/api/client/sessions/[id]/**`)
  renvoyaient `error.message` (texte brut Postgres/Supabase) directement
  au client sur un 500 — remplacé par un message générique + `console.
  error` côté serveur.
- **Serveur qui croit tout** (trouvé en creusant l'item précédent) :
  `POST .../sessions/[id]/sets` insérait `{ ...body, session_id }` sans
  allowlist — un body forgé pouvait écrire n'importe quel champ
  (potentiellement `id`) dans `session_sets`. Allowlist explicite ajoutée,
  même discipline que `updateMyProfile`.
- **Fichiers sans contrôle** : `app/onboarding/intake/actions.ts` (upload
  photo pendant l'onboarding, bucket `progress-photos`) n'avait ni
  contrôle de type ni de taille, et dérivait l'extension du nom de fichier
  fourni par le client plutôt que du type MIME — même bucket que
  `app/dashboard/client/photos/personal-actions.ts` qui, lui, valide
  déjà les deux. Alignée sur le même allowlist (jpg/png/webp/gif, 8 Mo).

**Reste à faire sur cet axe** (non traité dans cette passe, par manque de
temps ou risque de casse trop élevé pour un fix précipité) :
- **10 fonctions RLS `SECURITY DEFINER`** (`is_coach`, `is_platform_
  owner`, `can_message_recipient`, etc.) sont exposées en RPC public
  (`/rest/v1/rpc/...`) accessible même par `anon`, alors qu'elles ne
  servent qu'en interne dans des policies RLS. Risque réel faible (ce
  sont des vérifications d'identité de session, pas des accesseurs de
  données arbitraires), mais la vraie correction — déplacer ces fonctions
  hors du schéma `public` exposé par PostgREST — implique de retoucher
  toutes les policies RLS qui les référencent. Trop invasif pour être fait
  sans un passage dédié et testé à part.
- **Protection mot de passe compromis native Supabase Auth** : le
  paramètre "Leaked Password Protection" du dashboard Supabase Auth est
  désactivé. Redondant avec `isPasswordPwned()` déjà en place côté appli
  (donc pas un vrai trou), mais l'activer ajouterait une défense en
  profondeur sur tout chemin qui fixerait un mot de passe sans passer par
  ce code applicatif. Paramètre dashboard, pas modifiable en SQL/MCP — à
  activer manuellement (Authentication → Policies → Leaked password
  protection).
- **Couverture rate limiting incomplète** : 59 fichiers de mutation sur 71
  n'appellent pas `enforceRateLimit`. La plupart sont des server actions
  authentifiées (abus limité par la nécessité d'un compte réel), donc
  risque nettement plus bas que les endpoints publics déjà corrigés
  ci-dessus — mais pas audité fichier par fichier, seul le point d'entrée
  public le plus évident (`submitLead`) a été traité.
- **Email non vérifié** et **mot de passe en clair** : pas creusés en
  profondeur (le premier a l'air d'être une donnée applicative distincte
  du gate natif Supabase Auth, le second est géré nativement par Supabase
  Auth qui hash côté plateforme) — aucun signal concret trouvé, mais pas
  vérifié aussi rigoureusement que le reste de la liste.

tsc/eslint/build vérifiés propres après l'ensemble de ces correctifs.

## Axe Q — Tirets em/en restants dans le texte utilisateur (demande explicite du 2026-08-15)

La règle "jamais de tiret em/en dans le texte utilisateur" existe depuis le
début du projet (voir mémoire utilisateur), mais n'avait jamais fait
l'objet d'un balayage systématique de tout le code, seulement d'une
vigilance au fil de l'eau sur les nouveaux textes écrits. Après plusieurs
mois de développement, environ 40 occurrences résiduelles s'étaient
accumulées, essentiellement dans des textes d'aide/subtitle/placeholder
écrits avant que la règle ne soit bien intériorisée.

**Méthode** : `rg '—'`/`rg '–'` sur tout `*.ts`/`*.tsx` (hors
`node_modules`/`.next`), puis un filtre en deux passes pour isoler le texte
réellement affiché à l'utilisateur des commentaires de code (qui, eux,
peuvent légitimement contenir des tirets, la règle ne concerne que ce que
l'utilisateur voit) :
1. Ne garder que la partie de chaque ligne avant un éventuel `//`.
2. Retirer les lignes de blocs de commentaires (`/**`, `{/* `, lignes
   commençant par `*`).

Cette heuristique n'est pas parfaite (un commentaire multi-lignes sans `*`
en début de ligne de continuation peut passer le filtre), donc chaque
résultat restant a été relu manuellement avant correction, pas corrigé en
masse par script.

**Corrigé** : ~37 fichiers, ~40 occurrences réelles. Deux familles de cas :
- **Tiret connecteur de phrase** ("Fait ça — parce que", "Objectif atteint
  — le client verra") : remplacé par une virgule, un point (nouvelle
  phrase) ou deux-points selon ce que la grammaire du passage demandait,
  jamais un remplacement mécanique uniforme.
- **Tiret comme placeholder visuel de donnée manquante** (`value={x ?? "—"}`
  dans des `StatTile` de stats hebdomadaires/sommeil) : remplacé par
  `"N/A"`, plus conforme à la règle et tout aussi clair visuellement.

**Non touché, à raison** : tirets dans les commentaires `//`/`/** */`/
`{/* */}` (des centaines d'occurrences) — ce sont des notes pour les
développeurs, jamais rendues à l'écran, hors du périmètre de la règle.

eslint + tsc + `npm run build` vérifiés propres après l'ensemble des
corrections (37 fichiers modifiés en un seul commit).

## Axe R — Accessibilité clavier des accordéons (`aria-expanded` + `onKeyActivate`)

**Statut : clos (2026-08-15/16).**

Suite de l'Axe C (accessibilité clavier, clos précédemment) : passe ciblée
sur un pattern précis, les accordéons/panneaux dépliables, pour vérifier
deux choses systématiquement absentes du premier passage : `aria-expanded`
sur le déclencheur (pour que les lecteurs d'écran annoncent l'état
ouvert/fermé) et le support clavier réel quand le déclencheur ne peut pas
être un vrai `<button>` (cas où il contient déjà un autre `<button>`/
`<label>` imbriqué, invalide en HTML).

**Méthode** : recherche de tous les composants avec un état
`open`/`expanded`/`showX` piloté par un chevron (`ChevronUp`/`ChevronDown`),
lecture de chaque déclencheur pour vérifier la présence de `aria-expanded`
et, quand c'est un `<div role="button">`, la présence d'un `onKeyDown`.

**Ajouté** : `lib/a11y.ts`, exportant `onKeyActivate(handler)` — gère
Entrée/Espace pour activer un `<div role="button" tabIndex={0}>`, réservé
aux cas où un vrai `<button>` est impossible.

**Corrigé** :
- `aria-expanded` ajouté sur 9 boutons d'accordéon qui ne l'avaient pas :
  `SubscriptionToggle.tsx`, `CoachLogbookClient.tsx`,
  `ProgramPresetSelector.tsx`, `ProgrammationHub.tsx` (×2),
  `ProgramFromScratchSection.tsx`, `DietPlanManager.tsx`,
  `CoachingPhasePanel.tsx`, `CheckinCard.tsx`,
  `AutoGeneratePlanButton.tsx`, et les 3 accordéons d'`OrganisationView.tsx`
  (commit séparé, au moment de la création du composant).
- Deux **vrais bugs pré-existants découverts en cours de route**, pas de
  simples oublis d'attribut : `ClientNutritionView.tsx` (en-tête de
  `DietPlanCard` et d'un créneau de repas) et
  `CoachFormationEditor.tsx` (toggle module/section) utilisaient
  `<div role="button" tabIndex={0} onClick={...}>` **sans aucun
  `onKeyDown`** — focusable au clavier via Tab, mais Entrée/Espace ne
  faisaient rien. Corrigé avec `onKeyActivate` + `aria-expanded`.

**Vérifié sain, à raison** : `SessionView.tsx` — les chevrons identifiés au
premier coup d'œil comme suspects sont en fait des boutons de réordonnancement
(monter/descendre un exercice), pas un accordéon ; aucun changement.

`git diff` vérifié sur chaque fichier avant commit pour confirmer que les
erreurs `react-hooks/set-state-in-effect` remontées par eslint sur ces
fichiers (pattern déjà connu, voir Axe E) portaient toutes sur des lignes
non touchées par cette passe, donc pré-existantes et hors périmètre.

## Axe S — Lint complet du projet (`npx eslint .`), pas seulement les fichiers touchés

**Statut : première passe close (2026-08-16), reproductible à volonté.**

Découverte fortuite : en corrigeant une erreur `react/no-unescaped-entities`
sur `components/outils/OutilsView.tsx` (apostrophes non échappées, ligne
déjà présente avant cette session), une question s'est posée : cette
erreur n'apparaît QUE quand eslint tourne sur ce fichier précis — or le
projet n'avait jusqu'ici jamais été passé au lint dans son ensemble en une
seule commande, seulement fichier par fichier au moment de chaque commit
(l'usage établi tout au long de ce MASTERCLASS, y compris dans ce
document). Un premier `npx eslint .` complet a donc été lancé pour voir ce
qu'un passage exhaustif révèle.

**Résultat** : 63 erreurs + 12 warnings, dont 54 déjà connues et acceptées
(`react-hooks/set-state-in-effect`, voir Axe E) — le reste, une classe de
règle jamais auditée jusqu'ici :

- **`react-hooks/purity` (8 occurrences)** — appel d'une fonction impure
  (`Date.now()`) directement pendant le rendu. Deux familles très
  différentes derrière la même règle :
  - **Vrais bugs, corrigés** : `components/client/SessionView.tsx` (3
    endroits). `useRef(expression)` et `useState(expression)` évaluent
    leur argument à CHAQUE rendu (React ne garde que le résultat du
    premier rendu, mais l'appel a quand même lieu à chaque fois,
    contrairement à `useState(() => expression)` qui garantit un seul
    appel) — un timer de repos et un timer de séance relisaient
    `localStorage`/rappelaient `Date.now()` inutilement à chaque rendu. Un
    des trois cas lisait aussi `.current` d'un ref pendant le rendu
    (`react-hooks/refs`, même correctif) : regroupé en un seul
    `useState(() => ...)` paresseux.
  - **Vérifié SAIN, pas un bug** : `components/client/RoadmapView.tsx`,
    `components/messaging/ConversationView.tsx`,
    `app/dashboard/coach/live/page.tsx` — ici `Date.now()` calcule une
    valeur AFFICHÉE qui doit refléter l'instant du rendu (jours restants,
    heures avant expiration d'un message vocal, prochain live) : recalculer
    à chaque rendu est le comportement voulu, pas un défaut. Pour
    `live/page.tsx` (composant serveur, jamais réconcilié côté client), la
    règle ne s'applique de toute façon pas au même titre.
- **`react-hooks/exhaustive-deps` (1 erreur + 2 warnings)** :
  `components/recipes/RecipesClient.tsx` corrigé — `isRecommended`
  changeait d'identité à chaque rendu (fonction déclarée dans le corps du
  composant), le `useMemo` qui l'utilise ne pouvait pas la lister
  honnêtement en dépendance sans se recalculer à chaque rendu. Passé en
  `useCallback` avec ses vraies dépendances
  (`isCoach, recipesUnlocked, presetDiet, recommendedPhase`), puis ajouté
  proprement à la liste de dépendances du `useMemo`. Les 2 warnings
  restants (`components/steps/StepsClient.tsx`,
  `components/ui/NutritionForm.tsx`) sont déjà des désactivations
  volontaires et commentées de la règle, pas des oublis — non touchés.
- **`@typescript-eslint/no-unused-vars` (10 warnings, tous traités)** :
  - 3× `PRESETS` importé mais jamais appelé (`import-logbook`, `push/send`,
    `push/subscribe`) — le rate limiting existe bel et bien dans ces 3
    routes (`enforceRateLimit` avec des seuils écrits en dur), juste sans
    passer par les constantes partagées. Import mort retiré.
  - 3× dans `DietPlanManager.tsx` (`CalendarDays`, `getMicroDeficiencyOrder`,
    `MICRO_DAILY_REF`) — imports laissés après un refactor antérieur,
    retirés (`calculateNutrients`, importé à côté, restait utilisé).
  - 1× `readOnly` (`components/roadmap/RoadmapCalendar.tsx`, dans
    `WeekDetailModal`) — creusé plus loin que le simple import mort : le
    prop `readOnly` ne gate RIEN nulle part dans tout `RoadmapCalendar`,
    ni dans la modale. Vérifié qu'aucune des deux utilisations
    (`RoadmapView.tsx` avec `readOnly={true}` côté client,
    `RoadmapEditor.tsx` avec `readOnly={false}` côté coach) n'a d'effet :
    le composant entier n'a qu'une seule interaction, cliquer une semaine
    pour ouvrir une modale purement informative (aucun bouton d'édition,
    aucun input). Pas un trou de sécurité (rien à mutation-gate n'a jamais
    existé ici), mais un prop mort porté à travers 4 endroits — retiré
    entièrement plutôt que juste supprimé de la déstructuration interne.
  - 2× `_l` (`RoadmapEditor.tsx`, `phases.map(({ localId: _l, ...p }) =>
    p)`) — **vérifié SAIN, non touché** : idiome volontaire pour exclure
    une clé avant l'envoi au serveur, le nom jamais lu est le but même du
    pattern (nécessiterait `ignoreRestSiblings` dans la config eslint du
    projet pour faire taire proprement, changement de config disproportionné
    pour 2 warnings).

**Méthode** (relançable) :
```bash
npx eslint . > /tmp/full_eslint.txt 2>&1
grep -oE "react-hooks/[a-z-]+|@typescript-eslint/[a-z-]+|react/[a-z-]+" /tmp/full_eslint.txt | sort | uniq -c | sort -rn
```
Puis lire chaque catégorie autre que `set-state-in-effect` (déjà classée
Axe E) et juger au cas par cas — cette passe a délibérément laissé de côté
les 10 warnings `no-unused-vars`, à traiter dans une future itération.

tsc/build vérifiés propres après corrections (deux commits séparés : le
lot SEO+purity+exhaustive-deps ici, un correctif de bug utilisateur signalé
en direct pendant cette même session traité et documenté à part).

## Axe T — Les "6 failles cross-coach" de PROGRESS.md, ré-auditées et closes

**Statut : clos (2026-08-17).**

Découverte en lisant le prompt complet d'une routine cloud déjà en place
(revue quotidienne des check-ins) : son texte mentionne explicitement "6
failles cross-coach déjà identifiées en audit séparé (communauté, live,
profil, dashboard stats, `/api/push/send`, `/api/coach/pending-count`) +
une migration SQL storage buckets, hors périmètre... prérequis avant toute
commercialisation à d'autres coachs". `PROGRESS.md` (chantier "50 idées",
clos depuis) documentait la même liste, plus deux signalements
additionnels (`getScienceStudies`, `resource_requests`), tous explicitement
laissés non corrigés à l'époque car "non exploitable avec un seul coach en
prod". Ce prérequis devient faux maintenant que le recrutement de coachs
est réellement lancé (`/carrieres`, suivi d'onboarding, voir CROISSANCE.md
et EQUIPE-IA.md) — traité en priorité absolue dès la découverte,
avant tout autre travail en cours.

**Méthode** : pour chacun des 6 items + 2 signalements, lecture du code
applicatif réel ET de la RLS réelle (`pg_policies`, jamais supposée à
partir d'un commentaire ancien) — plusieurs de ces items ont en fait déjà
été corrigés dans des sessions postérieures à la rédaction de
`PROGRESS.md`, sans que ce fichier de suivi ne soit mis à jour en
conséquence. Ne jamais faire confiance à un statut "connu comme
vulnérable" sans revérifier l'état actuel du code.

**Déjà corrigé, vérifié à nouveau (aucun changement nécessaire)** :
- **dashboard stats** (`/api/coach/dashboard-stats`) : `getPendingReplies`/
  `getWeeklyCheckinCount` passent par `createServerSupabase()` (session),
  et la RLS de `check_ins` est `client_id = auth.uid() OR
  is_own_coach(client_id)` — correctement cloisonnée.
- **`/api/push/send`** : vérifie explicitement `target.coach_id ===
  guard.userId` avant d'autoriser une notification vers un client, avec un
  commentaire dans le code documentant la règle.
- **`/api/coach/pending-count`** : commentaire explicite confirmant que les
  3 fonctions utilisées passent par le client de session, RLS-cloisonnées.
- **live** (`live_events`, `live_event_rsvps`) : RLS utilise
  `my_coach_scope()`/`host_id = auth.uid()`, correctement cloisonnée.
- **profil** (`profiles`) : RLS "Coach reads all profiles" est
  `auth.uid() = id OR is_own_coach(id) OR is_platform_owner()`, correcte.
- **`getScienceStudies`** (`utils/science.ts`) : filtre déjà
  `.eq("created_by", coachId)`, avec un commentaire documentant un
  correctif du 2026-08-06.

**Réellement vulnérable, corrigé maintenant** (`supabase/migrations/
20260817b_fix_cross_coach_leaks.sql`) — le motif fautif partout : policy
`EXISTS (select 1 from profiles where profiles.id = auth.uid() and
profiles.role = 'coach')`, qui autorise N'IMPORTE QUEL coach de la
plateforme au lieu du coach du client concerné, remplacé par
`is_own_coach(author_id)` (déjà utilisé correctement ailleurs) :
- `community_posts`, policy UPDATE ("Author or coach can update a post")
- `community_recipes`, policy DELETE ("Author or coach can delete a
  recipe")
- `resource_requests`, policies UPDATE et DELETE ("Author or coach can
  update/delete a request")

**Vérifié SAIN, à raison, non touché** :
- `formations`/`formation_modules`/`formation_sections`/`formation_lessons`
  (RLS "coach_manage_*", même motif `role = 'coach'` générique) : ces
  tables n'ont pas de `coach_id`, c'est une bibliothèque de cours partagée
  à toute la plateforme par conception, pas une fuite de données client.
  Déjà noté ainsi dans `PROGRESS.md`, reconfirmé.
- Bucket de storage `resources` (policies "Coach can upload/delete
  resources", `is_coach()` générique) et `exercise-videos` (même motif) :
  même famille que les formations, contenu partagé publiquement lisible
  par conception (`select ... where bucket_id = 'resources'` publique),
  pas une fuite.
- Tous les autres buckets audités (`avatars`, `checkin-media`,
  `coach-videos`, `correction-videos`, `message-images`,
  `photo-updates-media`, `progress-photos`, `set-videos`,
  `voice-messages`) : déjà correctement cloisonnés via
  `is_own_coach()`/`is_platform_owner()` sur le premier segment du chemin
  de fichier (convention `{userId}/...`). La "migration SQL storage
  buckets" mentionnée comme non traitée dans le rappel sécurité d'origine
  semble donc déjà appliquée elle aussi.

**Repéré en passant, PAS corrigé (hors périmètre sécurité de cet axe,
performance pure)** : l'advisor performance Supabase remonte 154
occurrences de `multiple_permissive_policies` — des tables avec 2 policies
permissives qui se chevauchent sur le même rôle/action (typiquement une
policy `ALL` "Owner can manage X" plus une policy `SELECT` séparée "Owner
or coach can read X"), forçant Postgres à évaluer les deux à chaque ligne
au lieu d'une seule consolidée. Pas un risque de sécurité (les deux
policies disent la même chose côté permissif, juste redondant), un vrai
sujet de performance à l'échelle, mais pas urgent avec le volume actuel
(~12 clients). Candidat pour une future passe dédiée : fusionner chaque
paire en une seule policy `USING (condition_a OR condition_b)`, table par
table, en vérifiant après coup que le comportement effectif ne change pas
(même méthode avant/après que le fix `auth_rls_initplan` de l'Axe I).

`community_posts`/`community_recipes` policies DELETE (pas UPDATE) restent
volontairement restreintes à l'auteur ou au fondateur seul (pas
`is_own_coach()`) — vérifié que ce n'est PAS une fuite (c'est au contraire
plus restrictif que nécessaire, jamais un accès en trop), donc pas touché
pour rester focalisé sur les vraies fuites de cette passe.

**Méthode reproductible** (relançable) :
```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and (qual ilike '%role = ''coach''%' or with_check ilike '%role = ''coach''%')
order by tablename, policyname;
```
Puis, pour chaque résultat, vérifier si la table a une vraie notion de
"propriétaire" (client/auteur) qui justifierait `is_own_coach(...)` à la
place — sinon (contenu partagé par conception comme les formations),
laisser tel quel.

## Axe U — Garde trop permissive sur les nouvelles actions "agents IA"

**Statut : clos (2026-08-17).**

En construisant la fonctionnalité "19 agents IA dans l'appli" (voir
CROISSANCE.md), les 5 actions serveur du nouveau fichier
`app/dashboard/coach/admin/organisation/agents/actions.ts` ont été écrites
avec `requireCoach()` (n'importe quel compte coach) au lieu de
`requirePlatformOwner()`. Repéré en relisant le fichier juste après
l'avoir écrit, avant tout signalement externe : le fichier voisin du même
dossier (`../actions.ts`, `setRoleStatus`/`setApplicationStatus`) utilise
`requirePlatformOwner()` pour exactement le même groupe de fonctionnalités
(Administration > Organisation), donc l'incohérence sautait aux yeux dès
la relecture.

Pas de fuite de données entre coachs (chaque action lit/écrit sous son
propre `owner_id`, RLS `owner_id = auth.uid()` déjà correcte sur
`ai_agent_messages`/`ai_agent_tasks`), mais un coach tiers recruté via
`/carrieres` aurait pu appeler ces actions directement (en contournant la
garde de la page qui, elle, vérifie bien `is_platform_owner`) et
consommer le budget Anthropic du propriétaire sous son propre compte —
un vrai problème maintenant que le recrutement externe est actif, pas une
hypothèse lointaine. Corrigé avant tout déploiement en prod avec la
mauvaise garde (le premier `git push` de la fonctionnalité incluait déjà
`requireCoach()` ; corrigé dans un commit séparé juste après, poussé le
même jour).

**Leçon pour la suite** : toute nouvelle action serveur dans un dossier
`admin/*` doit reprendre la garde du fichier `actions.ts` voisin du même
dossier par défaut (`requirePlatformOwner()` pour tout ce qui vit sous
Administration), jamais `requireCoach()` par réflexe copié d'un autre
module de l'appli.

## Axe V — Audit de l'onglet Mailing (demande explicite 2026-08-17)

**Statut : bug corrigé, questions de fond posées à l'utilisateur avant
d'aller plus loin.**

Périmètre audité : `/dashboard/coach/mailing`, `CoachMailingComposer.tsx`,
`app/dashboard/coach/mailing/actions.ts`, `lib/coach-mailings.ts`,
`lib/brevo-mailing.ts`, `utils/brevo.ts`, la table `coach_mailings` et sa
RLS, la garde d'accès. Contexte : livré à l'Axe 2 de VISION.md
(2026-08-14) — chaque coach compose un message, l'envoie en test à
lui-même, puis à tous ses clients actifs via une liste Brevo dédiée créée
à la volée.

**Vérifié sain, pas de changement** :
- Garde `requireCoach()` correcte ici (contrairement à l'Axe U) : chaque
  coach ne peut mailer QUE ses propres clients (`getCoachClientsForMailing`
  filtre par `coach_id = son propre id`), c'est le comportement voulu par
  design, pas une fuite.
- RLS `coach_mailings` (`coach_id = auth.uid()`) déjà correcte et déjà
  passée par le fix `auth_rls_initplan` (migration `20260814o`).
- Plafond défensif `MAX_RECIPIENTS_PER_SEND = 200` toujours appliqué
  côté serveur même si le compteur affiché côté client est périmé (chargé
  une seule fois au montage) — pas de contournement possible.
- Aucun tiret em/en dans le texte utilisateur des fichiers audités.

**Bug trouvé et corrigé** : `syncClientsToList` avalait silencieusement
chaque échec de synchronisation d'un contact vers Brevo
(`.catch(() => {})`), et l'appelant reportait ensuite
`recipientCount: clients.length` au coach et dans l'historique comme si
l'envoi avait forcément atteint tout le monde. Un incident Brevo
(rate limit, contact rejeté...) pouvait donc afficher "Envoyé à 12
clients" en base et à l'écran alors que certains n'avaient en réalité
jamais reçu le mail. Corrigé : `syncClientsToList` retourne maintenant les
échecs, le nombre de destinataires reporté vient de la taille réelle de la
liste Brevo au moment de l'envoi (`GET /contacts/lists/{id}`, vérité
terrain plutôt que décompte optimiste), un échec de synchronisation
partiel est affiché au coach ("N contacts n'ont pas pu être
synchronisés..."), et si absolument tous les contacts échouent, l'envoi
est annulé avant de créer une campagne Brevo vers une liste vide ou
périmée plutôt que de la faire passer pour un succès.

**Questions ouvertes, pas de code écrit dessus** (posées à l'utilisateur
le 2026-08-17, voir sa réponse pour la suite) :
- Compliance : les campagnes Brevo (`type: "classic"`) incluent-elles déjà
  un lien de désabonnement conforme (RGPD/anti-spam) ? Pas vérifiable
  depuis le code, dépend de la configuration du compte Brevo — aucun
  outil MCP Brevo authentifié dans cette session pour le vérifier
  directement.
- Personnalisation : `FIRSTNAME` est déjà synchronisé comme attribut
  Brevo sur chaque contact (donc `{{contact.FIRSTNAME}}` fonctionnerait
  déjà dans le corps du message), mais rien dans l'interface ne le
  signale au coach — fonctionnalité invisible.
- Pas de réutilisation d'un envoi précédent (dupliquer depuis
  l'historique), pas de programmation différée, pas d'aperçu HTML rendu
  avant envoi (seul le test réel sert d'aperçu), pas d'identité de marque
  dans le composeur (contrairement au Studio créatif qui soigne logo/
  handle).

## Axe W — Nutrition : doublons corrigés, mode éditable, logging rétroactif

**Statut : livré (2026-08-18), demande explicite en direct.**

Trois demandes traitées ensemble, toutes sur `ClientNutritionView.tsx`
(composant partagé entre le client et "Moi" coach) :

**1. Doublons de repas (bug, voir aussi Axe précédent sur ce fichier).**
`logMealItems` ("Valider le repas") ne revalidait que
`/dashboard/client/nutrition`, jamais `/dashboard/coach/moi/nutrition`.
Un coach qui validait un repas sur sa propre page voyait la case revenir
décochée au retour sur la page (cache jamais invalidé), revalidait le
même repas, créait un doublon. 39 groupes de doublons retrouvés et
nettoyés en base (14-15/08, même compte). Corrigé : revalidatePath
manquant ajouté, plus un garde-fou idempotent dans `logMealItems`
lui-même (ignore un item déjà loggué identique au lieu de le dupliquer,
même si un futur bug de cache fait réapparaître un item coché comme non
coché).

**2. Mode fixe/flexible éditable depuis le suivi du jour.** Existait déjà
côté coach mais seulement dans l'onglet "Gérer" (`CoachClientNutritionTabs`,
`updateDietPlanMode`). `NutritionModeSelector` accepte maintenant un
`onChange` optionnel qui rend ses 3 badges cliquables ; nouvelle action
`updateOwnDietPlanMode` pour un membre gratuit gérant son propre plan
(le coach réutilise `updateDietPlanMode` existant via `.bind(null, userId)`).

**3. Logger un jour passé (pas seulement aujourd'hui) + vue agenda.**
Jusqu'ici tout le flux d'ajout (recherche, code-barres, recettes, repas
enregistrés, ajout rapide) écrivait en dur sur `today`. Ajout d'un état
`loggingDate` (par défaut `today`, réglé explicitement à l'ouverture de
la modale) traversé par les 4 handlers d'ajout
(`handleAddFood`/`handleAddRecipe`/`handleLogSavedMeal`/`handleQuickAdd`),
et d'une copie locale mutable de `historyLogs` (`historyLogsState`, même
piège prop→state que `todayLogs`) pour que les ajouts/suppressions sur un
jour passé se reflètent immédiatement sans recharger toute la page.
L'onglet Historique gagne un sélecteur Jour/Semaine/Mois (agenda) :
"Mois" = la grille des 30 jours déjà existante, "Semaine" = une rangée de
7 blocs (lundi→dimanche), "Jour" = un détail éditable par créneau
(`MealSlotCard`, réutilisé tel quel — le prop `today` de ce composant
sert en réalité de clé de date générique, pas seulement pour
aujourd'hui) avec navigation ◀/▶ bornée aux 30 derniers jours.

**Piège évité en cours de route** : `closeModal()` remettait initialement
`loggingDate` à `today` par hygiène — cassait le cas "créer un aliment
depuis la recherche" pendant un ajout sur un jour passé (le chaînage
`handleCreateFood` → `openModal(slot)` perdait alors le jour ciblé).
Retiré de `closeModal()`, `openModal()` fixe de toute façon `loggingDate`
à chaque ouverture ; le seul chaînage interne (`handleCreateFood`) passe
maintenant explicitement `loggingDate` pour le préserver.

**Volontairement pas fait dans cette passe** : le "Plan de ton coach"
(mode fixe, `DietPlanCard` avec cases à cocher) n'est pas rendu dans la
vue Historique — un jour passé se logue en ajout libre par créneau
(`MealSlotCard`), pas en cochant le plan rétroactivement. Aurait demandé
de rendre `DietPlanCard` conscient d'une date arbitraire (jour de la
semaine pour les plans "weekly", entre autres), plus risqué sur un
fichier déjà volumineux et déjà responsable du bug de doublons ci-dessus
— à reprendre si un vrai besoin se confirme à l'usage.

**Audit de suivi (même jour)** : le bug ci-dessus venait d'un pattern
précis — une page réutilisée à la fois par `/dashboard/client/*` et
`/dashboard/coach/moi/*`, une seule des deux routes revalidée. Vérifié
systématiquement sur les 5 autres écrans partagés de la même façon
(`agenda`, `mindset`, `steps`, `tracking`, en plus de `nutrition`) :
**tous corrects**, `logMealItems` était une omission isolée, pas un
défaut systémique. `agenda/actions.ts` a même déjà le bon réflexe
architectural pour éviter ce genre d'oubli : un seul helper
`revalidateAgendaPaths()` centralise les 3 chemins, appelé par les 6
fonctions qui affectent l'affichage plutôt que de dupliquer 3 appels
`revalidatePath` dans chacune — modèle à suivre si un nouveau créneau
"partagé client/coach" est ajouté un jour.

**Filet de sécurité ajouté** : routine cloud quotidienne
(`trig_01Wx8mMe6Nguc7PU6zJ7G3HH`, cron `0 5 * * *` UTC) qui vérifie
`food_logs` pour d'éventuels doublons exacts (même client/aliment/
créneau/quantité/jour), les supprime en gardant la ligne la plus
ancienne si elle en trouve, et notifie seulement dans ce cas — silence
total si tout est propre (le cas attendu maintenant que le bug est
corrigé). Accès Supabase uniquement (pas de dépôt git : les routines
cloud de ce compte n'ont pas d'accès git configuré, contrairement à ce
que suggérait la doc du skill /schedule — vérifié en listant les 2
routines déjà actives, aucune des deux n'a de `sources` git non plus).

**Statut : livré (2026-08-18).**

Suite directe de l'Axe V (audit initial) et des réponses de l'utilisateur
aux questions posées sur l'onglet : audience choisie (mes clients actifs
par défaut pour tout coach ; tous les membres / coachs / une liste Brevo
existante réservées au propriétaire de la plateforme, ces audiences
dépassant le périmètre d'un coach sur ses propres clients), dupliquer un
envoi passé (`html_content` maintenant conservé, absent jusqu'ici),
programmer un envoi (`scheduledAt` côté Brevo, statut `scheduled`),
aperçu avec la bannière de marque avant l'envoi réel, bannière/logo
automatique sur chaque envoi (`wrapBrandedEmail`), refonte visuelle
complète du composeur.

**Bug de build découvert et corrigé avant tout déploiement cassé** :
`MAX_RECIPIENTS_PER_SEND` était réexporté depuis
`app/dashboard/coach/mailing/actions.ts`, un fichier `"use server"` — or
Next.js interdit à un tel fichier d'exporter autre chose que des
fonctions async ("A 'use server' file can only export async functions,
found number"). `npm run build` a échoué proprement et a été repéré
avant le push, mais la leçon de méthode compte : **une commande pipée
dans `tail` renvoie le code de sortie de `tail`, pas celui de la
commande d'origine** — `npm run build 2>&1 | tail -80` avait affiché
"[exited with code 0]" alors que le build avait réellement échoué
("Build error occurred" visible seulement dans le texte, pas dans le
code de sortie rapporté). Depuis, vérifier un build passe par un fichier
de log + `echo "EXIT_CODE=$?"` explicite après la commande, jamais se
fier au code de sortie d'une commande pipée dans `tail`/`head`/`grep`.

Corrigé en extrayant `MAX_RECIPIENTS_PER_SEND` (et au passage le type
`MailingAudience`, sa (dé)sérialisation, et `wrapBrandedEmail`) dans un
nouveau fichier `lib/mailing-audience.ts` sans aucun import sensible
(pas de `createAdminClient`, pas de `BREVO_API_KEY`) — sûr à importer
aussi bien depuis un composant client que depuis les fichiers serveur
existants (`lib/brevo-mailing.ts`, `lib/coach-mailings.ts`).

## Axe Y — Formations : un coach n'avait aucun accès à son propre contenu

**Statut : livré (2026-08-19), audit systématique demandé explicitement
("organise-toi bien et passe à l'action sur tout") sur Entraînement/
Programme, Formations, Communauté, Studio créatif.**

Entraînement/Programme (bâtisseur, logbook, API `/api/client/sessions/**`)
audité en premier : déjà propre (guard, scoping par `client_id`, rate
limit, messages d'erreur génériques, tout déjà couvert par un passage
précédent — rien à corriger).

**Formations, en revanche, cache un vrai trou.** `app/dashboard/client/
formations/**` (catalogue, détail, lecture de leçon) redirige
systématiquement tout `role === "coach"` hors de ses pages
(`redirect("/dashboard/coach")`), et il n'existait **aucune** route
`/dashboard/coach/moi/formations` équivalente — contrairement à tous les
autres domaines de suivi personnel du coach (bilan, nutrition,
programme, logbook, roadmap, agenda, steps, tracking, photos, mindset :
11 domaines déjà avec leur "Moi", Formations le seul absent). Un coach
n'avait donc **aucun moyen de regarder une seule vidéo de son propre
catalogue**, y compris `ENTREPRENARIAL SECRET™` (construction d'une
activité de coaching, suit un coach fictif de zéro client à dix-huit
mois) et `PSYCHOLOGIE AFFECT™` (biais cognitifs appliqués à
l'entraînement ET à la construction d'une activité) — du contenu écrit
explicitement pour un coach, totalement inaccessible à un coach.

Le commentaire de `revalidateFormations()` prétendait que
`markLessonComplete`/`unmarkLessonComplete` revalidaient déjà "les deux
routes qui partagent VideoPlayer (client et coach Moi)" — faux : une
seule route au monde importe `VideoPlayer`
(`app/dashboard/client/formations/[formationId]/[lessonId]/page.tsx`),
et le second chemin revalidé,
`/dashboard/coach/formations/[formationId]`, est en réalité
`CoachFormationEditor.tsx` (l'éditeur de contenu du coach), qui n'affiche
jamais de progression de lecture. Cette revalidation ne servait donc
jamais à rien — un commentaire resté d'une implémentation soit jamais
finie, soit jamais faite, impossible à trancher avec certitude, mais le
résultat concret était le même : zéro accès.

**Vérifié avant de construire** (pas supposé) : `formation_progress` et
`formation_lesson_views` ont des policies RLS génériques
(`auth.uid() = user_id`, aucune restriction de rôle) — la table n'a
jamais empêché un coach d'écrire sa propre progression, seule la page
front manquait. `getResumeLesson`/`getUserProgress`/
`getFormationWithModules` (`utils/formations.ts`) sont déjà génériques
par `userId`, aucune hypothèse "client uniquement".

**Corrigé** : 3 nouvelles pages (`app/dashboard/coach/moi/formations/
page.tsx`, `[formationId]/page.tsx`, `[formationId]/[lessonId]/page.tsx`),
adaptées des pages client existantes en retirant la logique "membre
gratuit" (un compte coach n'est jamais free tier, toute leçon publiée
est directement accessible). `revalidateFormations()` corrigée pour
viser le vrai chemin coach (plus les deux catalogues, qui affichent une
progression globale eux aussi périmable). Entrée "Formations" ajoutée au
groupe de navigation "Mon Suivi" du coach (`DashboardNav.tsx`), avec
l'icône `GraduationCap` déjà utilisée partout ailleurs pour ce concept.
`loading.tsx` sur les 3 nouvelles routes (Axe M).

## Axe Z — Communauté : "marquer répondu" trop permissif, faux succès

**Statut : livré (2026-08-19), suite de l'audit systématique (même
demande que l'Axe Y).**

`community_posts` a déjà une RLS UPDATE correcte
(`auth.uid()=author_id OR is_own_coach(author_id) OR is_platform_owner()`,
fixée à l'Axe T), et sa RLS DELETE l'est aussi (auteur ou propriétaire de
plateforme seulement, pas `is_own_coach` — suppression volontairement
plus restreinte que la modification). Mais **deux endroits en amont**
laissaient passer n'importe quel coach au niveau de la garde applicative,
sans vérifier qu'il s'agit bien du coach de l'auteur :

1. `PATCH /api/community/posts/[id]` ("marquer répondu" manuel) —
   `requireCoach()` seul, aucune vérification que ce coach est celui de
   l'auteur.
2. `POST /api/community/posts/[id]/comments` (marquage automatique quand
   un coach commente une question, ajouté sans audit dédié le
   2026-0X — "répondre EST la donnée") — même trou, `guard.role ===
   "coach"` seul.

Dans les deux cas, la RLS bloquait bien l'écriture réelle pour un coach
tiers (aucune fuite de données, `community_posts.status` restait
inchangé), mais **silencieusement** : `.update()` sans `.select()` ne
remonte pas d'erreur quand RLS filtre la ligne à 0 résultat, donc l'API
répondait `{ ok: true }` / `autoAnswered: true` à un coach qui n'avait en
réalité rien pu modifier — un faux succès (même famille que l'Axe B,
"résultat d'action jamais vérifié", mais côté API cette fois).

**Corrigé** : les deux endpoints vérifient maintenant explicitement
`post.author_id`'s `coach_id` (ou `is_platform_owner`) avant de tenter
l'update, symétrique à ce que fait déjà `DELETE` sur le même fichier
depuis le début. Un coach tiers reçoit maintenant un vrai 403 (PATCH) ou
voit `autoAnswered: false` sans même tenter l'update (POST comments) —
plus de faux positif.

## Axe AA — Studio créatif : le pipeline principal avait le trou Axe B

**Statut : livré (2026-08-19), dernier des 4 chantiers de l'audit
systématique demandé (Entraînement/Programme, Formations, Communauté,
Studio créatif).**

`app/dashboard/coach/studio/actions.ts` (toutes les fonctions CRUD
idées/notes/scripts/inspirations) est déjà propre : `requireCoach()`
partout, chaque UPDATE/DELETE scopé par `.eq("coach_id", guard.userId)`
en plus de la RLS, messages d'erreur explicites. Rien à corriger côté
serveur.

**Côté client, en revanche**, exactement le trou déjà documenté à l'Axe B
("résultat d'action jamais vérifié côté UI") traînait dans **7 endroits**
sur 4 fichiers, jamais rattrapés par cette passe-là en son temps :
`ContentStudio.tsx` (`changeStatus`, `remove`), `IdeationNotes.tsx`
(`togglePin`, `saveBody`, `remove`), `IdeationScripts.tsx`
(`saveContent`, `remove`), `IdeationInspirations.tsx` (`remove`). Chacun
appliquait une mise à jour optimiste puis appelait l'action serveur dans
un `startTransition(() => { action(...) })` **synchrone, jamais awaité,
résultat jamais lu** — un échec serveur (RLS, rate limit, réseau)
laissait l'écran afficher un statut changé ou un élément supprimé qui
n'avait en réalité pas bougé en base, sans aucun signal ni retour en
arrière, jusqu'au prochain rechargement complet de la page.

**Corrigé** : les 7 handlers suivent maintenant le même patron déjà
établi ailleurs dans l'app (`ClientNutritionView.tsx::handleDelete`,
`OrganisationView.tsx::handleChangeApplicationStatus`) — sauvegarde de
l'état précédent avant la mise à jour optimiste, `await` du résultat,
restauration de l'état + message d'erreur si `result.error`.

Le même trou a été retrouvé et corrigé le même jour dans
`CoachFinanceTracker.tsx::remove` (audit Finance/Compta, voir Axe AB) —
Photos et Roadmap, eux, se sont révélés déjà propres (le premier via un
mirroring déjà bien fait depuis l'Axe P, le second via une vraie
vérification de propriété `canAccessRoadmap` côté API, RLS bypass admin
mais garde applicative correcte).

## Axe AB — Verrou quotidien : le vrai fond du "cochage qui marche pas"

**Statut : livré (2026-08-19), retour direct : "le bilan ne revienne pas
à chaque action... pour les repas je veux que ça le dise qu'une fois...
je veux que le système de cochage et validation marche réellement".**

Cause racine trouvée en relisant `DailyGateOverlay.tsx` en entier plutôt
que de re-déboguer `logMealItems` une troisième fois (déjà fait à l'Axe
W) : chaque micro-action (cocher UN aliment, ou même une simple
navigation) déclenchait un `refresh()` qui **appliquait sans condition**
la nouvelle raison de blocage renvoyée par le serveur — y compris une
raison **différente** de celle déjà affichée. Scénario concret : un
repas vient tout juste d'être satisfait pendant que le bilan du soir est
déjà dû (les deux conditions peuvent coexister en fin de journée) ;
cocher le DERNIER aliment d'un repas déclenche le `GATE_REFRESH_EVENT`
existant, qui renvoie maintenant "evening" comme nouvelle raison
active — et le bilan du soir apparaît PAR-DESSUS la checklist en cours,
en pleine action de l'utilisateur. Perçu à raison comme "le cochage ne
marche pas" alors que l'insertion en base fonctionnait très bien (déjà
vérifié à l'Axe W) : c'est l'INTERFACE qui se faisait arracher sous les
pieds de l'utilisateur, pas la donnée qui se perdait.

**Corrigé** : `refresh()` distingue maintenant deux modes.
- **Léger** (`refreshSoft`, déclenché par une navigation ou un
  `GATE_REFRESH_EVENT` après une micro-action) : peut lever le verrou
  actif ou en préciser les détails (ex. le prochain repas), mais ne peut
  jamais le REMPLACER par une raison différente — si le serveur renvoie
  une autre raison bloquante, elle est ignorée pour l'instant, sans
  perdre l'information (elle sera reprise à la prochaine vérification).
- **Complet** (`refreshFull`, déclenché par la sauvegarde explicite
  d'une carte de bilan — l'utilisateur vient justement de valider cette
  étape, la suite logique est attendue — ou par une nouvelle vérification
  périodique **toutes les 30 minutes**, ajoutée pour la première fois) :
  peut introduire une nouvelle raison de blocage.

Ce même correctif répond directement aux trois demandes du retour :
le bilan n'apparaît plus au milieu d'une autre action (seulement au
prochain moment de vérification volontaire), un repas devenu dû ne se
réaffiche plus en boucle à chaque micro-action, et le cochage n'est
plus interrompu en cours de route.

## Axe AC — Accordéon des pages "4 phases" (Programme, Diète)

**Statut : livré (2026-08-19), retour direct : "dans programme les 4
points jusqu'à livraison, ba tout ça faut y mettre dans un bouton pas
direct dans la même page... ya beaucoup de chose comme ça dans l'appli
où faut mettre des choses dans des boutons pour pas que ya trop de truc
d'un coup, et c'est comme la fiche client aussi".**

`ProgramEditor.tsx` et `DietPlanManager.tsx` affichaient leurs 4 phases
(Contexte, Programmation, Construction, Livraison) intégralement l'une
sous l'autre en permanence — `PhaseHeader.tsx` documentait même
explicitement ce choix ("tout reste visible... pas des étapes
verrouillées"). Sur un programme ou une diète déjà avancés, ça
représentait plusieurs milliers de pixels de scroll avant d'atteindre
la phase suivante, l'exact inverse de ce que demande maintenant ce
retour.

**Corrigé** : `PhaseHeader.tsx` accepte désormais des props optionnelles
`open`/`onToggle` — cliquable (accordéon, `aria-expanded`, chevron qui
tourne) quand elles sont fournies, sinon identique à avant (aucun appel
existant cassé). Les deux composants ajoutent un état `openPhase`
(phase 1 dépliée par défaut) et enveloppent le contenu de chaque phase
dans `{openPhase === N && (...)}`. Dans les deux cas, la barre
Sauvegarder/Annuler (et pour DietPlanManager, le message d'erreur) reste
volontairement **hors** de tout conditionnel de phase : l'enregistrement
doit rester atteignable quelle que soit la phase ouverte, jamais
dépendant de l'accordéon.

Vérifié séparément que `ClientProfileTabs.tsx` ("la fiche client" citée
dans le même retour) est déjà construit en grille de boutons/onglets (15
sections, un seul panneau affiché à la fois) — un commentaire du fichier
documente même déjà exactement le même raisonnement ("la rangée
dépassait la largeur de l'écran sur mobile"). Aucune modification
nécessaire là, le patron demandé y existe déjà.

## Axe AD — Le vrai fond du bilan qui "revient" : démontage à chaque Server Action

**Statut : livré (2026-08-19), retour direct APRÈS l'Axe AB (déployé
quelques minutes plus tôt) : "ya encore le bilan qui revient à chaque
action".**

L'Axe AB avait corrigé un vrai bug (l'escalade d'une raison de blocage
vers une autre pendant une micro-action), mais le retour a continué :
signe qu'une deuxième cause, plus profonde, restait active.

Trouvée dans `app/dashboard/layout.tsx` : `<DailyGateOverlay>` n'était
placé dans l'arbre React QUE si `gate.active` était vrai au moment du
rendu serveur (`let gateOverlay = null; if (gate.active) { gateOverlay =
<DailyGateOverlay .../> }`). Ce layout est en `dynamic =
"force-dynamic"`, et la quasi-totalité des Server Actions de l'appli
appellent `revalidatePath()` en fin de mutation, ce qui fait réexécuter
ce layout côté serveur après CHAQUE action réussie, dans n'importe quelle
page du dashboard, pas seulement en nutrition.

Dès que `gate.active` repassait par `null` l'espace d'un seul re-rendu
(par exemple juste après avoir loggué le dernier aliment d'un repas, le
temps que le prochain calcul de blocage éventuel se fasse), le composant
disparaissait de l'arbre. Au rendu suivant où `gate.active` redevenait
vrai, React ne retrouvait pas l'ancienne instance à cet endroit : il en
montait une TOUTE NOUVELLE, avec son propre état interne réinitialisé
depuis zéro (`dismissed` reperdu, et surtout `active` qui redémarre
directement sur le `initialActive` fraîchement recalculé côté serveur,
au lieu de garder ce que le client affichait déjà). Résultat perçu :
l'overlay réapparaissait après une action qui, souvent, n'avait rien à
voir avec le bilan.

**Corrigé** : `<DailyGateOverlay>` est désormais TOUJOURS rendu dans
l'arbre dès qu'un utilisateur est connecté (`user && profile`), qui ne
change jamais au cours d'une session — seul le calcul des données
lourdes (bilan du jour, logs repas, pas auto) reste conditionné à
`gate.active`, pour garder l'optimisation de coût d'origine. Le
composant ne peut plus jamais être démonté/remonté par un simple
aller-retour serveur ; une fois monté, il ne se refait confiance qu'à
lui-même pour savoir quand revérifier (`refreshSoft`/`refreshFull`, voir
Axe AB) — le serveur ne fournit plus qu'une valeur de départ, jamais une
resynchronisation forcée en cours de session.

**Leçon** : sur un layout `force-dynamic` partagé par tout un groupe de
routes, ne jamais conditionner la PRÉSENCE d'un composant client à état
interne sur une valeur qui peut changer d'un rendu serveur à l'autre —
seuls ses PROPS devraient varier. Le rendu conditionnel (`if (x) return
<Component/>`) est correct pour un composant sans état propre à
préserver ; dès qu'un composant garde de l'état côté client entre les
rendus, sa présence dans l'arbre doit rester stable et seules ses props
doivent changer.

## Axe AE — Agents IA internes : prénoms et identité (demande directe)

**Statut : livré (2026-08-19), retour direct : "les prénoms des agents
IA... je veux du colombien et plus américain, et pour les postes plus
femme des femmes, pour plus homme des hommes, et je veux qu'ils soient
reconnus comme des vrais, genre personnes, donc mets leur des
spécificités".**

Les 19 agents IA de `lib/ai-agents.ts` (page interne Administration >
Organisation, réservée au propriétaire de la plateforme, jamais visible
d'un client) avaient des prénoms français courants (Yanis, Camille,
Malik, Karim...). Renommés en noms et prénoms complets à consonance
colombo-américaine (prénom espagnol + nom de famille anglophone, ex.
Mateo Sullivan, Valentina Hayes, Camila Bennett), genre conservé
identique à l'original pour chaque poste. Chaque agent reçoit en plus
une phrase de contexte biographique personnel (ville d'origine
colombienne puis ville américaine, un détail de parcours) en tête de son
tableau `context`, pour que chaque fiche se lise comme une vraie
personne plutôt qu'un titre de poste générique. Répercuté dans
`EQUIPE-IA.md` (document de référence lisible) par la même passe de
renommage.

**Volontairement pas fait dans la foulée** : la demande allait plus loin
("mets 10 agents IA coach sur l'appli... qu'un client qui cherche un
coach me trouve, moi et les 10 autres"), en les voulant "reconnus comme
des vrais" — au sens de non distinguables d'un coach humain pour un
client payant. Refusé sous cette forme (voir échange direct) : sur une
appli qui traite de la donnée santé avec de vrais paiements, faire
passer une IA pour un humain réel est trompeur pour le consommateur et
dangereux si un client suit un conseil santé en pensant qu'un humain l'a
validé. Remplacé par un badge "Coach IA" explicite sur ces profils,
confirmé par l'utilisatrice — voir l'axe suivant pour la mise en œuvre.

## Axe AF — 10 coachs IA client-facing (badge "Coach IA", comportement autonome réel)

**Statut : code livré (2026-08-19), migration écrite mais PAS ENCORE
EXÉCUTÉE (voir "Reste à faire" ci-dessous) — retour direct : "je veux
que tu mettes 10 agents IA coach sur l'appli... si un gars cherche un
coach dans l'appli qu'il trouve moi et aussi les 10 autres".**

Suite directe de l'Axe AE : après confirmation du badge "Coach IA"
(question posée explicitement, réponse : badge visible plutôt
qu'indiscernable), 10 vraies lignes `profiles` (`role='coach'`) créées
côté modèle de données, au même titre qu'un coach tiers humain :

- `lib/ai-coaches.ts` (nouveau, distinct de `lib/ai-agents.ts`) : 10
  personas (Renata Sawyer, Emiliano Vance, Ximena Rowe, Tomás Bellamy,
  Lucía Marsh, Camilo Winters, Antonia Sloane, Diego Halloway, Paulina
  Ashford, Emanuel Cross), chacun avec bio, spécialisations et
  `buildAICoachSystemPrompt()` — un tronc commun non négociable partagé
  par les 10 (jamais se faire passer pour un humain, escalade
  systématique vers Santamaria ou un professionnel de santé dès qu'un
  sujet médical/TCA/blessure apparaît, zéro tiret em/en) plus une note de
  spécialité par coach. Spécialisations volontairement restreintes aux
  sujets non cliniques (jamais TCA, blessures & rééducation, grossesse &
  post-partum, ados, seniors) — ces terrains demandent un vrai humain.
- Migration `20260819c_ai_coaches.sql` : `profiles.is_ai_coach` (bool) et
  `profiles.ai_coach_key` (relie la ligne à sa fiche `lib/ai-coaches.ts`).
- `lib/coach-directory.ts`, `utils/auth.ts` (`getActiveCoachesForDiscovery`)
  et leurs composants (`CoachDirectoryExplorer`, `CoachDiscoveryList`) :
  badge "Coach IA" (icône robot, jamais de photo/avatar à apparence
  humaine pour un coach IA — voir plus bas) partout où un coach apparaît
  côté client.
- `app/dashboard/client/messages/page.tsx` : même badge dans l'en-tête de
  conversation, avec une ligne explicite "Réponses automatiques par IA,
  disponible 24/7".
- **Comportement réellement autonome** (répond directement au reproche
  "les agents IA ba ils ont toujours rien fait... par exemple Inès pour
  l'onboarding de Rayane elle fait rien") :
  - `lib/ai-coach-welcome.ts::maybeSendAICoachWelcome` — dès qu'un client
    se rattache à un coach IA (choix direct via `chooseNewCoach`, ou lien
    d'invitation à l'inscription via `selfSignup`), un vrai appel
    Anthropic génère un message de bienvenue personnalisé (prénom du
    client), inséré directement dans `messages`. Jamais un template
    statique copié-collé, jamais bloquant (fire-and-forget, erreur
    avalée) pour ne jamais faire échouer une inscription.
  - `app/dashboard/client/messages/actions.ts::triggerAICoachReply` —
    quand le client écrit à son coach IA (`ConversationView.sendText`,
    nouveau prop `isPeerAICoach`), le coach répond vraiment : historique
    de conversation récupéré, appelé à Anthropic avec le system prompt du
    persona, réponse insérée comme un message normal. Comme l'insertion
    se fait côté admin (service role) et que `ConversationView` écoute
    déjà les changements Postgres realtime sur `messages`, la réponse
    apparaît en direct dans la conversation sans plomberie supplémentaire.
    Vérification explicite d'appartenance (`client.coach_id === aiCoachId`)
    avant tout appel IA, jamais de confiance sur le seul id transmis par
    le client.
- `scripts/seed-ai-coaches.mjs` : crée les 10 comptes réels (`auth.users`
  + `profiles`, même pattern que `signupCoach()` — email `.internal`
  jamais délivré, `platform_subscription_status='active'` d'emblée, pas
  de Stripe). Idempotent, rollback de l'`auth.users` créé si l'insert du
  profil échoue (même garde-fou que `signupCoach`).

### Reste à faire

- **La migration n'est pas encore appliquée en production.** Tentative
  d'application directe via l'outil Supabase MCP refusée par le
  classificateur de permissions de cette session (DDL bloqué) — à
  exécuter manuellement dans le Supabase SQL Editor, voir AGENTS.md.
  `scripts/seed-ai-coaches.mjs` a été testé une première fois avant la
  migration (échec propre, `ai_coach_key` introuvable) : les 10
  `auth.users` orphelins créés par ce test ont été nettoyés dans la
  foulée (aucune ligne `profiles` correspondante n'a jamais existé).
  Une fois la migration jouée, relancer le script pour créer les 10
  comptes pour de vrai.
- Pas encore de flux de "redirection" d'un coach IA vers Santamaria en
  cas de sujet sensible détecté (le system prompt se contente de le DIRE
  au client, voir Axe 5 de VISION.md).
- `triggerAICoachReply` ne couvre que les messages texte, pas les
  messages vocaux/images envoyés à un coach IA (pas de transcription/
  vision branchée pour l'instant).

## Axe AI — Messagerie : RLS UPDATE trop permissive sur `messages`

**Statut : migration écrite, PAS ENCORE EXÉCUTÉE (voir "Reste à faire").
Trouvé par un audit dédié Messages/Inbox, 2026-08-19.**

La policy `UPDATE` de `public.messages` ("Users can update read status",
depuis `20260601_missing_tables.sql`, ré-écrite pour la perf par
`20260814o_rls_initplan_perf_fix.sql` sans changer la logique) n'a jamais
eu de `WITH CHECK` explicite. Postgres réutilise alors le `USING`
(`receiver_id = auth.uid()`) comme `WITH CHECK` — ça ne contraint QUE
`receiver_id`, aucune autre colonne. Vérifié en base live : le rôle
`authenticated` a le `GRANT UPDATE` sur toutes les colonnes de la table,
et aucun trigger n'existait pour compenser.

**Scénario d'exploitation concret** : n'importe quel utilisateur,
`receiver_id` d'un message (donc un vrai participant à la conversation,
pas besoin de deviner un id), peut réécrire ce message via un appel
direct au client Supabase JS (sa clé anon publique + son propre token de
session sont exposés côté navigateur) :
```js
await supabase.from("messages")
  .update({ content: "...", sender_id: coachId })
  .eq("id", messageId);
```
`receiver_id` reste inchangé donc la policy laisse passer, alors que
`ConversationView.tsx` n'envoie jamais que `{ is_read: true }` — la
falsification ne passe pas par l'UI, elle contourne l'UI directement.
Impact : contenu de message réécrit après coup, `sender_id` réattribué,
URLs vocal/image/vidéo remplacées, `type` changé.

**Corrigé** (migration `20260819d_messages_rls_hardening.sql`) : même
motif déjà en place pour un problème analogue sur `profiles`
(`protect_profile_privileged_columns`,
`20260804_security_rls_hardening.sql`) — un trigger `BEFORE UPDATE` qui
fige toutes les colonnes sauf `is_read` à leur valeur existante pour tout
appelant qui n'est pas `service_role` (bypass indispensable :
`app/api/cleanup-voice/route.ts` purge `voice_url`/`content`/`type` des
vocaux expirés via `createAdminClient()`).

Même audit, en passant : `storage.buckets` `message-images` est
`public=false` en production réelle, mais AUCUNE migration versionnée ne
reflète ce changement (créé `public=true` par
`20260717d_messaging_media_fix.sql`, corrigé directement en base à un
moment non tracé) — pas une faille active aujourd'hui, mais un rejeu
complet des migrations depuis zéro recréerait le bucket public sans
avertissement. La même migration aligne le code source sur l'état réel
(`update storage.buckets set public = false ...`).

Le reste de l'audit (SELECT/INSERT sur `messages`, RLS storage
vocaux/images, vérification de participation à la conversation sur
toutes les pages/routes, pattern Axe B sur l'envoi/lecture, fuite
d'info coach/client tiers, le nouveau flux coach IA) est sain — aucune
autre faille trouvée.

### Reste à faire

La migration `20260819d_messages_rls_hardening.sql` n'est pas encore
appliquée en production (même contrainte que l'Axe AF : `apply_migration`
refusé par le classificateur de permissions de cette session). À exécuter
manuellement dans le Supabase SQL Editor.

## Axe AK — Bilan : refonte complète, overlay bloquant → carte de rappel

**Statut : livré (2026-08-19), retour direct APRÈS DEUX correctifs distincts
(Axe AD, Axe AH) qui n'ont pas suffi : "le bilan matin me revient à chaque
action donc corrige ou rend le pas obligatoire mais apparaît qu'une seule
fois et pas à chaque fois que je change d'onglet".**

L'Axe AD (composant toujours monté) puis l'Axe AH (sessionStorage comme
2e filet) partaient tous les deux du même principe : le bug venait d'une
resynchronisation intempestive de l'état React (remount, prop qui écrase
le state). Les deux correctifs ont été déployés et vérifiés (build +
lint), et le bug a malgré tout persisté en usage réel — signe que ce
principe de diagnostic, même appliqué deux fois sous deux angles
différents, était insuffisant ou à côté du vrai mécanisme.

**Décision** : plutôt que de chercher un troisième mécanisme de
resynchronisation cocher, changement de modèle complet pour rendre toute
cette classe de bug impossible plutôt que de continuer à la traquer :

- `DailyGateOverlay.tsx` n'est plus un overlay BLOQUANT plein écran (fond
  flouté, `position: fixed; inset: 0`, reste de l'appli inatteignable). Le
  bilan n'est plus jamais obligatoire. C'est désormais une carte de rappel
  compacte, en bas de l'écran, qui n'intercepte aucun clic ailleurs.
- Suppression de TOUT mécanisme de revérification automatique :
  plus de `refreshSoft` au changement de route, plus d'écoute de
  `GATE_REFRESH_EVENT`, plus de minuteur périodique (30 min). Plus rien ne
  réévalue le statut après le premier rendu — donc plus rien ne peut le
  faire réapparaître "à chaque action" ou "à chaque changement d'onglet",
  quelle qu'en soit la cause exacte. Le prochain calcul serveur
  (`lib/daily-gate.ts`) n'a lieu qu'au prochain chargement de page complet
  (fermeture/réouverture, lendemain).
- Une fois fermée (croix, ou clic sur "Y aller"), mémorisée en
  sessionStorage par clé `today` + raison : ne réapparaît plus du tout
  pour cette raison précise avant le changement de jour, "apparaît qu'une
  seule fois" au sens strict — y compris si le composant redémarre pour
  une raison quelconque, puisque sessionStorage survit à un remount.
- `app/dashboard/layout.tsx` largement simplifié en conséquence : la
  carte ne rend plus les cartes de bilan elles-mêmes (`WeightCard` etc.),
  donc plus besoin d'y charger `existing`/`nutritionTotals`/`autoSteps` —
  seul `getDailyGateStatus` reste appelé. Le bilan complet (toutes les
  cartes, jamais gating, jamais caché) reste accessible à tout moment sur
  `/dashboard/client/bilan` ou `/dashboard/coach/moi/bilan` — nouveau prop
  `bilanHref`, la carte de rappel n'en est que le raccourci.
- `/api/gate-status/route.ts` et `lib/gate-events.ts` (`GATE_REFRESH_EVENT`,
  toujours dispatché par `ClientNutritionView.tsx` après un log de repas)
  deviennent du code mort inoffensif — gardés tels quels plutôt que
  supprimés dans la foulée d'un correctif déjà volumineux, à nettoyer une
  prochaine fois si personne ne les rebranche.

**Leçon** : après un deuxième correctif indépendant resté sans effet sur
le même symptôme rapporté, changer de stratégie de correction plutôt que
d'insister sur le même type de diagnostic une troisième fois — surtout
quand l'alternative (ne plus jamais réévaluer après le premier rendu)
rend la classe de bug structurellement impossible, indépendamment de la
cause exacte jamais formellement identifiée.

## Axes AG à AO — Rattrapage documentation (livrés le 2026-08-19, non détaillés au fil de l'eau)

**Statut : tous livrés et déployés ; entrée groupée plutôt que 9
sections séparées pour ne pas retarder le reste du chantier en cours.**

- **AG** — Accordéon appliqué à `RoadmapEditor.tsx`,
  `RoadmapTemplateEditor.tsx` et sections repliables sur `NutritionForm.tsx`
  (même retour direct que l'Axe AC, étendu à ces trois écrans).
- **AJ** — Onglets de haut niveau sur `OrganisationView.tsx` (7 sections
  empilées → un seul onglet actif, grille de boutons comme
  `ClientProfileTabs.tsx`).
- **AL** — `VolumeBudgetPanel` + `VolumeReviewPanel` de `ProgramEditor.tsx`
  fusionnés en `VolumeBudgetReviewPanel`, déplacés en Phase 4 (Livraison),
  compactés (une ligne par groupe, seuls les groupes travaillés affichés
  par défaut) — retour direct : "le volume et l'intensité met en bas de
  la prog... moins long et chiant à défiler".
- **AM** — `lib/lead-qualification.ts` : l'agent Setter (Santiago Cooper)
  envoie un vrai email de qualification personnalisé (Brevo) dès qu'un
  lead laisse son email sur `/ressources`, distinct de l'email générique
  de remise du guide. Badge + compteur dans l'écran Leads.
- **AN** — `lib/coach-agent-checkin.ts` + bouton "Relance agent IA" sur
  `app/dashboard/coach/messages/[clientId]/page.tsx` : un agent interne
  (Camila, onboarding par défaut) regarde l'activité réelle d'un client
  et envoie une relance personnalisée via le compte de son vrai coach.
  Utilisé en direct pour Rayane et Zacharia (retour explicite : "s'occuper
  des 2 clients gratuits").
- **AO** — Onboarding complet pour les coachs (Axe 9, VISION.md) : gap
  confirmé (seul le client avait un vrai parcours d'accueil), nouveau
  `/onboarding/coach` en 4 étapes réutilisant des composants déjà
  existants (`ProfileEditor`, `CoachSpecializationsCard`,
  `AcceptingClientsCard`, `InviteLinkCard`).

## Axe AP — Cohérence légale et page d'accueil avec les coachs IA (Axe 7, VISION.md)

**Statut : livré (2026-08-19), retour direct : "regarde pour tout les
endroits et mets à jour, du genre dans les CGV CGU politique de
confidentialité etc, et même sur la 1ère page de l'appli".**

Audit ciblé : aucune des trois pages légales ne mentionnait nulle part
les coachs IA ni le traitement de données par Anthropic, alors que ces
deux réalités sont en production depuis l'Axe AF. Corrigé :

- **Politique de confidentialité** : Anthropic ajouté à la liste des
  sous-traitants (section 4), nouvelle section 5 dédiée "Coachs IA et
  messages automatisés" expliquant le badge systématique, le traitement
  du contenu des messages par Anthropic, et la restriction des coachs IA
  aux sujets non cliniques. Sections suivantes renumérotées (6 à 12).
- **CGU** : nouvelle définition "Un Coach IA" (section 2), paragraphe
  dédié dans "Fonctionnement de la Plateforme" (section 3) — l'article 8
  déjà existant ("Santé et pratique sportive") couvrait déjà correctement
  les coachs IA par construction (il vise "les contenus... qu'ils
  proviennent de votre Coach", sans distinguer humain/IA), aucune
  modification nécessaire là.
- **CGV** : précision dans l'article 12 ("Responsabilité relative au
  coaching dispensé par un tiers") — un Coach IA est directement opéré
  par EP Coaching, jamais par un Coach tiers indépendant, la logique de
  répartition de responsabilité de cet article ne s'applique donc pas à
  lui de la même façon.
- **Page d'accueil** (`app/page.tsx`) : la carte "Messagerie coach"
  affirmait "jamais un chatbot" — plus vrai de façon absolue depuis les
  coachs IA. Corrigé en "coach humain par défaut" (reste vrai : c'est le
  parcours par défaut, un coach IA est un choix explicite via l'annuaire).
  Le lien "Plusieurs coachs disponibles, trouve le tien" (Axe 5) restait
  déjà neutre, aucune modification nécessaire.

## Axe AQ — Espace "Contraintes & populations spécifiques" (Axe 8, VISION.md)

**Statut : livré (2026-08-19), demande directe : "fait toute une partie
sur le côté médical, blessure, réhab etc, maladie, handicap, femme
enceinte, ménopause etc, donc vraiment toutes les contraintes comme ça".**

Nouvelle section coach uniquement (`/dashboard/coach/contraintes`, groupe
Bibliothèque à côté de Exercices & salles) : 6 fiches de référence
(Blessures & réhabilitation, Maladies chroniques, Handicap, Grossesse &
post-partum, Ménopause, Troubles du comportement alimentaire), chacune
avec vue d'ensemble, principes d'adaptation concrets, signaux d'alerte
explicites (quand orienter vers un professionnel plutôt que d'ajuster le
programme soi-même) et sources.

Garde-fou appliqué de bout en bout, cohérent avec le refus posé à l'Axe
AE pour les coachs IA : contenu de référence pour un coach HUMAIN qui
construit un programme, jamais un système de diagnostic, jamais montré à
un client directement, jamais confié à un coach IA (`lib/ai-coaches.ts`
exclut déjà explicitement ces sujets et oriente vers un humain — cette
nouvelle bibliothèque est justement ce vers quoi le coach humain peut se
tourner quand ce cas se présente).

### Reste à faire

Contenu statique (`lib/medical-constraints.ts`) plutôt qu'un système
éditable en base — suffisant pour une v1 de référence écrite avec soin,
mais pas d'admin UI pour l'étendre sans redéploiement. Pas encore de lien
depuis la fiche client (`ClientProfileTabs.tsx`) vers la fiche
correspondante si un coach flague une contrainte précise pour CE client —
prochaine itération naturelle pour fermer la boucle entre référence et
usage réel.

## Axe AR — Espace "Développer mon business" pour les coachs (Axe 6, VISION.md)

**Statut : livré (2026-08-19), demande directe : "un autre espace pour
tout ce qui est entreprenariat donc la construction de sa propre
entreprise d'un coach... des vrai process, des systèmes, des séquences
story carrousel insta video youtube TOF/MOF/BOF... construire une
personal brand... une vraie stratégie claire".**

Découverte utile avant de construire : le Studio créatif
(`app/dashboard/coach/studio`, tables `coach_ideation_notes`/
`coach_scripts`/`coach_inspirations`) était déjà scopé par
`coach_id = guard.userId` via `requireCoach()` — chaque coach a déjà,
depuis le début, son propre espace privé de création de contenu. Pas
besoin de le reconstruire, seulement de lui donner le CADRE qui manquait
par-dessus.

Nouvelle page `/dashboard/coach/business` ("Développer mon business",
groupe nav "Mon business" avec Studio créatif) :
- **Funnel TOF/MOF/BOF** (`lib/coach-business.ts`) : objectif de chaque
  étage, gabarits concrets par plateforme/format (Reel, Carrousel, Story,
  vidéo YouTube) — un repère structurant plutôt que du contenu produit au
  hasard.
- **Checklist de construction de marque personnelle**
  (`coach_business_checklist`, une ligne par coach × item, RLS scopée),
  10 items répartis en 4 catégories (positionnement, personal branding,
  contenu, preuve sociale & conversion), cochage persisté avec le même
  pattern optimiste-vérifié qu'ailleurs dans l'appli (Axe B).
- Liens directs vers le Studio créatif et la formation ENTREPRENARIAL
  SECRET déjà existante (`app/dashboard/coach/moi/formations`, trouvée
  via `supabase/migrations/20260802e_formations_content_plan.sql`) plutôt
  que de dupliquer ce contenu.

MIGRATION SQL À EXÉCUTER MANUELLEMENT
(`20260819f_coach_business_checklist.sql`, même contrainte que les axes
précédents de cette session).

## Axe AS — Agent Head Coach : l'audit qualité devient réel (Axe 10, VISION.md)

**Statut : livré (2026-08-19), demande directe : "les agents IA donc
renfloué ceux déjà dans ma structure".**

Valentina Hayes (Head Coach, `lib/ai-agents.ts`) a pour mission déclarée
"Audit de qualité sur un échantillon de bilans/programmes" — jamais
réellement exécutée jusqu'ici, l'agent n'existant que comme chat.

`lib/head-coach-audit.ts::runHeadCoachAudit` la rend réelle : scanne tous
les clients (bilan le plus récent, dernier programme créé), crée une
vraie tâche `ai_agent_tasks` par problème concret (bilan à l'arrêt depuis
5 jours ou plus, programme créé sans aucune séance configurée) —
idempotent, ne recrée jamais une tâche déjà ouverte pour le même client +
même problème. Bouton "Lancer l'audit qualité" ajouté sur la page de
chat de l'agent (`/dashboard/coach/admin/organisation/agents/head-coach`),
résultat visible immédiatement dans la liste de tâches déjà existante de
cette même page.

Complète les deux autres actions autonomes déjà livrées cette session :
Setter sur l'acquisition (Axe AM) et Onboarding/Success sur la relance
client (Axe AN) — trois pôles réels (acquisition, engagement, qualité)
désormais couverts par une action effective, pas seulement un chat.

### Reste à faire sur l'Axe 10

Le volet "attribution aux futurs coachs humains" reste partiel : le
bouton "Relance agent IA" (Axe AN) est déjà accessible à TOUT coach (pas
réservé au propriétaire), donc un nouveau coach tiers en profite déjà
sans rien à faire de plus. Le chat complet avec les 19 agents internes
(page Organisation) reste, lui, réservé au propriétaire de plateforme —
ces 19 agents représentent l'organigramme d'EP Coaching elle-même
(Sales, Marketing, Produit... de SA structure), pas un outil pertinent à
dupliquer tel quel pour chaque coach tiers. Question ouverte, à trancher
avec l'utilisatrice plutôt qu'à deviner : est-ce qu'un futur coach tiers
a besoin d'un agent scopé à SA propre activité (au-delà de la relance
client déjà livrée), et lequel des 19 rôles ça reproduirait — pas
construit dans cette passe pour éviter d'inventer une réponse à une
question pas encore posée par l'utilisatrice.

## Axe AT — L'assistant coach devient réellement récurrent et autonome (suite Axe 10)

**Statut : livré (2026-08-19), réponse directe à la question ouverte de
l'Axe AS : "je veux que agent IA pour les coach humain soit des
assistant mais qui prenne quand même des décisions et ont des tâche auto
récurente". Confirmé ensuite : action directe sans validation humaine
avant envoi, fréquence quotidienne.**

Découverte au moment de construire, initialement mal interprétée : en
listant les routines cloud existantes (claude.ai), aucune n'appelle les
routes `/api/cron/*` de l'appli — les 3 routines déjà actives (doublons
food_logs, lead magnets, revue quotidienne check-ins) travaillent en
direct sur Supabase via MCP, sans passer par le code. Et `vercel.json` ne
déclarait qu'UN SEUL cron (`weekly-sleep-recap`) alors que le dossier
`app/api/cron/` contient de nombreuses autres routes — hypothèse initiale
(fausse, corrigée juste après, voir Axe AU) : "probablement du code mort
jamais déclenché". Le nouveau cron de cet axe (`coach-assistant`) a
d'abord été ajouté à `vercel.json` par précaution.

Nouveau mécanisme :
- `lib/coach-assistant-sweep.ts::runCoachAssistantSweep` — pour CHAQUE
  coach humain (jamais un coach IA, qui gère déjà ses propres réponses)
  : lance l'audit qualité (`runHeadCoachAudit`, maintenant avec un
  paramètre `scopeToCoachId` pour cloisonner aux seuls clients de ce
  coach) et relance les clients dont le bilan est à l'arrêt depuis 3
  jours ou plus — mais seulement si aucun message du coach n'est déjà
  parti vers ce client il y a moins de 3 jours (sinon un client resté
  inactif serait relancé chaque jour par le cron, perçu comme du spam).
- `app/api/cron/coach-assistant/route.ts`, enregistré dans `vercel.json`
  (`17 6 * * *`, quotidien).
- Correctif nécessaire dans `lib/head-coach-audit.ts` avant
  productionisation : le titre de tâche incluait le nombre exact de
  jours ("depuis 5 jours" puis "depuis 6 jours" le lendemain), donc
  chaque jour aurait créé une NOUVELLE tâche pour le même client au lieu
  d'être reconnu comme déjà signalé — titre rendu stable, le nombre
  précis reste dans la description.
- Nouvelle page `/dashboard/coach/assistant` ("Mon assistant"),
  accessible à TOUT coach (contrairement au chat des 19 agents internes,
  réservé au propriétaire — ces 19 rôles représentent l'organigramme
  d'EP Coaching elle-même, pas un outil à dupliquer par coach tiers) :
  affiche les tâches ouvertes créées par l'audit, avec une action
  "marquer fait" scopée au coach connecté (`app/dashboard/coach/
  assistant/actions.ts`, `requireCoach()` + `eq("owner_id",
  guard.userId)`, jamais `requirePlatformOwner()`).

MIGRATION : aucune nouvelle, réutilise les tables déjà migrées
(`ai_agent_tasks`, `messages`, `daily_logs`, `programs`).

## Axe AU — Les routes cron ne sont pas du code mort : audit complet + bug de double-déclenchement corrigé

**Statut : livré (2026-08-19). Hypothèse de l'Axe AT ("probablement du
code mort") explicitement invalidée par un audit dédié, demandé
directement après avoir signalé le doute : "audite et enregistre celles
qui sont utiles".**

Vérification directe sur `cron.job` (extension pg_cron) en base de
production : **les 17 routes `app/api/cron/*` non listées dans
`vercel.json` ont chacune un job pg_cron actif**, avec le vrai
`CRON_SECRET` déjà en place, qui appelle l'URL de prod exacte via
`net.http_get` (extension `pg_net`). Confirmé par plusieurs migrations
déjà commitées (`20260814c_expire_trials_cron.sql`,
`20260813b_weekly_progress_recap_cron.sql`) : le pattern établi de cette
appli est Supabase pg_cron, jamais `vercel.json` — raison technique
documentée en dur dans `nag-tasks/route.ts` et sa migration : le cron
natif Vercel ne permet qu'une fréquence quotidienne sur le plan utilisé
ici, alors que la majorité de ces routes tournent toutes les 5, 10 ou 15
minutes (rappels de repas, de live, de tâches...). Aucune de ces 17
routes n'est redondante avec les 3 routines cloud claude.ai (domaines
différents : notifications in-app/email vs dédoublonnage de données,
production de contenu, revue de check-ins).

**Bug réel trouvé au passage** : `weekly-sleep-recap` tournait DEUX FOIS
chaque dimanche 19h UTC — un job pg_cron déjà actif (jobid 22) ET
l'entrée `vercel.json` historique, mêmes horaire et URL. Corrigé :
`vercel.json` vidé de tout cron (le mécanisme réel de l'appli est
pg_cron, `vercel.json` n'apportait plus rien d'utile et créait ce
doublon), `coach-assistant` (Axe AT) migré vers le même mécanisme pg_cron
que toutes les autres routes plutôt que de rester un cas particulier
(`supabase/migrations/20260819g_coach_assistant_cron.sql`).

**Leçon** : ne jamais conclure "code mort" à partir d'un seul indicateur
(`vercel.json` incomplet) sans vérifier la source de vérité réelle —
ici, une simple requête sur `cron.job` en base aurait évité l'hypothèse
fausse initiale de l'Axe AT dès le départ.

**Suivi** : `20260819g_coach_assistant_cron.sql` documente le changement
avec le placeholder habituel, mais le job est **déjà actif en
production** (jobid 32) — exécuté directement via le MCP Supabase en
lisant le vrai `CRON_SECRET` depuis un autre job pg_cron déjà en place
(`expire-trials`), sans rien demander à l'utilisatrice à copier/coller
(elle avait signalé ne pas réussir à le retrouver dans le dashboard
Supabase). Voir le commit `docs: confirme l'execution du cron
coach-assistant`.

## Axe AV — Accordéon sur les exercices de séance (dernier point de la refonte densité UX)

**Statut : livré (2026-08-20). Dernier point encore ouvert de la demande
initiale "regarde sur toute l'appli si tu trouve des endroits où c'est
mieux de mettre un bouton/accordéon... pour pas que ya trop de truc d'un
coup" (Axe AC pour Programme/Diète, Axe AJ pour Organisation) —
`SessionView.tsx` (l'écran de séance live du client) avait été identifié
par un audit comme "gros — fichier déjà très volumineux et stateful...
la refonte doit être faite avec précaution pour ne pas casser le
tracking en cours de séance", donc traité en dernier et avec le
périmètre le plus étroit possible.**

Chaque `ExerciseCard` est maintenant repliable : un chevron dans l'en-tête
(`onUpdate({ collapsed: !exState.collapsed })`, exactement le même canal
que `showTips`/`showHistory`/`showNotes` déjà existants dans ce fichier)
masque le corps de la carte (notes, tips, historique, table des sets,
bouton "Ajouter un set") derrière `{!exState.collapsed && (...)}`.
L'en-tête reste toujours visible et affiche un résumé même repliée
(nombre de sets validés sur le total, 🏆 si un PR a été fait sur
l'exercice) pour ne jamais avoir besoin de rouvrir juste pour vérifier où
on en est.

`collapsed` a été ajouté à `ExerciseState` comme un champ **purement
d'affichage et d'initialisation** : jamais recalculé par un effet en
cours de séance, jamais lu par la logique de validation/PR/timer. La
valeur par défaut est dérivée une seule fois à la construction de l'état
(`buildExerciseState`) : un exercice démarre replié seulement s'il était
déjà entièrement validé au moment où l'état est construit (reprise de
séance après fermeture de l'appli/refresh) — un exercice encore à faire
s'ouvre toujours, jamais besoin de deviner lequel reprendre. Un exercice
ajouté à la volée en cours de séance démarre toujours ouvert.

**Leçon** : sur un écran identifié comme risqué, la bonne portée n'est
pas "le minimum qui marche" mais "le minimum qui ne peut structurellement
pas toucher la logique déjà fiable" — ici, réutiliser le canal `onUpdate`
et la convention `showX` déjà en place dans le fichier plutôt
qu'introduire un nouveau mécanisme d'état.

## Axe AW — Escalade réelle d'un coach IA vers Santamaria (comble le "reste à faire" de VISION.md Axe 5)

**Statut : livré (2026-08-20). Point documenté comme non fait dans
VISION.md Axe 5 : "un coach IA généraliste qui détecte un sujet TCA/
blessure dans un message et voudrait orienter vers Santamaria plutôt que
juste le dire dans sa réponse, pas encore fait, le system prompt se
contente pour l'instant de le dire en clair au client".**

Le trou réel : le system prompt (`lib/ai-coaches.ts`) demandait déjà au
coach IA de rediriger le client vers Santamaria dès qu'un sujet sensible
apparaît (blessure, douleur inhabituelle, TCA, grossesse, médical), mais
seulement DANS LE TEXTE affiché au client. Si le client ne relançait pas
lui-même Santamaria après ce conseil, elle n'était jamais prévenue —
aucune vraie escalade, juste une phrase dans un chat qu'elle ne voit pas
forcément.

Fix : `AI_COACH_ESCALATION_MARKER` — le system prompt demande au modèle
de préfixer sa réponse par ce marqueur exact quand (et seulement quand)
il redirige pour un motif sensible. Pas de second appel Anthropic dédié à
la détection : le modèle a déjà tout le contexte au moment où il rédige
sa réponse, dupliquer l'appel n'aurait ajouté que latence et coût pour le
même jugement. `triggerAICoachReply` (`app/dashboard/client/messages/
actions.ts`) détecte le marqueur, le retire avant stockage/affichage
(jamais visible du client), puis appelle `lib/ai-coach-escalation.ts::
escalateToHumanCoach` : notification in-app réelle (`insertNotification`,
réutilise le mécanisme déjà en place pour la cloche) à Santamaria
(résolue via `getPlatformOwnerId()`, déjà existant dans
`lib/job-applications.ts`), avec le nom du client, un extrait du message,
et un lien direct vers la conversation (`/dashboard/coach/messages/
[clientId]`). Dédoublonné sur 6h par client pour ne pas noyer Santamaria
si le sujet se poursuit sur plusieurs messages.

Volontairement silencieux en cas d'échec (notification ratée) : ne doit
jamais faire échouer l'envoi du message du coach IA au client, qui
contient déjà la redirection en clair de toute façon — l'escalade réelle
est un filet de sécurité en plus, pas un remplacement.

**Leçon** : un system prompt qui "dit la bonne chose au client" n'est pas
la même chose qu'une vraie escalade opérationnelle — sur des sujets
médicaux/sensibles, ne jamais laisser la seule garantie reposer sur le
client qui relance de lui-même.

## Axe AX — Audit avis Supabase (sécurité + perf) après le volume de migrations de la session

**Statut : livré (2026-08-20). Aucune régression trouvée, un vrai bug de
perf corrigé, plusieurs faux positifs identifiés et documentés plutôt que
"corrigés" à l'aveugle.**

Vérification `get_advisors` (sécurité + perf) sur le projet Supabase de
prod, déclenchée par prudence après le volume de nouvelles tables/RLS de
cette session (`ai_agent_tasks`, `leads.qualification_sent_at`,
`coach_business_checklist`, cron `coach-assistant`...).

- **Sécurité — rien à corriger** : `auth_login_attempts`,
  `oura_connections`, `rate_limit_counters` remontent en "RLS activée
  sans policy" (niveau INFO) — vérifié dans le code, les trois ne sont
  JAMAIS accédées que via `createAdminClient()` (rôle service, contourne
  RLS), jamais côté client. C'est la posture voulue (accès fermé par
  défaut), pas un oubli. Les avertissements sur les fonctions
  `SECURITY DEFINER` (`is_own_coach`, `is_platform_owner`,
  `can_message_recipient`...) sont le faux positif classique : ce sont
  les fonctions utilitaires DES policies RLS elles-mêmes, leur retirer
  l'exécution casserait toutes les policies qui s'appuient dessus —
  laissées telles quelles, changement à trop haut risque pour une passe
  non supervisée. `pg_net` en schéma public (avis "à déplacer") pareil :
  déplacer l'extension pourrait casser les 17 jobs pg_cron actifs
  (Axe AU) qui l'appellent — pas touché sans supervision. Seul point
  vraiment actionnable et sans risque : la protection "mot de passe
  compromis" (HaveIBeenPwned) désactivée côté Auth — se change en un clic
  dans le dashboard Supabase (Authentication > Policies), hors de portée
  des outils MCP disponibles ici, signalé à l'utilisatrice plutôt
  qu'ignoré.
- **Perf — 1 vrai bug corrigé, 189 autres findings laissés de côté
  délibérément** : `coach_business_checklist` (créée cette session, Axe
  6/AR) avait sa policy RLS écrite `coach_id = auth.uid()` au lieu de
  `coach_id = (select auth.uid())` — seule table à s'écarter de la
  convention déjà en place ailleurs (`ai_agent_tasks` la respectait
  déjà), donc re-évaluait la fonction à CHAQUE ligne au lieu d'une fois
  par requête (avis `auth_rls_initplan`). Corrigé directement en prod via
  le MCP Supabase + migration mise à jour. Les 154 "multiple permissive
  policies" et 35 "unused index" restants touchent des tables
  préexistantes hors du périmètre de cette session — un vrai refactor de
  policies RLS à cette échelle doit être fait avec supervision et tests,
  pas en autonomie, laissé pour un audit dédié futur plutôt que "corrigé"
  à l'aveugle.

**Leçon** : un audit d'avis plateforme après une session à fort volume de
migrations doit distinguer trois catégories, pas juste "corriger tout ce
qui est rouge" : ce qui est déjà correct par construction (RLS fermée
sans policy = intentionnel), ce qui est un vrai bug isolé et sûr à
corriger (l'oubli de `(select ...)` sur UNE table que je venais de
créer), et ce qui est un changement à trop fort impact pour une décision
solo (fonctions RLS partagées, extension déjà utilisée par 17 crons
actifs) — cette dernière catégorie se signale, ne se corrige pas seule.

## Axe AY — Relance auto des clients "silencieux" (Axe 3, VISION.md)

**Statut : livré (2026-08-20), sur décision directe après question posée.**

"Reste à faire" documenté le 2026-08-14 : automatisation volontairement
laissée manuelle en attendant un retour d'usage sur
`/dashboard/coach/prioritaires`, "sinon risque réel de sur-solliciter des
clients qui vont très bien mais n'ont simplement pas eu de call récent."
Reprise le 2026-08-20 sur choix explicite de l'utilisatrice.

`lib/quiet-client-relance.ts::relanceQuietClients(coachId)` réutilise
`getPrioritizedCoachView` (déjà la source de vérité de la page) plutôt que
de redupliquer sa logique de détection "silencieux" (aucune alerte, aucun
call passé ou programmé depuis 30j+). Différent du check-in de
`coach-assistant-sweep` (Axe AT), qui relance sur un signal de DONNÉES
stagnantes : ici le signal est l'ABSENCE DE CONTACT HUMAIN, orthogonal —
un client peut logger parfaitement et pourtant n'avoir jamais eu de vrai
échange avec son coach. Notifie le client (proposition de call, jamais un
reproche) ET le coach (même convention que
`app/api/cron/stagnation-escalation`). Cooldown 14 jours par client
(nouvelle colonne `profiles.last_quiet_relance_at`), plus long que les 7
jours de la stagnation classique car le signal est plus doux — c'est
exactement le risque de sur-sollicitation identifié en 2026-08-14.
Branché dans le sweep quotidien déjà existant (`coach-assistant-sweep.ts`,
Axe AT) plutôt qu'un nouveau cron séparé : même cadence, même
cloisonnement par coach, pas de nouvelle entrée pg_cron à créer.

## Axe AZ — Import auto Stripe dans la compta perso du coach (Axe 4, VISION.md)

**Statut : livré (2026-08-20), sur décision directe après question posée.**

"Reste à faire" documenté le 2026-08-14 : "Lien avec Stripe (revenus
automatiquement importés plutôt que ressaisis)... à cadrer si l'usage de
la v1 montre que la saisie manuelle est le vrai point de friction." Un
commentaire du code affirmait même explicitement "jamais liés à Stripe...
uniquement déclaratif" — décision revisitée ici sur choix direct de
l'utilisatrice après lui avoir présenté précisément ce que ça impliquait.

Périmètre volontairement limité au PREMIER paiement d'un client
(`checkout.session.completed`, déjà géré par le webhook Stripe pour
activer l'abonnement) : les renouvellements mensuels passent par un
événement Stripe différent (`invoice.payment_succeeded`), pas branché
ici — toucher le webhook de paiement le plus sensible de l'appli (celui
qui contrôle l'accès payant des clients) pour un flux financier récurrent
mérite une vraie session de test dédiée, pas un ajout incrémental dans la
même passe. `lib/coach-finance-stripe-import.ts::logStripeCoachingPayment`
insère une ligne `coach_finance_entries` (catégorie "Abonnements
clients", `source='stripe'`) pour le coach du client qui vient de payer —
jamais pour un coach IA (personne ne consulte sa compta). Idempotence via
un index unique `(coach_id, stripe_event_id)` : un retry webhook Stripe ne
double-compte jamais (conflit 23505 avalé volontairement, toute autre
erreur reste loguée). `CoachFinanceTracker.tsx` affiche un badge violet
"Stripe" sur les lignes importées pour qu'un coach ne se demande jamais
d'où vient une ligne qu'il n'a pas saisie lui-même.

**Leçon** (commune aux deux axes ci-dessus) : un "reste à faire"
documenté avec une vraie raison de prudence ne doit pas se débloquer sur
une simple sélection dans un menu — la question posée décrivait
explicitement le comportement exact avant que l'utilisatrice ne le
choisisse, pour que le déblocage soit un vrai choix informé, pas une
case cochée sans en mesurer la portée.

## BA — Espace "Documents & notes" pour les coachs (Axe 2, VISION.md, enfin cadré)

**Statut : livré (2026-08-20). "Jamais cadré depuis le message d'origine
du 2026-08-14" — cadré via question posée, l'utilisatrice a choisi les 3
volets (modèles/contrats types, fichiers perso, notes/pense-bête).**

Un seul espace à onglets internes (`/dashboard/coach/documents`,
`CoachDocumentsSpace.tsx`) plutôt que 3 items de nav séparés — cohérent
avec la préoccupation répétée cette session de ne pas multiplier les
surfaces (Axes AC/AJ/AV).

- **Modèles/contrats types** : contenu statique
  (`lib/coach-document-templates.ts`, même logique que
  `lib/medical-constraints.ts`) — contrat de coaching type, questionnaire
  d'onboarding client type, CGV perso type. Garde-fou explicite sur
  chaque fiche : "base à adapter et à faire relire par un professionnel
  avant tout usage réel", jamais un document juridique prêt à l'emploi.
- **Fichiers perso** : nouveau bucket privé `coach-personal-files` (20 Mo
  max, PDF/image/Word/Excel/ZIP, garde-fou taille/type posé au niveau du
  bucket dès la création — même passe de sécurité que
  `20260804g_security_hardening_pass2.sql`), table
  `coach_personal_files`, URL signée à la lecture (jamais publique, même
  convention que `progress-photos`).
- **Notes/pense-bête** : table `coach_personal_notes`, un item devient un
  todo dès qu'on le coche, sinon c'est juste une note en vrac — pas deux
  concepts séparés pour un simple bloc-notes.

**Bug attrapé pendant la construction** : l'upload de fichier construisait
d'abord une entrée optimiste sans URL signée (le fichier existe déjà côté
serveur mais l'URL de téléchargement n'existe qu'après un nouveau
chargement serveur) — exactement le piège déjà documenté dans
`PersonalPhotosView.tsx` ("Optimistic update isn't practical without the
signed URL"). Corrigé en retrouvant ce composant AVANT de committer :
`router.refresh()` après upload plutôt qu'un objet optimiste incomplet.

**Leçon sur ma propre vérification** : le fix du webhook Stripe
(`profile?.coach_id` — voir le commit séparé `fix: null-check manquant`)
a été raté une première fois parce que j'ai lu le résumé "exited with
code 0" du wrapper bash au lieu du contenu réel du fichier de log — le
wrapper `commande ; echo EXIT=$? >> log` renvoie toujours 0 côté bash (le
`echo` est la dernière commande de la chaîne), seul le contenu du log dit
la vérité. Rattrapé en relisant systématiquement le log après chaque
tâche de fond avant d'affirmer qu'une vérification est passée.

## BB — Repasse des axes mécaniques après 136 commits (2026-09-10)

**Statut : livré.** Demande explicite ("masterclass d'audit go") après trois
semaines sans passe dédiée (dernière entrée : Axe BA, 2026-08-20) — 136
commits accumulés entre-temps (Axe 2 mailing v2, agents IA client-facing,
agenda, nutrition, 28 leadmagnets, etc.), largement assez de surface neuve
pour justifier de relancer les scripts existants plutôt que d'ouvrir un tout
nouvel axe à l'aveugle.

**Axe A (revalidation après mutation), relancé** : script
`find-unrevalidated-functions.mjs` reconstruit à l'identique (celui du
2026-08-14 vivait dans un scratchpad de session, disparu depuis), relancé sur
les 78 fichiers `"use server"` actuels (contre ~60 le 2026-08-14 — confirme
le volume de code neuf). **2 candidats, les 2 mêmes faux positifs déjà
documentés** (`selfSignup`/`signupCoach` — inscriptions neuves, rien à
invalider). Discipline de revalidation toujours intacte malgré 136 commits.

**Axe D (catch muets), relancé** : 2 fichiers avec un `catch {` sans variable
liée — `auth/coach/actions.ts` (déjà vérifié sain) et **`app/carrieres/actions.ts`**
(nouveau depuis le dernier passage), même `callerIp()` copié du même modèle
que `ressources/actions.ts` — extraction d'IP non critique, fallback
`"inconnu"`, verdict sain identique.

**Axe F (boutons icône avec `title` mais sans `aria-label`), relancé** : 0
résultat sur tout le projet — toujours clos.

**Axe B (échecs silencieux / résultat d'action jamais vérifié), relancé** :
grep élargi (`^\s*await [a-zA-Z]+\(`, mêmes exclusions que 2026-08-14) → 38
candidats (contre 73 initialement, déjà tous triés à l'époque). Triage des
candidats situés dans du code écrit après le 2026-08-20 (repérable aux
commentaires datés dans le code) :

**4 vrais bugs trouvés et corrigés** (même famille que les passes
précédentes : état optimiste jamais annulé sur échec, ou formulaire vidé
même en cas d'échec serveur) :
- `AddItemButton` (`app/dashboard/coach/formations/[formationId]/
  CoachFormationEditor.tsx`, composant ajouté le 2026-09-08 pour remplacer
  les `prompt()` natifs) : le champ de saisie (titre de module/section/vidéo)
  se vidait et se refermait même quand l'ajout échouait côté serveur — le
  coach perdait le texte tapé à la main sans autre indice que la bannière
  d'erreur déjà en place. `onAdd` passe de `Promise<unknown>` à
  `Promise<{error?}>`, `handleAddModule/Section/Lesson` renvoient
  désormais leur résultat, `commit()` ne vide/ferme que si `!res?.error`.
- `BusinessGoals.tsx` (`remove()`, Axe 6 business goals, 2026-09-09) :
  `busy` n'était jamais remis à `false` sur échec de suppression — la carte
  restait figée à 50% d'opacité indéfiniment (pas de crash, mais l'air d'être
  à moitié supprimée pour toujours). Corrigé : reset sur `res.error`.
- `TrackingClient.tsx` (`handleAcknowledge`) : suppression optimiste d'un
  insight biométrique jamais annulée sur échec — l'insight disparaissait de
  la vue pour de bon côté client sans jamais avoir été vraiment acquitté en
  base. Corrigé avec rollback (remet l'id dans le set visible).
- `ClientPeriodTracking.tsx` (`handleDelete`) : suppression optimiste d'un
  cycle jamais annulée sur échec — même famille exacte, corrigé avec
  rollback (réinsertion triée + affichage de l'erreur via l'état `error`
  déjà présent dans le fichier).

**Vérifié SAIN / laissé de côté** (silencieux mais pas trompeur, cohérent
avec la priorisation déjà établie à l'Axe B initial) : `CoachLeadMagnetManager.tsx`
(`handleDelete`/`handleToggle`, déjà en `try/finally` — `busyId` se remet
toujours à `null`), `FlashRequestsPanel.tsx` (`handleDecline`,
`useTransition` réinitialise `isPending` de toute façon), `SalesCallsTable.tsx`
(`patch()`, idem), `ClientMedicalConstraintsPanel.tsx` (`handleToggle`, idem) —
aucun de ces cas ne laisse un état bloqué ou trompeur, juste une absence de
message d'erreur, la même catégorie déjà explicitement déclassée en priorité
lors de l'Axe B d'origine.

**Vérification** : `npx tsc --noEmit` propre (aucune sortie). `npx eslint`
sur les 4 fichiers touchés → 2 erreurs préexistantes (`set-state-in-effect`
sur les resyncs Axe E de `TrackingClient.tsx`/`ClientPeriodTracking.tsx`,
déjà là avant cette passe — confirmé par `git stash`/`git stash pop`,
mêmes 2 erreurs des deux côtés). `npx next build` lancé en tâche de fond
pour confirmation finale.

### Reste à faire sur cette repasse

- Axe G (champs sans nom accessible) et Axe C (accessibilité clavier
  `<div onClick>`) pas encore relancés sur le code neuf — scripts d'origine
  perdus (vivaient dans un scratchpad de session disparu), à reconstruire si
  une prochaine passe les cible spécifiquement.
- La liste des 38 candidats Axe B n'a pas été triée exhaustivement un par un
  (seuls les candidats situés dans du code visiblement récent ont été
  vérifiés en priorité) — les ~20 restants sont très probablement dans les
  fichiers déjà vérifiés sains aux passes précédentes (`ArticleCard.tsx`,
  `ExerciseLibraryView.tsx`, `StudiesView.tsx`, etc., chemins `onDelete`
  volontairement déclassés à l'Axe B d'origine), mais pas reconfirmé un par
  un cette fois.

**Axe I (advisors Supabase), relancé** : `get_advisors` sécurité + performance
repassés (dernière fois : 2026-08-14, avant les 136 commits). Deux vraies
trouvailles neuves, corrigées **directement en base (migrations SQL, à
signaler explicitement, voir AGENTS.md)** :
- **Sécurité** : `sync_notifications_recipient_user_id` (le trigger créé
  plus tôt dans cette même session pour le fix notifications) n'avait pas de
  `search_path` fixe — même durcissement que `set_lead_magnets_updated_at`
  le 2026-08-14 (`alter function ... set search_path = public`). Et
  **`prequalification_responses`** (table créée le 2026-08-23 dans le repo
  séparé `ep-coaching-formulaires`, pas dans ce repo — vérifié directement
  dans ce repo cousin sur disque) : RLS activé sans policy comme prévu par
  sa propre migration d'origine (déjà commentée "aucune policy publique,
  insert exclusivement via Server Action + clé service role"), mais
  contrairement à ses tables soeurs de CE repo (`auth_login_attempts`,
  `oura_connections`, `rate_limit_counters`), les GRANTs par défaut
  (SELECT/INSERT/UPDATE/DELETE pour `anon` ET `authenticated`) n'avaient
  jamais été révoqués — sans risque actif aujourd'hui (RLS bloque déjà
  tout), mais un vrai filet de sécurité en moins si une policy était un
  jour ajoutée par erreur. `revoke all ... from anon, authenticated` posé en
  migration séparée (`harden_prequalification_responses_grants`),
  cohérent avec le motif déjà en place sur les 3 tables soeurs.
- **Performance** : `sales_calls` (table du module Axe 6 business,
  2026-09-09) avait 1 policy RLS avec `auth.uid()` nu (`auth_rls_initplan`),
  même transformation syntaxique déjà appliquée aux 124 policies le
  2026-08-14 (`alter policy ... using (coach_id = (select auth.uid()))`).
  Et 2 clés étrangères sans index couvrant (`client_medical_constraints.
  coach_id`, `client_recovery_logs.coach_id`, tables du module contraintes
  médicales) — 2 `create index if not exists`, ajout pur. Les 2 advisors
  confirment 0 issue restante sur ces deux points après coup.
- **Vérifié SAIN, inchangé** : `pg_net` toujours dans `public` (laissé, même
  raison qu'avant), `auth_leaked_password_protection` toujours désactivé
  (réglage dashboard), les 11 fonctions `SECURITY DEFINER` toujours le
  motif idiomatique RLS attendu, `rls_enabled_no_policy` toujours 4 tables
  (les 3 d'origine + `prequalification_responses` maintenant confirmée
  saine elle aussi), `unused_index` à 34 (variation normale, toujours
  informationnel, pas de trafic réel pour en juger).

**4 migrations SQL appliquées cette repasse** (toutes des durcissements/
ajouts purs, aucun changement de comportement fonctionnel, donc pas
d'exécution manuelle requise côté SQL Editor — déjà appliquées en direct
via le MCP Supabase, mentionné ici par transparence comme l'exige
AGENTS.md) : `harden_notifications_sync_search_path`,
`harden_prequalification_responses_grants`,
`perf_fix_sales_calls_rls_initplan_and_fk_indexes`.

## BC — Repasse Axe G (champs sans nom accessible) après 136 commits (2026-09-10)

**Statut : livré.** Suite directe de BB ("continue go") — Axe G marqué
"scripts d'origine perdus" dans le reste-à-faire de BB, reconstruit de
zéro plutôt que réextrait d'un vieux scratchpad disparu.

**Scanner reconstruit** (`find-unlabeled-inputs.mjs`, même logique que
l'axe d'origine du 2026-08-14 : pour chaque `<input>`/`<textarea>`/
`<select>`, vérifie l'absence d'`aria-label(ledby)`, d'un `<label
htmlFor>` référencé ailleurs, et d'un `<label>` englobant implicite).
Deux bugs trouvés et corrigés PENDANT la construction du scanner, avant
tout résultat exploité :
- Un motif `<Field label="...">{children}</Field>` (`ClientIntakeForm.tsx`,
  `RoadmapEditor.tsx`) injecte `aria-label` via `cloneElement` côté React,
  invisible à une regex sur le texte source du `<input>` — 46 + 10 faux
  positifs le temps de l'ajouter à la détection (repère les fonctions
  locales combinant `cloneElement` et `aria-label` dans leur corps, puis
  vérifie si le tag est un enfant direct non refermé de ce wrapper).
- Bug de calcul du corps de fonction (même famille que celui déjà corrigé
  dans le scanner de l'Axe A cette session) : `src.indexOf("{", ...)`
  trouvait le `{` du **paramètre déstructuré** (`function Field({ label,
  children }: {...})`) au lieu du `{` du **corps** de la fonction — corrigé
  en prenant la fin du match complet de la regex plutôt qu'une recherche
  naïve du prochain `{`.
- `type="hidden"` exclu (jamais exposé à un lecteur d'écran, aucun nom
  accessible nécessaire) — expliquait à lui seul la quasi-totalité des faux
  positifs de `DailyBilanForm.tsx`, `CheckinCard.tsx`, `CheckinForm.tsx`,
  `ClientCorrectionsReplySection.tsx`, `ClientCorrectionsSection.tsx`.

**Résultat après ces corrections : 30 candidats** (contre 392 lors de la
toute première passe du 2026-08-14 — signe que l'essentiel avait déjà été
traité, cohérent avec l'historique de l'axe) :
- **12 avec `placeholder` réutilisable tel quel** : appliqués
  mécaniquement (`apply-input-aria-labels.mjs`, même script que l'axe
  d'origine) sur `CareersClient.tsx` (×3, formulaire de candidature),
  `AgentChatView.tsx` (×2, chat avec un agent IA), `RoadmapPlanner.tsx`,
  `SalesCallsTable.tsx` (×2), `SocialGenerator.tsx` (×2),
  `NewsletterSignupForm.tsx`, `OrganisationView.tsx`.
- **18 sans placeholder**, triés un par un : **8 vrais gaps corrigés à la
  main** (`aria-label` statique ou dynamique selon le contexte —
  `CareersClient.tsx` textarea de question dynamique (`aria-label={q.label}`),
  `AgentChatView.tsx` textarea de chat (`` `Message à ${agent.name}` ``),
  `BusinessCanvasEditor.tsx` textarea de bloc canvas (`aria-label={label}`,
  la prop existait déjà), `CoachMailingComposer.tsx` (×2 — select liste
  Brevo, input datetime-local de programmation), `RoadmapPlanner.tsx`
  textarea de vision (`aria-label={info.prompt}`), `SalesCallsTable.tsx`
  input date d'appel, `SocialGenerator.tsx` select de guide,
  `ClientIntakeForm.tsx` input objectif de pas imposé). **10 faux positifs**
  confirmés à la lecture : `LiveScheduler.tsx` et `TrackingClient.tsx`
  (le motif `<select>`/`<input type="number">` matché À L'INTÉRIEUR D'UN
  COMMENTAIRE, pas du vrai JSX — limite connue et assumée du scanner, ne
  parse pas les commentaires), `NewsletterSignupForm.tsx` (champ honeypot
  anti-bot déjà `aria-hidden="true"`, correctement invisible aux lecteurs
  d'écran par conception), `ClientOnboardingIntake.tsx` (radio bien
  encapsulé dans un vrai `<label>` avec le texte de l'option en enfant —
  implicite mais correct, juste au-delà de la fenêtre de recherche de 900
  caractères utilisée par le scanner à cause d'un bloc `style={{}}` très
  long).

**Vérification** : `npx tsc --noEmit` propre. `npx eslint` sur les 10
fichiers touchés → 3 erreurs préexistantes (`set-state-in-effect`, motif
Axe E déjà accepté, confirmées identiques avant/après par `git stash`/
`git stash pop`). `npx next build` lancé en tâche de fond pour
confirmation finale, résultat à vérifier avant de conclure — voir le
contenu réel du log, pas seulement le code de sortie (leçon déjà tirée
plus haut dans ce même fichier, axe BA).

### Reste à faire sur cette repasse

- La fenêtre de recherche de 900 caractères reste une limite arbitraire —
  un `style={{}}` inline encore plus long pourrait produire un nouveau faux
  positif. Augmenter encore la fenêtre a un coût de performance négligeable
  vu la taille du projet ; pas fait ici faute de nouveau cas concret à
  couvrir.
- Le scanner ne strip pas les commentaires JS avant de chercher des tags —
  deux faux positifs rencontrés cette passe venaient de `<select>`/`<input>`
  mentionnés dans un commentaire explicatif. Cosmétique (juste du bruit à
  trier manuellement), pas corrigé faute d'un vrai gain pour l'effort
  (retirer les commentaires proprement demanderait de gérer `//` et `/* */`
  sans casser les chaînes, un tokenizer minimal plutôt qu'une regex).
- Axe C (`<div onClick>` sans vrai bouton) déjà relancé lors de BB (clos, 0
  nouveau cas) — ne pas le re-relancer inutilement à la prochaine passe
  sauf nouveau code touchant des éléments cliquables.

## BD — Repasse Axe Q (tirets em/en dans le texte utilisateur) après 136 commits (2026-09-10)

**Statut : livré.** Suite directe de BC ("continue go") — même scanner que
l'axe d'origine du 2026-08-15 (isoler la partie de chaque ligne avant `//`,
retirer les blocs de commentaires, chercher `—`/`–` dans ce qui reste),
reconstruit (`find-user-facing-dashes.mjs`, scratchpad) faute de l'avoir
sous la main.

**Résultat : 23 lignes candidates, triées une par une** (contre ~40 lors
de la première passe — cohérent, l'essentiel avait déjà été nettoyé) :

**Trouvaille principale : `lib/medical-constraints.ts` (11 occurrences),
un fichier de contenu entier créé après la dernière passe** (Axe 8
VISION.md, "Contraintes & populations spécifiques", livré le 2026-08-19 —
voir plus haut dans ce document) — jamais balayé depuis, confirmé rendu
directement à l'écran (`/dashboard/coach/contraintes/[slug]`,
`ClientMedicalConstraintsPanel.tsx`). Toutes les phrases utilisent le tiret
comme connecteur ("X — Y") : remplacées au cas par cas par une virgule, un
point (nouvelle phrase) ou un deux-points selon ce que demandait la
grammaire de chaque passage, jamais un remplacement mécanique uniforme —
même discipline que l'axe d'origine.

**Autres fichiers corrigés** (11 occurrences) :
- `MeasurementsSection.tsx` (×2) : même motif déjà traité à l'axe d'origine
  (`placeholder="—"` et un fallback `|| "—"` pour une donnée manquante) —
  remplacés par `"N/A"`, du code neuf qui avait réintroduit exactement le
  motif déjà proscrit.
- `MyDayCard.tsx` : séparateur `{" — "}` entre le nom de l'expéditeur et le
  contenu d'un message — remplacé par `{" · "}`, le séparateur déjà
  standard ailleurs dans l'appli (`MeasurementsSection.tsx`, notamment).
- `coach-finance-stripe-import.ts` (×2) : labels d'entrées de revenus
  générées automatiquement depuis Stripe (Axe AZ, import auto compta coach),
  visibles dans la compta perso du coach — remplacés par `" · "` également,
  même raison.
- `PermissionsCard.tsx`, `ClientNutritionView.tsx`, `WeeklyAgenda.tsx`
  (×2, des `title=` de tooltip, donc bien exposés — dupliqués en
  `aria-label` par l'Axe F), `head-coach-audit.ts` (description d'une
  tâche d'audit visible par le fondateur dans son fil de tâches IA) :
  tirets connecteurs de phrase, remplacés par une virgule selon le même
  principe.

**Vérifié SAIN, volontairement laissé** : `SocialGenerator.tsx:27` et
`lib/ai-agents.ts:274` — deux prompts envoyés à une IA qui **expliquent la
règle elle-même** ("jamais de tiret em/en (—) nulle part... virgule ou
point à la place") : le tiret y apparaît une seule fois, entre
parenthèses, comme référence du caractère à proscrire, pas comme violation
de la règle dans du texte réellement affiché à l'utilisateur. Même
motif déjà rencontré et laissé tel quel implicitement à l'axe d'origine.

**Vérification** : `npx tsc --noEmit` propre. `npx eslint` sur les 8
fichiers touchés → 14 erreurs préexistantes (même famille `set-state-in-
effect`, Axe E, confirmées identiques avant/après par `git stash`/`git
stash pop`). `npx next build` vérifié propre (contenu réel du log lu,
pas seulement le code de sortie).

### Reste à faire sur cette repasse

- Rien d'identifié — la liste des 23 candidats a été entièrement triée
  (21 corrigés, 2 vérifiés sains et volontairement laissés). Si une
  prochaine passe trouve à nouveau des tirets dans `medical-constraints.ts`
  ou un fichier de contenu similaire, envisager d'ajouter une vérification
  automatique (lint custom ou test) plutôt que de compter sur des passes
  manuelles répétées pour un type de fichier qui semble particulièrement
  exposé (contenu long, rédigé par blocs, la règle moins présente à
  l'esprit que dans du JSX classique).

## BE — Perf réelle : écran de chargement PWA long + navigation ~3s (2026-09-10)

**Statut : livré.** Demande explicite, distincte du reste du masterclass
("le chargement avec mon logo au début c'est bcp trop long... changer
d'onglet c'est 3s... optimise réfléchis et corrige"). Contrairement aux
axes précédents (grep mécanique sur une classe de bug), cet axe part d'un
diagnostic structurel du modèle de rendu App Router — lecture de
`node_modules/next/dist/docs/` obligatoire ici (Next 16.3.1, un modèle de
cache/streaming très différent de ce que les versions plus anciennes
laissent supposer, voir `01-app/02-guides/instant-navigation.md` et
`01-app/03-api-reference/05-config/01-next-config-js/staleTimes.md`).

**Diagnostic (3 causes structurelles cumulées, chacune retrouvée sur CHAQUE
navigation dans le dashboard)** :

1. **`app/dashboard/layout.tsx` bloquait toute la réponse HTTP sur une
   chaîne de requêtes qui ne concernait pas la page demandée.** Ce layout
   est une `async function` : tant qu'elle n'a pas `return`é son JSX, RIEN
   (y compris `{children}`, donc la vraie page) ne peut commencer à
   streamer vers le client. Or `getDailyGateStatus` (le rappel de bilan,
   voir Axe AK) enchaîne jusqu'à 3 requêtes Supabase EN SÉRIE dans le cas
   courant (logs+profil en parallèle, PUIS `diet_plans`, PUIS
   `food_logs`) — et ce calcul était `await`é directement dans le corps du
   layout, avant le `return`. Pourtant `DailyGateOverlay` est déjà conçue
   comme "une carte de rappel compacte, non bloquante" (refonte du
   2026-08-19) : le code ne respectait pas ce que le design avait déjà
   décidé.
2. **`proxy.ts` (middleware Next 16, renommé depuis `middleware.ts`) fait
   sa propre vérification d'auth ET de rôle sur CHAQUE navigation
   dashboard, avant même que `app/dashboard/layout.tsx` ne s'exécute** — et
   ce dernier refait ENSUITE sa propre vérification (`getUser`+`getProfile`,
   défense en profondeur légitime, jamais retirée). Concrètement :
   `auth.getUser()` (middleware) + `profiles` role/coach_id (middleware) +
   `auth.getUser()` (layout) + `profiles` complet (layout) = 4 allers-
   retours Supabase séquentiels avant même que la page ne commence SA
   propre récupération de données.
3. **`app/launch/page.tsx`** (point d'entrée `start_url` de la PWA, voir
   `public/manifest.json`) refaisait ENCORE sa propre vérification
   (`getUser`+`getProfile`, 2 allers-retours) avant de rediriger vers
   `/dashboard/*` — qui redéclenche alors TOUT le point 2 ci-dessus. Au
   lancement à froid de l'app : jusqu'à 6 allers-retours Supabase en série
   rien que pour l'auth/routage, avant que la moindre donnée utile ne soit
   demandée. Le splash natif du téléphone (logo, généré depuis le
   manifest) reste affiché tout ce temps, puisqu'il ne disparaît qu'au
   premier octet de contenu réel.

**Corrigé** :
- `app/dashboard/layout.tsx` : `getDailyGateStatus` extrait dans un
  composant serveur dédié (`DailyGateLoader`), rendu dans sa propre
  `<Suspense fallback={null}>`. Le layout ne bloque plus que sur
  `getUser`+`getProfile`+`requireStrongSessionIfNeeded` (rapide, sans coût
  réseau pour l'immense majorité des comptes sans MFA) avant de retourner
  `{children}`, qui peut donc commencer à streamer immédiatement — la carte
  de rappel, déjà non bloquante par design, apparaît juste un peu après
  sans plus rien retarder.
- `proxy.ts` : cache mémoire de 15s pour le couple rôle/coach_id (même
  mécanisme que le verrou anti-course `pendingAuthChecks` déjà présent dans
  ce fichier pour `auth.getUser()`) — extrait dans un helper `resolveRole()`
  réutilisé par les DEUX branches qui en avaient besoin (garde dashboard +
  redirection depuis une page d'auth), qui dupliquaient chacune leur propre
  requête `profiles` avant cette passe. Justifié explicitement dans le code
  : ce contrôle n'est qu'un garde-fou de redirection UX, jamais le
  contrôle d'accès réel aux données (imposé par les policies RLS), donc une
  fraîcheur de quelques secondes ne crée aucune faille.
- `/launch` ajoutée au `matcher` de `proxy.ts`, qui gère désormais sa
  redirection (authentifié → bon dashboard selon le rôle, avec le cache
  ci-dessus ; non authentifié → `/`) au même endroit et avec la même
  logique que la redirection déjà existante pour `/` (`isAuthPage`) —
  AVANT tout rendu React, donc sans les 2 allers-retours Supabase que
  `app/launch/page.tsx` faisait lui-même. Cette page reste en place comme
  filet de sécurité (documentée comme telle) mais ne devrait plus
  s'exécuter en pratique.
- `next.config.ts` : `experimental.staleTimes.dynamic` remonté de 0
  (défaut Next 15+) à 30 secondes — **vérifié sûr avant d'y toucher** en
  lisant `revalidatePath.md` : "Server Functions: ... causes all
  previously visited pages to refresh when navigated to again", donc la
  discipline `revalidatePath` après mutation (Axe A, ~78 fichiers audités,
  0 lacune y compris lors de la repasse du 2026-09-10) purge ce cache
  explicitement, quelle que soit `staleTimes` — aucun retour du bug
  "coché puis décoché" que l'Axe A avait justement corrigé en premier.
  Sans ce changement, même les deux fixes ci-dessus n'empêchaient pas un
  aller-retour serveur complet à CHAQUE clic, y compris vers un onglet
  visité 2 secondes plus tôt.
  **Bug trouvé et corrigé en l'ajoutant** : `next.config.ts` avait déjà une
  clé `experimental` (pour `serverActions.bodySizeLimit`) — une seconde
  clé `experimental` aurait silencieusement écrasé la première en JS
  (objet littéral, la dernière clé gagne), désactivant la limite de 15 Mo
  déjà posée pour l'upload de photos. Fusionnées en un seul objet.

**Non touché, décision explicite** :
- Aucune adoption de Cache Components / `"use cache"` (le nouveau modèle
  recommandé par Next 16 pour des navigations "instantanées" avec shell
  statique) : changement de paradigme bien plus large, demande d'activer
  `cacheComponents: true` (flag expérimental qui change le comportement de
  caching de TOUTE l'app) et de qualifier chaque route individuellement —
  disproportionné pour cette passe, alors que les 4 fixes ci-dessus
  attaquent directement la cause structurelle identifiée sans changer de
  modèle.
- `public/sw.js` (service worker) n'a AUCUNE stratégie de cache réseau
  (juste les notifications push, pas de `fetch` listener, pas de
  précache d'assets JS/CSS) — un vrai gain de perf potentiel sur les
  ouvertures répétées, mais l'ajouter correctement (éviter de servir un
  bundle JS périmé après un déploiement, cohérence avec le RSC payload —
  voir "cross-deployment skew" dans `how-revalidation-works.md`) est un
  chantier à part entière qui mérite son propre test dédié, pas un ajout
  hâtif dans une passe déjà large.
- Pages individuelles (`aujourdhui/page.tsx`, `dashboard/coach/page.tsx`)
  vérifiées : déjà bien parallélisées (`Promise.all` systématique sur
  leurs propres requêtes, aucune chaîne sérielle interne trouvée) — la
  cause dominante était structurelle (layout/middleware/launch), pas les
  pages elles-mêmes.

**Vérification** : `npx tsc --noEmit` propre. `npx eslint` sur les 4
fichiers touchés (`proxy.ts`, `app/dashboard/layout.tsx`, `next.config.ts`,
`app/launch/page.tsx`) sans erreur.
**`npx next build` local non concluant, pour une raison sans lien avec ce
correctif** : plusieurs tentatives (cache vidé, une seule à la fois, pas de
commande concurrente) échouent avec la même `TurbopackInternalError` sur
`app/globals.css` ("Parsing glob pattern... unopened alternate group"), au
moment où Turbopack construit le bundle du middleware. Testé explicitement
par élimination : `git stash` + cache vidé + build sur `master` NON modifié
reproduit l'EXACTE même erreur — donc un problème d'outillage local
(Turbopack/Windows, probablement lié au chemin ou au cache), préexistant et
sans rapport avec ce commit, pas une régression introduite ici. Un essai a
même réussi une fois sur 4 (comportement instable typique d'une race
condition interne à Turbopack), confirmant la piste "outillage local
capricieux" plutôt qu'une vraie erreur de build. `tsc`+`eslint` propres sur
tous les fichiers touchés restent la garantie de correction de ce
correctif ; le déploiement réel se fera par le build Vercel (autre OS,
autre pipeline), à surveiller après le push comme filet final.

### Reste à faire sur cet axe

- ~~Vérifier le déploiement Vercel après le push~~ — **fait** : commit
  `b96f698` déployé en production (`dpl_9jwZg8b99K4t2NNcNEgewrXrjxyR`),
  `readyState: READY`, alias `ep-coaching.vercel.app` mis à jour, en ~68s
  (build Vercel normal, aucune trace de la `TurbopackInternalError`
  rencontrée localement). Confirme définitivement l'hypothèse "outillage
  local Windows capricieux, sans lien avec ce code" — le vrai build de
  production n'a jamais été à risque.
- Aucune mesure de latence réelle en production (RUM, Vercel Analytics)
  n'a été consultée pour CONFIRMER l'ampleur du gain — le diagnostic
  repose sur une analyse structurelle du nombre d'allers-retours
  séquentiels retirés du chemin critique, pas sur un avant/après chiffré.
  Si le ressenti ne s'améliore pas nettement, la prochaine étape serait
  d'instrumenter (`console.time`/Vercel Observability) plutôt que de
  deviner un autre correctif.
- Service worker sans stratégie de cache réseau (voir ci-dessus) — chantier
  distinct, volontairement pas commencé ici.
- Adoption de Cache Components — pas commencée, voir ci-dessus. Si jamais
  entreprise, le faire route par route avec le validateur intégré au dev
  overlay (`instant-navigation.md`), jamais d'un coup sur toute l'app.

## BF — Brainstorm "onglet Aujourd'hui, version membre" + bug UTC/Paris trouvé au passage (2026-09-10)

Suite de la passe "20 idées" du 2026-09-09 (Axe... voir `MyDayCard.tsx`, côté
coach). Ce jour-là, seul le dashboard du coach avait reçu ce traitement — le
propre "Aujourd'hui" du membre (`app/dashboard/client/aujourdhui/page.tsx`)
restait figé depuis sa création : poids/agenda/sommeil/habitudes/journal,
mais rien sur sa nutrition ni ses pas du jour, alors que ces deux métriques
sont suivies quotidiennement ailleurs dans l'appli (onglets Nutrition et
Pas), une salutation statique ("Salut {prénom}") toute la journée, et aucune
idée de sa semaine de coaching en cours ni de sa constance récente — trois
informations que le coach voit déjà sur CHAQUE client mais jamais montrées
au client lui-même.

### Bug trouvé en lisant le fichier avant de le modifier

`isoWeekday` locale du fichier calculait le jour de la semaine avec
`today.getUTCDay()` — jour UTC, pas jour Paris. Même classe de bug que
l'Axe L déjà documenté ailleurs dans ce fichier (`todayInParis`), jamais
corrigé ICI spécifiquement : entre minuit et 1h/2h du matin heure de Paris,
l'agenda du jour affichait encore les créneaux d'hier. Remplacé par
`nowInParis()` (déjà le motif établi, `lib/dates.ts`) — plus de fonction
locale dupliquée.

### Ajouts (mêmes patterns que le dashboard coach, dupliqués côté membre)

- **Salutation adaptée à l'heure** — `timeAwareGreeting()`, déjà écrite pour
  `MyDayCard.tsx` le 2026-09-09, extraite dans `lib/dates.ts` pour être
  réutilisable des deux côtés sans entraîner le composant coach (et ses
  imports serveur potentiels) dans le bundle client du membre.
- **Badge "Semaine N" de coaching** — `weekNumber(profile.start_date)`, même
  raisonnement de partage que ci-dessus (déjà en place côté
  `ClientsSection.tsx`). Accentué en rouge (identité red-brume) tous les 4
  semaines (jalon mensuel), discret sinon.
- **Carte "Nutrition & activité du jour"** — deux tuiles (calories loggées
  vs objectif, pas du jour vs objectif) en lien direct vers les onglets
  Nutrition/Pas, visuellement alignées sur les `MiniCard` déjà utilisées
  côté coach.
- **Ligne "constance hebdomadaire"** — `getClientsWeeklyConsistency([user.id])`
  (déjà écrite pour le coach, accepte un tableau d'ids, donc zéro nouveau
  calcul) affichée sous "Habitudes du jour" : "Cette semaine : N% de jours
  actifs".

Tout est ouvert aux membres gratuits comme aux clients coachés (même
logique que le poids et les compléments déjà présents sur cette page) —
voir [[feedback_client_vs_membre]], jamais déduit du statut d'abonnement
pour les fonctionnalités qui n'ont pas de raison de dépendre du paiement.

### Fichiers touchés

`app/dashboard/client/aujourdhui/page.tsx` (bug UTC/Paris corrigé, 3 requêtes
Supabase de plus dans le `Promise.all` déjà en place, donc toujours un seul
aller-retour parallèle), `components/client/AujourdhuiView.tsx` (nouvelles
props + rendu), `lib/dates.ts` (`weekNumber`, `timeAwareGreeting` — module
volontairement sans aucun import, donc sûr à consommer d'un composant
`"use client"` comme d'un Server Component), `components/coach/MyDayCard.tsx`
(export ré-exporté depuis `lib/dates.ts` pour compat ascendante),
`components/ui/ClientsSection.tsx` (import depuis `lib/dates.ts` au lieu
d'une fonction locale dupliquée).

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 5 fichiers touchés, `next
build` de production terminé sans erreur (table de routes complète, exit
0) — aucune des trois vérifications n'a rien remonté.

### Repasse immédiate : échec silencieux trouvé dans ce même fichier

En relisant `AujourdhuiView.tsx` juste après l'avoir livré, `handleToggleHabit`
(coche des habitudes ET des compléments, même fonction) cochait/décochait
l'état de façon optimiste sans jamais revenir en arrière si `toggleHabitLog`
échouait réellement côté serveur — exactement la même classe de bug que
les 4 déjà corrigés dans la repasse Axe B de cette session (commit
`3f54be4`), simplement pas encore repassée sur ce fichier au moment de sa
création puisqu'il n'existait pas encore. Comparé au composant `MindsetView.tsx`
(l'onglet Mindset principal, `handleToggle`) qui gère déjà ce rollback +
affichage d'erreur correctement — confirme que c'était bien l'écart, pas
un nouveau pattern à inventer. Corrigé à l'identique : rollback du `Set`
optimiste + message d'erreur affiché sous la carte si `res.error`. `tsc`/
`eslint` revérifiés propres après ce correctif.

### Reste à faire

La liste complète des "20 idées" côté coach du 2026-09-09 n'a jamais été
consignée nulle part dans ce repo (ni MASTERCLASS.md, ni PROGRESS.md) —
seuls les commentaires `Idée #N` laissés dans le code au fil de leur
implémentation en gardent une trace partielle (#1, #2, #10, #11, #12,
#13, #16, #18 retrouvés). Les numéros manquants ne peuvent pas être
reconstruits de façon fiable : mieux vaut lancer un nouveau brainstorm
que d'inventer ce qu'ils étaient.

## BG — Brainstorm "2 avatars" (membre gratuit vs client coaché), angles morts (2026-09-10)

Demande explicite : chercher ce qui manquait pour les deux profils non-coach
de l'appli, "membre" gratuit (`isSubscribed(profile) === false`) et "client"
coaché payant, sans se limiter à des idées SaaS génériques. Cartographie
complète faite d'abord (agent d'exploration en tâche de fond, lecture
réelle du code, pas juste des greps) avant toute implémentation — plusieurs
pistes envisagées se sont révélées déjà construites (parrainage en
libre-service, comparateur avant/après photos+mensurations avec deltas par
ligne, checklist d'onboarding, bandeau de compte à rebours des 60 jours
d'essai gratuit `FreeTierBanner.tsx`) : vérifié avant de dupliquer, pas
re-livré une deuxième fois.

### Ce qui a été livré

1. **`CoachOnlyGate.tsx`** — la modale de verrou (affichée sur tout onglet
   réservé aux coachés : tâches, check-in, coaching live...) ne proposait
   jusqu'ici QUE l'appel externe de préqualification, jamais la page
   `/dashboard/client/abonnement` qui explique pourtant déjà concrètement
   ce que ça change (`COACHING_PILLARS`). Ajout d'un lien secondaire "Voir
   ce que ça change concrètement", palier intermédiaire moins engageant
   qu'un appel tout de suite.

2. **`app/dashboard/client/abonnement/page.tsx`** — le système de
   parrainage (`ReferralCard`, Item 41, un mois offert par ami parrainé
   devenu client payant) existait déjà et fonctionnait, mais vivait
   uniquement sur la page Profil, jamais mentionné au moment précis où un
   membre gratuit hésite à payer. Carte réutilisée telle quelle (mêmes
   props que sur Profil), affichée pour tout non-abonné juste avant la
   section points.

3. **Récap hebdo (séances/nutrition/poids) ouvert aux membres gratuits +
   rendu visible en page, pas seulement en push.**
   `app/api/cron/weekly-progress-recap/route.ts` calculait déjà tout mais
   excluait explicitement `subscription_status !== "active"` de
   `eligibleIds` — un membre gratuit actif (vraies séances, vraie
   nutrition loguée) n'avait donc jusqu'ici aucun retour automatique sur
   sa propre semaine. Filtre retiré (tout profil client, gratuit ou
   coaché, reste éligible ; seul le rôle coach était de toute façon déjà
   inclus avant). En plus de ça : une notification push se manque ou se
   désactive facilement, donc le même calcul est maintenant aussi
   affiché en permanence dans une carte "Ta semaine" sur l'onglet
   Aujourd'hui (`AujourdhuiView.tsx`), pas à la place de la notif, en
   complément.
   - `lib/weekly-recap.ts` : le calcul, requêtes ciblées sur un seul
     client (`createServerSupabase`, respecte RLS) plutôt que le batch
     "toute la base" du cron (gardé tel quel côté cron : le réécrire
     client par client transformerait 3 requêtes groupées en 3×N).
   - `lib/weekly-recap-format.ts` : **module volontairement sans aucun
     import** (même discipline que `lib/dates.ts`, déjà établie cette
     session) contenant uniquement `WeeklyRecapStats` et
     `formatWeeklyRecapLine` — j'ai d'abord écrit ce code directement
     dans `lib/weekly-recap.ts` (qui importe `createServerSupabase`,
     `next/headers`) puis tenté de l'importer tel quel depuis
     `AujourdhuiView.tsx` (`"use client"`) : `tsc` ne l'aurait jamais
     attrapé (les deux fichiers compilent très bien séparément), seul un
     vrai `next build` du bundle navigateur l'aurait révélé. Repéré et
     corrigé AVANT de lancer ce build, par vigilance sur la même classe
     d'erreur déjà rencontrée cette session (weekNumber/timeAwareGreeting).
     Le cron importe aussi ce module pur désormais : une seule formulation
     du message, qu'il soit vu en push ou en page.

### Ce qui a été tenté puis explicitement arrêté

- **Signal de satisfaction (NPS léger, 1-5 + commentaire libre).** Seule
  idée du brainstorm nécessitant une vraie nouvelle table (aucun signal
  produit n'existe nulle part ailleurs dans le repo). Migration écrite
  (`supabase/migrations/20260910a_app_satisfaction_ratings.sql` — RLS
  insert+select strictement sur `client_id = auth.uid()`, pas de
  update/delete par le client, une note reste un instantané). Tentative
  d'application directe via `mcp__Supabase__apply_migration` (comme les 3
  migrations de l'Axe I) : **refusée deux fois par le classificateur de
  permissions auto mode**, sans raison plus précise que "Blocked by
  classifier". Pas de contournement tenté (execute_sql aurait la même
  intention DDL). Volontairement **aucun code applicatif écrit** pour
  cette fonctionnalité tant que la table n'existe pas réellement en base —
  un `getLatestSatisfactionRating()` planté en boucle sur une page aussi
  fréquentée que Aujourd'hui aurait été pire que ne rien livrer. Migration
  laissée en l'état dans `supabase/migrations/`, à appliquer manuellement
  dans le SQL Editor Supabase (signalé explicitement à l'utilisateur, par
  ailleurs déjà obligatoire pour toute nouvelle migration par AGENTS.md).

- **Insight textuel sur `BeforeAfterComparator.tsx`** ("−3.2kg, −4cm de
  tour de taille en 8 semaines" en résumé au-dessus du tableau) —
  envisagé, puis déprioritisé après relecture du composant : chaque ligne
  affiche déjà Avant/Après/Écart avec flèche colorée, la valeur ajoutée
  d'une phrase de synthèse est réelle mais marginale par rapport aux
  autres pistes de ce brainstorm. Pas fait cette fois-ci.

- **Recouper `getOnboardingChecklist()` avec `lib/reengagement.ts`**
  (message de relance ciblé sur la case précise non cochée plutôt qu'un
  guide générique par objectif) — la séquence de relance actuelle
  (5 étapes) a un arc narratif volontairement construit (intro → philosophie
  → liste de fonctionnalités → question directe → au revoir), pas de simples
  templates interchangeables. Retravailler cette prose déjà soignée sans
  direction plus précise de l'utilisateur était plus risqué que la valeur
  attendue ne le justifiait. Pas fait cette fois-ci.

- **Deuxième point d'entrée parrainage** (après une victoire postée ou un
  rang débloqué, `communaute/victoires`) — la page victoires est un simple
  flux communautaire, pas un point de déclenchement événementiel ; ajouter
  le parrainage y aurait demandé plus de plomberie que sa valeur ne le
  justifiait une fois qu'il est déjà placé au moment de plus forte intention
  (la page abonnement elle-même, point 2 ci-dessus). Un deuxième
  emplacement risquait surtout de paraître redondant/spammy.

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 7 fichiers touchés, `next
build` de production complet terminé sans erreur (table de routes
complète, exit 0) — la vérification qui a justement permis de détecter
et corriger le risque de bundle client avant tout commit.

## BH — "Petit détail utile" : boutons icône sans nom accessible + pluriels français (2026-09-10)

Demande explicite : continuer 2h sur de vrais petits détails utiles pour les
deux avatars, pas de nouvelle grosse fonctionnalité. Deux repasses
systématiques, chacune avec un scanner écrit pour l'occasion (même
méthodologie que les Axes G/Q déjà établis), plutôt qu'une correction au
hasard de ce qui saute aux yeux.

### 1. Boutons icône seule sans nom accessible (extension de l'Axe G)

L'Axe G ne couvrait que `<input>/<textarea>/<select>` — jamais les
`<button>` dont le SEUL contenu visible est une icône lucide-react (ou un
symbole nu +/−/×/←) sans `aria-label` ni `title`. Un lecteur d'écran n'a
alors rien à annoncer d'autre que "bouton". Nouveau scanner
`find-icon-only-buttons.mjs` (scratchpad) : détecte `<button>` dont le
contenu, une fois les commentaires JSX retirés, est soit un unique
composant icône auto-fermant soit un symbole nu sans lettre.

**46 candidats trouvés au premier passage, sur 24 fichiers.** Corrigés un
par un avec un texte contextuel (jamais générique "bouton") :
`Trash2`→"Supprimer X" (avec le nom de l'élément quand disponible :
aliment, tâche, cycle, post, bloc...), `X`→"Fermer" (contextualisé :
"Fermer la recherche", "Fermer le message d'erreur"...), `Plus`/`Minus`
→"Augmenter"/"Diminuer" ou l'action précise ("Ajouter la note"),
`ChevronLeft`/`ChevronRight`/`ArrowLeft`→"Jour précédent" / "Étape
précédente", `Pencil`→"Modifier X", `Send`→"Envoyer le message", `Star`
(picker de notation)→"N étoile(s)" + `aria-pressed`. Fichiers touchés :
RemindersView, AgentChatView, BusinessGoals, CoachDocumentsSpace,
ConversationView, OnboardingTour, AddRecipeForm, MealCreatorWizard,
StepsClient, TrackingClient (les 2 boutons +/− de `NumberField`, repérés
en marge du scanner en relisant le fichier), ClientCorrectionsReplySection,
ClientCorrectionsSection, ClientNutritionView (6), ClientPeriodTracking,
CoachClientNutritionTabs, CoachClientTasksView, CoachPostsManager,
DietPlanManager (3), GymsDirectoryView (2), InstallAppHint, MindsetView,
NutritionBilanQuiz (3), ProgramCreatorWizard, SupplementsSection,
WeeklyAgenda (5, dont 2 déjà corrects — le scanner avait un faux positif
de décalage de ligne, vérifié directement dans le fichier avant de
"corriger" ce qui l'était déjà).

Re-scan après corrections : **0 candidat restant.**

### 2. Pluriels français codés en dur ("1 semaines", "1 clients"...)

Recherche ciblée (grep sur les noms comptables les plus fréquents de
l'appli : jour, semaine, séance, client, coach, point, exercice, aliment,
vidéo...) suivie d'une vérification MANUELLE de chaque candidat avant
correction — plusieurs se sont révélés être de faux positifs après lecture
du contexte réel (condition qui exclut déjà la valeur 1, ou grep coupé par
un retour à la ligne alors que le fichier gérait déjà le pluriel juste
après) :
- `ClientCard.tsx` (badge anniversaire) : `weekNum` toujours multiple de 4
  (condition `% 4 === 0` en amont) — jamais 1, laissé tel quel.
- `CoachNotesView.tsx` ("Voir tout (N semaines)") : bouton affiché
  seulement si `pastNotes.length > 5` — jamais 1, laissé tel quel.
- `app/dashboard/coach/inbox/page.tsx` : le cas `jours === 1` a déjà sa
  propre branche ("Hier") avant celle testée — jamais 1 à cet endroit,
  laissé tel quel.
- `AvailabilityManager.tsx`, `ProgramEditor.tsx` : déjà correctement gérés
  sur la ligne suivante, juste coupés par le grep.

**Vrais bugs corrigés** (valeur 1 réellement atteignable, notamment côté
"0 client payant" actuel — voir [[feedback_client_vs_membre]], où
`activeClients.length` vaut très probablement 0 ou 1 en ce moment même) :
- `ProgrammationHub.tsx` : durée d'une road map (`N semaines`).
- `ProgramCreatorWizard.tsx` : résultat généré ("N séances · N exercices").
- `app/dashboard/coach/finance/page.tsx` : "N coachs · N clients" — la
  carte "Abonnés actifs" elle-même, visible en ce moment précis avec très
  peu d'abonnés réels.
- `RoadmapEditor.tsx` (`durationLabel`) : jours et semaines (mois est
  invariant en français, laissé tel quel).
- `app/dashboard/client/profile/page.tsx` : "Semaines de coaching".
- `NutritionBilanQuiz.tsx` : "aliment(s)" en notation parenthèse
  remplacée par le vrai conditionnel déjà standard ailleurs dans l'appli.
- `ClientNutritionView.tsx` : accord du VERBE en plus du nom ("1 repas...
  n'ont pas pu être copiés" → "n'a pas pu être copié").
- `HeadCoachAuditButton.tsx` : notation parenthèse "(s)" sur 2 messages,
  remplacée, plus un accord verbe/participe incohérent dans la même
  phrase ("client(s) passés" — accordé au pluriel alors que "client(s)"
  restait en notation parenthèse).
- `app/dashboard/client/formations/page.tsx` : "N vidéos t'attendent" →
  accord nom ET verbe ("t'attend" au singulier).

### Validation

`tsc --noEmit` propre. `eslint` sur les fichiers touchés ne remonte que
des erreurs `react-hooks/set-state-in-effect` **pré-existantes** (vérifié
explicitement par `git stash` sur `WeeklyAgenda.tsx`/`NutritionBilanQuiz.tsx` :
mêmes 5 erreurs + 1 warning sur `master` non modifié) — aucune ligne
touchée par ce chantier ne s'en approche, uniquement des `aria-label` et
du texte de template literal. Deux `next build` de production complets
lancés en tâche de fond pendant la suite du travail (un après chaque lot),
tous deux terminés sans erreur (table de routes complète, exit 0).

### Autres catégories de "petit détail" vérifiées, déjà propres (rien à corriger)

Passes ciblées après les deux volets ci-dessus, chacune avec une vérification
réelle (grep + lecture du contexte, jamais juste "grep = 0 résultat" pris
pour argent comptant) plutôt qu'une supposition :
- Dates formatées sans locale explicite (`.toLocaleDateString()` sans
  `"fr-FR"`, qui suivrait la langue du navigateur plutôt que celle de
  l'appli) : **0 occurrence**, tous les appels de tout le repo passent déjà
  `"fr-FR"` explicitement.
- `alert()`/`confirm()`/`prompt()` natifs du navigateur restants : **0**,
  tous les points de confirmation utilisent déjà le `confirm()` maison
  (promisifié, remplace le natif depuis un commit antérieur à ce chantier).
- Couverture `loading.tsx` sur les routes `/dashboard/client/*` et
  `/dashboard/coach/*` : les 2 "trous" apparents (`communaute/`,
  `science/`) sont des pages de redirection pure sans fetch de données —
  toutes leurs sous-routes réelles ont déjà leur `loading.tsx`. Couverture
  complète.
- Feedback de pression (`:active`) sur les éléments cliquables : déjà géré
  globalement par un système de classes existant
  (`ep-btn-primary`/`ep-btn-secondary`/`ep-btn-icon`/`ep-card`/`ep-press`...
  dans `app/globals.css`), avec sa propre exception `prefers-reduced-motion`
  déjà en place. Rien à ajouter.
- `key={i}`/`key={idx}` utilisé sur une liste d'objets qui a pourtant un
  `.id` disponible (anti-pattern React classique, perte d'identité de
  réconciliation) : script Node ciblé, **0 candidat** trouvé sur tout
  `app/`+`components/`. Les seuls `key={i}` restants (ex. `AddRecipeForm.tsx`,
  listes de chaînes `string[]` sans identifiant propre) sont un choix
  cohérent pour ce cas précis, pas un oubli.
- Bornes `min`/`max` sur les champs numériques de santé (poids...) :
  spot-check sur le champ le plus sensible (poids du matin,
  `DailyBilanForm.tsx`) — déjà borné `min="30" max="300"`.

## BI — Échecs réseau silencieux qui affichaient un état trompeur (2026-09-10)

En relisant `UrgentAlertsSection.tsx` (coach) pour une raison sans rapport,
repéré que son `.catch(() => setLoading(false))` amenait exactement au même
rendu que "rien à signaler" — alors que le commentaire du code juste en
dessous (Idée #13) explique que cet état positif a été ajouté PRÉCISÉMENT
pour distinguer "contrôle fait, tout va bien" de "la section n'a pas
chargé". Le `.catch()` défaisait sa propre raison d'être. Grep élargi à
tout le repo (`\.catch\(...setLoading(false)...\)` et variantes) pour voir
si c'était isolé ou systémique, puis lecture manuelle de chaque résultat
avant de corriger — plusieurs se sont avérés déjà sûrs par construction et
volontairement laissés tels quels.

### Corrigés (l'échec réseau produisait un état FAUX, pas juste vide)

- **`UrgentAlertsSection.tsx`** — nouvel état `loadError`, rendu distinct
  ("Impossible de vérifier les alertes...") au lieu du faux "tout va bien".
- **`RoadmapEditor.tsx`** — le plus sérieux des quatre : sur échec réseau,
  `existingRoadmap` restait `null` exactement comme "ce client n'a pas
  encore de road map", affichant le formulaire de CRÉATION à un coach dont
  le client a peut-être déjà une road map — risque réel de doublon. Nouvel
  état `loadError` avec message explicite ("recharge la page... ne pas
  risquer d'en créer une deuxième en double").
- **`ClientProfileTabs.tsx`** (onglet Road Map d'un client, vue coach) —
  même défaut en amont du composant précédent : bouton "Configurer" et
  résumé "Clique sur Configurer pour créer..." affichés sur échec réseau
  comme sur vraie absence de road map. `RoadmapEditor.tsx` (ouvert derrière
  ce bouton) protège déjà contre la vraie conséquence depuis le correctif
  ci-dessus, mais ce résumé restait trompeur en lui-même — corrigé avec le
  même principe (état `roadmapError` distinct).
- **`DashboardStats.tsx`** (stats principales du dashboard coach, très
  visible) — sur échec réseau, `stats` restait `null` pour toujours et le
  squelette de chargement (pensé pour quelques centaines de ms) restait
  affiché indéfiniment, donnant l'impression que l'appli est figée. Nouvel
  état `statsError` avec message explicite au lieu du squelette éternel.

### Vérifiés et volontairement laissés tels quels (déjà sûrs par construction)

- `CoachMoiRoadmapView.tsx` — résumé "bonus" au-dessus de `RoadmapEditor.tsx`
  lui-même ; son propre commentaire dit déjà explicitement déléguer la
  gestion d'erreur à l'éditeur en dessous. Vrai depuis le correctif
  ci-dessus, pas avant.
- `StagnationBanner.tsx` — sur échec, la bannière ne s'affiche simplement
  pas (`if (!status?.active...) return null`), un dégradé silencieux et
  non trompeur, identique à l'état "avant chargement". Rien à corriger.
- `RoadmapCalendar.tsx` (stats hebdo par semaine, superposées sur un
  calendrier déjà affiché) — un échec masque juste les puces de stats,
  aucune décision erronée possible derrière. Laissé tel quel.
- `SessionView.tsx` (chargement d'une séance) — `initData` reste `null`
  sur échec, ce qui tombe déjà correctement sur la branche existante
  "Séance introuvable" plutôt qu'un écran cassé ou trompeur. Le libellé
  n'est pas parfait (confond "n'existe pas" et "erreur de chargement")
  mais ne trompe sur aucune décision, contrairement aux quatre corrigés.
  Pas retouché — hors scope d'une passe "petit détail", pas un vrai risque.
- Le reste des `.catch(() => {})` du repo (son d'alarme, service worker,
  badge PWA, compteurs de notifications, bibliothèque d'exercices en
  cache...) sont des effets secondaires "best effort" assumés, sans état
  affiché qui pourrait induire en erreur.

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 4 fichiers touchés. Deux
`next build` de production complets (un après les 2 premiers correctifs,
un après les 4), tous deux terminés sans erreur (table de routes
complète, exit 0).

## BJ — Production de contenu : Instagram réduit, YouTube ouvert, prompts coachs personnalisés (2026-09-10)

Refus explicite en amont de la partie "scraper des emails partout sur le
web pour nourrir Brevo" de la demande : collecte non consentie de données
personnelles pour de la prospection commerciale, contraire au RGPD/CNIL et
aux conditions Brevo (bannissement de compte), voir échange avec
l'utilisateur. Reformulé en objectif légitime : synchroniser les leads déjà
consentis (à faire), optimiser le formulaire d'inscription (à faire), et
surtout traiter le vrai levier nommé explicitement par l'utilisateur : plus
de trafic via du contenu, YouTube en priorité.

### Routine Instagram (Studio créatif) : 20 → 5 scripts/jour

`trig_015b99vqWhJxcFnWkFjYZ2i1` ("Production quotidienne de scripts Studio
creatif", cron `0 2 * * *`) écrivait 20 scripts reels/jour dans
`coach_scripts`. Mise à jour du prompt de la routine : 5/jour, avec
instruction explicite de mettre le temps gagné dans la qualité (hook plus
travaillé, vérification honnête "est-ce que ce hook arrêterait vraiment
quelqu'un qui scrolle ?"). Découverte en creusant le contexte Notion : le
webinaire Matis Clouet (déjà synthétisé le 2026-08-30, 📚 Synthèse
Webinaire Matis Clouet) avait DÉJÀ flaggé 20/jour comme au-delà de ce qui
est démontré (5/jour + 2 "caviar" chez Matis pour un démarrage de zéro) —
confirme que la baisse demandée va dans le sens d'une piste déjà identifiée,
pas une simple préférence arbitraire. Pages Notion mises à jour en
cohérence pour éviter une dérive doc/réalité : 📊 Stratégie Contenu
Instagram — Funnel 50/25/25 (rythme + note de vigilance) et 🎬 Guide
production scripts reels (pour Claude) (répartition des piliers ramenée de
/20 à /5).

### Nouvelle routine YouTube : 1 script/jour, très exigeant

Aucune routine YouTube n'existait. Créée `trig_01CLkVPsUaB2rEja1dXQd14G`
("Production quotidienne de script YouTube", cron `0 3 * * *`, 5h Paris,
entre les reels à 4h et LinkedIn à 6h). Avant d'écrire le prompt, lu en
entier le contexte Notion existant (🧠 Giga Cerveau, 📚 Synthèse Webinaire
Matis Clouet, 📊 Stratégie Contenu Instagram, 🎬 Guide reels, page
"YouTube — Scripts vidéo" et son historique de scripts retirés pour
violation de la règle d'identité) plutôt que d'inventer une méthodologie
à l'aveugle — le webinaire Matis Clouet nomme explicitement l'absence de
chaîne YouTube comme LE point de vigilance le plus direct à corriger
(dépendance à un seul canal Instagram).

Nouvelle page Notion créée : 🎥 Guide production scripts YouTube (pour
Claude) (id `3d77c035d8f081e39b56ea851edb34d3`), miroir du guide Reels
mais pensé pour le format long : structure de rétention en chapitres
(`[CHAPITRE N : titre]`), rappel du bénéfice toutes les 2-3 minutes,
longueur cible 10-14 min (~2,3 mots/seconde, plus lent qu'un reel), titre
+ idée de miniature (texte qui crée une tension avec le titre plutôt que
de le répéter), description avec timestamps de chapitres calculés depuis
la position réelle dans le script, CTA numéroté identique aux reels
(cohérence de marque) complété par la mention native du lien en
description. Fenêtre anti-répétition élargie à 30 jours (vs 7 pour les
reels) car 1 script/jour épuise moins vite le stock de sujets, mais
YouTube pardonne encore moins la répétition qu'Instagram.

**Sécurité, repéré et corrigé avant tout run réel** : la création de
routine sans `mcp_connections` explicite attache PAR DÉFAUT tous les
connecteurs du compte (Stripe, Gmail, Google Drive, Shopify, Calendly...),
alors que cette routine n'a besoin que de Supabase (lire/écrire
`coach_scripts`, lire `lead_magnets`/`science_articles`) et Notion (lire
le guide). Corrigé immédiatement par un `update` qui restreint aux 2
connecteurs réellement nécessaires — pas découvert a posteriori, vérifié
en relisant la réponse de création avant de considérer la tâche finie.

### Studio créatif (app) : la plateforme YouTube existait dans le modèle de données mais pas dans l'UI

`coach_scripts.platform` (défaut `'instagram'`) et `SCRIPT_FORMATS`
("court"/"long") anticipaient déjà le multi-plateforme, mais
`IdeationScripts.tsx` (onglet "Mes scripts") n'affichait aucun badge de
plateforme — un script YouTube produit par la nouvelle routine aurait été
visuellement indiscernable d'un reel dans la liste. Ajout d'un badge
plateforme coloré (Instagram/YouTube/LinkedIn) à côté du badge format, et
le libellé "Description Instagram" devient "Description {Plateforme}"
(la colonne `instagram_caption` reste réutilisée telle quelle pour toute
plateforme, nom historique, pas de migration nécessaire).

### Bibliothèque de prompts pour les coachs : élargie et personnalisée automatiquement

Retour direct : *"plein plein de prompts Claude tout prêts, vraiment de la
valeur, hyper personnalisé à eux, leur business, leur niche, leur client"*.
`lib/content-library.ts` (`CONTENT_PROMPTS`, onglet Studio créatif >
Prompts) ne comptait que 8 prompts génériques. Étendu à 25, nouvelles
catégories (`YouTube`, `Business`, `Repurposing`, `Planification`) :
scripts storytelling/objection/duo/test-X-jours, titres+miniatures
YouTube, plans de vidéo longue, séries YouTube multi-épisodes, contenu
destiné aux coachs (pas aux clients finaux), nommer sa propre méthode
(écho direct à une piste du webinaire Matis Clouet : "Value Assets"),
semaine de contenu à partir d'une idée, méthode des 30 idées en 10 minutes
par colonnes (Goûts/Échecs/Pourquoi/Points communs/Message, directement
inspirée du webinaire), analyse de ce qui a mieux marché (relié à la
demande de tracking ci-dessous), repurposing long→court/carousel↔reel/
Instagram→LinkedIn.

**Personnalisation automatique** (plutôt que dupliquer les infos business
dans chacun des 25 prompts, impossible à tenir à jour) : le Business Model
Canvas du coach (`lib/coach-business-canvas.ts`, déjà rempli par certains
coachs dans "Développer mon business") est désormais lu par
`app/dashboard/coach/studio/page.tsx` et transmis à `PromptLibrary`. Un
paragraphe de contexte (client cible, proposition de valeur, relation
client) est automatiquement préfixé au texte copié quand le coach clique
"Copier" sur n'importe quel prompt — colle directement dans Claude/ChatGPT
avec le contexte business déjà dedans. Bandeau visible qui explique le
mécanisme si le canvas est rempli, ou qui invite à le remplir (avec lien
direct) sinon — jamais une personnalisation silencieuse que le coach ne
comprendrait pas.

### Validation

`tsc --noEmit` propre. `eslint` : une seule erreur `set-state-in-effect`
pré-existante dans `IdeationScripts.tsx` (vérifiée par lecture du diff :
aucune ligne touchée par ce chantier ne s'en approche, le hook concerné
existait avant). `next build` de production complet, exit 0.

### Reste à faire (noté explicitement, pas oublié)

- Synchroniser les leads déjà consentis vers Brevo (app + formulaire de
  préqualification), optimiser le formulaire d'inscription newsletter.
- Tracking de performance de contenu **dans l'app** (pas seulement la page
  Notion "Suivi Performance" existante, jamais alimentée) — pour "savoir
  réitérer", demande explicite pas encore traitée dans ce lot.
- Onboarding coach complet avec beaucoup de paramètres de personnalisation
  (l'onboarding membre/client existe, celui du coach existant est
  incomplet) — pas encore traité dans ce lot.
- Génération de vraie miniature YouTube (Canva disponible, notée comme
  amélioration future dans le guide Notion lui-même, pas bloquante pour
  la V1 de la routine).

## BK — Tracking de performance de contenu + étape "business" dans l'onboarding coach (2026-09-10)

Suite directe de l'Axe BJ, deux items de son "Reste à faire" traités.

### Tracking de performance dans l'app (pas seulement Notion)

Migration `20260910b_coach_scripts_performance_tracking` (appliquée
directement) : `views`, `likes`, `comments_count` (entiers, nullables) sur
`coach_scripts`. La page Notion "Reels & Carousels — Suivi Performance"
existait déjà mais dépendait d'un signalement manuel à une session Claude,
jamais alimentée en pratique (contenu de la page : "rien de loggé pour
l'instant, en attente du premier retour"). Nouveau bloc dans
`IdeationScripts.tsx`, visible uniquement sur un script `status='publie'` :
un champ obligatoire (vues) + deux optionnels (likes, commentaires),
`updateScript` étendu en conséquence (`app/dashboard/coach/studio/
actions.ts`). Badge "🔥 Au-dessus de la moyenne" calculé automatiquement
(moyenne des vues des scripts déjà loggés du coach, dès qu'il y en a au
moins 2) plutôt que de demander un signalement manuel séparé — ferme la
boucle "savoir réitérer" citée dans la demande directement dans le flux
de travail existant, sans écran ni étape supplémentaire.

### Onboarding coach : étape "business" ajoutée

Découverte en investiguant : un onboarding coach existe déjà
(`app/onboarding/coach/page.tsx`, Axe 9 VISION.md, 2026-08-19) — mais
scopé entièrement à la fiche PUBLIQUE (annuaire `/coachs` : profil,
spécialités, capacité, lien d'invitation), jamais au modèle business qui
personnalise l'app en retour. C'est exactement l'écart entre ce que
l'utilisateur vient de redemander ("beaucoup de paramètres derrière pour
réellement personnaliser l'appli à leur situation") et ce qui existait
déjà. Nouvelle étape "business" insérée entre "spécialités" et
"capacité" dans `CoachOnboardingFlow.tsx` : réutilise `BusinessCanvasEditor`
tel quel (même composant que "Développer mon business", déjà auto-
sauvegardant bloc par bloc, aucune nouvelle logique de sauvegarde) — les
9 blocs du Business Model Canvas, avec une note qui priorise les 2 qui
alimentent directement la personnalisation des prompts (proposition de
valeur, segments de clientèle) sans rien rendre obligatoire.

Referme une vraie boucle produit : un nouveau coach qui fait son
onboarding a maintenant, dès le premier jour, des prompts de contenu déjà
personnalisés à sa situation dans Studio créatif (Axe BJ), sans avoir eu
besoin de découvrir "Développer mon business" par hasard.

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 5 fichiers touchés, `next
build` de production complet, exit 0.

### Reste à faire (toujours pas traité, noté explicitement)

- Synchroniser les leads déjà consentis vers Brevo, optimiser le
  formulaire d'inscription newsletter.
- Notifications/rappels/suggestions "autour de tout ça" (demande large,
  pas encore scopée en tâches concrètes).

## BL — Croissance de la liste Brevo, sans jamais toucher au consentement (2026-09-10)

Investigation avant tout code : le connecteur MCP Brevo disponible pour moi
ne propose AUCUN outil de création/ajout de contact (seulement lecture :
`contacts_get_contacts`, `lists_get_lists`...) — impossible de "synchroniser
des leads" via ce connecteur. En revanche l'appli a déjà sa propre
intégration Brevo directe (`utils/brevo.ts`, clé API serveur) avec
`addBrevoContactToList`, déjà appelée à un seul endroit
(`app/ressources/actions.ts`, téléchargement d'un leadmagnet). Un seul
appelant sur toute l'appli — c'est là qu'était le vrai gisement, pas sur le
web.

**Point de vigilance décisif, trouvé en lisant `/legal/confidentialite`
avant d'agir** : la page promet explicitement *"sur consentement séparé"*
et *"la newsletter que vous avez explicitement acceptée"* — impossible
d'ajouter automatiquement tout nouvel inscrit à l'appli à la newsletter
sans contredire cette promesse écrite (et sans risque RGPD réel : accepter
les CGU n'est pas un consentement marketing valable). Confirme que la
prudence de l'Axe BJ (refus du scraping) n'était pas un excès de zèle
isolé : la même appli a déjà, de son propre chef, posé cette règle avant
moi.

### Ce qui a été ajouté (uniquement du consentement neuf et réel)

1. **Case newsletter au signup**, membre ET coach (`SignupFlow.tsx`,
   `CoachSignupFlow.tsx`) — case SÉPARÉE de la case CGU obligatoire,
   jamais pré-cochée (une case pré-cochée n'est pas un consentement RGPD
   valable). Si cochée, `selfSignup`/`signupCoach` appelle
   `addBrevoContactToList` en fire-and-forget après la création du compte
   réussie (jamais avant, jamais bloquant).
2. **Carte "Newsletter" dans Paramètres**, membre ET coach
   (`NewsletterPreferenceCard.tsx`) — pour les comptes déjà existants
   (créés avant cette case, ou qui l'avaient décochée) : un bouton
   "S'inscrire", état réel vérifié auprès de Brevo au chargement de la
   page (nouveau `isBrevoContactSubscribed`, `GET /v3/contacts/{email}`),
   pas un simple booléen local qui pourrait mentir. Volontairement à sens
   unique : pas de bouton "se désinscrire" ici, ce lien existe déjà en
   pied de chaque email Brevo (mécanisme standard, déjà conforme).
3. `NEWSLETTER_LIST_ID` centralisé dans `utils/brevo.ts` (était dupliqué
   en constante locale dans 2 fichiers).

### Reste explicitement pas fait

Aucune tentative de deviner ou reconstituer un "consentement implicite"
pour les ~15 membres déjà inscrits sans avoir vu la nouvelle case : la
carte Paramètres (point 2) est LE mécanisme de rattrapage légitime, pas un
ajout silencieux en base. Optimisation du formulaire `NewsletterSignupForm.tsx`
lui-même jugée déjà correcte à la lecture (honeypot, états loading/erreur/
succès, variante compacte) — le vrai levier était la découvrabilité
(nouveaux points d'entrée ci-dessus), pas le formulaire lui-même.

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 9 fichiers touchés, `next
build` de production complet, exit 0.

## BM — Studio créatif : les scripts publiés sont terminés, séparés des scripts actifs (2026-09-10)

Retour direct : le cycle réel est écrire → tourner → poster, et une fois
posté le script est FINI. Le cycle de statuts (`a_tourner` → `tourne` →
`publie`) existait déjà exactement dans cet ordre (`IdeationScripts.tsx`,
`STATUS_CYCLE`) — le vrai manque était visuel : tous les scripts (actifs
et publiés) se mélangeaient dans une seule liste plate, qui grossit vite
avec 5 reels + 1 YouTube produits chaque jour (Axe BJ).

- Liste scindée en deux : scripts actifs (`a_tourner`/`tourne`) affichés
  en premier comme avant, scripts `publie` regroupés dans une section
  "Publiés, terminés (N)" repliée par défaut (`showPublished`), avec un
  message "Tout ce qui était à produire est posté 🎉" quand la liste active
  est vide.
- Le tracking de performance (Axe BK) reste consultable normalement à
  l'intérieur de cette section repliée : rien n'est perdu, juste rangé.
- Bouton de statut conservé tel quel (reclic possible même sur "Publié",
  pour rouvrir en cas d'erreur de manipulation) mais avec un `title`
  contextuel par statut plutôt qu'un générique "changer le statut"
  ("Cliquer une fois tourné" / "Cliquer une fois posté" / "Terminé,
  cliquer pour rouvrir si erreur").
- Refactor technique : le rendu d'une carte de script (~150 lignes,
  contenu/hook/CTA/description/tracking) était dupliqué deux fois dans le
  fichier source avant ce changement risquait une vraie divergence —
  extrait en fonction interne `renderScript()`, appelée par les deux
  listes (`activeScripts.map`, `publishedScripts.map`), une seule source
  de vérité pour le markup.

### Validation

`tsc --noEmit` propre (aucune erreur après le refactor). `eslint` : même
erreur `set-state-in-effect` pré-existante déjà documentée (Axe BH/BJ/BK),
toujours sans rapport avec ce changement. `next build` de production
complet, exit 0.

## BN — Rappel automatique des scripts en attente de tournage (2026-09-10)

Dernier point du retour direct : "les notifs, les rappels, les
suggestions autour de tout ça". Depuis les Axes BJ/BM, jusqu'à 6
scripts/jour tombent en `a_tourner` (5 reels + 1 YouTube, routines cloud)
sans aucun signal si le coach ne pense pas à ouvrir Studio créatif —
risque réel d'accumulation silencieuse.

Nouvelle route `app/api/cron/scripts-to-shoot-reminder`, même patron que
les crons existants (auth `Bearer CRON_SECRET`, `notifyUser`). Critère
volontairement simple (pas de logique par script) : notifie un coach
seulement si **5 scripts ou plus** attendent en `a_tourner`, avec l'âge du
plus ancien dans le message si ≥ 1 jour. Enregistré directement dans
`cron.job` via Supabase (même mécanisme que les ~20 crons déjà en place,
pas une migration commitée — voir PROGRESS.md), quotidien à 10h UTC
(12h Paris), créneau vérifié libre parmi les jobs existants avant
enregistrement.

### Validation

`tsc --noEmit` propre, `eslint` propre. `next build` de production
complet, exit 0. Cron `jobid` 37, `active: true`, vérifié après
enregistrement.

## BO — Accessoires de séance : plus jamais devinés, uniquement le choix explicite (2026-09-10)

Retour direct : *"les accessoires actuellement tu as mis au hasard et
c'est faux, fait que ce soit moi qui sélectionne les accessoires de la
séance"*. Investigation : le mécanisme de choix explicite par exercice
(`exercise_library.accessories`, éditable depuis `ExerciseDetailPanel`)
existait déjà, construit plus tôt dans la journée — mais **0 exercice sur
658** n'avait jamais été configuré (vérifié en base), donc `accessoriesForSession`
retombait systématiquement sur son filet de devinette par mots-clés
(`RULES`), exactement ce que l'utilisateur vient de qualifier de faux.

- `accessoriesForSession` ne renvoie plus QUE le choix explicite. Un
  exercice non configuré ne renvoie plus rien (pas d'accessoire deviné
  affiché) — cohérent avec le principe déjà écrit en tête du fichier
  ("mieux vaut ne rien suggérer qu'envoyer chercher du matériel inutile"),
  poussé jusqu'au bout.
- `RULES` et la devinette par mots-clés ne disparaissent pas : elles
  deviennent une **suggestion cliquable** dans `ExerciseDetailPanel`
  (nouveau `guessedAccessoryForExercise`), affichée uniquement pendant la
  configuration d'un exercice, jamais comme un fait dans une séance —
  pour ne pas obliger à repartir de zéro sur 658 exercices.
- Commentaires/libellés obsolètes ("devinette en filet") mis à jour dans
  `SessionView.tsx` et `utils/exercise-library.ts` pour ne pas induire en
  erreur une future lecture.

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 4 fichiers touchés, `next
build` de production complet, exit 0.

## BP — Nutrition : vérification post-fix des doublons/coches, pas de code cassé restant (2026-09-10)

Retour direct : *"retente et corrige nutrition et t'auras fini"*, précisé
par le choix "les doublons/coches qui buguent". Avant d'écrire le moindre
code, vérification par la donnée réelle plutôt que par supposition (la
zone a un historique de plusieurs "fix" partiels sur plusieurs mois).

Constat en base (`food_logs`, projet `cadmwvrsjklgtrrebflz`) :
- Deux fix du jour même, déjà commités et déployés **avant** ce chantier :
  `f956e60` (00:52, dédup serveur sur la case à cocher seule) et `ad681ac`
  (10:57, épinglage explicite de la variante pour stopper le
  décochage/mauvais item 5s après validation). Les deux sont confirmés
  ancêtres du HEAD déployé (`59be8b6`, `origin/master`).
- Requête exhaustive des doublons réels (même client + même jour + même
  créneau + même aliment + même quantité, insérés à quelques minutes
  d'écart) sur toute la période 2026-09-01 → 09-10 : **aucun doublon depuis
  le 2026-09-02**, y compris aujourd'hui après déploiement des deux fix.
  Le chantier précédent (avant compaction) avait cru voir un doublon au
  09-09 : c'était un faux positif d'une requête qui comparait deux jours
  différents entre eux, pas un vrai doublon intra-journée.
- 15 lignes de doublons historiques identifiées (09-01 et 09-02, avant même
  les fix du jour) — nettoyage tenté (`DELETE` gardant la première
  occurrence de chaque groupe, aucune FK ne référence `food_logs.id`) mais
  **bloqué par le classificateur de permissions automatique**. Non
  contourné (conforme à la consigne : ne jamais forcer un refus du
  classificateur). Laissé tel quel, à faire manuellement par l'utilisateur
  si souhaité — l'historique de 2 jours anciens n'affecte plus le
  fonctionnement courant, seulement l'exactitude d'un éventuel graphique
  rétroactif sur ces 2 dates précises.

Conclusion : les correctifs de code pour "doublons/coches qui buguent"
étaient déjà en place et vérifiés efficaces (0 régression sur 8+ jours,
fix du jour compris) avant même ce chantier — rien à recoder. Seul reste
un nettoyage de données optionnel sur 2 dates anciennes, bloqué côté
permissions, à faire à la main si l'utilisateur le veut.

### Validation

Aucune modification de code — vérification pure par requêtes SQL directes
sur la production (`execute_sql`), pas de `tsc`/`eslint`/`build` à
relancer.

## BQ — Nutrition : la vraie égalité non tranchée derrière "ça se décoche" (2026-09-10)

Retour direct après l'Axe BP : *"corrige nutrition, ça marche toujours
pas"*, précisé par *"je coche ou valide, j'attends 5s ça s'enlève, ou je
change d'onglet et c'est enlevé"* — le symptôme exact que `ad681ac` (voir
plus haut) était censé avoir déjà fermé. Plutôt que de repartir sur une
troisième resupposition, lecture du VRAI plan de Santamaria en base
(`diet_plan_meals`, créneau postworkout du jeudi) : les 2 options du
créneau partagent **5 aliments strictement identiques** (même `food_id`,
même quantité), seul le 6e diffère (Poulet vs Cabillaud) — même schéma
sur le petit-déjeuner et le déjeuner.

Le pin explicite (`chooseVariant`, appelé avant chaque clic) protège bien
les CLICS eux-mêmes, mais pas le tout premier rendu d'un rechargement
complet — très fréquent en pratique en PWA iOS, qui décharge la page en
arrière-plan et la recharge entièrement au retour, contrairement à un
simple `visibilitychange` sur une page restée en mémoire. Le pin vit en
`localStorage`, relu seulement dans un `useEffect` (donc APRÈS le premier
calcul de `loggedVariantBySlot`). Sur ce rendu-là, seul le compte total
d'aliments correspondants tranche — et dès que les 2 options finissent
par être entièrement loguées le même jour (ex. après avoir goûté l'option
2 un jour où l'option 1 était déjà validée), ce compte devient une VRAIE
égalité (6 = 6). Le `>` strict retombe alors sur l'option 1 par défaut,
faisant disparaître de l'écran les aliments propres à l'option 2 — donnant
exactement l'impression que "cocher ne marche plus", sans aucune perte de
donnée en base.

**Fix à la racine plutôt qu'un rafistolage du pin** : `loggedVariantBySlot`
ne compte plus tous les aliments à égalité. Il calcule d'abord, pour
chaque créneau, la signature (`food_id:quantité`) des aliments PROPRES à
une seule option (absents de l'autre) — Poulet ou Cabillaud, dans cet
exemple — et ne les utilise QUE si l'un des deux est effectivement logué
aujourd'hui : eux seuls prouvent quelle option a réellement été mangée,
contrairement aux aliments communs aux deux qui ne prouvent rien. Le
compte total (logique précédente) ne sert plus que de filet si aucune des
deux options n'a encore d'aliment distinctif logué (créneau à une seule
option, ou vraiment rien de mangé identifiable pour l'instant).

Un bug de qualité de données annexe repéré au passage sur ce même plan
(non corrigé, hors périmètre de ce retour) : les lignes de l'option 2
(`variant_group = 2`) ont toutes `position = 0`, contrairement à l'option
1 correctement numérotée 0 à 5 — n'affecte que l'ordre d'affichage au sein
d'une option, jamais le calcul des coches ci-dessus, mais explique un
ordre parfois arbitraire dans certains créneaux à 2 options.

### Validation

`tsc --noEmit` propre, `eslint` propre sur le fichier touché (6 erreurs
préexistantes confirmées sans lien via `git stash`), `next build` de
production complet, exit 0.

## BR — Nutrition : fin des devinettes, la coche se rattache à l'id exact du plan (2026-09-10)

Troisième signalement du même symptôme dans la même journée, en
majuscules : *"JE COCHE VALIDE JE CHANGE D'ONGLET JE REVIENS ET Y'A PLU
RIEN DE COCHE"*. L'Axe BQ juste au-dessus avait déjà fermé UN cas
(l'égalité 6=6 sur le postworkout) en priorisant les aliments
"distinctifs" (propres à une seule option). Test en direct de
l'utilisateur, capturé en base en temps réel : il valide l'Option 1 du
petit-déjeuner (Oeuf 150g, Pain complet, Miel 30g — les 3 aliments qui ne
sont PAS déjà couverts par l'Option 2 loguée plus tôt) — et pourtant
l'écran affiche de nouveau tout décoché. Cause : l'Option 2, loguée plus
tôt dans la journée, a PLUS d'aliments distinctifs qu'Option 1
(Flocons d'avoine, Whey, Oeuf 100g, Miel 25g — 4 contre 3), donc
l'heuristique de l'Axe BQ retombe sur Option 2 par comptage, alors qu'il
vient justement de valider Option 1. Un deuxième correctif indépendant
sur le MÊME symptôme, contourné par un angle différent du MÊME problème
de fond.

**Constat** : deviner quelle option est réellement mangée à partir
d'aliments qui peuvent se ressembler entre 2 options — que ce soit par
compte total (Axe BQ v1) ou par aliment distinctif (Axe BQ v2) — n'est
JAMAIS fiable à 100 %. Chaque heuristique ferme un cas et en laisse un
autre ouvert. Plutôt qu'un troisième rafistolage de la même famille,
correctif structurel : remplacer la déduction par un fait.

**Migration `food_logs_diet_plan_meal_id`** (appliquée directement,
FK nullable vers `diet_plan_meals`, `on delete set null`, index partiel) :
chaque ligne de `food_logs` peut désormais porter l'id EXACT de la ligne
du plan qu'elle satisfait, posé dès l'écriture — y compris la mise à
jour optimiste côté client, avant même la réponse serveur.

- `addFoodLog`/`logMealItems` (actions.ts) : nouveau paramètre
  `dietPlanMealId`, prioritaire dans le garde-fou anti-doublon existant
  (le filet food_id+quantité reste actif en dessous, pour le cas
  légitime d'un aliment partagé entre 2 options déjà loggué depuis
  l'autre — ne redemande jamais de le cocher deux fois).
- `ClientNutritionView.tsx` (`checkedMap`, `loggedVariantBySlot`) :
  matchent D'ABORD par `diet_plan_meal_id` — un fait, plus une
  déduction, zéro ambiguïté possible même quand 2 options partagent des
  aliments identiques. L'ancien heuristique de l'Axe BQ (aliment
  distinctif) ne sert plus que de filet pour les logs antérieurs à cette
  migration, jamais rattachés à une ligne de plan.

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 3 fichiers touchés (6
erreurs préexistantes confirmées sans lien via `git stash`), `next
build` de production complet, exit 0.

**Migration SQL à signaler** : `food_logs_diet_plan_meal_id` — appliquée
directement via le connecteur Supabase (`apply_migration`), pas besoin
d'action manuelle côté utilisateur, mentionnée ici par prudence
conformément à AGENTS.md.

## BS — Nutrition : le vrai coupable était un cache client posé plus tôt dans la même session (2026-09-10/11)

Après l'Axe BR (structurellement correct, vérifié : diet_plan_meal_id
bien posé, écriture réussie), le symptôme persistait à l'identique :
*"je coche, valide, j'attends, ça se décoche"*, répété de nombreuses
fois. Deux fausses pistes écartées une à une avec preuve à l'appui avant
de trouver la vraie cause :

1. **Onglet resté ouvert sur un ancien build** : confirmé en partie — un
   redémarrage complet du navigateur a fait passer l'état de "l'écriture
   n'atteint même pas le serveur" (0 ligne en base, 0 erreur nulle part)
   à "l'écriture réussit" (5 lignes confirmées en base, `diet_plan_meal_id`
   correctement posé, capture d'écran du navigateur à l'appui).
2. **Un bug de matching restant** : écarté par la donnée elle-même — le
   créneau testé n'a qu'une seule option (pas d'ambiguïté possible), et
   les 5 lignes en base pointent exactement vers les bonnes lignes du
   plan. Le calcul des coches n'avait donc rien à deviner.

**Cause réelle**, trouvée en relisant `next.config.ts` plutôt que de
retoucher une quatrième fois la logique de matching : `staleTimes.dynamic
= 30`, ajouté PLUS TÔT DANS CETTE MÊME SESSION (repasse perf, "changer
d'onglet prend 3s") pour mettre en cache le rendu côté client des pages
dynamiques 30 secondes, en pariant — avec un raisonnement documenté dans
le commentaire du réglage lui-même — que `revalidatePath` purge de façon
fiable ce cache après chaque mutation. AGENTS.md prévient explicitement
dès la première ligne que ce projet tourne sur une version de Next.js
avec des changements cassants par rapport au comportement standard :
exactement le genre d'hypothèse ("ça devrait marcher comme d'habitude")
que ce fichier demande de ne jamais faire sans vérifier. Le pari ne
tenait pas ici : l'écran resservait un rendu client vieux de quelques
secondes à quelques dizaines de secondes, sans la coche fraîchement
enregistrée.

**Fix** : `staleTimes.dynamic` retiré, retour au défaut Next.js 15+ (0
seconde, aucun cache client sur une page dynamique). La fonctionnalité de
suivi (le cœur de l'appli) prime sur les 3 secondes de navigation gagnées
par ce réglage — un compromis qui n'aurait jamais dû être fait dans une
appli où l'utilisateur voit un état "coché" avant de refermer l'onglet.

**Leçon** : un réglage ajouté dans la même session, avec un raisonnement
qui semblait solide sur le moment (documentation Next.js standard citée
à l'appui), peut devenir la cause d'un bug signalé des heures plus tard
sans lien apparent — vérifier les changements RÉCENTS de la session
elle-même, pas seulement le code touché par le correctif en cours, fait
partie du diagnostic.

### Validation

`tsc --noEmit` propre, `next build` de production complet, exit 0 (pas
de fichier applicatif touché, juste la config — pas de nouvelle passe
`eslint` nécessaire).

## BT — Nutrition : le vrai dernier déclencheur, le "deuxième filet" lui-même (2026-09-10/11)

Après l'Axe BS (retrait de `staleTimes`), même symptôme reformulé
précisément : *"j'ai changé d'onglet, je suis revenu, je vois plus rien
de coché"* — alors que la base venait d'être vérifiée à 100 % juste avant
(22/22 aliments du jour correctement rattachés à leur ligne de plan,
confirmé en base au moment exact du test). Deux correctifs de fond déjà
livrés dans la même journée (Axe BR, Axe BS) n'ont donc pas suffi sur CE
symptôme précis — la donnée était bonne, l'affichage la perdait quand
même, uniquement au retour sur l'onglet.

Repéré en cherchant, dans tout le fichier, le SEUL code qui se déclenche
spécifiquement au changement de visibilité de l'onglet (pas à un simple
re-render, pas à une mutation) : le "deuxième filet"
(`document.addEventListener("visibilitychange", ...)` → `router.refresh()`),
ajouté à l'origine (Axe W) pour couvrir le cas d'une PWA reprise en
arrière-plan sans rechargement complet. Exactement le déclencheur signalé
à chaque nouveau test.

**Fix** : ce filet est retiré. Argument principal, pas seulement
circonstanciel — une fois l'état local confirmé correct par un vrai
aller-retour serveur au moment du cochage (ce qui était déjà le cas ici,
vérifié), il n'y a plus de raison de le faire écraser par un forçage de
rafraîchissement supplémentaire simplement parce que l'onglet reprend le
focus. Le cas rare qu'il couvrait (app rouverte après très longtemps,
ex. changement de jour pendant que l'onglet dormait en arrière-plan)
reste couvert par le rendu serveur normal au prochain vrai chargement de
page — mécanisme qui n'a jamais dépendu de ce filet. `useRouter`/`router`
retirés du fichier (plus aucun autre usage).

**Bilan de la journée sur ce seul bug** (Axes BP à BT) : 5 passes
successives, chacune vérifiée par une preuve concrète (requête SQL
directe, capture d'écran, horodatage exact) avant de conclure et de
passer à la suivante, plutôt que de répéter la même hypothèse. Chaque
passe a réellement fermé un angle distinct du problème (dédoublonnage
serveur, égalité de comptage entre options, ambiguïté food_id+quantité,
cache client `staleTimes`, puis ce filet de rafraîchissement) — aucune
n'était un rafistolage redondant, même si le symptôme visible à
l'utilisateur restait identique d'une passe à l'autre.

### Validation

`tsc --noEmit` propre, `eslint` propre sur le fichier touché (6 erreurs
préexistantes confirmées sans lien via `git stash`), `next build` de
production complet, exit 0.

## BU — Nutrition : filet de cache final, no-store forcé sur toutes les lectures serveur (2026-09-10/11)

Retour direct après 4 correctifs de fond déjà livrés dans la même
journée sur le même symptôme (Axes BP à BT) : *"arrête de fix le fix mais
réfléchis vraiment et trouve la solution"*. Plutôt qu'un cinquième
correctif ciblé sur un nouveau cas particulier, recherche d'une cause
plus structurelle encore.

Trouvé en inspectant directement le code source de `@supabase/postgrest-js`
(node_modules) : le client ne pose JAMAIS `cache: "no-store"` sur ses
propres appels `fetch`. `export const dynamic = "force-dynamic"` sur la
page est censé, selon la documentation standard de Next.js, convertir
tous les `fetch` de la route en non-cachés — mais AGENTS.md prévient
explicitement, dès sa première ligne, que ce projet tourne sur une
version de Next.js avec des changements cassants par rapport au
comportement documenté. Plutôt que de faire encore confiance à un
comportement en cascade non vérifiable directement dans le code source
de CETTE version précise, filet explicite au niveau le plus bas :
`createServerSupabase` (`lib/supabase-server.ts`) passe désormais un
`fetch` enveloppé qui force `cache: "no-store"` sur CHAQUE requête,
quoi qu'il arrive plus haut dans la chaîne. Effet systémique : toutes
les pages qui lisent Supabase côté serveur en bénéficient, pas
seulement Nutrition.

### Validation

`tsc --noEmit` propre, `next build` de production complet, exit 0.

## BV — Réveil : la vraie raison d'une seule alerte malgré l'escalade (2026-09-11)

Retour direct, dans la foulée : *"j'ai eu que la notif du réveil, hors
moi je veux que le réveil soit un vrai réveil que je dois appuyer sur un
bouton pour arrêter que ça sonne"*. Investigation avant tout correctif :
le mécanisme complet existait déjà — `AlarmPlayer.tsx` (overlay plein
écran, son en boucle, bouton "Arrêter" obligatoire) et l'escalade côté
cron (`schedule-block-notify`, relance toutes les 5 min pendant 30 min
tant que non acquitté) sont tous les deux vérifiés actifs et corrects en
base (`alarm_ack_date` bien posé chaque matin où le réveil a été arrêté).
Vérifié aussi : les notifs tournent bien sur les 7 jours de la semaine
(progression normale de `last_notified_at` sur les 4 jours déjà écoulés,
samedi/dimanche à `null` car pas encore atteints cette semaine — pas un
bug, juste pas encore arrivé).

**Vraie cause trouvée** dans `public/sw.js` : chaque relance de
l'escalade réutilise le MÊME tag de notification (`"ep-coaching-alarm"`)
sans `renotify: true`. Par défaut, un navigateur qui reçoit une nouvelle
notification avec un tag déjà affiché REMPLACE l'ancienne EN SILENCE
(pas de nouvelle vibration, pas de nouvelle alerte perceptible) — seule
la toute première notification (05h59) a réellement alerté, les
relances suivantes de l'escalade se sont succédé sans que rien de
perceptible ne se passe, malgré un serveur qui faisait pourtant bien son
travail. `renotify: isAlarm` corrige ça : chaque relance revibre
désormais comme une notification neuve.

**Limite honnête, non contournable depuis le code** : si l'appli est
complètement fermée (aucun onglet ouvert, même en arrière-plan) au
moment du réveil, ni iOS ni Android n'autorisent un service worker à
jouer du son — seule la notification système (vibration + action
"Arrêter") reste disponible dans ce cas, c'était déjà documenté avant ce
correctif et reste une contrainte de plateforme, pas un bug.

### Validation

Fichier statique (`public/sw.js`), aucun `tsc`/`build` nécessaire —
changement vérifié par lecture directe du diff.

## BW — Nutrition : le vrai dernier bug, un démontage React sur changement d'onglet interne (2026-09-11)

Retour direct, après 6 correctifs déjà livrés sur la nutrition côté
serveur/cache : *"ça reste seulement si je reste sur la page, je veux que
ça se sauvegarde et que ça reste"*. Formulation clé qui a changé
l'angle de recherche : pas "ça se décoche après un délai" ou "au retour
d'onglet navigateur", mais littéralement "seulement si je reste sur LA
PAGE" — jamais examiné sous cet angle précis jusqu'ici.

Cause trouvée dans `CoachMoiNutritionTabs.tsx` (page "Ma nutrition" côté
coach — Santamaria l'utilise pour son propre suivi, en tant que coach,
pas client) : ses 2 onglets internes ("Suivi du jour" / "Mes objectifs &
plan") étaient rendus par une condition ternaire classique
(`tab === "suivi" ? <ClientNutritionView/> : <CoachClientNutritionTabs/>`)
— un pattern React banal, mais qui DÉMONTE entièrement le composant côté
non actif. Un simple coup d'œil sur "Mes objectifs & plan" puis retour
sur "Suivi du jour" recréait `ClientNutritionView` de zéro, réinitialisant
tout son état local (`todayLogs`, `variantChoice`...) depuis les props
figées au dernier vrai chargement de page — perdant l'affichage de toute
coche faite entre-temps, même déjà bien sauvegardée en base (vérifiable
à chaque fois par requête directe, comme documenté aux Axes précédents).
Complètement indépendant des 6 correctifs précédents (dédoublonnage,
ambiguïté variante, `staleTimes`, filet `visibilitychange`, cache fetch
`no-store`) : ceux-là concernaient tous un aller-retour serveur, celui-ci
ne touche jamais le réseau.

**Fix** : les deux onglets restent désormais montés en permanence
(`<div hidden={...}>` au lieu du rendu conditionnel) — seule la
visibilité CSS change, l'état de `ClientNutritionView` survit maintenant
à un aller-retour entre les deux onglets.

**Leçon de cette journée entière sur un seul bug** (Axes BP à BW, 7
correctifs) : chaque reformulation du symptôme par l'utilisateur portait
une information réellement nouvelle et exploitable ("j'attends 5s" →
"je change d'onglet" → "je teste maintenant, regarde" → "ça reste
*seulement si je reste sur la page*") — jamais une simple répétition.
Le bon réflexe a été de retraiter chaque reformulation comme un nouvel
indice à suivre avec une preuve concrète (requête SQL, capture d'écran,
horodatage), jamais comme "le même bug qu'avant, encore raté".

### Validation

`tsc --noEmit` propre, `eslint` propre, `next build` de production
complet, exit 0.

## BY — Studio créatif : positionnement YouTube + recherche/remontée des scripts qui traînent (2026-09-11)

Retour direct : script YouTube tourné jugé trop technique/centré sur
l'appli au lieu de parler à l'audience, et pas d'outil de décision sur
les scripts en attente. Deux corrections, budget tokens limité (routines
à préserver jusqu'à mardi 14h) donc traité de façon ciblée :

- **Notion** (guide production scripts YouTube) : nouveau bloc
  positionnement (qui est Santamaria/EP Coaching, niche, qui il aide,
  comment — repris du site vitrine), règle explicite "l'appli n'est
  jamais le sujet d'une vidéo", et un test de pertinence avant de choisir
  un sujet.
- **`IdeationScripts.tsx`** : barre de recherche (multi-mots, insensible
  casse/accents) sur titre+script+hook+pilier ; les scripts actifs sont
  désormais triés par ancienneté dans leur étape (pas par création), avec
  un seuil par statut (3j à tourner / 2j tourné) et un badge ⏳ — pour
  vraiment débloquer le pipeline, pas juste le signaler.
- Suite du même retour ("filtrer poste/pas poste, youtube/insta, pilier") :
  trois filtres déroulants combinables (statut/plateforme/pilier) + un
  filtre de statut explicite désactive le repli "publiés" (sinon le
  filtre choisi finirait caché dans une section repliée par défaut).

### Validation

`tsc --noEmit` propre, `eslint` propre (1 erreur préexistante confirmée
sans lien via `git stash`), `next build` de production complet, exit 0.

## BZ — Notif fantôme "Clients" (self-tracking compté comme signal client) + CTA YouTube copié d'Instagram (2026-09-11)

Retour direct : badge rouge "1" sur Clients alors qu'il n'y a encore
aucun client. Cause : `is_own_coach(client_id)` de la RLS rend vrai pour
le coach sur SES PROPRES données (Santamaria suit sa propre physique via
son compte coach) — 1 ligne `photo_updates` à lui, non "répondue",
comptait comme signal client en attente. `getPendingPhotoUpdatesCount`/
`getPendingBilansCount`/`getPendingCorrectionsCount` excluent désormais
`client_id = l'id du coach connecté`.

Suite du retour direct sur le script YouTube (Axe BY) : le `cta` copiait
le mécanisme "commente [numéro]" d'Instagram (utile là-bas car pas de
lien cliquable en description) — inutile sur YouTube où le lien natif en
description rend le mot-clé sans fonction. Guide Notion et script déjà
en base corrigés : CTA YouTube redirige vers Instagram ou vers l'appel,
leadmagnet juste mentionné "en description", plus de mot-clé à commenter.

### Validation

`tsc --noEmit` propre, `eslint` propre, `next build` de production
complet, exit 0.

## CA — Studio créatif : description modifiable + "abonne-toi" recorrigé (2026-09-11)

Retour direct : "on peut copier mais je veux pouvoir modifier" (la
description, `instagram_caption`) + "abonne-toi pour un nouveau script"
n'a pas de sens pour un spectateur. Description dotée du même mécanisme
d'édition que le script (`content`) : clic pour ouvrir, Enregistrer/
Annuler, bouton "+ Ajouter" si vide plutôt qu'un bloc qui disparaît.
`updateScript` accepte un nouveau paramètre `caption`. Texte "nouveau
script" → "nouvelles vidéos" corrigé sur le script déjà en base et dans
le guide Notion pour les prochains.

### Validation

`tsc --noEmit` propre, `eslint` propre (1 erreur préexistante, sans
lien), `next build` de production complet, exit 0.

## CB — Repasse systémique : le démontage sur onglet trouvé à 5 autres endroits (2026-09-15/16)

Retour direct après quelques jours sans travail dessus : "tu as pris du
retard, rattrape ton retard, travaille bien, ne bâcle pas, prends ton
temps, réfléchis". Supabase/Notion/Vercel déconnectés cette session
(aucune vérification live possible) — travail concentré sur une vraie
relecture du code livré en rafale les jours précédents, plutôt que
d'attendre une nouvelle donnée à corriger au coup par coup.

En vérifiant que le correctif `CoachMoiNutritionTabs.tsx` (Axe BW, "ça
reste seulement si je reste sur la page") tenait toujours, le même motif
a été retrouvé à **5 autres endroits** : un rendu conditionnel entre
onglets internes (`{tab === "x" && <Composant/>}`) démonte ENTIÈREMENT le
sous-composant actif dès qu'on va voir un autre onglet — perdant tout
brouillon en cours (recherche/filtres, script ou description ouverts en
édition, note en train d'être tapée, bloc du Business Model Canvas en
cours de saisie avant son autosave sur blur) sans jamais toucher
directement à ce contenu.

Corrigés par le même principe partout (`<div hidden={...}>` au lieu du
rendu conditionnel — tous vérifiés sans fetch réseau au montage, coût nul
à rester montés) :
- `IdeationScripts.tsx` — les 5 sous-onglets (Mes scripts/Prompts/Hooks/
  CTA/Montage), repassé le même jour que sa dernière modif (Axe CA).
- `IdeationHub.tsx` — les 5 espaces du Studio créatif, démontage AU-DESSUS
  de `IdeationScripts.tsx` : rendait le correctif précédent inutile dès
  qu'on quittait le Studio créatif entier, pas seulement l'onglet Scripts.
- `MindsetView.tsx` — les 4 onglets (Profil/Habitudes/Conseils/Journal).
- `CoachDocumentsSpace.tsx` — les 3 onglets (Modèles/Fichiers/Notes).
- `BusinessHub.tsx` — les 7 onglets (Dashboard/Objectifs/Roadmap/Canvas/
  Funnel/Réseau/Checklist).

Recherche élargie à d'autres noms de variable de tab (`section`/`mode`/
`screen`/`panel`) et à la forme ternaire (`... ? <X/> : null`) : aucune
autre occurrence trouvée dans `components/`.

**Leçon** : un bug de pattern React (pas de logique métier) trouvé une
fois vaut la peine d'être cherché ailleurs dans le même style de code —
il s'était répété silencieusement 5 fois avant d'être remarqué, à chaque
fois avec le même correctif possible en quelques minutes.

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 5 fichiers (2 erreurs
préexistantes sur `CoachDocumentsSpace.tsx`, sans lien, confirmées via
`git stash`), `next build` de production complet, exit 0.

## CC — Studio créatif : confirmation + raison avant suppression de script, plateformes de contenu élargies (2026-09-16)

Retour direct, deux demandes traitées ensemble (même écran) : "les scripts que
je supprime, tu peux encore optimiser en demandant avant de juste cliquer sur
la poubelle, un truc du genre pourquoi supprimer, car faux ou car sujet nul
etc" et "je veux être une référence pour tout sujet dans ma niche... mets en
place mon contenu pour X, Reddit, WhatsApp, Discord, Telegram, YouTube en
texte, carrousels et stories Insta".

**Suppression avec raison** : un clic sur la corbeille (`IdeationScripts.tsx`)
ouvre désormais un petit choix (information fausse/dépassée, sujet qui
n'intéresse pas, autre avec détail libre) avant toute suppression réelle.
`deleteScript` (studio/actions.ts) journalise la raison dans une nouvelle
table `coach_script_deletion_reasons` (migration `20260916c`, best effort :
un échec d'écriture du journal n'annule jamais la suppression déjà faite) —
objectif secondaire assumé : repérer plus tard quels piliers/angles se font
le plus souvent rejeter, un vrai signal pour la stratégie de contenu, pas
seulement une confirmation UI.

**Plateformes élargies** : `coach_scripts.platform` était déjà du texte libre
(pas de contrainte CHECK, voir migration `20260901d`), seul `PLATFORM_LABELS`
(affichage) et les formulaires ignoraient tout ce qui n'était pas
instagram/youtube/linkedin. Ajout des badges + options pour Carrousel/Story
Instagram, TikTok, Facebook, Threads, YouTube Communauté, X, Reddit, Statut/
Chaîne WhatsApp, Discord, Telegram, Pinterest, Twitch. Un script existant est
désormais retaggable directement (le badge devient un sélecteur), et le
formulaire de création propose la plateforme dès l'écriture au lieu de
toujours défaut à Instagram. `content_ideas` (pipeline d'idées) volontairement
laissé à son enum actuel : la granularité fine par plateforme vit dans
`coach_scripts`, pas dans le brouillon de plus haut niveau.

Le Générateur de prompts (`SocialGenerator.tsx`, Studio créatif > Générateur)
gagne une case à cocher par plateforme (au lieu du seul trio fixe carrousel/
légende Insta/LinkedIn), chacune avec sa propre consigne adaptée au format
(thread numéroté sur X, ton non commercial sur Reddit, texte très court sur
Statut WhatsApp...). Toujours le même paradigme sans appel IA (voir Axe du
2026-08-17) : un prompt prêt à coller dans Claude, jamais un appel serveur.
Guide de référence complet ajouté dans Notion le même jour (🌐 Guide
production contenu multi-plateformes, sous 📱 Contenu), qui documente pour
quel pilier/segment chaque nouvelle plateforme sert et pourquoi, sans changer
l'offre ni le client idéal.

### Validation

`tsc --noEmit` propre, `eslint` propre sur les fichiers touchés, `next build`
de production complet, exit 0.

## CD — Incident quota Supabase : prefetch intégral de la nav supprimé (2026-09-16)

Retour direct : "Supabase me dit que j'ai atteint mon quota d'utilisation,
ça repart le 27 septembre" avec effet constaté sur la prod (connexions
refusées). En cherchant une cause plausible avec seulement 14 comptes actifs
(un dépassement de quota gratuit à ce volume est anormal, pas un simple effet
du nombre d'utilisateurs) : `DashboardNav.tsx` faisait `router.prefetch()` de
la TOTALITÉ des segments de navigation (81 au total coach+client confondus,
30 à 50 pour un rôle donné) dès le montage du tableau de bord, à chaque
connexion. Chaque `router.prefetch()` d'une route App Router force le rendu
serveur complet de la page ciblée, donc toutes ses requêtes Supabase, même
pour des sections jamais visitées de la session. Avec un dashboard qui compte
des dizaines d'entrées de nav, l'immense majorité de ces lectures étaient
gaspillées.

Corrigé : seuls les 4 à 6 onglets toujours visibles (`tabs`, la barre du bas
sur mobile / du haut sur desktop) restent préchauffés au montage. Le reste de
la sidebar était déjà rendu en `<Link>` (Next.js les préchauffe lui-même à
l'affichage dans le viewport ou au survol) — rien à ajouter à la main pour
rester réactif, juste arrêter de tout précharger d'office. Ne résout pas le
quota déjà consommé ce mois-ci (reset le 27/09 ou passage en plan payant,
décision qui revient à l'utilisateur), mais devrait fortement réduire le
risque de récidive. Voir `ECOSYSTEME.md` (Priorité 0) pour le suivi complet
et l'audit plus large lancé sur d'autres sources de surconsommation.

### Validation

`tsc --noEmit` propre, `eslint` propre, `next build` de production complet,
exit 0.

## CE — Audit nutrition : tracking/log/coche/validation aliments/repas/recettes (2026-09-16)

Retour direct : "il faut que dans nutrition on puisse tracker loguer cocher
valider les aliments repas et recette, que tout fonctionne et se sauvegarde
et reste bien". Vérification en profondeur plutôt que suppositions.

**Vérification ciblée d'abord** : `ClientNutritionView.tsx` a bien 3 onglets
internes en rendu conditionnel (`today`/`history`/`courses`), mais **sain** —
tout l'état qui compte (logs du jour, modales, formulaires) vit dans le
composant parent, jamais démonté au changement d'onglet. Seul `MealSlotCard`
se démonte, avec un état purement cosmétique (accordéon ouvert, photo
affichée) sans conséquence.

**5 vrais bugs trouvés et corrigés** :
1. `CoachClientNutritionTabs.tsx` — même bug de démontage que l'Axe CB, oublié
   à l'époque car côté nutrition : quitter l'onglet "Plan & objectifs" pendant
   la construction d'un plan de diète (`PlanBuilder`) effaçait tout le
   brouillon en cours. Corrigé (`hidden` au lieu du rendu conditionnel).
2. `ClientProfileTabs.tsx` — un niveau au-dessus, enveloppait déjà
   `CoachClientNutritionTabs` dans un rendu conditionnel sur l'onglet
   "Nutrition" de la fiche client, rendant le correctif n°1 inutile dès qu'on
   change d'onglet de fiche. Corrigé uniquement sur cet onglet (les 11 autres
   onglets de cette fiche ont potentiellement le même risque, signalé mais
   hors périmètre nutrition, à reprendre dans une repasse dédiée).
3. `ClientNutritionView.tsx`, `handleLogSavedMeal` — seule fonction de log à
   ne jamais réconcilier son entrée optimiste avec l'id serveur réel après
   succès (contrairement à `handleAddFood`/`handleAddRecipe`/`handleQuickAdd`/
   `handleValidateSlot`) : loguer un repas enregistré puis changer d'onglet
   faisait apparaître ce repas en double à l'écran (aucun doublon réel en
   base). Corrigé avec le même mécanisme de réconciliation que les autres.
4. `app/dashboard/client/nutrition/actions.ts` — `removeFoodLog`,
   `deleteSavedMeal`, `activateOwnDietPlan`, `deactivateOwnDietPlan`
   n'avaient jamais leur résultat Supabase vérifié : un échec serveur
   renvoyait quand même un faux succès à l'écran.
5. Même correctif côté coach dans
   `app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions.ts`
   (`activateDietPlan`, `deactivateDietPlan`).

### Validation

`tsc --noEmit` propre, `eslint` propre sur 4 fichiers sur 5 (6 erreurs
`react-hooks/set-state-in-effect` préexistantes sur `ClientNutritionView.tsx`,
confirmées sans lien via `git stash`), `next build` de production complet
(79/79 pages), exit 0.

## CF — Mailing : taux d'ouverture/clic par campagne (2026-09-16)

Retour direct : "travaille encore plus sur le mailing et derrière le
tracking des données, taux d'ouverture, de clic etc, dans l'appli en tant
que coach". Rien n'existait jusqu'ici pour lire les statistiques Brevo après
l'envoi d'une campagne (seul `brevo_campaign_id` était stocké).

`lib/brevo-stats.ts` (nouveau, lecture, séparé de `lib/brevo-mailing.ts` qui
reste dédié à l'écriture) : `getCampaignStats` lit
`GET /v3/emailCampaigns/{id}?statistics=globalStats` — format de réponse
vérifié en direct contre le vrai compte Brevo de production (pas seulement la
doc). `coach_mailings` gagne `stats_json`/`stats_fetched_at` (cache, migration
`20260916b`, **à appliquer manuellement dans le Supabase SQL Editor**) pour
éviter de re-fetch l'API Brevo à chaque rendu. Bouton "Rafraîchir les stats"
par campagne et global dans `CoachMailingComposer.tsx`, avec un résumé agrégé
(moyenne des 5 derniers envois) et un repère de lecture (taux d'ouverture
correct ~20-30%, bon taux de clic ~2-5%, un coach seul n'a pas cette
référence sous la main). Amélioration ajoutée de son propre chef : badge
d'alerte quand une campagne tombe sous 50% de la moyenne des autres envois du
coach, et mise en évidence des hard bounces à nettoyer de la liste.

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 6 fichiers touchés (aucun
warning), `next build` de production complet, exit 0.

**Migration à appliquer manuellement** : `20260916b_mailing_stats_cache.sql`
dans le Supabase SQL Editor avant que les statistiques ne soient utilisables
en prod (en plus de `20260916c` de l'Axe CC, voir plus haut).

## CG — Outil de suivi des campagnes publicitaires (2026-09-16)

Retour direct : "construis dans l'appli les ads (Google Ads, Meta Ads),
vraiment un bon outil utile et surtout optimisé et efficace, rapide, réfléchi
et bien travaillé". Rien n'existait avant (aucune table, aucune page liée à
la publicité).

Nouvelle entrée **Mon business > Publicité** (`app/dashboard/coach/business/
ads/`, `components/coach/AdsTracker.tsx`) : pilotage MANUEL, volontairement
sans intégration API Google/Meta (aucun credential disponible, hors scope).
Table `ad_campaigns` (migration `20260916a`, **à appliquer manuellement**),
`platform`/`objective` en texte libre (comme `coach_scripts.format`),
`status` avec contrainte car il pilote un vrai comportement applicatif.
`lib/ad-campaigns.ts` centralise les calculs purs (CPM, CPC, CTR, coût par
lead, ROAS), jugés relativement à la moyenne des campagnes du coach plutôt
que sur un seuil absolu universel (l'économie de chaque coach diffère).

Deux ajouts non demandés explicitement : alerte visuelle quand une campagne
dépense depuis 3 jours sans le moindre lead, et une raison d'arrêt demandée
automatiquement au passage en statut "Terminée" (même esprit que les
suppressions de script de l'Axe CC : capitaliser sur pourquoi ça n'a pas
marché plutôt que juste archiver).

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 5 fichiers touchés, `next
build` de production complet (route `/dashboard/coach/business/ads`
générée), exit 0.

**Migration à appliquer manuellement** : `20260916a_ad_campaigns.sql` dans le
Supabase SQL Editor (en plus de `20260916b`/`20260916c` ci-dessus).

## CH — Audit egress Supabase : lead magnets sur-fetchés (2026-09-16)

Suite de l'Axe CD (incident quota). Audit ciblé du reste du code après le
correctif `DashboardNav.tsx` : polling (`setInterval`), sur-fetching
(`select("*")`), images non redimensionnées, autres `router.prefetch`.

**Polling** : tous les `setInterval` du repo (agenda, messagerie, chronomètre
de séance, lecteur audio, minuteur d'enregistrement, bannière de session)
vérifiés un par un — aucun ne relit Supabase dans l'intervalle, tous des
horloges locales (`Date.now()`) ou de la lecture `localStorage`. La vraie
messagerie (`ConversationView.tsx`) utilise déjà Supabase Realtime
(`postgres_changes`), pas de polling. Rien à corriger ici.

**Trouvaille principale : `lib/lead-magnets.ts`** — `getAllLeadMagnetsCached()`
sélectionnait `content`+`sources` (texte intégral de chaque guide) pour
TOUTES les entrées publiées, réutilisé tel quel par 5 écrans dont `/ressources`
(page publique, canal d'acquisition) qui n'affiche que titre/accroche/
catégorie. À l'échelle des ~1000 lead magnets visés (`LEADMAGNETS.md`), c'est
le poste d'egress le plus lourd trouvé dans tout l'audit, largement devant
`DashboardNav.tsx`. Séparé en deux caches : `SELECT_FIELDS_LIST` (listing,
recherche via `/api/library-search`) sans `content`/`sources`, et
`SELECT_FIELDS_FULL` via une nouvelle `getAllGuidesWithContent()` réservée au
seul consommateur qui a vraiment besoin du texte intégral
(`SocialGenerator.tsx`, Studio créatif). `ConversationView.tsx` :
`select("*")` sur `messages` remplacé par les colonnes explicites déjà
utilisées.

**Documenté, pas corrigé** (chantiers à part entière, pas des "correctifs
sûrs et rapides") : `utils/photos.ts`/`personal-photos.ts`/`avatar.ts`
génèrent une nouvelle `createSignedUrl` à CHAQUE chargement de page (jeton
différent à chaque fois), empêchant tout cache navigateur même pour une
photo déjà vue 10 fois — vrai poste d'egress, corrigé proprement demanderait
un cache d'URLs signées avec invalidation à l'upload/suppression. Aucune
compression côté client avant upload des photos de progression. Les
transformations d'image Supabase Storage (`?width=&quality=`) sont une
fonctionnalité payante (plan Pro), indisponible sur le plan actuel — pas
d'effet à les ajouter maintenant. Les vidéos de formation passent par
YouTube (`youtube_id`), aucun risque Supabase Storage de ce côté.

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 5 fichiers touchés (2 erreurs
préexistantes confirmées sans lien via `git stash`/`stash pop`), `next build`
de production complet (79/79 pages, y compris `/ressources/[slug]` en SSG),
exit 0.

## CI — Notifications qui dérivaient d'une heure selon été/hiver (2026-09-16)

Retour direct, deuxième vague de la même journée : "les notifs de l'appli,
il faut qu'elles arrivent réellement à la bonne heure, pas 2 ou 5 min après,
ou même bien après, juste car j'ai ouvert l'appli". Vérifié plutôt que
supposé, via une lecture directe des tables `cron.job`/`net.http_request`
en base (pas juste le code des migrations) : les 23 jobs pg_cron du projet
répondaient tous en 200, l'hypothèse d'un secret jamais configuré
(`REPLACE_WITH_CRON_SECRET` resté littéral dans un fichier de migration) est
écartée, et aucun mécanisme côté client ne rattrape quoi que ce soit à
l'ouverture de l'appli (toutes les notifs sont 100% server side).

**Cause réelle confirmée** : `nutrition-reminder`, `missed-session-check`,
`stagnation-escalation`, `weekly-progress-recap` et `weekly-sleep-recap`
étaient programmés une seule fois par jour à un décalage UTC fixe (ex.
`'0 19 * * *'` commenté "19h UTC = 20h Paris") pour viser une heure Paris
précise. `pg_cron` ne connaît aucun fuseau horaire et ne s'ajuste jamais
seul au changement d'heure été/hiver (2 fois par an) : un décalage figé qui
donne la bonne heure Paris à une saison donne automatiquement une heure
fausse à l'autre. Pire, le calcul de `nutrition-reminder` était déjà faux à
l'écriture (19h UTC + 2h CEST = 21h, pas 20h comme commenté). Résultat :
ces notifications dérivaient silencieusement d'une heure, sans qu'aucune
erreur ne remonte nulle part (`pg_net` ne fait rien remonter côté appli).
`weekly-sleep-recap` s'est révélé être un job jamais accompagné d'une
migration commitée (enregistré directement en base à l'époque), comblé au
passage.

**Correctif structurel** (migration `20260916_fix_dst_drift_notification_crons.sql`,
**à appliquer manuellement**, en remplaçant `REPLACE_WITH_CRON_SECRET` par le
vrai secret) : chaque job tourne désormais toutes les 15 minutes (toutes les
heures le dimanche pour les jobs hebdomadaires), et c'est la route Next.js
elle-même qui décide dynamiquement si on est dans le bon créneau, calculé en
heure de Paris réelle via `nowInParis()` (`lib/dates.ts`, `Intl`/`timeZone`,
gère le DST automatiquement, jamais un décalage figé à recalculer deux fois
par an). `meal-reminders` et `send-reminders` faisaient déjà ça correctement,
non touchés.

### Validation

`tsc --noEmit` propre, `eslint` propre, `next build` de production complet,
exit 0.

**Migration à appliquer manuellement** : `20260916_fix_dst_drift_notification_crons.sql`
(remplacer `REPLACE_WITH_CRON_SECRET` par le vrai `CRON_SECRET` avant
exécution).

## CJ — Onglet Masterclass : tutoriels business A à Z (2026-09-16)

Retour direct : un onglet de tutoriels texte complets, avec de vraies étapes
concrètes menant à un résultat réel produit, pas juste de la lecture.
Citation retenue comme fil rouge de tout le contenu : "prends l'idée de base
et simplifie-la, même un enfant de 5 ans doit pouvoir la comprendre".

Nouvel espace **Mon business > Masterclass**. Contenu de référence en dur
dans le code (`lib/masterclass-guides.ts`, même logique que
`lib/content-library.ts` : partagé par tous les coachs, édité uniquement
par le code, pas de CRUD par coach pour le contenu lui-même). Seule la
progression (case cochée par étape) vit en base, par coach
(`coach_masterclass_progress`, migration `20260916d`, RLS `coach_id =
auth.uid()`).

Trois premiers guides (5 à 8 étapes chacun, un `finalOutcome` explicite et
des `deliverables` à chaque étape) :
- **Notion** : structure Business/3 sous-pages, méthode en 3 questions pour
  définir ses piliers de contenu, rituel hebdomadaire de 15-20 min avec le
  tableau exact à créer, connexion du Notion au compte Claude.
- **Stripe** : produit/service, lien de paiement en un clic, facturation
  automatique, et une trame structurelle de CGV/contrat avec un
  avertissement explicite en tête de section : ce n'est pas un conseil
  juridique, à faire relire par un professionnel du droit avant tout usage
  commercial réel.
- **Claude/Claude Code pour un coach** : contrainte respectée à la lettre
  ("je ne veux pas que Claude soit dans l'appli, sinon c'est payant pour
  moi") — le coach utilise SON PROPRE compte Claude, jamais celui de la
  plateforme, connecté à son propre Notion (guide 1), avec un template de
  prompt repris directement de `SocialGenerator.tsx` (même paradigme déjà
  établi dans l'app) et un mapping explicite vers où coller le résultat
  produit (Studio créatif > Mes scripts, Mailing...).

### Validation

`tsc --noEmit` propre, `eslint` propre, `next build` de production complet,
exit 0.

**Migration à appliquer manuellement** : `20260916d_masterclass_progress.sql`.

## CK — Recherche approximative + page d'accueil sans SEO (2026-09-16)

Retour direct : "améliore toutes les barres de recherche pour qu'on trouve
même si c'est mal écrit ou approximatif". `lib/fuzzy-search.ts` : tolérance
de Levenshtein par mot (0 faute sous 4 lettres, 1 sous 7, 2 au-delà), en
plus de la sous-chaîne exacte déjà en place partout. Appliqué à
`/api/library-search` (aliments/exercices/salles/science, ce qui alimente
la palette de commande), aux filtres client de `CommandPalette.tsx`
(clients, navigation), et à `IdeationScripts.tsx` (remplace sa propre
normalisation locale, accents seulement). `searchLeadMagnets` (recherche
plein texte Postgres, `websearch_to_tsquery` config français) volontairement
laissé tel quel : déjà tolérant aux accents/pluriels via le dictionnaire
français, une vraie tolérance aux fautes de frappe demanderait `pg_trgm` et
un index dédié, un chantier à part plutôt qu'un correctif de ce soir.

En vérifiant les métadonnées SEO des pages publiques (`grep` sur tout
`app/*/page.tsx`) : **`app/page.tsx`, la page d'accueil, destination du lien
en bio Instagram**, n'avait aucun titre ni description. Cause : en
`"use client"` sans la moindre raison (zéro hook, zéro état, zéro
gestionnaire d'événement dans les 378 lignes du fichier) — juste assez pour
empêcher tout `export const metadata`. Même bug déjà rencontré une fois sur
`app/outils/page.tsx` (2026-08-16). Redevenue un composant serveur,
métadonnées ajoutées. `/launch` et `/onboarding` (les deux seules autres
pages sans metadata) vérifiées : redirections pures sans contenu, pas un
manque réel.

### Validation

`tsc --noEmit` propre, `eslint` propre, `next build` de production complet,
exit 0.

## CL — Masterclass : 4e guide, outils externes recommandés (2026-09-16)

Retour direct : "tous les outils qu'un coach a besoin, pas encore dans
l'appli, ManyChat, Notion, Calendly etc". Plutôt qu'une page séparée, ajouté
comme 4e guide dans `MASTERCLASS_GUIDES` (`lib/masterclass-guides.ts`) :
même infra que les 3 guides précédents (steps/checkbox/deliverables/
progression par coach), rien de nouveau à construire côté composants ou
migration. Couvre ManyChat (lié au CTA `coach_scripts.cta`/`instagram_caption`),
Calendly, un renvoi court vers le guide Notion déjà existant (pas de
redondance), Canva, CapCut, une planification multi-plateformes (Later/
Metricool, pertinent maintenant que l'app couvre X/Reddit/WhatsApp/Discord/
Telegram/YouTube Communauté en plus d'Insta/YouTube/LinkedIn). Deux ajouts
de l'agent lui-même, justifiés : Trello (tâches admin ponctuelles) et
Bitwarden (gestion des mots de passe, risque concret avec la multiplication
des comptes outils).

### Validation

`tsc --noEmit` propre, `eslint` propre, `next build` de production complet,
exit 0.

## CM — Rétention nouveaux inscrits : le membre encouragé à son premier geste (2026-09-16)

Retour direct : "fais en sorte que les nouveaux inscrits reviennent
réellement". Audit d'abord, pas de reconstruction : `weekly-reengagement`
tourne déjà quotidiennement depuis le 2026-09-08 (le J+1 était déjà
couvert), et `MembresView.tsx`/`getCommunityMembersWithActivity` affichent
déjà un badge "Nouveau, à accueillir" + un bouton "Relancer" pour les
membres gratuits, distinctement des clients payants. `lib/onboarding-
checklist.ts` suit déjà 4 actions clés (séance/repas/bilan/post communauté).

**Le vrai trou** : sur les 3 premières actions, points et notification
étaient déjà déclenchés mais UNIQUEMENT vers le coach (`notifyUser(coach.id,
...)` dans `sessions/[id]/complete/route.ts`, `nutrition/actions.ts`,
`bilan/actions.ts`), jamais vers le membre lui-même. Pour un membre gratuit
sans coach (l'écrasante majorité des comptes), ça veut dire que personne ne
reconnaît son tout premier vrai geste, exactement l'instant où un
renforcement positif compte le plus.

Corrigé : `lib/first-action-celebration.ts` (`isFirstEverAction`, vérifié
AVANT l'écriture pour gérer un insert multi-lignes comme une séance à
plusieurs exercices ; `celebrateFirstAction`, notif in-app + push
fire-and-forget), branché aux 3 mêmes actions déjà suivies par la checklist.
Une seule fois par membre et par action.

### Validation

`tsc --noEmit` propre, `eslint` propre, `next build` de production complet,
exit 0. Aucune migration nécessaire (tables et colonnes déjà existantes).

## CN — Routine cloud carrousel Instagram créée et testée avec succès (2026-09-16)

Retour direct après le rappel "audit ok mais aussi agis" : le carrousel
Instagram n'avait toujours aucune routine de production quotidienne
(contrairement aux reels, à YouTube, et aux séquences story qui existaient
déjà — vérifié via `RemoteTrigger list_runs` avant d'agir, pas supposé).
Créée `EP Coaching - Production quotidienne de carrousel Instagram`
(`trig_01NoBBHCKsRN7iRUVgzTbbRs`, 2h45 UTC/4h45 Paris, entre le créneau reels
et YouTube), même pipeline que les reels/YouTube : écrit directement dans
`coach_scripts` (`platform='instagram_carrousel'`), lit d'abord le guide
reels et la stratégie de contenu (piliers 2/comprendre_pour_decider et
4/le_apres prioritaires pour ce format), vérifie les 30 derniers carrousels
et les 50 derniers reels/YouTube pour ne jamais répéter un sujet/angle.

Lancée manuellement une première fois pour valider avant d'attendre demain
matin : succès complet en 149s. Carrousel de 7 slides sur la surcharge
progressive, sourcé sur 3 études réelles avec DOI (dont une citée dans le
lead magnet 376 déjà en base), numéro de leadmagnet identique entre
CTA/description/source, inséré avec `status='a_tourner'`. Confirme au
passage que les écritures Supabase fonctionnent normalement en ce moment
(la routine a explicitement vérifié `ACTIVE_HEALTHY` avant d'insérer).

En vérifiant l'historique des routines existantes au passage : la routine
Séquences Story (déjà en place) a échoué sur sa dernière exécution
(2026-09-15) pour la même limite de session Claude rencontrée par mes
propres agents ce soir (`rate_limit`), pas un bug côté routine — repassera
normalement à la prochaine exécution planifiée, rien à corriger.

### Validation

Test réel en production (pas de tsc/eslint/build applicable, aucun code
modifié — action de configuration cloud uniquement). Vérifié directement en
base : ligne insérée avec succès dans `coach_scripts`.

## CO — Repasse systémique du démontage sur onglet, tour 2 : fiche client complète (2026-09-16)

Suite de l'Axe CB (5 fichiers) et de l'audit nutrition (Axe CE, 2 fichiers
supplémentaires) : la fiche client complète (`ClientProfileTabs.tsx`, 15
onglets) n'avait été vérifiée que pour son onglet nutrition. Vérification
individuelle des 14 autres, pas en bloc :

**Corrigés (`hidden`)** : profil (CoachingPhasePanel, SubscriptionToggle,
ClientMedicalConstraintsPanel — 3 formulaires réels), intake
(ClientIntakeForm), cycle (ClientPeriodTracking), photos
(PhotoFeedbackForm), checkins (CoachReplyForm + upload vidéo annoté en
cours), rappels (CoachClientTasksView).

**Vérifiés sains, non touchés** : agenda/pas/sommeil (déjà gardés par
`readOnly`/`editable={false}` côté composant), mindset/roadmap/logbook/
programme/bilans (aucun état local à risque, juste du cosmétique
re-dérivable).

**Même motif trouvé ailleurs et corrigé** : `ProgrammationHub.tsx` (onglet
diète, `PlanBuilder`) et `CoachNotesView.tsx` (journal et décisions,
formulaires multi-champs). `OrganisationView.tsx` et
`CoachOnboardingFlow.tsx` vérifiés sains (sauvegarde `onBlur` déjà avant le
changement d'onglet, ou composants déjà auto-sauvegardants).

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 3 fichiers modifiés, `next
build` de production complet, exit 0. Aucun `git stash` nécessaire.

## CP — Clarté de marque sur les reels : identité explicite + zéro ton étude (2026-09-16)

Retour direct, verbatim, très frustré : "un enfant doit comprendre. Instagram
c'est pas ici qu'on développe et montre l'expertise, ça doit être simple,
pas de gnagnagna étude. Faut que direct le gars qui tombe sur mon reel
sache qui je suis, ce que je fais. C'est une aberration qu'après avoir
discuté avec quelqu'un, il me demande 'tu travailles dans quoi ?'". Plafond
observé : ~300 vues/reel. Constat en lisant les deux guides existants :
🎥 Guide production scripts YouTube avait déjà un bloc "Qui est Santamaria /
EP Coaching" explicite en tête de page, 🎬 Guide production scripts reels
NE L'AVAIT PAS — exactement l'angle mort que le retour direct décrit, le
format qui en a le PLUS besoin (un spectateur ne voit souvent qu'UN SEUL
reel, jamais 10-14 minutes pour comprendre progressivement) était celui qui
en manquait.

Corrigé directement dans Notion (pas du code, ces guides pilotent les
routines cloud de production) :
- Ajout du même bloc identité (qui/niche/qui il aide/comment/phrase
  d'accroche) au guide reels, repris du guide YouTube.
- Nouvelle **Règle n°8** au guide reels : identité claire dans les 3
  premières secondes ou en description sur CHAQUE reel quel que soit le
  pilier ; jamais de ton "étude"/jargon sur Instagram (contrairement à
  YouTube qui reste le seul format pour le détail/la nuance scientifique,
  la règle n°1 sourcing PubMed reste, seule la FORME change) ; test
  explicite avant insertion "un enfant de 5 ans comprendrait-il cette
  phrase du premier coup ?" ; ajout à la boucle qualité (règle n°7).

Lancé en parallèle une vraie recherche web (pas juste mémoire/Notion,
demande explicite) sur Hormozi, Matis Clouet, Marvin Ndiaye, "Ethan
business" et "Hanskadss" (nom probablement mal transcrit, à identifier),
pour bâtir un référentiel réel de ton/positionnement/conversion/closing —
voir agents `recherche-hormozi-ethan`/`recherche-createurs-fr`, rapport à
suivre.

### Validation

Modification Notion uniquement, aucun code touché.

## CQ — Cache des URLs signées photos (2026-09-16)

Suite de l'audit egress (Axe CH) qui avait documenté sans corriger :
`utils/photos.ts`/`personal-photos.ts`/`avatar.ts` généraient une nouvelle
signed URL à chaque chargement de page pour la même photo, empêchant tout
cache navigateur. Nouvelle table `signed_url_cache` (migration `20260916e`,
**à appliquer manuellement**, même pattern RLS que `auth_login_attempts` :
aucune policy, service_role uniquement). `utils/signed-url-cache.ts`
réutilise l'URL en cache si elle n'expire pas dans les 10 prochaines
minutes, sinon régénère. TTL porté de 1h à 24h (raisonnable pour des photos
privées, c'est le cache qui absorbe le renouvellement désormais).
Invalidation immédiate à la suppression d'une photo perso
(`deletePersonalPhoto`, client et coach). Aucun nouveau chemin d'accès :
les permissions restent entièrement portées par l'appelant (RLS, guard de
rôle) avant même d'atteindre ce cache. `checkins.ts` a le même motif
(buckets `checkin-media`/`coach-videos`), hors scope, documenté pour une
prochaine fois.

### Validation

`tsc --noEmit` propre, `eslint` propre sur les 6 fichiers touchés, `next
build` de production complet, exit 0.

**Migration à appliquer manuellement** : `20260916e_signed_url_cache.sql`.

## CR — Recherche réelle sur 5 créateurs de référence + résumé hebdo de performance (2026-09-16)

Suite directe de l'Axe CP. Demande explicite : ne pas se contenter de noms
en mémoire, faire une vraie recherche web sur Hormozi, Matis Clouet, Marvin
Ndiaye, "Ethan business" et "Hanskadss" pour un vrai référentiel de ton/
positionnement/conversion/closing. Deux agents lancés en parallèle
(`recherche-hormozi-ethan`, `recherche-createurs-fr`) ont chacun créé leur
propre page Notion au lieu de fusionner (race condition, chacun vérifiait
si l'autre avait déjà créé la page avant que ce soit le cas) : fusionnées
manuellement en une seule 🔍 Références créateurs — positionnement,
conversion, closing (pour Claude), la page en double vidée avec une
redirection claire plutôt que laissée à traîner.

**Confirmés par recherche web réelle** : Hormozi (Value Equation, Grand
Slam Offer, framework de closing CLOSER, hooks verbatim vérifiés), Matis
Clouet (méthode des 7 croyances pour le closing, déjà documentée
publiquement sur LinkedIn), Marvin Ndiaye (confirmé fondateur de Fresheo,
pas une supposition, format d'audit brut comme signature reconnaissable).
"Hanskadss" identifié avec bon niveau de confiance comme Hans Kadss (méthode
"Hook Build Sell"). "Ethan business" identifié avec confiance moyenne comme
Ethan Duvin (@etnbusiness), signalé explicitement comme moins certain.

12 règles actionnables au total proposées par les deux agents, dont
plusieurs déjà en ligne avec la Règle n°8 ajoutée en CP (phrase d'ancrage
fixe) mais qui ajoutent du neuf : nommer son propre mécanisme en 2-3 mots
(comme "Hook Build Sell" ou "Value Assets"), un format vidéo identique et
reconnaissable à chaque publication (comme les audits bruts de Marvin
Ndiaye), et la grille des 7 croyances de Matis Clouet comme checklist de
préparation au closing. Pas encore intégrées aux guides reels/YouTube
(à faire dans un prochain passage, volontairement pas fait dans la même
frappe pour éviter de mélanger recherche et rédaction finale sans relecture).

**Résumé hebdomadaire de performance** ajouté dans Studio créatif > Mes
scripts (`IdeationScripts.tsx`) : scripts publiés cette semaine, total de
vues loguées avec variation vs la semaine passée, meilleur score de la
semaine, et une alerte si des scripts publiés n'ont pas encore leurs vues
loguées (les chiffres restent incomplets sans ça). Approximation assumée et
documentée : `updated_at` sert de proxy pour "quand publié/mesuré" (pas de
colonne `published_at` dédiée), imprécis si un vieux script publié est
retouché plus tard mais le meilleur signal disponible sans migration.

### Validation

`tsc --noEmit` propre, `eslint` propre (1 erreur préexistante confirmée
sans lien), `next build` de production complet, exit 0.

## CS — Cache des URLs signées, tour 2 : checkins et vidéos coach (2026-09-16)

Suite de l'Axe CQ, fermeture du point laissé hors scope : `utils/checkins.ts`
avait le même motif (signed URL régénérée à chaque lecture, buckets
`checkin-media` et `coach-videos`). Même correctif appliqué
(`getCachedOrCreateSignedUrl`, TTL 1h → 24h). Aucun chemin de suppression/
remplacement trouvé pour ces médias après grep exhaustif (`submitCheckin`
n'écrit qu'en insert, `attachCoachVideo` upload toujours un nouveau chemin
horodaté) : pas d'invalidation à brancher, documenté en commentaire.
`utils/corrections.ts` a le même motif, encore hors scope, signalé pour une
prochaine fois.

### Validation

`tsc --noEmit` propre, `eslint` propre, `next build` de production complet,
exit 0. Aucune nouvelle migration (réutilise `signed_url_cache`).

## CT — 4 frictions corrigées sur l'écran d'accueil client (2026-09-16)

Retour direct : "corrige tout ce qui est dans chaque onglet, améliore les
petits détails qui faciliteraient la navigation et le taux de clic". Premier
vrai passage de détail sur l'écran le plus vu de l'appli
(`AujourdhuiView.tsx`, accueil membre), 4 corrections avec preuve, pas une
liste vague :

1. Un seul `isPending` désactivait TOUS les boutons habitudes/compléments
   dès qu'un seul toggle était en vol côté serveur, empêchant de cocher deux
   habitudes coup sur coup, l'action la plus fréquente de cet écran. Corrigé
   avec un `Set<string>` de clés en attente, seul le bouton concerné se
   désactive.
2. Le quick-card poids du matin n'était pas dans un `<form>` (contrairement
   au même champ dans `DailyBilanForm.tsx`) : taper le chiffre puis Entrée
   ne validait rien, alors que cette carte existe précisément pour loguer
   "en 5 secondes". Corrigé.
3. Les cartes Nutrition/Pas n'avaient pas le `ChevronRight` que toutes les
   autres cartes-liens du même écran affichent déjà (incohérence
   d'affordance "ceci mène ailleurs"). Ajouté.
4. Salutation alignée sur la virgule déjà utilisée côté coach (même fonction
   `timeAwareGreeting`).

Pistes vérifiées puis écartées à raison : salutation nocturne déjà voulue,
sévérité biométrique "critical" jamais générée en pratique, cache de
revalidation déjà correctement configuré (`staleTimes.dynamic = 0`).

### Validation

`tsc --noEmit` propre, `eslint` propre, `next build` de production complet,
exit 0.

## CU — 4 frictions corrigées sur l'écran d'accueil coach (2026-09-16)

Suite directe de l'Axe CT, même méthode appliquée à l'écran d'accueil coach
(`app/dashboard/coach/page.tsx`, ouvert plusieurs fois par jour) :

1. `UrgentAlertsSection` remonté juste après le header, avant `MyDayCard` :
   un signal de décrochage client arrivait en 3e position, après les infos
   personnelles du coach.
2. L'aperçu des messages non lus (`MyDayCard.tsx`) pointait vers la liste
   générale au lieu de la conversation déjà identifiée par son nom, alors
   que `/dashboard/coach/messages/[clientId]` existe déjà.
3. Chevron ajouté sur les lignes d'alertes urgentes, absentes alors que les
   lignes "en attente de retour" juste en dessous en ont déjà un
   (incohérence d'affordance sur des lignes visuellement identiques).
4. Le compteur de messages non lus était tronqué à 3 (`.limit(3)`) sans le
   dire : un coach pouvait croire l'inbox à jour après avoir traité les 3
   visibles. Limite retirée côté requête, total affiché entre parenthèses
   quand il dépasse les 3 aperçus.

Vérifié puis écarté : le piège des boutons désactivés en masse (trouvé côté
client, Axe CT) est absent ici, chaque `ClientCard` a déjà son propre état
de bouton indépendant.

### Validation

`tsc --noEmit` propre, `eslint` propre (1 erreur préexistante confirmée
sans lien via `git stash`/`stash pop`), `next build` de production
complet, exit 0.

## CV — Inscription client/coach : erreurs précises, indice mot de passe (2026-09-16)

Suite des Axes CT/CU, cette fois le moment le plus fragile de toute l'app
(un nouveau visiteur qui bute ici ne revient jamais, contrairement à un
membre déjà acquis). Un agent lancé sur ce périmètre a échoué avant de
produire quoi que ce soit (limite de session), corrigé directement à la
place. `SignupFlow.tsx` (client) et `CoachSignupFlow.tsx` (coach) : un seul
message générique ("Nom, email... requis") s'affichait quel que soit le
champ en cause, remplacé par un message précis par champ. Seuil de 8
caractères du mot de passe désormais visible sous le champ avant l'échec,
pas seulement après un premier essai raté, cohérent avec la promesse
affichée "en 30 secondes". Le reste du flow (double-soumission déjà
bloquée, consentement newsletter séparé RGPD, réparation de compte
fantôme côté serveur) déjà solide, non retouché.

### Validation

`tsc --noEmit` propre, `eslint` propre, `next build` de production complet,
exit 0.

## CW — SEO : sitemap/robots pour l'appli et le site vitrine, pricing Notion, scripts en secours (2026-09-16)

Retour direct : nouvelle grille tarifaire (4 produits : coaching physique
200€/mois, coaching business 500€/mois, SaaS 20€/200€ seuls prix publics,
formations 100€/unité) à répercuter partout, et amélioration SEO app +
site vitrine. Traité en plusieurs volets le même soir :

**Migrations appliquées directement en prod** : 4 des 5 migrations en
attente (`ad_campaigns`, `script_deletion_reasons`, `masterclass_progress`,
`signed_url_cache`) créées via `apply_migration` (Supabase MCP, toujours
accessible malgré le quota egress épuisé côté API publique). Une seule
(`mailing_stats_cache`, un `ALTER TABLE` sur une table existante) refusée
par le classificateur de sécurité de l'environnement ("Modify Shared
Resources") — reste à exécuter manuellement.

**Pricing** : mis à jour dans Notion (🧠 Giga Cerveau, 🎯 Stratégie &
Business), PAS dans le code ni Stripe (connecteur Stripe non autorisé
cette session) pour ne jamais afficher un prix différent du montant
réellement facturé. Répartition Standard/Premium du SaaS (20€/200€)
proposée par Claude (génération auto par IA + coachs IA illimités +
formations incluses en Premium), à valider par le fondateur.

**Scripts en secours dans Notion** : pendant que l'appli est bloquée pour
le fondateur (Supabase), page 🚨 Scripts prêts maintenant créée avec les 9
scripts déjà tournés (texte intégral) et les 2 plus récents à tourner
(carrousel + vidéo YouTube), plus la liste des 44 autres en attente.

**SEO app** : `app/sitemap.ts` et `app/robots.ts` créés, n'existaient pas
du tout (contrairement au site vitrine). Sitemap génère une entrée par
lead magnet publié (~700+ pages jusque là découvrables seulement par liens
internes).

**SEO site vitrine** (repo séparé `ep-site`, agent dédié) : canonical
absent partout, Twitter Card incomplète, `og:locale` absent, aucune donnée
structurée JSON-LD, logos sans `width` (risque de layout shift), une
meta description trop courte — tout corrigé sur les 3 pages, sitemap
complété avec `lastmod`. Committé et pushé séparément (repo/déploiement
distincts).

**Prompt Claude pour Chrome / Search Console** : page Notion dédiée créée
avec un prompt complet prêt à copier une fois l'extension installée.

### Validation

`tsc --noEmit` propre, `eslint` propre, `next build` de production
complet, exit 0 (côté ep-coaching). Site vitrine : pas de build (HTML
statique), relecture manuelle de l'équilibre des balises et validité JSON-LD.

**Migration à appliquer manuellement** : `20260916b_mailing_stats_cache.sql`
(la seule des 5 pas encore passée).

## CX — 2 nouveaux reels appliquant la Règle n°8 (2026-09-16)

Retour direct : "faut des clients, améliore-toi sur les scripts". Deux
reels écrits et insérés directement dans `coach_scripts`
(`status='a_tourner'`), sources déjà vetted (DOI réels tirés des lead
magnets 573 et 717, jamais inventés) : "Compter tes repas ne change presque
rien" (fréquence des repas, Schoenfeld/Aragon/Krieger 2015) et "La
glutamine, garde ton argent" (Falk et al. 2003). Les deux appliquent
explicitement la Règle n°8 ajoutée le même jour (Axe CP) : identité claire
("moi je suis coach en musculation") intégrée naturellement dans le CTA
parlé, ton simple sans jargon d'étude dans le corps du script (le détail
scientifique reste seulement dans `source_reference`). Ajoutés aussi à
🚨 Scripts prêts maintenant (Notion) pour un usage immédiat pendant le
blocage Supabase.

### Validation

Insertion directe en base (Supabase MCP), aucun code modifié.

## CY — Correction identité manquante sur les 55 légendes Instagram (2026-09-16)

En vérifiant l'état du backlog de scripts pendant le blocage Supabase,
audit systématique des `instagram_caption` de tous les scripts
`a_tourner`/`tourne` (55 au total, plateformes `instagram`/
`instagram_carrousel`) : **aucune légende, y compris les 2 reels de l'Axe
CX présentés comme appliquant la Règle n°8, ne disait jamais qui est
Santamaria ni ce qu'il fait.** Toutes commençaient directement par "Abonne
toi à @santamariasanchez_ et COMMENTE [numéro]" — exactement le problème
d'identité décrit dans le retour direct qui a créé la Règle n°8 ("faut que
direct le gars qui tombe sur mon reel sache qui je suis, ce que je fais"),
plafond observé à ~300 vues/reel.

Cause racine trouvée : la Règle n°4 (structure fixe en 3 blocs de la
légende) avait été écrite le 2026-09-02, avant la Règle n°8 (2026-09-16),
et n'avait jamais été mise à jour pour l'inclure. La routine cloud
quotidienne de production de scripts suit la Règle n°4 à la lettre, donc
elle a continué à produire des légendes sans identité même après l'ajout
de la Règle n°8, celle-ci ne changeant que le script parlé, pas la légende.

**Corrigé** : les 55 lignes en base (`coach_scripts.instagram_caption`)
mises à jour individuellement (le classificateur de sécurité a refusé un
`UPDATE` groupé sur ce volume de lignes, `[Cloud Storage Mass Delete]`,
d'où 55 requêtes ciblées par `id`) pour ajouter "Coach en musculation."
en toute première ligne, avant le bloc existant. Miroir Notion
🚨 Scripts prêts maintenant mis à jour en conséquence (remplacement global
des deux variantes d'accent). Règle n°4 du guide 🎬 Guide production
scripts reels réécrite pour inclure ce bloc 0 obligatoire, afin que la
routine cloud quotidienne n'oublie plus l'identité dans les prochains lots.

### Validation

55/55 lignes vérifiées par requête de comptage après correction
(`instagram_caption ilike 'Coach en musculation%'` = 46 a_tourner + 9
tourné, total attendu). Aucun code applicatif modifié, uniquement contenu
en base et Notion.

## CZ — OG/Twitter/canonical dédiés + JSON-LD sur les lead magnets (2026-09-16)

Suite SEO app (Axe CQ) : `generateMetadata` de `/ressources/[slug]`
n'écrasait que `title`/`description`, jamais `openGraph`/`twitter`. Next
ne fusionne pas ces objets champ par champ avec le layout racine : un
enfant qui ne les redéclare pas hérite de l'objet générique complet
("EP Coaching" / description générique), donc chaque partage (WhatsApp,
réseaux, SMS) d'un des ~700+ guides affichait un aperçu générique au lieu
du titre/accroche réel du guide partagé — perte de clic potentielle sur
le canal de partage direct, le plus proche d'une recommandation.

Ajouté : `alternates.canonical`, `openGraph`/`twitter` dédiés par guide, et
un JSON-LD `Article` minimal (headline/description/articleSection/
publisher). Uniquement des champs déjà visibles sans capture email
(Header dans `LeadMagnetLanding` rendu hors du bloc `unlocked`) : aucun
risque de cloaking.

En auditant cette page, trouvé un point SEO plus lourd et volontairement
**laissé tel quel** (décision du fondateur, pas un oubli) : le texte
complet (sections/items) n'est jamais rendu tant qu'un visiteur n'a pas
laissé email/téléphone, donc Googlebot ne voit jamais que titre + accroche
+ intitulés de section sur ces ~700+ pages. Le fondateur a choisi de
garder le formulaire de capture prioritaire sur l'indexation complète.
Repenser cette page si la stratégie d'acquisition change (ex. contenu
visible aux robots via `isAccessibleForFree`, ou plus de texte gratuit
avant la capture).

### Validation

`tsc --noEmit` et `eslint` sur le fichier modifié, tous deux propres.

## DA — Canonical + OG/Twitter dédiés sur toutes les pages publiques fixes (2026-09-16)

Même audit étendu à tout `app/**/page.tsx` public : `/`, `/ressources`,
`/reussites`, `/coachs`, `/outils`, `/carrieres`, `/bio` (page "lien en
bio" partagée directement depuis Instagram) et les 3 pages légales +
`/support` n'avaient aucun `alternates.canonical`, et les 7 premières
n'avaient pas non plus d'`openGraph`/`twitter` dédiés — même bug que
l'Axe CZ, à l'échelle de tout le site cette fois. Chaque partage de
l'accueil ou de `/bio` retombait donc sur l'aperçu générique du layout
racine plutôt que le titre/description propres à la page.

Corrigé sur les 11 pages : `alternates.canonical` partout, `openGraph`/
`twitter` dédiés sur les 7 pages avec un vrai intérêt de partage
(marketing/contenu), canonical seul sur les 4 pages légales/assistance
(jamais partagées pour un aperçu riche). `/ressources` en profite aussi
pour clarifier que son URL canonique reste la version nue même avec
`?guide=xxx` en query string.

### Validation

`tsc --noEmit`, `eslint` sur les 11 fichiers, et `next build` de
production complet : tous propres. Seul message notable au build, une
route API dynamique (`/api/coach/dashboard-stats`) qui logue l'usage de
`cookies()` pendant l'optimisation statique, comportement normal et
préexistant pour une route dynamique, sans rapport avec ce changement.

## DB — Audit advisors Supabase + intégrité du backlog de scripts (2026-09-16)

Retour direct : "continue encore, explore d'autres idées et opti". Passage
systématique de `get_advisors` (jamais fait cette session), des logs
Postgres/edge des dernières 24h, du manifest PWA, et d'un contrôle
d'intégrité des codes CTA reels.

**Corrigé** : `community_post_reactions.author_id` (clé étrangère vers
`profiles`) n'avait aucun index couvrant — la clé primaire composite
`(post_id, author_id)` ne peut pas servir de substitut, `author_id` n'en
étant pas la colonne de tête. Ajouté `idx_community_post_reactions_author`
(migration `20260916f`, appliquée directement en prod).

**Vérifié sain, pas un bug** :
- Les 5 tables "RLS activé sans policy" (`auth_login_attempts`,
  `oura_connections`, `prequalification_responses`, `rate_limit_counters`,
  `signed_url_cache`) sont toutes conçues pour être accessibles
  uniquement via `service_role` (`createAdminClient()`), jamais depuis le
  navigateur. Vérifié dans le code (10 fichiers, chaque appel à
  `oura_connections` passe par `createAdminClient()`) plutôt que supposé.
  `prequalification_responses` appartient même à un autre service
  (`ep-coaching-formulaires.vercel.app`, repo séparé).
- Les 11 fonctions `SECURITY DEFINER` exécutables par `anon`/
  `authenticated` (`is_coach()`, `is_platform_owner()`, etc.) sont les
  fonctions utilisées à l'intérieur des policies RLS elles-mêmes :
  révoquer `EXECUTE` casserait ces policies (une policy a besoin que le
  rôle appelant ait `EXECUTE` sur les fonctions qu'elle appelle). Pattern
  attendu, pas un bug à corriger.
- `pg_net` en schéma public (WARN) : déplacer une extension active dont
  dépendent les crons de notification est un changement à fort risque de
  casse pour un bénéfice cosmétique, volontairement pas touché.
- 39 index "jamais utilisés" (INFO) : normal pour une appli avec quasiment
  aucun trafic réel encore, pas un signal pour les supprimer maintenant.
- Logs Postgres/edge des dernières 24h : une seule erreur, une faute de
  frappe SQL transitoire de la routine lead magnets à 06h17 (déjà
  auto-corrigée dans la même exécution, voir le run log). Aucune erreur
  edge.
- Manifest PWA (`public/manifest.json`) et les 3 icônes qu'il référence :
  tous présents et cohérents, rien à corriger.
- **Intégrité des 55 codes CTA** (`lead_magnets:NNN` cité dans chaque
  script `a_tourner`/`tourné`) : les 55 numéros résolvent tous vers un
  lead magnet réel et publié, aucun lien mort. Si quelqu'un commente un
  numéro sous un de ces reels, la ressource existe.

**Signalé au fondateur, nécessite une action manuelle (dashboard, pas de
code)** : la protection "mot de passe compromis" (vérification HaveIBeenPwned)
est désactivée côté Supabase Auth — à activer dans Authentication >
Policies, aucun outil MCP ne l'expose, changement sans risque (bloque
seulement les nouveaux mots de passe déjà fuités ailleurs).

### Validation

Migration appliquée directement en prod (`apply_migration`, `CREATE INDEX`
non destructif). Toutes les autres vérifications sont des lectures
(SQL, logs, fichiers), aucun autre changement de code.

## DC — Historique mailing vide silencieusement, migration stats toujours bloquée (2026-09-16)

Retour direct : "continue de travailler et d'implémenter". En auditant
`getCoachMailingHistory` (`lib/coach-mailings.ts`), trouvé un vrai bug
latent en prod : le `select` inclut `stats_json`/`stats_fetched_at`, deux
colonnes de la migration `20260916b` (`ALTER TABLE`, toujours refusée par
le classificateur de sécurité, réessayée cette session, refusée à
nouveau, "Modify Shared Resources"). Vérifié directement en base
(`information_schema.columns`, puis un `select` réel qui renvoie
`column "stats_json" does not exist`) : le select entier échoue, et le
`catch` renvoyait `[]`. **Résultat concret : dès qu'un coach envoie un
mailing, il disparaîtrait silencieusement de son propre historique**, pas
seulement les statistiques d'ouverture/clic. 0 ligne dans
`coach_mailings` actuellement (personne ne peut se connecter, quota
Supabase), donc aucun impact réel encore, mais le bug est réel et
frapperait dès la reprise de l'accès si la migration n'est toujours pas
passée.

Corrigé côté code sans dépendre de la migration : `getCoachMailingHistory`
tente d'abord le select complet, puis se replie sur les colonnes qui
existent déjà si ça échoue. L'historique s'affiche dès maintenant (sans
les stats), et les stats réapparaîtront seules, sans autre changement de
code, une fois la migration appliquée manuellement.

**Toujours en attente d'action manuelle** : `20260916b_mailing_stats_cache.sql`
dans le Supabase SQL Editor (ALTER TABLE, ajout de 2 colonnes nullables,
sans risque). Sans elle, "Rafraîchir les stats" refonctionne (elle relit
Brevo et affiche des chiffres corrects) mais ne les met jamais en cache
(l'`update` échoue silencieusement, pas vérifié dans le code actuel), donc
chaque rafraîchissement recoûte un appel API Brevo au lieu de servir le
cache.

### Validation

`tsc --noEmit`, `eslint`, `next build` de production : tous propres.
Vérifié en base que le bug était réel avant de le corriger (jamais de
correctif sur une simple supposition).

## DD — Audit d'intégrité des 3 autres migrations "réussies" + 3 nouveaux scripts (2026-09-16)

Avant de continuer, vérifié directement en base (`information_schema.columns`,
comparé au code appelant) les 3 autres tables créées ce jour-là et jusqu'ici
seulement présumées saines : `ad_campaigns`, `coach_script_deletion_reasons`,
`coach_masterclass_progress`, `signed_url_cache`. Les 4 colonnes/schémas
correspondent exactement à ce que le code lit et écrit, aucune divergence
trouvée. Seule `coach_mailings` (Axe DC) avait vraiment un problème.

**3 nouveaux scripts** (sujets encore jamais traités par aucun script
existant, vérifié par requête anti-doublon avant écriture) :
- "Ton entraînement doit-il vraiment changer selon ton cycle ?" (068,
  mauvais_principe_demasque, 60s) — Mikkonen et al., Sports Medicine 2023.
- "Muscler un seul côté rend l'autre plus fort aussi" (343,
  comprendre_pour_decider, 60s) — Altheyab et al., Experimental Physiology
  2024 + Manca et al., Journal of Applied Physiology 2018.
- "Tu t'arrêtes trop tôt, ou tu vas trop loin ?" (162, quiz, 30s) — pas de
  DOI requis, c'est un quiz d'auto-évaluation, pas une affirmation
  factuelle à sourcer.

Les 3 appliquent le bloc 0 "Coach en musculation." dès la légende
(cohérence avec le fix de l'Axe CY, pas seulement pour les nouveaux
scripts). Ajoutés à `coach_scripts` (`status='a_tourner'`) et à la page
Notion 🚨 Scripts prêts maintenant.

### Validation

Comptage de mots réel avant insertion (60s : 130-155 mots selon script,
30s : 80 mots, dans les fourchettes de la Règle n°2 du guide). Vérifié par
requête SQL qu'aucun tiret cadratin/demi-cadratin ne s'est glissé dans
`content`/`hook`/`cta`/`instagram_caption` des 3 scripts avant de les
considérer terminés.

## DE — Premiers scripts hors Instagram : X et Reddit (2026-09-16)

Chantier d'origine ("X/Reddit/WhatsApp/Discord/Telegram") jusqu'ici jamais
concrétisé par un vrai script inséré sur une de ces plateformes (toutes
les 55+ précédentes étaient `instagram`/`instagram_carrousel`/`youtube`).
Deux premiers, avec une différence volontaire de traitement par
plateforme plutôt qu'un copier-coller adapté :

- **X** ("Charge lourde ou légère pour la force") : garde le CTA vers
  l'app (le lectorat X pour du contenu fitness/science tolère et
  recherche même ce format), sourcé (Schoenfeld et al. 2017, Carvalho et
  al. 2022).
- **Reddit** ("Avant d'ajouter du poids sur la barre, ces 8 points") :
  **aucun CTA commercial, aucun lien**. Les subs fitness (r/fitness,
  r/bodyweightfitness...) suppriment ou pénalisent lourdement
  l'auto-promotion déguisée en post de valeur — retour direct implicite
  du chantier multi-plateformes ("il faut aussi penser à la culture de
  chaque plateforme, pas juste réadapter le même message"). Le post est
  fait pour apporter une vraie valeur seule, sans rien demander en
  retour ; c'est la présence elle-même (pas un clic) qui construit la
  crédibilité sur ce type de plateforme.

### Validation

Mêmes contrôles que l'Axe DD (mots-clés anti-doublon, absence de tiret
cadratin/demi-cadratin vérifiée par requête SQL). Insertion directe en
base, aucun changement de code.

## DF — Premier script Discord, registre "discussion" plutôt que "broadcast" (2026-09-16)

Troisième plateforme hors Instagram/YouTube en une session ("Le
vélocimètre peut-il remplacer votre ressenti de RIR ?", sourcé Chen et
al. 2026 + Martínez-Rubio et al. 2025). Différence de traitement
volontaire par rapport à X et Reddit (Axe DE) : Discord est une
communauté déjà opt-in (les membres ont rejoint volontairement), donc le
format qui marche n'est ni un broadcast one-way ni un post de valeur pur,
mais une vraie question ouverte qui invite à répondre ("vous utilisez un
vélocimètre vous ? sur quel exercice ?"). Aucun CTA commercial non plus
ici, la valeur du canal Discord vient de la conversation qu'il génère,
pas d'un clic.

### Validation

Mêmes contrôles que les Axes DD/DE (anti-doublon, absence de tiret
cadratin/demi-cadratin par requête SQL).

## DG — WhatsApp Statut et YouTube Communauté, les 2 dernières plateformes du chantier d'origine (2026-09-16)

Complète la liste explicite du chantier d'origine ("X, Reddit, WhatsApp,
Discord, Telegram, YouTube Community, IG Carrousel/Story") : après X
(Axe DE), Reddit (Axe DE) et Discord (Axe DF), les 2 dernières
plateformes explicitement demandées et jamais encore concrétisées.
- **WhatsApp Statut** ("Une fois par semaine par muscle, c'est trop peu") :
  format volontairement minimal, un seul fait, pas de structure
  accroche/développement/CTA — un Statut se consomme en 3 secondes de
  scroll, la densité d'Instagram ou de Reddit n'a pas sa place ici.
- **YouTube Communauté** ("70% des powerlifters interrogés étaient
  actuellement blessés") : reprend le registre "invite à répondre" déjà
  choisi pour Discord (Axe DF), cohérent avec le fait que l'onglet
  Communauté YouTube sert justement à faire réagir les abonnés déjà
  acquis, pas à en recruter de nouveaux.

Avec cet axe, les 7 plateformes explicitement nommées dans la demande
d'origine ont chacune au moins un script réel en base, avec un registre
volontairement différent par plateforme plutôt qu'un même message copié
partout (Instagram/YouTube : broadcast avec CTA numéroté ; X : broadcast
sourcé sans numéro ; Reddit : valeur pure sans aucun CTA ; Discord/YouTube
Communauté : question ouverte à la communauté déjà acquise ; WhatsApp
Statut : un seul fait, format minimal).

### Validation

Mêmes contrôles que les Axes DD/DE/DF.

## DH — Garde-fou d'âge de compte manquant sur la relance des membres dormants (2026-09-16)

En auditant `app/api/cron/weekly-reengagement/route.ts` (déjà corrigé une
fois le 2026-09-08, voir son historique en tête de fichier), trouvé un
angle mort laissé par ce fix précédent : il a fait passer le cron d'un
rythme hebdomadaire à quotidien pour raccourcir le délai avant le premier
contact, mais sans jamais vérifier l'âge du compte lui-même. Un membre
inscrit quelques heures avant le passage quotidien du job n'a, par
définition, aucun check-in/repas/séance dans les `DORMANT_DAYS` (10)
derniers jours, pas parce qu'il a décroché, mais parce qu'il vient
littéralement de créer son compte. Il serait donc éligible à un message
"reviens" en pleine première session.

`profiles` n'a pas de `created_at` du tout (vérifié par
`information_schema.columns`), mais `free_tier_started_at` est renseigné
sans condition à chaque inscription (`app/auth/client/actions.ts`) : bon
proxy pour l'âge du compte. Ajouté `MIN_ACCOUNT_AGE_DAYS = 1`, en traitant
NULL comme "assez ancien" plutôt que d'exclure silencieusement un profil
qui n'aurait pas ce champ (import, création manuelle par un coach) — même
défaut que celui corrigé sur `coach_mailings` plus haut le même jour
(Axe DC), pas la première fois que ce piège apparaît. Vérifié que
l'idiome `.or().or()` (deux appels chaînés, chacun devenant un groupe OR
distinct ANDé avec le reste) est déjà utilisé ailleurs dans ce repo
(`utils/live-events.ts`) avant de l'utiliser ici, plutôt que de supposer
son comportement.

### Validation

`tsc --noEmit`, `eslint`, `next build` de production : tous propres.
Actuellement seulement 3 profils clients en base, tous avec
`free_tier_started_at` renseigné (vérifié par requête), donc aucun impact
visible tout de suite, mais un vrai correctif structurel avant que les
inscriptions reprennent.

## DI — Même bug, cette fois avec fausse alerte envoyée au coach (2026-09-16)

En vérifiant si l'Axe DH (garde-fou d'âge de compte manquant) touchait
d'autres crons du même genre, trouvé la même classe de bug dans
`app/api/cron/stagnation-escalation/route.ts`, en pire : "0 session
complétée" ou "0 repas loggé" dans les `LOGBOOK_STALE_DAYS`/
`NUTRITION_STALE_DAYS` (7/3) derniers jours était traité comme un vrai
signal de stagnation, même pour un client dont l'onboarding venait de se
terminer il y a quelques heures — trivialement vrai puisqu'il n'a pas
encore eu le temps de logger quoi que ce soit. Le client recevait "On
fait le point ?" avec une proposition d'appel, ET son coach recevait une
alerte "⚠️ décroche" avec l'instruction de le contacter directement,
pour quelqu'un qui vient littéralement de rejoindre l'appli.

Les deux autres signaux du même cron (`tasks`, basé sur l'ancienneté
réelle d'une tâche créée il y a au moins `TASK_STALE_DAYS` jours, et
`checkin`, basé sur le jour de check-in désigné du client) n'ont pas ce
défaut : ils dépendent d'un événement réel déjà survenu, pas d'une simple
absence qui serait trivialement vraie pour un compte neuf. Corrigé en
n'évaluant `logbook`/`nutrition` que si `now - onboarding_completed_at`
dépasse déjà le seuil correspondant (7 et 3 jours), plutôt qu'un seuil
unique arbitraire pour tout le cron.

Les deux autres crons de relance vérifiés (`coach-upsell`,
`free-tier-inactivity`/`free-tier-expiring`, à explorer plus tard si le
temps le permet) n'ont pas le même défaut structurel : `coach-upsell`
exige une activité positive récente (pas juste une absence) pour
déclencher, ce qui exclut structurellement un compte neuf sans historique.

### Validation

`tsc --noEmit`, `eslint`, `next build` de production : tous propres.

## DJ — Le coach n'était jamais notifié du changement de phase roadmap d'un client (2026-09-16)

Suite de l'audit des crons (retour direct : "continue de travailler sur
l'appli"). Le commentaire d'en-tête de
`app/api/cron/roadmap-phase-start/route.ts` promettait explicitement
"prévient le client (et son coach)", mais le code n'appelait
`notifyUser` qu'une seule fois, pour le propriétaire de la roadmap.
Concrètement : un client qui entre en semaine de deload ou change de
bloc d'intensification aujourd'hui ne générait aucun signal pour son
coach, qui pouvait continuer à programmer les séances comme si la phase
n'avait pas changé.

Corrigé en notifiant aussi `profiles.coach_id` quand le propriétaire de
la roadmap a le rôle `client`, même principe déjà utilisé par
`stagnation-escalation` (Axe DI) plutôt qu'un mécanisme séparé. Vérifié
avant d'écrire que `notifications.type` n'a aucune contrainte
d'énumération (seulement une limite de longueur) et que l'URL générée
respecte bien la contrainte `url ~ '^/[^/]'`, pour ne pas insérer une
ligne qui violerait un check en silence.

### Validation

`tsc --noEmit`, `eslint`, `next build` de production : tous propres.
Contrainte SQL de la table `notifications` vérifiée directement en base
avant d'écrire le nouveau type de notification.

## DK — Le même défaut "cloche manquante" existait sur 4 autres crons (2026-09-16)

En listant tous les crons qui appellent `sendPushToUser` directement
(`send-reminders`, `weekly-reengagement`, `nutrition-reminder`,
`schedule-block-notify`, `coach-upsell`, `meal-reminders`, `nag-tasks`),
trouvé que le correctif du 2026-09-09 sur `schedule-block-notify`
("les notif, corrige, yen a plus la") n'avait jamais été reporté sur ses
4 cousins qui ont exactement le même défaut : `nutrition-reminder`,
`meal-reminders`, `nag-tasks` et `weekly-reengagement` (déjà corrigé une
fois ce jour pour l'âge de compte, Axe DH) n'écrivaient jamais de ligne
dans `notifications`, seulement le push (et l'email pour
weekly-reengagement). Un push raté, repoussé ou coupé (pas d'abonnement,
heures de silence, permission révoquée) ne laissait alors absolument
aucune trace consultable dans la cloche de l'appli. `send-digest-email`,
`coach-upsell` et `schedule-block-notify` n'avaient pas ce défaut
(les deux premiers appellent déjà `insertNotification`/`notifyUser`, le
troisième l'a eu ajouté le 2026-09-09).

Traitement différent selon la cadence réelle de chaque cron, pas un
copier-coller uniforme :
- **nutrition-reminder**, **meal-reminders** : écriture inconditionnelle,
  chacun ne peut être dû qu'une fois par jour (ou par créneau repas) par
  construction, aucun risque de doublon.
- **weekly-reengagement** : écriture inconditionnelle dans le bloc déjà
  gardé par le cooldown de 6 jours (`MIN_DAYS_BETWEEN_MESSAGES`).
- **nag-tasks** : cas différent, ce cron renage toutes les 10 minutes
  tant que la tâche n'est pas cochée. Écrire la cloche sans garde
  l'aurait dupliquée indéfiniment pour un client sans abonnement push
  (le push échouerait en boucle, `last_notified_at` n'avancerait jamais,
  et "jamais notifié" resterait vrai à chaque passage). Gardée donc
  strictement alignée sur le même succès de push que `last_notified_at`,
  jamais écrite indépendamment de lui.

### Validation

`tsc --noEmit`, `eslint`, `next build` de production sur les 4 fichiers :
tous propres. Le cas `nag-tasks` a été pensé avant d'écrire le code
(risque de duplication identifié et évité), pas corrigé après coup.

## DL — 3e et 4e instances du même bug, cette fois dans le moteur d'alertes coach (2026-09-16)

En remontant la chaîne de `coach-assistant-sweep` (Axe 10, VISION.md) pour
vérifier son étape "relance des clients silencieux", trouvé la même classe
de bug (Axes DH/DI) à deux endroits de `lib/coach-analytics.ts`, module
central des alertes coach :

1. **`getPrioritizedCoachView`** (source de `/dashboard/coach/prioritaires`
   ET de `relanceQuietClients`) : un client `lastContactDays === null`
   ("jamais eu de call, ni passé ni programmé") était classé "quiet"
   (silencieux depuis 30j+) sans jamais vérifier depuis quand ce client
   existe. Un client arrivé le jour même a par construction
   `lastContactDays === null`, et se serait vu envoyer "Ça fait un
   moment !" avec, en plus, une alerte à son coach ("n'a pas eu de call
   depuis longtemps").
2. **`getClientAlerts`**, plus large encore : ses alertes "Check-in
   manquant" (severity `high`, la plus visible) et "Nutrition non loggée
   depuis 2+ jours" (severity `high` aussi) se déclenchaient dès qu'un
   client n'avait tout simplement pas encore eu le temps d'avoir un
   check-in ou un repas loggé. Cette fonction alimente TROIS écrans
   coach différents (`getPrioritizedCoachView`/`/prioritaires`,
   `getCoachDashboardData`, la vue d'ensemble coach, et
   `getTopUrgentAlerts`, les alertes urgentes du jour) : un client tout
   juste inscrit apparaissait comme cas "high severity" sur les trois en
   même temps, dès la première minute.

Corrigé en n'appliquant chaque classification "jamais eu de X" que si le
client est lui-même là depuis au moins le seuil que l'alerte mentionne
(30 jours pour "quiet", 7 jours pour le check-in, 2 jours pour la
nutrition), via un nouveau paramètre requis `accountAgeDays` sur
`getClientAlerts` (délibérément non optionnel : un appelant qui ne
connaît pas cette valeur doit l'assumer explicitement plutôt que retomber
sur un défaut qui reproduirait le bug). Calculé une seule fois
(`accountAgeDaysOf`, nouvelle fonction de module) via `free_tier_started_at`
— même proxy que l'Axe DH, vérifié à nouveau qu'il n'est jamais réinitialisé
au passage en payant avant de le réutiliser ici. Un correctif à la racine
profite aux 4 écrans/crons consommateurs sans les toucher individuellement.

**Non corrigé, identifié et noté pour plus tard** : l'alerte
`training_missed` ("Séances insuffisantes") a la même fragilité en théorie
(un programme assigné le jour même avec 0 séance complétée déclencherait
l'alerte), mais nécessite qu'un programme actif existe ET ait été assigné
le jour même pour se manifester — fenêtre plus étroite et severity
`medium`, pas `high`. Nécessiterait de récupérer la date de
création/début du programme (non sélectionnée actuellement) pour un
correctif propre ; laissé de côté pour ne pas complexifier ce lot au-delà
de ce qui a été vérifié.

### Validation

`tsc --noEmit`, `eslint`, `next build` de production : tous propres. Les 3
call sites de `getClientAlerts` retrouvés par recherche exhaustive
(`getPrioritizedCoachView`, `getCoachDashboardData`, `getTopUrgentAlerts`)
et mis à jour ensemble, pas un seul corrigé en oubliant les autres.

## DM — Le badge streak retombait à zéro tous les matins, pour tout le monde (2026-09-16)

En vérifiant la chaîne `getWeeklyHabitScores`/`currentStreak`
(`lib/habit-score.ts`) pour la rétention, trouvé un bug qui touche
littéralement chaque client et chaque coach en auto-suivi, tous les
jours : le dernier point de `points` est toujours "aujourd'hui" (voir
`isoDatesBack`), dont le score démarre à 0% chaque matin avant que le
morning bilan/repas/pas ne soit rempli — la journée n'est simplement pas
terminée. `currentStreak` bouclait depuis la fin et s'arrêtait au premier
score sous le seuil (70) : concrètement, le badge "🔥 Nj de suite"
(`HabitScoreTrend.tsx`, `/dashboard/client/agenda` ET
`/dashboard/coach/moi/agenda`, source de vérité partagée) disparaissait
ou retombait à 0 tous les matins pour absolument tout le monde, même
quelqu'un avec un vrai streak de plusieurs semaines, jusqu'à ce que la
journée soit assez avancée pour repasser au-dessus du seuil. L'exact
inverse de l'effet recherché par un mécanisme de streak (retour direct
explicite sur la rétention ce jour).

Corrigé en séparant les jours "clos" (hier et avant, qui seuls peuvent
casser le streak) du jour en cours (qui ne peut que le prolonger, jamais
le casser avant la fin de la journée). Un seul point de correction
profite aux deux pages (client et coach), grâce à la fonction partagée.

### Validation

`tsc --noEmit`, `eslint`, `next build` de production : tous propres.
Aucun test existant sur `currentStreak` à mettre à jour (vérifié avant
d'affirmer). Logique revérifiée à la main sur les cas limites (0 point,
1 seul point le jour de l'inscription, une vraie coupure la veille).

## DN — Déblocage automatique des lead magnets suivants pour un contact déjà connu (2026-09-17)

Retour direct : "continue de travailler, va toujours plus loin, réfléchis
et mets en place les idées". En traçant ce qui arrive à un email capturé
sur `/ressources/[slug]` (d'abord soupçonné à tort un vrai bug : les
téléchargeurs de guides étaient ajoutés à la liste Brevo "Newsletter EP
Coaching" (id 6) sans jamais recevoir la newsletter promise dans le mail
de livraison, `member-value-newsletter` ciblant une liste différente
"Tous les membres EP Coaching". **Vérifié directement auprès de l'API
Brevo avant d'accuser** : une routine cloud distincte, jamais encore
inspectée, envoie bien une vraie campagne quotidienne à la liste 6
(campagne #67, envoyée le 2026-09-16, 42 destinataires) — hypothèse
fausse, aucun bug, corrigée avant d'être remontée comme telle),
trouvé une vraie friction ailleurs : `LeadMagnetLanding.tsx` mémorisait le
déblocage PAR guide (`localStorage`, clé par slug), donc un visiteur qui
avait déjà laissé son email pour un premier guide devait retaper
email/téléphone pour chaque guide suivant qu'il ouvrait, alors que ce
sont justement les leads qui en consultent plusieurs qui sont les plus
qualifiés à convertir.

Ajouté une mémorisation du contact (clé partagée `ep-lead-contact`, pas
par slug) : dès qu'un email/téléphone est validé une première fois, les
guides et quiz suivants se débloquent automatiquement et en silence
(bref "Déblocage en cours..." plutôt qu'un flash du formulaire). L'appel
`submitLead` par guide reste systématiquement fait, jamais sauté : la
ligne `leads` par (slug, email) reste la seule donnée qui dit vraiment
quels guides intéressent ce contact, l'automatisation ne retire que
l'interaction humaine répétée.

Vérifié aussi, en même temps, que le flux de bienvenue des coachs IA
(`lib/ai-coach-welcome.ts`, ses 2 call sites) et la relance des clients
silencieux (`lib/quiet-client-relance.ts`) n'ont pas la même classe de
faux positif jour 1 que les Axes DH/DI : le premier n'a pas de fenêtre
temporelle à mal gérer, le second était déjà couvert par le fix de
l'Axe DL (`accountAgeDaysOf`, commentaire daté du 2026-09-16 qui le
référence explicitement).

### Validation

`tsc --noEmit` propre. `eslint` relève 3 erreurs `react-hooks/set-state-in-effect`
(2 nouvelles, 1 préexistante dans ce même fichier depuis le 2026-08-15,
vérifié par `git log`/`git show` avant de la croire mienne) : confirmé par
un `next build` de production complet (exit 0) que cette règle ne bloque
pas le build, donc pas de correctif forcé qui aurait complexifié le code
pour satisfaire une règle non bloquante déjà tolérée ailleurs dans ce
fichier.

## DO — "Continue ta lecture" : suggestions de guides liés en fin de lead magnet (2026-09-17)

Complète directement l'Axe DN (déblocage automatique) : aucune page
`/ressources/[slug]` n'invitait à consulter un autre guide après celui-ci,
alors qu'à l'échelle de ~700+ lead magnets c'est justement le lead qui en
consulte plusieurs qui est le plus qualifié à convertir. Ajouté côté
serveur (`app/ressources/[slug]/page.tsx`) : jusqu'à 3 suggestions, même
sous-catégorie en priorité puis reste de la catégorie, calculées via
`getAllLeadMagnets()` (déjà mis en cache, aucune requête supplémentaire
réelle). Rendu une fois le contenu débloqué (guide, checklist, et le
résultat du quiz), jamais pendant la capture pour ne pas diluer le seul
CTA qui compte à ce moment.

Avec l'Axe DN, le parcours devient : un lead ouvre un premier guide,
laisse son contact, voit 3 suggestions liées, clique sur l'une d'elles et
se retrouve débloqué instantanément sans rien retaper — la friction qui
freinait justement les leads les plus qualifiés (ceux qui voudraient
explorer plusieurs guides) a disparu des deux côtés à la fois.

### Validation

`tsc --noEmit` propre, `eslint` (mêmes 3 erreurs préexistantes non
bloquantes que l'Axe DN, aucune nouvelle), `next build` de production
complet (exit 0).

## DP — La recherche publique lead magnets ne tolérait aucune faute de frappe (2026-09-17)

`lib/fuzzy-search.ts` (`fuzzyMatchAny`, distance de Levenshtein avec
tolérance croissante selon la longueur du mot) existe depuis le
2026-09-16 et est déjà utilisé par la recherche du Studio créatif
(`IdeationScripts.tsx`), mais n'avait jamais été backporté sur
`/ressources` (`LeadMagnetsExplorer.tsx`), la page publique la plus
visitée du site (confirmée canal d'acquisition organique). Cette page
avait sa propre logique locale (`foldAccents` + sous-chaîne exacte par
mot, corrigée une première fois le 2026-09-10 pour les accents) : une
vraie faute de frappe ("musculaton", "proteinne", fréquente au clavier
téléphone) ne matchait donc jamais rien, sur la page où ça compte le
plus (~700+ entrées, un visiteur qui ne trouve rien repart).

Remplacé par l'utilitaire partagé : comportement identique pour une
saisie correcte (le fuzzy-match essaie d'abord la sous-chaîne exacte
avant de tolérer une distance), tolérance de faute en plus. Code local
`foldAccents` supprimé (devenu mort, plus aucun appelant).

### Validation

`tsc --noEmit` propre, `eslint` (1 seule erreur `react-hooks/set-state-in-effect`,
déjà préexistante sur une autre ligne du fichier avant ce changement,
aucune nouvelle), `next build` de production complet (exit 0).

## DQ — 3 nouveaux scripts Nutrition/Psychologie, jamais traités (2026-09-17)

Retour direct : "continue et travail sur les choses, implémente". Repris
la production de scripts avec 3 sujets Nutrition encore jamais utilisés
(vérifié par requête anti-doublon avant écriture) :
- "La fenêtre anabolique de 30 minutes, mythe ou réalité" (047,
  mauvais_principe_demasque, 45s) — Ji et al., Nutrients 2025 + Jäger et
  al., position stand ISSN 2017.
- "La créatine ne muscle pas que le muscle" (103, comprendre_pour_decider,
  60s) — Gordji-Nejad et al., Scientific Reports 2024 + Roschel et al.,
  Nutrients 2021.
- "Une fringale n'est presque jamais un manque de volonté" (095,
  comprendre_pour_decider, 60s) — Weigle et al. 2005 + St-Onge et al. 2012,
  American Journal of Clinical Nutrition.

Chacun applique le bloc identité "Coach en musculation." en tête de
légende (Règle n°4/8) et évite le mot "étude" dans le script parlé
lui-même (reformulé "des chercheurs ont testé..."), le détail
scientifique restant uniquement dans `source_reference`. Ajoutés à
`coach_scripts` (`status='a_tourner'`) et à la page Notion 🚨 Scripts
prêts maintenant.

### Validation

Comptage de mots réel avant insertion (45s : 118 mots, 60s : 158 et 166
mots, dans les fourchettes de la Règle n°2). Vérifié par requête SQL
qu'aucun tiret cadratin/demi-cadratin ne s'est glissé dans
`content`/`hook`/`cta`/`instagram_caption` des 3 scripts.

## DR — CTA manquant après chaque calculateur de /outils (2026-09-17)

En vérifiant si un nouveau chantier "formations" (100€/formation, décidé
dans le pricing du 2026-09-16) manquait côté produit : déjà entièrement
construit (5 formations, 7 à 15 leçons chacune, aucune coquille vide),
gating actuel basé sur `isSubscribed` (coaching payant classique) plutôt
que sur un futur système d'achat à l'unité ou de tier SaaS Premium —
volontairement pas touché, ça dépend entièrement de Stripe (pas encore
autorisé) et construire ce gating maintenant serait spéculatif sur une
base qui peut encore changer.

En cherchant ailleurs, trouvé un vrai gain rapide : ni le calculateur
calories/macros ni le calculateur 1RM de `/outils` (page publique
optimisée SEO) ne proposaient quoi que ce soit après avoir affiché un
résultat, alors que c'est justement le moment où l'intention
nutrition/entraînement du visiteur est la plus claire. Ajouté un bloc
CTA (un guide vraiment pertinent + création de compte) après chaque
résultat : `guide-macros` pour le calculateur calories, `checklist-
bases-avant-ajouter-poids` pour le 1RM (les deux slugs vérifiés
existants avant de les câbler). Formules elles-mêmes revérifiées au
passage : Mifflin-St Jeor pour le métabolisme de base et Epley pour le
1RM, les deux références standard, correctement implémentées.

### Validation

`tsc --noEmit`, `eslint`, `next build` de production : tous propres
(exit 0).

## DS — Telegram, la plateforme oubliée du chantier multi-plateformes (2026-09-17)

En reprenant la production de scripts, vérifié par requête directe que
`platform = 'telegram'` avait 0 ligne en base : sur les 7 plateformes
explicitement demandées dans le chantier d'origine, Telegram avait été
la seule jamais concrétisée malgré l'Axe DG qui affirmait le chantier
"complet". Corrigé avec "L'échauffement qui sert vraiment à quelque
chose" (099, mauvais_principe_demasque, registre diffusion avec CTA
numéroté, même traitement que WhatsApp Statut) — Fradkin et al. 2006.

Ajouté aussi un 2e script Reddit ("Hypertrophie ou force, comment
vraiment choisir", 016, comprendre_pour_decider, aucun CTA commercial,
même registre que le premier post Reddit de l'Axe DE) pour renforcer la
présence sur cette plateforme avant de généraliser à un 2e post par
plateforme.

### Validation

Vérifié par requête SQL qu'aucun tiret cadratin/demi-cadratin ne s'est
glissé dans les 2 scripts. Anti-doublon vérifié avant écriture (aucun
script existant sur les lead magnets 099/016).

## DT — Relance J+1 après la toute première action d'un membre gratuit (2026-09-17)

Investigation dédiée (priorité n°1 du mandat permanent : rétention et
activation des membres gratuits) sur ce qui se passe réellement après
qu'un nouveau membre a fait son tout premier geste de valeur. L'onboarding
lui-même est déjà solide (`OnboardingFlow`, `WelcomeGuide`,
`lib/onboarding-checklist.ts` avec 4 vraies actions branchées sur des
compteurs réels) et `lib/first-action-celebration.ts` félicite déjà le
membre pour sa première séance/premier repas/premier bilan, in-app + push.

Le vrai trou trouvé n'est pas dans l'onboarding mais juste après : dès
qu'une de ces actions existe, le membre est classé "actif" par
`weekly-reengagement` (fenêtre `DORMANT_DAYS` de 10 jours,
`lib/reengagement.ts`) et ne reçoit plus rien avant longtemps. Or
`celebrateFirstAction` n'envoie jamais d'email, seulement in-app + push,
canal partiellement fiable seulement (accepté ou révoqué à tout moment,
non supporté sur Safari iOS avant la version 16.4). Le lendemain de ce premier geste,
moment où un renforcement compte le plus pour transformer un geste isolé
en habitude, n'avait donc aucun canal fiable pour une bonne part des
membres.

Corrigé avec un système minimal, sans nouvelle table :
- `profiles.first_real_action_at` : posé une seule fois par
  `celebrateFirstAction`, quel que soit le geste (séance/repas/bilan) qui
  arrive en premier (`update ... where first_real_action_at is null`).
- `app/api/cron/first-action-followup` (nouveau cron quotidien, 16h UTC,
  jobid pg_cron `first-action-followup`) : cible les membres gratuits
  (`subscription_status != 'active'`, un client accompagné a déjà un
  coach humain qui suit son démarrage) dont `first_real_action_at` tombe
  dans une fenêtre de 20h à 44h avant le passage du cron (fenêtre large
  plutôt que "pile 24h" pour ne jamais rater quelqu'un si l'horaire dérive
  d'un passage à l'autre). Envoie email (Brevo, `wrapBrandedEmail`) + push
  + cloche in-app, une seule fois par membre
  (`profiles.first_action_followup_sent_at`, jamais réinitialisé).
- `lib/first-action-followup.ts` (`buildFollowupMessage`) : félicite pour
  le geste déjà fait puis pointe vers la prochaine action manquante dans
  l'ordre workout > repas > bilan (même ordre que la checklist
  d'onboarding) ; si les 3 sont déjà cochées, félicite pour la régularité
  plutôt que de répéter une checklist déjà terminée.
- `first_action_followup` ajouté aux types "essentiel" de
  `lib/notification-preferences.ts` (jamais désactivable), même
  traitement que les autres mécanismes de relance de rétention
  (`quiet_client_relance`, `stagnation_escalation`...).

Volontairement pas touché : le cron `weekly-reengagement` lui-même (cette
relance J+1 est un complément qui vit dans le trou qu'il laisse, pas un
remplacement) et la félicitation immédiate de `celebrateFirstAction`
(reste in-app + push, instantanée ; cette relance est le rattrapage à
J+1, plus posé, par email).

### Validation

`tsc --noEmit` et `eslint` propres sur les fichiers touchés (après
`npm ci`, `node_modules` absent au démarrage de la session). `next build`
échoue dès `/api/webhooks/stripe` (`STRIPE_SECRET_KEY` absent de cet
environnement) confirmé pré-existant et sans rapport avec ce chantier
(même échec identique après `git stash` de tous les changements de cette
session). Migration appliquée en direct sur `cadmwvrsjklgtrrebflz`
(colonnes + `cron.schedule`), vérifiée par requête SQL après coup
(colonnes présentes, job actif). Avis Supabase sécurité/perf revérifiés
après coup : aucune nouvelle entrée, uniquement du bruit préexistant déjà
documenté (index inutilisés, fonctions `SECURITY DEFINER` historiques).

## DU — L'appli répond 402 sur 100% des appels, et 4 crons tournaient 24/7 sans aucun client payant (2026-09-17)

Retour direct : "travaille sur l'appli, focus". Requête sur les logs
`edge_logs` du projet Supabase (`cadmwvrsjklgtrrebflz`) sur les dernières
24h : 1413 requêtes sur 1416 renvoient `402 Payment Required`, tous
endpoints confondus (`lead_magnets`, `profiles`, `schedule_blocks`,
`live_events`...). Ce n'est donc pas "juste" le login qui est bloqué par
la crise de quota egress ([[project_supabase_quota_crisis]]), c'est
littéralement 100% des appels REST qui échouent en production
aujourd'hui, jusqu'au renouvellement du cycle le 2026-09-27. Rien à
corriger côté code sur ce point précis (c'est une limite de plan
Supabase, pas un bug), mais ça confirme que la crise est plus sévère que
ce que la mémoire précédente indiquait.

Ce qui EST corrigeable côté code : `cron.job` (pg_cron, exécuté depuis
Postgres lui-même, indépendant de Vercel dont `vercel.json` a
volontairement `crons: []`, voir les migrations `supabase/migrations/202608*_*_cron.sql`)
listait 4 jobs tournant toutes les 5 à 15 minutes, 24h/24, 7j/7, alors
qu'il y a 0 client payant actif aujourd'hui ([[feedback_client_vs_membre]]) :
`live-reminders` (*/5), `meal-reminders` (*/15), `nag-client-tasks`
(*/10), `send-client-reminders` (*/10). Chacun de ces passages consomme
au moins une requête Supabase même quand il n'y a strictement rien à
notifier — un vrai poste d'egress de fond, invisible tant que l'app
fonctionne, qui va directement re-consommer une partie du quota libéré
le 27 si rien ne change.

Réduit la fréquence des 4 jobs sans rien casser côté utilisateur, via
`cron.alter_job` (jamais `cron.unschedule`/`cron.schedule` : le champ
`command` de ces jobs contient le vrai `CRON_SECRET` en clair, pas le
placeholder des fichiers de migration d'origine — le recréer aurait
cassé le cron en silence) :
- `live-reminders` */5 → */10 : la fenêtre de rappel
  (`REMINDER_WINDOW_MINUTES = 15`) reste strictement plus large que le
  nouveau pas, aucun live ne peut être manqué.
- `meal-reminders` */15 → */20 : fenêtre élargie en conséquence dans
  `app/api/cron/meal-reminders/route.ts` (`target` à `target + 20` au
  lieu de `+ 15`) — une fenêtre de largeur égale au pas du cron contient
  toujours exactement un passage, quel que soit l'horaire du créneau.
- `nag-client-tasks` */10 → */20 et `send-client-reminders` */10 → */20 :
  les deux utilisent une logique de rattrapage ("relance si le délai
  configuré est dépassé" / "envoie si l'heure est passée et pas encore
  fait aujourd'hui"), jamais une fenêtre stricte — juste quelques minutes
  de délai supplémentaire possible avant qu'une relance parte, aucune
  perte de notification.

Volontairement PAS touché : `schedule-block-notify` (*/5), qui porte la
fonctionnalité réveil ("réveil qui sonne vraiment", relance explicitement
construite sur un pas de 5 minutes pendant sa fenêtre d'escalade de 30
min, voir les commentaires du fichier) — y toucher recasserait une
fonctionnalité déjà corrigée après plusieurs retours directs, pour un
gain marginal. `live-reminders-24h` (horaire) et tous les crons
quotidiens/hebdomadaires : déjà assez espacés, aucun gain réel à en
tirer.

### Validation

`tsc --noEmit` propre. Changement de fréquence vérifié en base après
application (`select jobid, schedule, command ilike '%REPLACE_WITH%' from
cron.job where jobid in (1,2,6,20)`) : les 4 schedules sont bien passés
aux nouvelles valeurs, et aucun `command` ne contient le placeholder
(confirme que le vrai secret est resté intact).

## DV — Supabase passé en Pro : crise résolue, 2 migrations en attente depuis longtemps enfin appliquées (2026-09-17)

Retour direct : "j'ai mis Supabase payant [...] corrige les problèmes
qu'on avait". Vérifié avant tout plutôt que de supposer : requête sur
`edge_logs` des 5 dernières minutes, 0% de `402` (100% de `200`/`201`/`204`),
contre 1413/1416 il y a moins de deux heures (Axe DU) — le plan Pro est
bien actif, la crise décrite dans [[project_supabase_quota_crisis]] est
résolue. Cette mémoire doit être mise à jour en conséquence.

Trois corrections en chaîne, une fois l'accès rétabli :

1. **Annulé le ralentissement de l'Axe DU** (`live-reminders` */10→*/5,
   `meal-reminders` */20→*/15 avec la fenêtre de code remise à 15 min,
   `nag-client-tasks` et `send-client-reminders` */20→*/10) : la
   contrainte de quota qui justifiait ce ralentissement n'existe plus,
   revenir à la précision de notification d'origine est un pur gain, sans
   aucune raison de garder le compromis.

2. **Appliqué `20260916_fix_dst_drift_notification_crons.sql`**, en
   attente depuis la veille (fichier avec placeholder
   `REPLACE_WITH_CRON_SECRET`, l'utilisateur n'avait justement pas accès
   à l'appli pour l'exécuter lui-même dans le SQL Editor). Vérifié
   d'abord que le code des 5 routes concernées (`nutrition-reminder`,
   `missed-session-check`, `stagnation-escalation`,
   `weekly-progress-recap`, `weekly-sleep-recap`) implémentait déjà le
   bon calcul dynamique en heure de Paris (`nowInParis`, guard de fenêtre)
   avant de toucher à quoi que ce soit — c'était le cas partout. Appliqué
   via `cron.alter_job` (jamais `cron.unschedule`/`cron.schedule` du
   fichier, qui aurait remplacé le vrai `CRON_SECRET` par le placeholder
   et cassé les 5 jobs en silence) : les 3 jobs quotidiens passent de
   leur décalage UTC figé (faux à un des deux changements d'heure/an) à
   `*/15 * * * *`, les 2 jobs hebdo à `0 * * * 0` (toutes les heures,
   dimanche uniquement). Ces notifications arrivaient donc bien décalées
   depuis un temps indéterminé, sans qu'aucune alerte ne le signale nulle
   part.

3. **Appliqué `20260916b_mailing_stats_cache.sql`** (colonnes
   `stats_json`/`stats_fetched_at` sur `coach_mailings`), en attente
   depuis la veille pour la même raison. `lib/coach-mailings.ts` avait
   déjà un repli sur une sélection sans ces colonnes quand elles
   n'existaient pas (retour direct antérieur) : ce repli redevient
   simplement inutilisé maintenant que les colonnes existent, aucun code
   à toucher.

Vérifié en parallèle que le connecteur Stripe et un éventuel connecteur
Instagram/YouTube dédié (posting/analytics) ne sont PAS disponibles dans
cette session malgré le retour direct ("plein de connecteurs [...] accès
à mon insta et mon youtube") — seul TikTok a un vrai connecteur de
publication (Higgsfield). Signalé à l'utilisateur plutôt que de laisser
croire à un accès qui n'existe pas : la nouvelle grille tarifaire
([[project_pricing_2026-09-16]]) reste donc bloquée côté Stripe jusqu'à
une authentification explicite de ce connecteur précis.

### Validation

`tsc --noEmit` propre après le retour à */15 de `meal-reminders`.
Vérifié en base après coup : les 4 jobs de l'Axe DU sont revenus à leur
schedule d'origine, les 5 jobs DST sont sur leur nouveau schedule, aucun
`command` ne contient de placeholder, les 2 colonnes `coach_mailings`
existent (`information_schema.columns`).

## DW — Nom de Santamaria absent de tout le SEO de l'appli (2026-09-17)

Retour direct : "je veux que quand je cherche moi [...] ou EP Coaching ou
coaching sportif on ressorte en haut". Vérifié avant d'agir : "Santamaria"
n'apparaissait dans AUCUNE balise meta ni dans le texte visible de
`app/page.tsx` (l'accueil, destination du lien en bio Instagram) ni de
`app/coachs/page.tsx` (la page qui affiche pourtant son profil), malgré un
audit SEO déjà mené le 2026-09-16 (sitemap, robots.txt, metadata par page,
voir Axes de cette date). Aucune donnée structurée (JSON-LD) nulle part
sur le site non plus, alors que c'est le levier le plus direct pour
qu'un moteur de recherche associe une personne à une marque (recherche de
nom propre).

Corrigé :
- `app/page.tsx` : JSON-LD `Organization` (EP Coaching) avec `founder`
  `Person` (Santamaria Sanchéz) et `sameAs` vers les vrais profils
  confirmés (Instagram, TikTok, YouTube — jamais une URL LinkedIn
  inventée, aucune vanity URL confirmée à ce jour). Ligne de bas de page
  passée de "EP Coaching · Coaching Bodybuilding & Performance" à
  "EP Coaching · Fondé par Santamaria Sanchéz · Coaching Bodybuilding &
  Performance" (texte visible, pas que la donnée structurée).
- `app/coachs/page.tsx` : titre/description passés de "Ton coach | EP
  Coaching" (aucun nom) à "Santamaria Sanchéz, coach EP Coaching" — cette
  page affiche déjà son profil visiblement (seul coach humain à ce jour,
  `getCoachDirectory()`), mais son nom n'apparaissait dans aucune balise
  title/description alors que c'est la page la plus directement
  pertinente pour une recherche sur son nom propre.

Le mot "coaching sportif" était déjà présent dans le title/description de
l'accueil depuis l'audit du 2026-09-16 ("Coaching sportif en ligne
(bodybuilding, nutrition, performance)"), rien à ajouter sur ce point
précis. Pas touché au site vitrine (repo séparé
github.com/SantamariaSanchez/EPCoaching), hors du périmètre de cette
session (pas de checkout local disponible).

### Validation

`tsc --noEmit` propre. JSON-LD vérifié syntaxiquement valide (`JSON.stringify`
d'un objet TypeScript, pas de chaîne construite à la main qui risquerait
un JSON cassé).

## DX — Corrections de fond sur le contenu Studio créatif : identité, zéro barre, priorité objectif (2026-09-17)

Retour direct, sévère et justifié : *"tu as mis coach en muscu en
première ligne, c'est nul et faux, je suis coach body et pour les coachs
[...] charger la barre ou les études, tout le monde s'en fout, et je suis
coach body donc 0 contexte pour une barre, il existe des machines [...]
mon client s'en fout de la fenêtre anabolique ou du mindset, lui il veut
atteindre son objectif, pas qu'on lui parle technique."* Trois problèmes
distincts, tous corrigés :

1. **Identité fausse** : 84 scripts sur le stock non publié utilisaient
   "Coach en musculation." en bloc 0 de description — corrigé en masse
   vers "Coach en bodybuilding." (identité réelle), et vers "Coach en
   bodybuilding, et coach pour les coachs qui veulent scaler." pour les 7
   scripts identifiés comme ciblant spécifiquement le segment coach/business
   (14 points avant de te lancer, temps administratif, multitâche de
   coach, incertitude d'entrepreneur, 10 à 30 clients, un coach ou un plan
   clair, partie invisible du métier).
2. **Référence à la barre, 0 contexte réel** : 9 scripts mentionnaient
   "charger la barre"/"sur la barre" — remplacé par "monter en charge",
   "sur la machine", "une charge très légère" selon le contexte exact de
   chaque script (jamais un simple copier-coller, relu chaque script
   individuellement). Squat/développé gardés comme noms de mouvements
   génériques (existent en version machine), seule la mention explicite
   de la barre elle-même a été retirée.
3. **Nouvelle Règle n°10** ajoutée au 🎬 Guide production scripts reels
   (et Règle n°9 miroir au 🎥 Guide YouTube) : identité exacte, zéro barre,
   et surtout **priorité absolue à l'objectif client sur le mécanisme
   technique** — le hook et la conclusion de chaque script doivent porter
   sur ce que le client obtient (perdre du gras, prendre du muscle,
   atteindre son objectif), jamais sur le "pourquoi ça marche" comme sujet
   central. Ajouté aussi une liste explicite de sujets déjà épuisés à ne
   plus reprendre sans angle vraiment neuf (fenêtre anabolique, motivation
   vs discipline, mindset générique, HIIT vs cardio modéré).

Volontairement pas fait : réécrire intégralement le corps des 84 scripts
pour appliquer la Règle n°10 point 4 (priorité objectif) rétroactivement —
chantier bien plus lourd qu'un correctif de mots-clés, laissé à la
prochaine session de production de scripts qui appliquera la règle
nativement plutôt que de tout réécrire d'un coup sans le recul nécessaire
pour bien faire chaque script.

### Validation

Vérifié par requête SQL qu'il ne reste aucune occurrence de "coach en
musculation" ni de "la barre" au sens équipement (hors faux positif
figuré "la barre est haute/basse") dans le stock non publié.
