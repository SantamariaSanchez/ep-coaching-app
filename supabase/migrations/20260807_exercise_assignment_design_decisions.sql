-- Décisions du coach POUR CET exercice DANS CETTE séance précise, distinctes
-- des attributs de classification de l'exercice en général (exercise_library,
-- partagés par tous les coachs). "Tout ce qui est data c'est l'appli, tout ce
-- qui est décision c'est moi" — le classement d'un exercice (amplitude type,
-- difficulté d'apprentissage...) est une donnée de référence ; ce que le
-- coach en fait pour CE client précis, à CETTE place dans la séance, est une
-- décision qui se prend une fois par exercice ajouté, pas une fois pour toutes.
alter table exercises
  add column if not exists tension_focus text check (tension_focus in ('etire', 'mi_course', 'raccourci', 'complet')),
  add column if not exists resistance_notes text,
  add column if not exists rom_notes text,
  add column if not exists availability_notes text,
  add column if not exists discomfort_notes text;

comment on column exercises.tension_focus is 'Décision du coach : où la tension est recherchée pour CE client sur CET exercice (peut différer de exercise_library.position si accessoire ajouté).';
comment on column exercises.resistance_notes is 'Accessoires/réglages décidés pour cette séance (élastique, cuff, poignée, cale...).';
comment on column exercises.rom_notes is 'Amplitude décidée pour ce client sur cette machine/poste précis (limite connue, ROM partiel volontaire, ajustement).';
comment on column exercises.availability_notes is 'Disponibilité vérifiée de ce matériel dans la salle du client à son horaire d''entraînement habituel.';
comment on column exercises.discomfort_notes is 'À partir de combien de séries/quelle intensité ce mouvement devient inconfortable pour ce client.';
