-- Le suivi des leads (/dashboard/coach/admin/leads) était un pur journal en
-- lecture seule : email/téléphone/date, sans la moindre notion d'état ni de
-- suivi manuel possible. Demande directe 2026-09-09 : les onglets "juste
-- info" ("lead" cité en exemple) doivent devenir de vrais outils. Ajoute un
-- statut de pipeline et une note libre par lead, pour que l'écran devienne
-- un outil de travail (qui a été contacté, qui reste à traiter) plutôt
-- qu'une liste qu'on ne fait que consulter.
alter table public.leads add column if not exists status text not null default 'nouveau'
  check (status in ('nouveau', 'contacte', 'qualifie', 'converti', 'perdu'));
alter table public.leads add column if not exists coach_note text;
alter table public.leads add column if not exists status_updated_at timestamptz;

create index if not exists leads_status_idx on public.leads (status);
