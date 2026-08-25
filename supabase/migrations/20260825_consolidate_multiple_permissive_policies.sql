-- Déjà exécutée en production via le MCP Supabase le 2026-08-25.
-- Consolidation des policies RLS permissives qui se chevauchent (advisor
-- performance Supabase, 154 occurrences de "multiple_permissive_policies"
-- sur 22 tables, déjà repéré et documenté comme dette technique dans
-- MASTERCLASS.md Axe T le 2026-08-17, jamais traité depuis). Chaque paire
-- fait évaluer Postgres deux fois par ligne au lieu d'une. Pas un risque
-- de sécurité (aucun accès effectif ne change), uniquement de la
-- performance à l'échelle, qui devient pertinente maintenant que le
-- recrutement de coachs est actif (voir CROISSANCE.md).
--
-- Méthode : pour chaque table, l'union exacte des conditions "avant" est
-- recalculée et reportée dans une policy unique par commande, jamais
-- simplifiée ni élargie. Deux familles de fusion :
-- 1. Une policy ALL "owner-only" + une policy SELECT plus large (owner
--    OR coach) : la policy ALL est éclatée en INSERT/UPDATE/DELETE
--    (owner seul), la policy SELECT reste ou devient la seule à couvrir
--    la lecture avec l'union exacte des conditions.
-- 2. Une policy redondante, strict sous-ensemble d'une autre sur la même
--    commande (ex "Users can read own profile" ⊂ "Coach reads all
--    profiles") : suppression pure, aucun accès perdu.
--
-- Vérifié après application : get_advisors(type=performance) ne remonte
-- plus aucune occurrence de multiple_permissive_policies (35 unused_index
-- restants, non liés) ; get_advisors(type=security) remonte exactement
-- les mêmes findings qu'avant (aucun nouveau, aucun disparu) — le
-- cloisonnement coach/client est identique à l'octet près, juste évalué
-- une fois par ligne au lieu de deux.

drop policy if exists "Owner can manage their biometric insights" on public.biometric_insights;
drop policy if exists "Owner can manage their biometric logs" on public.biometric_logs;
drop policy if exists "Owner can manage their step logs" on public.step_logs;
drop policy if exists "Owner can manage their routine items" on public.step_routine_items;
drop policy if exists "Owner can manage their step settings" on public.step_settings;

create policy "Owner can insert their biometric insights" on public.biometric_insights for insert with check ((select auth.uid()) = client_id);
create policy "Owner can update their biometric insights" on public.biometric_insights for update using ((select auth.uid()) = client_id) with check ((select auth.uid()) = client_id);
create policy "Owner can delete their biometric insights" on public.biometric_insights for delete using ((select auth.uid()) = client_id);

create policy "Owner can insert their biometric logs" on public.biometric_logs for insert with check ((select auth.uid()) = client_id);
create policy "Owner can update their biometric logs" on public.biometric_logs for update using ((select auth.uid()) = client_id) with check ((select auth.uid()) = client_id);
create policy "Owner can delete their biometric logs" on public.biometric_logs for delete using ((select auth.uid()) = client_id);

create policy "Owner can insert their step logs" on public.step_logs for insert with check ((select auth.uid()) = client_id);
create policy "Owner can update their step logs" on public.step_logs for update using ((select auth.uid()) = client_id) with check ((select auth.uid()) = client_id);
create policy "Owner can delete their step logs" on public.step_logs for delete using ((select auth.uid()) = client_id);

create policy "Owner can insert their routine items" on public.step_routine_items for insert with check ((select auth.uid()) = client_id);
create policy "Owner can update their routine items" on public.step_routine_items for update using ((select auth.uid()) = client_id) with check ((select auth.uid()) = client_id);
create policy "Owner can delete their routine items" on public.step_routine_items for delete using ((select auth.uid()) = client_id);

create policy "Owner can insert their step settings" on public.step_settings for insert with check ((select auth.uid()) = client_id);
create policy "Owner can update their step settings" on public.step_settings for update using ((select auth.uid()) = client_id) with check ((select auth.uid()) = client_id);
create policy "Owner can delete their step settings" on public.step_settings for delete using ((select auth.uid()) = client_id);

-- client_supplements : deux policies ALL (client-only, coach-only)
-- qui se chevauchent totalement sur les 4 commandes. Fusion en une seule
-- policy ALL, union exacte des deux conditions.
drop policy if exists "Client manages own supplements" on public.client_supplements;
drop policy if exists "Coach manages own client supplements" on public.client_supplements;
create policy "Client or coach manages supplements" on public.client_supplements
  for all
  using (client_id = (select auth.uid()) or is_own_coach(client_id))
  with check (client_id = (select auth.uid()) or is_own_coach(client_id));

-- coaching_waitlist : deux policies ALL (coach_id, member_id) sur des
-- colonnes différentes de la même ligne, fusionnées.
drop policy if exists "Coach manages own waitlist" on public.coaching_waitlist;
drop policy if exists "Member manages own waitlist entry" on public.coaching_waitlist;
create policy "Coach or member manages waitlist entry" on public.coaching_waitlist
  for all
  using (coach_id = (select auth.uid()) or member_id = (select auth.uid()))
  with check (coach_id = (select auth.uid()) or member_id = (select auth.uid()));

-- client_tasks : ALL (coach) + SELECT (client OR coach, déjà l'union
-- exacte, inchangée) + UPDATE (client seul, fusionné avec l'UPDATE
-- implicite de ALL).
drop policy if exists "Coach manages own client tasks" on public.client_tasks;
drop policy if exists "Client completes own tasks" on public.client_tasks;
create policy "Coach inserts client tasks" on public.client_tasks for insert with check (is_own_coach(client_id));
create policy "Coach deletes client tasks" on public.client_tasks for delete using (is_own_coach(client_id));
create policy "Client or coach updates task" on public.client_tasks
  for update
  using (client_id = (select auth.uid()) or is_own_coach(client_id))
  with check (client_id = (select auth.uid()) or is_own_coach(client_id));
-- "Client reads own tasks" (SELECT) n'est pas touchée : déjà l'union exacte.

-- coach_availability : ALL (coach) + SELECT (coach OR ses clients,
-- déjà l'union exacte pour SELECT).
drop policy if exists "Coach manages own availability" on public.coach_availability;
create policy "Coach inserts own availability" on public.coach_availability for insert with check (coach_id = (select auth.uid()));
create policy "Coach updates own availability" on public.coach_availability for update using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy "Coach deletes own availability" on public.coach_availability for delete using (coach_id = (select auth.uid()));
-- "Own clients read availability" (SELECT) inchangée : déjà l'union exacte.

-- coach_notes : ALL (coach) + SELECT (client seul, fusionné).
drop policy if exists "Coach manages own client notes" on public.coach_notes;
drop policy if exists "Client reads own coach notes" on public.coach_notes;
create policy "Coach inserts client notes" on public.coach_notes for insert with check (is_own_coach(client_id));
create policy "Coach updates client notes" on public.coach_notes for update using (is_own_coach(client_id)) with check (is_own_coach(client_id));
create policy "Coach deletes client notes" on public.coach_notes for delete using (is_own_coach(client_id));
create policy "Client or coach reads notes" on public.coach_notes
  for select
  using (client_id = (select auth.uid()) or is_own_coach(client_id));

-- foods : "Authenticated users can read foods" (role authenticated)
-- est un sous-ensemble strict de "Anyone can read foods" (role public,
-- qui couvre déjà authenticated). Suppression pure, aucun accès perdu.
drop policy if exists "Authenticated users can read foods" on public.foods;

-- formation_lessons/modules/sections/formations : ALL (coach, EXISTS
-- profiles.role='coach') + SELECT (true, déjà plus large). Le SELECT
-- implicite de ALL est un sous-ensemble strict de read_*, on retire
-- juste la part SELECT de ALL.
drop policy if exists "coach_manage_lessons" on public.formation_lessons;
create policy "coach_insert_lessons" on public.formation_lessons for insert to authenticated
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text));
create policy "coach_update_lessons" on public.formation_lessons for update to authenticated
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text))
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text));
create policy "coach_delete_lessons" on public.formation_lessons for delete to authenticated
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text));

