-- Studio YouTube : plan de la vidéo longue (structure Y01 à Y16, type de hook,
-- titres candidats, miniatures A et B, cases de la checklist de publication).
-- Colonne optionnelle : sans elle, le Studio fonctionne comme avant.
alter table public.coach_scripts add column if not exists video_plan jsonb;
comment on column public.coach_scripts.video_plan is 'Plan de la vidéo YouTube (lib/youtube-studio.ts VideoPlan) : structure, hookType, hookId, titles, thumbA, thumbB, checklist.';
