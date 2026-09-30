-- Origine réelle de chaque lead (LANCEMENT.md semaine 2 : « Leads : origine
-- par contenu visible en 1 écran »). Appliquée en direct via le MCP Supabase
-- le 2026-09-30. Voir lib/lead-origin.ts.
alter table public.leads
  add column if not exists origin_platform text,
  add column if not exists origin_script_id uuid references public.coach_scripts(id) on delete set null,
  add column if not exists origin_referrer text;
create index if not exists leads_origin_script_id_idx on public.leads(origin_script_id) where origin_script_id is not null;
comment on column public.leads.origin_platform is 'Plateforme d''origine (lien suivi ?src= ou referrer), voir lib/lead-origin.ts';
comment on column public.leads.origin_script_id is 'Script (coach_scripts) dont le lien suivi ?c= a amené ce lead : attribution exacte';
comment on column public.leads.origin_referrer is 'Nom d''hôte du site précédent (jamais l''URL complète)';
