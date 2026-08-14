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

**Statut : première passe faite (2026-08-14).**

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

### Reste à faire sur cet axe

- `progression` et `roadmap` (coach/moi) pas encore vérifiés en détail
  (composants dédiés `CoachMoiRoadmapView` etc., pas encore ouverts) — état
  plutôt en lecture/édition ponctuelle côté coach, risque a priori plus bas
  que les checklists quotidiennes déjà couvertes, mais pas confirmé.
- La passe 1 (grossière, par fichier) ne détecte pas une fonction isolée
  oubliée dans un fichier qui a par ailleurs des revalidations correctes
  ailleurs — c'est exactement comme ça que nutrition/formations sont
  passés sous le radar une fois qu'on ne regarde plus que les fichiers à
  zéro revalidation. Une vraie couverture demanderait un passage fonction
  par fonction sur les ~60 fichiers d'actions, pas juste un grep global —
  gros chantier, à faire par petits lots plutôt que d'un coup.

## Prochains axes (pas commencés)

Idées à développer au fil des passes plutôt que planifiées d'avance en
détail (l'esprit de la demande est "petit à petit", pas un plan figé).
Axes A (cache après mutation), B (échecs silencieux côté UI), C
(accessibilité clavier) et D (catch muets côté serveur) sont clos —
détail de chacun plus bas. Idée pas encore commencée :
- Cohérence des messages d'erreur utilisateur (certains génériques, d'autres
  précis) et de la discipline "jamais de tiret" déjà en place ailleurs —
  plus une question de polish/cohérence de ton que de vrai bug, à cadrer
  différemment des axes précédents (pas un grep mécanique évident, demande
  de relire beaucoup de messages un par un pour juger de leur clarté).

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
- Nice-to-have repéré en vérifiant les backdrops de modale : aucun ne gère
  la touche Échap (seulement le clic sur le fond ou le bouton `×`) — pas
  un blocage (le bouton `×` reste accessible au clavier), mais un vrai
  gain d'ergonomie clavier si repris un jour.

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
