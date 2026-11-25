-- Revenus & dépenses (25/11) : import de relevés bancaires et réglages.
-- 1) Une ligne peut venir d'un relevé importé (CSV de la banque).
alter table public.coach_finance_entries drop constraint if exists coach_finance_entries_source_check;
alter table public.coach_finance_entries
  add constraint coach_finance_entries_source_check check (source = any (array['manual'::text, 'stripe'::text, 'import'::text]));

-- 2) Réglages du coach : objectif de chiffre d'affaires du mois, taux de
-- cotisations à mettre de côté (en %), prix de l'offre principale.
create table if not exists public.coach_finance_settings (
  coach_id uuid primary key references public.profiles(id) on delete cascade,
  monthly_goal numeric check (monthly_goal is null or monthly_goal >= 0),
  contribution_rate numeric check (contribution_rate is null or (contribution_rate >= 0 and contribution_rate <= 100)),
  offer_price numeric check (offer_price is null or offer_price >= 0),
  updated_at timestamptz not null default now()
);
-- RLS activée sans politique : lecture et écriture via le serveur (client admin).
alter table public.coach_finance_settings enable row level security;
