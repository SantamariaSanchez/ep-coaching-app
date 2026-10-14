-- Check-in : plusieurs vidéos d'exécution, chacune avec le nom de l'exercice
-- (video_path reste rempli avec la première pour l'existant). Ré-exécutable.
alter table public.check_ins
  add column if not exists video_paths text[],
  add column if not exists video_labels text[];
