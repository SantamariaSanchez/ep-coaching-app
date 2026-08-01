-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Pouvoirs de modération du fondateur
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : le fondateur (is_platform_owner) doit pouvoir envoyer un
-- message direct à N'IMPORTE QUEL utilisateur de la plateforme (support,
-- modération), pas seulement à ses propres clients. Les messages sont
-- insérés directement depuis le client (RLS = seule couche d'application
-- réelle ici, voir components/messaging/ConversationView.tsx), donc cette
-- policy est la source de vérité, pas juste une défense en profondeur.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "Active clients and coach can send messages" on public.messages;
create policy "Active clients and coach can send messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_own_coach(receiver_id)
      or (
        public.is_active_client()
        and exists (
          select 1 from public.profiles c
          where c.id = auth.uid() and c.coach_id = receiver_id
        )
      )
      or exists (
        select 1 from public.profiles c
        where c.id = auth.uid() and c.role = 'coach' and c.coach_id = receiver_id
      )
      -- Le fondateur peut écrire à n'importe qui (support, modération)...
      or public.is_platform_owner()
      -- ...et n'importe qui peut lui répondre, même sans être son propre client.
      or exists (
        select 1 from public.profiles r
        where r.id = receiver_id and r.is_platform_owner = true
      )
    )
  );
