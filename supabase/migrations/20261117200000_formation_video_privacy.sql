-- Vidéos de formation : l'identifiant YouTube n'est plus lisible par la
-- session d'un utilisateur. Avant, la règle read_lessons (true) laissait
-- n'importe quel compte connecté lire youtube_id d'une formation payante
-- sans y avoir accès. L'appli lit désormais has_video pour savoir si une
-- leçon est disponible, et youtube_id avec le client admin seulement après
-- hasFormationAccess (utils/formations.ts, getLessonVideoId).

-- 1. Indicateur lisible par tous (appliqué avant le déploiement du code).
alter table public.formation_lessons
  add column if not exists has_video boolean generated always as (youtube_id is not null and youtube_id <> '') stored;

-- 2. Lecture colonne par colonne, sans youtube_id (appliqué après le déploiement).
revoke select on public.formation_lessons from anon, authenticated;
grant select (id, module_id, section_id, title, description, duration_min, order_index, is_published, has_video)
  on public.formation_lessons to anon, authenticated;
