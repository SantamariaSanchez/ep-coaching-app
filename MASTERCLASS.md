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
(accessibilité clavier), D (catch muets côté serveur), E (`useState`
jamais resynchronisé sur un nouveau prop serveur), F (boutons icône seule
sans nom accessible), G (champs de formulaire sans nom accessible) et H
(pas d'`error.tsx`/`not-found.tsx`) sont clos — détail de chacun plus bas.
Idée pas encore commencée :
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

### Reste à faire sur cet axe

- ~77 champs restent sans nom accessible après ces deux passes (aucun
  `placeholder`, pas de `<label>`/`<span>` sibling au motif reconnu par
  les scripts) — nécessitent une lecture individuelle du contexte,
  remis à une passe future plutôt que de deviner un texte au hasard.
- Les `aria-label` ajoutés depuis un `placeholder` reprennent parfois un
  texte d'exemple plutôt qu'une vraie description du champ (ex.
  `placeholder="Ex. 12"` donne `aria-label="Ex. 12"`, pas
  "Durée en semaines") — mieux que rien, mais pas idéal ; une relecture
  ciblée des placeholders de type "Ex. ..." pourrait affiner ça un jour.
- Le détecteur d'"expression JS unique" (bug `CheckinForm.tsx` ci-dessus)
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
