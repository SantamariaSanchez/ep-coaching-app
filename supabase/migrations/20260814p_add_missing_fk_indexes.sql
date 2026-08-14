-- MASTERCLASS.md Axe I : 3 cles etrangeres sans index couvrant (advisor
-- unindexed_foreign_keys) -- ralentit les jointures/DELETE en cascade sur
-- ces colonnes. Ajout pur, aucun changement de comportement.
--
-- Deja appliquee en production via le MCP Supabase le 2026-08-14.

create index if not exists coaching_waitlist_member_id_idx
  on public.coaching_waitlist (member_id);

create index if not exists content_ideas_source_question_id_idx
  on public.content_ideas (source_question_id);

create index if not exists formation_lesson_views_lesson_id_idx
  on public.formation_lesson_views (lesson_id);
