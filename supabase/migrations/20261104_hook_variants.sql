-- Variantes d'accroche pour les reels d'essai : une idée, plusieurs ouvertures.
-- À exécuter dans le Supabase SQL Editor (non automatisé par le déploiement).
alter table public.coach_scripts add column if not exists hook_variants text[] not null default '{}';
