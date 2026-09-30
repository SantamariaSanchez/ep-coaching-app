-- Agenda : réorganiser une journée sans toucher à la semaine type
-- (2026-09-30, "si c'est le rush, je bouge un bloc et le reste s'ajuste").
-- Un bloc récurrent peut être masqué à certaines dates : il est alors
-- remplacé ce jour-là par une copie datée (specific_date) décalée.
alter table public.schedule_blocks add column if not exists skipped_dates date[] not null default '{}';
notify pgrst, 'reload schema';
