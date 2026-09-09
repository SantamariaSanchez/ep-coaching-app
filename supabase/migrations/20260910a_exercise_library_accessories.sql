-- Retour direct 2026-09-10 : "les accessoire y sontt encore faux donc fait
-- en sorte quil y es un bagages daccesoire et que c moi qui defini et
-- choisi quel accesoire ya" — jusqu'ici accessoriesForSession (lib/
-- session-accessories.ts) devinait par mots-clés sur le nom de l'exercice,
-- fragile et jamais correct pour tout le monde ("lift loop pour legs
-- epaules c'est completement faux", deja corrige une fois, toujours des
-- faux positifs). Ce champ permet au coach de choisir EXPLICITEMENT, une
-- fois par exercice dans la bibliotheque partagee, quels accessoires du
-- catalogue 0RIR s'appliquent — modifiable a tout moment depuis
-- ExerciseDetailPanel. Le tableau vide (comportement actuel de tous les
-- exercices existants) fait retomber sur l'ancienne devinette par mots-clés
-- en filet, le temps que la bibliotheque soit renseignee a la main.
alter table exercise_library
  add column if not exists accessories text[] not null default '{}';
