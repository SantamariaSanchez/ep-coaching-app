-- Retours vidéo externes (ScreenPal ou équivalent) sur check-ins et photos
-- de comparaison physique (demande explicite, 2026-08-15) : les
-- corrections d'exercice supportent déjà un lien externe des deux côtés
-- (exercise_corrections.video_link / coach_video_link), mais check_ins
-- n'a un lien externe QUE côté client (video_drive_link), rien côté coach
-- (coach_video_path = upload natif uniquement), et photo_updates n'a
-- aucun lien externe du tout (video_path = upload uniquement). Symétrie
-- avec le pattern déjà en place ailleurs dans le schéma.

alter table public.check_ins
  add column if not exists coach_video_link text;

comment on column public.check_ins.coach_video_link is
  'Lien vidéo externe (ScreenPal, YouTube, Vimeo...) pour la réponse du coach à ce check-in, alternative à coach_video_path (enregistrement natif dans l''appli).';

alter table public.photo_updates
  add column if not exists video_link text;

comment on column public.photo_updates.video_link is
  'Lien vidéo externe (ScreenPal, YouTube, Vimeo...) pour la routine de pose jointe à cette mise à jour photo, alternative à video_path (upload natif).';
