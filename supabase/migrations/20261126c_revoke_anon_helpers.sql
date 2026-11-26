-- Audit sécurité 26/11 (advisor « SECURITY DEFINER exécutable par anon »).
-- Ces deux fonctions ne servent à aucune policy évaluée pour un visiteur non
-- connecté : on retire l'exécution à anon et PUBLIC, on la garde pour les
-- utilisateurs connectés (policies, triggers du garde-manger) et le service.
-- Les autres helpers (is_own_coach, is_platform_owner…) restent exécutables
-- par anon : des policies « public » les appellent et les retirer ferait
-- échouer les lectures anonymes au lieu de renvoyer zéro ligne. Ils renvoient
-- false sans auth.uid(), donc rien n'est exposé.
revoke execute on function public.is_active_client() from public, anon;
grant execute on function public.is_active_client() to authenticated, service_role;
revoke execute on function public.pantry_auto_enabled(uuid) from public, anon;
grant execute on function public.pantry_auto_enabled(uuid) to authenticated, service_role;