drop policy if exists "coach_manage_modules" on public.formation_modules;
create policy "coach_insert_modules" on public.formation_modules for insert to authenticated
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text));
create policy "coach_update_modules" on public.formation_modules for update to authenticated
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text))
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text));
create policy "coach_delete_modules" on public.formation_modules for delete to authenticated
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text));

drop policy if exists "coach_manage_sections" on public.formation_sections;
create policy "coach_insert_sections" on public.formation_sections for insert
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text));
create policy "coach_update_sections" on public.formation_sections for update
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text))
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text));
create policy "coach_delete_sections" on public.formation_sections for delete
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text));

drop policy if exists "coach_manage_formations" on public.formations;
create policy "coach_insert_formations" on public.formations for insert to authenticated
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text));
create policy "coach_update_formations" on public.formations for update to authenticated
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text))
  with check (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text));
create policy "coach_delete_formations" on public.formations for delete to authenticated
  using (exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'coach'::text));

-- nutrition_profiles : "Client reads own nutrition profile" (SELECT,
-- client seul) est un sous-ensemble strict de la policy ALL (client OR
-- coach). Suppression pure.
drop policy if exists "Client reads own nutrition profile" on public.nutrition_profiles;

-- profiles : "Users can read own profile" (SELECT, soi-même) est un
-- sous-ensemble strict de "Coach reads all profiles" (soi-même OR coach
-- OR platform owner). Suppression pure.
drop policy if exists "Users can read own profile" on public.profiles;

