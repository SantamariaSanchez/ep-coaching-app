-- Budget de volume : cible de séries directes/semaine par groupe musculaire,
-- fixée par le coach AVANT de choisir les exercices (voir VolumeBudgetPanel),
-- puis suivie en direct pendant la construction (VolumeReviewPanel compare au
-- réel). Une vraie décision de planification, donc sauvegardée comme le
-- reste du programme plutôt que perdue au rechargement de la page.
alter table programs
  add column if not exists volume_targets jsonb;

comment on column programs.volume_targets is 'Cibles de séries directes hebdomadaires par groupe musculaire ({"Pectoraux": 14, ...}), décidées par le coach avant la construction.';
