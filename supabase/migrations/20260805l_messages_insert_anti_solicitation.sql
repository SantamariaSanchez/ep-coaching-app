-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Un membre gratuit ne peut pas écrire en premier au coach
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : la règle "un membre gratuit ne peut que RÉPONDRE au coach,
-- jamais ouvrir la conversation" n'existait que côté rendu de page
-- (app/dashboard/client/messages/page.tsx calcule canSend). Or les messages
-- sont insérés directement depuis le navigateur (components/messaging/
-- ConversationView.tsx) : la RLS est la seule couche réellement appliquée.
-- La policy INSERT ne vérifiait nulle part qu'un message du coach existait
-- déjà dans le fil, et ne contraignait pas non plus conversation_id, qui
-- pouvait donc pointer vers le fil d'un autre membre.
--
-- Deuxième problème corrigé ici, apparu en vérifiant le cas normal en base :
-- la branche qui devait autoriser un membre à écrire au fondateur reposait
-- sur EXISTS (select 1 from profiles r where r.id = receiver_id and
-- r.is_platform_owner) — une sous-requête soumise à la RLS de profiles, où
-- un membre ne voit QUE sa propre ligne. Elle renvoyait donc toujours false,
-- et un membre gratuit ne pouvait plus répondre à son coach du tout, même
-- après que celui-ci avait écrit. Les vérifications passent maintenant par
-- des fonctions SECURITY DEFINER, comme is_own_coach()/is_platform_owner()
-- déjà utilisées ici.
--
-- Anti récursion : la vérification "le coach a-t-il déjà écrit dans ce fil"
-- interroge la table messages depuis une policy qui protège messages. Elle
-- DOIT donc passer par une fonction SECURITY DEFINER (qui court-circuite la
-- RLS et coupe la récursion), jamais par une sous-requête directe — voir
-- 20260805e_fix_profiles_rls_infinite_recursion.sql.
-- ═══════════════════════════════════════════════════════════════════════

-- Le destinataire est-il bien le coach de l'expéditeur, ou le fondateur ?
-- SECURITY DEFINER indispensable : un membre ne peut pas lire la fiche de
-- son coach à travers la RLS de profiles.
create or replace function public.can_message_recipient(target_receiver_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and (
        me.coach_id = target_receiver_id
        or exists (
          select 1 from public.profiles r
          where r.id = target_receiver_id
            and r.is_platform_owner = true
        )
      )
  )
$$;

-- L'expéditeur a-t-il le droit d'OUVRIR la conversation ? Oui pour un
-- client payant et pour un compte coach (y compris double rôle, coach
-- lui-même suivi par un autre coach). Non pour un membre gratuit, qui ne
-- peut que répondre.
create or replace function public.can_open_conversation()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and (me.role = 'coach' or me.subscription_status = 'active')
  )
$$;

-- Un message de target_sender_id existe-t-il déjà dans ce fil ? Utilisé
-- pour n'autoriser un membre gratuit à écrire qu'après le coach.
create or replace function public.conversation_opened_by(
  target_conversation_id uuid,
  target_sender_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.messages m
    where m.conversation_id = target_conversation_id
      and m.sender_id = target_sender_id
  )
$$;

grant execute on function public.can_message_recipient(uuid) to authenticated;
grant execute on function public.can_open_conversation() to authenticated;
grant execute on function public.conversation_opened_by(uuid, uuid) to authenticated;

drop policy if exists "Active clients and coach can send messages" on public.messages;

create policy "Active clients and coach can send messages"
on public.messages
for insert
to public
with check (
  sender_id = auth.uid()
  and (
    -- Côté coach : il écrit à l'un de ses propres membres, ou le fondateur
    -- écrit à n'importe qui (support, modération). Le fil porte toujours
    -- l'identifiant du membre, jamais celui du coach.
    (
      conversation_id = receiver_id
      and (public.is_own_coach(receiver_id) or public.is_platform_owner())
    )
    or
    -- Côté membre : uniquement vers son propre coach (ou le fondateur), et
    -- toujours dans SON fil — conversation_id épinglé sur auth.uid(), ce qui
    -- interdit d'aller déposer un message dans le fil d'un autre membre.
    (
      conversation_id = auth.uid()
      and public.can_message_recipient(receiver_id)
      and (
        public.can_open_conversation()
        or public.conversation_opened_by(auth.uid(), receiver_id)
      )
    )
  )
);
