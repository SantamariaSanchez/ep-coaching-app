-- « Ton audit » (transcripts Hormozi et Skali) : une page envoyée dès la
-- réservation, où la prospecte prépare son appel en 2 minutes. Lien privé par
-- rendez-vous (prep_token), réponses gardées avec le rendez-vous.
alter table public.prospect_bookings
  add column if not exists prep_token uuid not null default gen_random_uuid(),
  add column if not exists prep_answers jsonb,
  add column if not exists prep_at timestamptz;
create unique index if not exists prospect_bookings_prep_token_idx on public.prospect_bookings (prep_token);
