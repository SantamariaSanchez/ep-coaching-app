-- Idées du Studio : toutes les plateformes suivies (2026-09-30).
alter table public.content_ideas drop constraint if exists content_ideas_platform_check;
alter table public.content_ideas add constraint content_ideas_platform_check
  check (platform in ('instagram', 'tiktok', 'youtube', 'facebook', 'linkedin', 'threads', 'general'));
