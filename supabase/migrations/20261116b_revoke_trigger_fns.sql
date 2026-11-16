-- Fonctions de déclencheur appelables via /rest/v1/rpc (alerte Supabase) :
-- elles ne servent qu'aux triggers, qui s'exécutent sans ce droit.
revoke execute on function public.pantry_on_food_log() from public, anon, authenticated;
revoke execute on function public.protect_message_content_columns() from public, anon, authenticated;
revoke execute on function public.set_coach_post_scope() from public, anon, authenticated;
