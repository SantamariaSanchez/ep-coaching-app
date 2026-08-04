-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Fix bug fonctionnel : client_tasks sans policy RLS
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : client_tasks a été repassée en RLS activée à un moment donné,
-- mais sans jamais recevoir de policy (confirmé par l'audit sécurité du
-- 2026-08-04 : "RLS Enabled No Policy"). Résultat concret en prod : la page
-- "Mes tâches" du client (ClientTasksView, lecture directe via le client
-- Supabase navigateur) ne retourne jamais aucune tâche, et cocher une tâche
-- comme faite ne s'enregistre jamais (l'update est silencieusement bloqué
-- par la RLS, l'UI se met à jour en local mais rien n'est persisté). Idem
-- côté fiche client coach (getClientTasks), qui ne voit jamais rien non
-- plus depuis la même migration RLS.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.client_tasks enable row level security;

drop policy if exists "Client reads own tasks" on public.client_tasks;
create policy "Client reads own tasks" on public.client_tasks
  for select using (client_id = auth.uid() or public.is_own_coach(client_id));

drop policy if exists "Client completes own tasks" on public.client_tasks;
create policy "Client completes own tasks" on public.client_tasks
  for update using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists "Coach manages own client tasks" on public.client_tasks;
create policy "Coach manages own client tasks" on public.client_tasks
  for all using (public.is_own_coach(client_id))
  with check (public.is_own_coach(client_id));
