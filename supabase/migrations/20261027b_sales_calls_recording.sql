-- Suivi des appels de vente : enregistrement des appels (décision d'Emmanuel,
-- Mastermind « Onboarding client » : enregistrer tous les appels), retour
-- d'appel en vidéo courte, type d'appel et questions posées par la personne
-- (chaque question posée en appel est un contenu à faire).
alter table public.sales_calls add column if not exists call_kind text not null default 'decouverte';
alter table public.sales_calls drop constraint if exists sales_calls_call_kind_check;
alter table public.sales_calls add constraint sales_calls_call_kind_check
  check (call_kind in ('decouverte', 'kickoff', 'suivi'));
alter table public.sales_calls add column if not exists recording_url text;
alter table public.sales_calls add column if not exists recording_consent boolean;
alter table public.sales_calls add column if not exists followup_url text;
alter table public.sales_calls add column if not exists prospect_questions text;
comment on column public.sales_calls.recording_consent is 'La personne a accepté l''enregistrement de l''appel. Sans accord, ne pas enregistrer.';
comment on column public.sales_calls.followup_url is 'Retour d''appel : vidéo courte (moins de 5 minutes) ou message vocal envoyé après l''appel.';
