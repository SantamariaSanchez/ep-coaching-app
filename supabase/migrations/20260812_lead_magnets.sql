-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Lead magnets : capture d'email/téléphone sur la page
-- publique /ressources avant de débloquer un guide/checklist/quiz.
-- Le contenu des lead magnets lui-même vit en dur dans lib/lead-magnets.ts
-- (comme les tips mindset dans lib/mindset-content.ts), seule la capture
-- de contact est en base.
-- Exécute dans Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_magnet_slug text not null,
  email text,
  phone text,
  source text not null default 'ressources_public',
  created_at timestamptz not null default now(),
  constraint leads_email_or_phone_chk check (email is not null or phone is not null),
  constraint leads_email_len_chk check (email is null or length(email) <= 320),
  constraint leads_phone_len_chk check (phone is null or length(phone) <= 40),
  constraint leads_slug_len_chk check (length(lead_magnet_slug) <= 100)
);

create index if not exists idx_leads_slug on public.leads(lead_magnet_slug);
create index if not exists idx_leads_created_at on public.leads(created_at desc);

-- Écriture publique (formulaire non authentifié) mais jamais de lecture
-- publique — la table capture des coordonnées, personne ne doit pouvoir
-- les relire depuis le client. Les écritures elles-mêmes passent par le
-- client admin côté serveur (voir app/ressources/actions.ts), RLS activée
-- ici seulement en défense en profondeur.
alter table public.leads enable row level security;

drop policy if exists "Nobody reads leads directly" on public.leads;
create policy "Nobody reads leads directly" on public.leads
  for select using (false);
