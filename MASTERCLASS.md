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
détail (l'esprit de la demande est "petit à petit", pas un plan figé) :
- Cohérence de la gestion d'erreur dans les server actions (certaines
  retournent `{ error }`, d'autres lèvent, certaines avalent l'erreur
  silencieusement en `catch {}` sans log).
- Accessibilité clavier sur les éléments cliquables construits en `<div
  onClick>` plutôt qu'un vrai `<button>` (repéré ponctuellement dans ce
  chantier, jamais audité systématiquement).
- Cohérence des messages d'erreur utilisateur (certains génériques, d'autres
  précis) et de la discipline "jamais de tiret" déjà en place ailleurs.

## Axe B — Échecs silencieux : résultat d'action jamais vérifié côté UI

**Statut : première passe faite (2026-08-14), un cas net corrigé.**

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

### Reste à faire sur cet axe

- Les ~59 autres résultats du grep n'ont pas été triés un par un — la
  prochaine passe sur cet axe devrait reprendre la liste complète (gardée
  dans l'historique git de ce fichier / relançable via la commande
  ci-dessus) et vérifier chaque site d'appel, pas seulement celui qui avait
  la plus forte concentration.
