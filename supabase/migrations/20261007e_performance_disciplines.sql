-- Deux disciplines de plus dans Performances (2026-10-07) : prépa
-- compétition de bodybuilding et grossesse / post-partum.
alter table public.performance_entries drop constraint if exists performance_entries_discipline_check;
alter table public.performance_entries add constraint performance_entries_discipline_check
  check (discipline in ('course', 'hyrox', 'crossfit', 'force', 'reeducation', 'sante', 'prepa', 'maternite'));
