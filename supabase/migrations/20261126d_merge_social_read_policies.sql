-- Audit perf 26/11 (advisor « multiple permissive policies ») : chaque table
-- social_* avait deux policies SELECT (coach propriétaire, fondateur) évaluées
-- l'une après l'autre. Fusion en une seule, réservée aux utilisateurs
-- connectés (un visiteur anonyme n'avait déjà aucune ligne : auth.uid() nul).
-- Même résultat, une seule évaluation.
do $$
declare
  t text;
  own text;
begin
  foreach t in array array['social_accounts','social_account_daily','social_audience_snapshots','social_posts','social_post_metrics'] loop
    own := case t
      when 'social_accounts' then 'owner_id = (select auth.uid())'
      when 'social_posts' then 'exists (select 1 from public.social_accounts a where a.id = social_posts.account_id and a.owner_id = (select auth.uid()))'
      when 'social_post_metrics' then 'exists (select 1 from public.social_posts p join public.social_accounts a on a.id = p.account_id where p.id = social_post_metrics.post_id and a.owner_id = (select auth.uid()))'
      else format('exists (select 1 from public.social_accounts a where a.id = %I.account_id and a.owner_id = (select auth.uid()))', t)
    end;
    execute format('drop policy if exists %I on public.%I', 'coach reads own ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'owner reads ' || t, t);
    execute format('drop policy if exists %I on public.%I', 'read ' || t, t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((%s) or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_platform_owner = true))',
      'read ' || t, t, own);
  end loop;
end $$;
