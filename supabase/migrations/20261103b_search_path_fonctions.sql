-- Sécurité (P61, conseiller Supabase du 03/11/2026) : search_path figé sur les
-- 4 fonctions signalées « role mutable search_path ». Aucun changement de
-- comportement : elles utilisent déjà le schéma public.
alter function public.notes_tags_text(text[]) set search_path = public;
alter function public.pantry_grams_to_unit(numeric, text, numeric) set search_path = public;
alter function public.coach_scripts_written_to_publish() set search_path = public;
alter function public.lead_magnet_next_keyword() set search_path = public;
