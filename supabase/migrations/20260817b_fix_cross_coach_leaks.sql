-- Corrige 3 des 6 failles cross-coach documentées dans PROGRESS.md (audit
-- séparé, jamais traité car "hors périmètre" du chantier "50 idées" et non
-- exploitable avec un seul coach en prod à l'époque). Découvert le
-- 2026-08-17 en lisant le prompt de la routine cloud "Revue quotidienne
-- check-ins", qui les mentionne explicitement comme prérequis avant toute
-- commercialisation à d'autres coachs — condition en train de devenir
-- vraie maintenant que /carrieres et le suivi d'onboarding recrutent
-- réellement (voir CROISSANCE.md, EQUIPE-IA.md).
--
-- Audit complet des 6 items nommés (communauté, live, profil, dashboard
-- stats, /api/push/send, /api/coach/pending-count) : 3 déjà corrigés entre
-- temps sans que ce fichier de suivi ne soit mis à jour (dashboard-stats,
-- /api/push/send, /api/coach/pending-count — code applicatif déjà
-- correctement scopé, vérifié en lisant les routes concernées). "live" et
-- "profil" : RLS déjà correctement scopée (is_own_coach()/my_coach_scope()
-- sur live_events, live_event_rsvps, profiles) — vérifié sain. Restait
-- "communauté", corrigé ici, plus resource_requests (même famille de
-- faille, documentée séparément dans PROGRESS.md sous "Signalements").
--
-- Le motif fautif partout : `EXISTS (select 1 from profiles where
-- profiles.id = auth.uid() and profiles.role = 'coach')` autorise N'IMPORTE
-- QUEL coach de la plateforme, pas seulement le coach du client concerné.
-- Remplacé par is_own_coach(author_id), qui vérifie la vraie relation
-- coach/client (déjà utilisé correctement ailleurs : profiles, check_ins).

drop policy if exists "Author or coach can update a post" on public.community_posts;
create policy "Author or coach can update a post" on public.community_posts
  for update
  using (
    (select auth.uid()) = author_id
    or is_own_coach(author_id)
    or is_platform_owner()
  );

drop policy if exists "Author or coach can delete a recipe" on public.community_recipes;
create policy "Author or coach can delete a recipe" on public.community_recipes
  for delete
  using (
    (select auth.uid()) = author_id
    or is_own_coach(author_id)
    or is_platform_owner()
  );

drop policy if exists "Author or coach can update a request" on public.resource_requests;
create policy "Author or coach can update a request" on public.resource_requests
  for update
  using (
    (select auth.uid()) = author_id
    or is_own_coach(author_id)
    or is_platform_owner()
  );

drop policy if exists "Author or coach can delete a request" on public.resource_requests;
create policy "Author or coach can delete a request" on public.resource_requests
  for delete
  using (
    (select auth.uid()) = author_id
    or is_own_coach(author_id)
    or is_platform_owner()
  );
