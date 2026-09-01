-- Tableau simple de suivi des appels de vente (TODO Notion #13, source
-- synthèse webinaire Matis Clouet : "dès le premier appel Calendly pris
-- après la reprise du 1er septembre, un tableau simple de suivi (appels
-- bookés, show up, closing, chiffre d'affaires), base du futur revenu par
-- call et LTV/CAC"). Rien de tel n'existait avant, remplissage manuel par
-- le coach après chaque appel (pas d'intégration Calendly/Stripe
-- automatique dans cette première version, volontairement simple).
create table if not exists sales_calls (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  lead_name text not null,
  call_date date not null default current_date,
  -- null = pas encore su (appel pas encore passé), true/false une fois su.
  show_up boolean,
  closed boolean,
  revenue_amount numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table sales_calls is 'Suivi manuel des appels de vente (appels bookés, show up, closing, CA) par coach. Base du futur calcul de revenu par call et LTV/CAC, voir synthèse webinaire Matis Clouet dans Notion.';

create index if not exists sales_calls_coach_id_idx on sales_calls(coach_id, call_date desc);

alter table sales_calls enable row level security;

-- Même schéma que le reste de l'app : le coach ne voit/modifie que ses
-- propres lignes.
create policy "Coach manages own sales calls"
  on sales_calls
  for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
