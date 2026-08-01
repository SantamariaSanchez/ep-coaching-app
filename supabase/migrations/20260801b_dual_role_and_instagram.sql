-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Double rôle coach/client + Instagram profil
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : un compte coach peut désormais être aussi suivi comme client
-- par un autre coach (coach_id existait déjà mais n'était utilisé que pour
-- les profils role='client' ; aucune contrainte ne l'empêchait sur un profil
-- role='coach', donc aucune migration de schéma n'est nécessaire pour ça).
-- On ajoute uniquement le champ Instagram, affiché sur le profil ou utilisé
-- pour orienter un membre sans coach vers Emmanuel ou un autre coach actif.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists instagram_handle text;

-- ── messages : un coach lui-même suivi par un autre coach (double rôle)
-- doit pouvoir écrire à CE coach sans condition d'abonnement — is_active_client()
-- exige role='client', ce qui bloquait ce cas précis à tort. ────────────────
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
    )
  );