-- roadmap_objectives / roadmap_phases : ALL (client OR is_own_coach)
-- + SELECT (client OR created_by). Union exacte des 3 conditions dans une
-- seule policy SELECT ; écriture reste sur la condition d'origine de ALL.
drop policy if exists "Roadmap objectives via roadmap owner" on public.roadmap_objectives;
drop policy if exists "Roadmap objectives access" on public.roadmap_objectives;
create policy "Roadmap objectives insert via owner" on public.roadmap_objectives for insert
  with check (exists (select 1 from roadmaps r where r.id = roadmap_objectives.roadmap_id and (r.client_id = (select auth.uid()) or is_own_coach(r.client_id))));
create policy "Roadmap objectives update via owner" on public.roadmap_objectives for update
  using (exists (select 1 from roadmaps r where r.id = roadmap_objectives.roadmap_id and (r.client_id = (select auth.uid()) or is_own_coach(r.client_id))))
  with check (exists (select 1 from roadmaps r where r.id = roadmap_objectives.roadmap_id and (r.client_id = (select auth.uid()) or is_own_coach(r.client_id))));
create policy "Roadmap objectives delete via owner" on public.roadmap_objectives for delete
  using (exists (select 1 from roadmaps r where r.id = roadmap_objectives.roadmap_id and (r.client_id = (select auth.uid()) or is_own_coach(r.client_id))));
create policy "Roadmap objectives select union" on public.roadmap_objectives for select
  using (exists (select 1 from roadmaps r where r.id = roadmap_objectives.roadmap_id and (r.client_id = (select auth.uid()) or is_own_coach(r.client_id) or r.created_by = (select auth.uid()))));

drop policy if exists "Roadmap phases via roadmap owner" on public.roadmap_phases;
drop policy if exists "Roadmap phases access" on public.roadmap_phases;
create policy "Roadmap phases insert via owner" on public.roadmap_phases for insert
  with check (exists (select 1 from roadmaps r where r.id = roadmap_phases.roadmap_id and (r.client_id = (select auth.uid()) or is_own_coach(r.client_id))));
create policy "Roadmap phases update via owner" on public.roadmap_phases for update
  using (exists (select 1 from roadmaps r where r.id = roadmap_phases.roadmap_id and (r.client_id = (select auth.uid()) or is_own_coach(r.client_id))))
  with check (exists (select 1 from roadmaps r where r.id = roadmap_phases.roadmap_id and (r.client_id = (select auth.uid()) or is_own_coach(r.client_id))));
create policy "Roadmap phases delete via owner" on public.roadmap_phases for delete
  using (exists (select 1 from roadmaps r where r.id = roadmap_phases.roadmap_id and (r.client_id = (select auth.uid()) or is_own_coach(r.client_id))));
create policy "Roadmap phases select union" on public.roadmap_phases for select
  using (exists (select 1 from roadmaps r where r.id = roadmap_phases.roadmap_id and (r.client_id = (select auth.uid()) or is_own_coach(r.client_id) or r.created_by = (select auth.uid()))));

-- roadmaps : ALL (client OR coach) + SELECT (client OR created_by).
-- Union exacte des 3 conditions dans une seule policy SELECT.
drop policy if exists "Active clients and coach manage roadmaps" on public.roadmaps;
drop policy if exists "Roadmap access" on public.roadmaps;
create policy "Roadmap insert by client or coach" on public.roadmaps for insert
  with check (client_id = (select auth.uid()) or is_own_coach(client_id));
create policy "Roadmap update by client or coach" on public.roadmaps for update
  using (client_id = (select auth.uid()) or is_own_coach(client_id))
  with check (client_id = (select auth.uid()) or is_own_coach(client_id));
create policy "Roadmap delete by client or coach" on public.roadmaps for delete
  using (client_id = (select auth.uid()) or is_own_coach(client_id));
create policy "Roadmap select union" on public.roadmaps for select
  using (client_id = (select auth.uid()) or is_own_coach(client_id) or created_by = (select auth.uid()));

-- session_sets : "Clients manage their session sets" (ALL, client
-- seul) est intégralement redondante : INSERT/DELETE déjà identiques via
-- les policies standalone, SELECT/UPDATE déjà des sous-ensembles stricts
-- des policies standalone (client OR coach). Suppression pure.
drop policy if exists "Clients manage their session sets" on public.session_sets;

-- sessions : "Clients manage their sessions" (ALL, client seul) n'est
-- nécessaire que pour DELETE (seule commande sans policy standalone) ;
-- SELECT/INSERT/UPDATE déjà couverts à l'identique ou plus largement
-- ailleurs. Restreinte à DELETE seul.
drop policy if exists "Clients manage their sessions" on public.sessions;
create policy "Users delete own sessions" on public.sessions for delete
  using ((select auth.uid()) = client_id);
