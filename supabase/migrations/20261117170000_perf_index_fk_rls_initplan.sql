-- Performance (conseiller Supabase, 17/11/2026) : aucun changement de comportement.
-- 1. Index sur les clés étrangères qui n'en avaient pas.
create index if not exists idx_formation_access_user_id on public.formation_access (user_id);
create index if not exists idx_formation_access_granted_by on public.formation_access (granted_by);
create index if not exists idx_training_gyms_created_by on public.training_gyms (created_by);
create index if not exists idx_program_days_gym_id on public.program_days (gym_id);
create index if not exists idx_client_coaching_phases_replaces_id on public.client_coaching_phases (replaces_id);
create index if not exists idx_client_engagements_updated_by on public.client_engagements (updated_by);
create index if not exists idx_pantry_movements_owner_id on public.pantry_movements (owner_id);
create index if not exists idx_staff_members_application_id on public.staff_members (application_id);
create index if not exists idx_staff_invites_owner_id on public.staff_invites (owner_id);
create index if not exists idx_staff_invites_application_id on public.staff_invites (application_id);
create index if not exists idx_staff_invites_used_by on public.staff_invites (used_by);
create index if not exists idx_staff_documents_staff_id on public.staff_documents (staff_id);
create index if not exists idx_staff_documents_uploaded_by on public.staff_documents (uploaded_by);
create index if not exists idx_team_messages_sender_id on public.team_messages (sender_id);
create index if not exists idx_food_logs_food_id on public.food_logs (food_id);

-- 2. Index en double sur food_logs (client, date) : on garde idx_food_logs_client_date.
drop index if exists public.food_logs_client_date_idx;

-- 3. auth.uid() évalué une seule fois par requête au lieu d'une fois par ligne
--    (même résultat, règle identique).
alter policy "pantry_items_owner" on public.pantry_items
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter policy "pantry_movements_owner" on public.pantry_movements
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter policy "Client reads own engagement" on public.client_engagements
  using (client_id = (select auth.uid()));
alter policy "founder_video_scripts_owner_all" on public.founder_video_scripts
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_platform_owner = true))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_platform_owner = true));
alter policy "platform_owner_all_source_staging" on public.founder_video_scripts_source_staging
  using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.is_platform_owner = true))
  with check (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.is_platform_owner = true));
