-- Corrige le meme piege deja rencontre et corrige ailleurs dans l'appli
-- (voir 20260814o_rls_initplan_perf_fix.sql) : auth.uid() dans une policy
-- RLS est reevalue a CHAQUE ligne sans le wrapper (select ...), qui le
-- transforme en InitPlan calcule une seule fois par requete. Trouve par
-- l'advisor de performance juste apres la creation de ces deux tables
-- (20260922_business_non_negotiables.sql), qui n'avait pas encore repris
-- ce pattern.

drop policy if exists "Coach manages own non-negotiables log" on business_non_negotiables_log;
create policy "Coach manages own non-negotiables log"
  on business_non_negotiables_log
  for all
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));

drop policy if exists "Coach manages own monthly objectives" on business_monthly_objectives;
create policy "Coach manages own monthly objectives"
  on business_monthly_objectives
  for all
  using (coach_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()));
