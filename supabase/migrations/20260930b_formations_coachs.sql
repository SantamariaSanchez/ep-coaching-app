-- Formations pour TOUS les coachs (demande directe 2026-09-29 : "vendre des
-- formations", "apprendre grâce aux formations et aux lives").
--   owner_id null  = Académie EP (plateforme, éditée par le fondateur) ;
--   owner_id = id  = formation d'un coach, visible par ses clients.
-- access_mode : 'inclus' (tous ses clients) ou 'payant' (accès donné à la
-- personne, après achat via le lien de paiement du coach).
-- Sécurité : jusqu'ici n'importe quel compte coach pouvait écrire sur toute
-- l'Académie en direct (policies "role = coach"). L'écriture est maintenant
-- limitée au propriétaire de chaque formation.
-- Idempotent : peut être relancée sans risque.

alter table public.formations add column if not exists owner_id uuid references public.profiles(id) on delete cascade;
alter table public.formations add column if not exists access_mode text not null default 'inclus';
alter table public.formations add column if not exists price_eur numeric;
alter table public.formations add column if not exists payment_url text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'formations_access_mode_check') then
    alter table public.formations add constraint formations_access_mode_check check (access_mode in ('inclus', 'payant'));
  end if;
end $$;
create index if not exists formations_owner_idx on public.formations (owner_id, order_index);

create table if not exists public.formation_access (
  formation_id uuid not null references public.formations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  source text not null default 'manuel',
  granted_at timestamptz not null default now(),
  primary key (formation_id, user_id)
);
alter table public.formation_access enable row level security;
drop policy if exists "formation_access_own_read" on public.formation_access;
create policy "formation_access_own_read" on public.formation_access for select using (user_id = (select auth.uid()));
drop policy if exists "formation_access_owner_read" on public.formation_access;
create policy "formation_access_owner_read" on public.formation_access for select using (
  exists (select 1 from public.formations f where f.id = formation_id and f.owner_id = (select auth.uid()))
);

-- Qui peut modifier une formation : son coach propriétaire, ou le fondateur
-- pour l'Académie EP.
create or replace function public.can_edit_formation(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.formations f
    join public.profiles p on p.id = auth.uid()
    where f.id = fid
      and p.role = 'coach'
      and ((f.owner_id is null and p.is_platform_owner = true) or f.owner_id = p.id)
  );
$$;

drop policy if exists coach_insert_formations on public.formations;
create policy coach_insert_formations on public.formations for insert with check (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'coach'
      and ((owner_id is null and p.is_platform_owner = true) or owner_id = p.id)
  )
);
drop policy if exists coach_update_formations on public.formations;
create policy coach_update_formations on public.formations for update using (public.can_edit_formation(id)) with check (public.can_edit_formation(id));
drop policy if exists coach_delete_formations on public.formations;
create policy coach_delete_formations on public.formations for delete using (public.can_edit_formation(id));

drop policy if exists coach_insert_modules on public.formation_modules;
create policy coach_insert_modules on public.formation_modules for insert with check (public.can_edit_formation(formation_id));
drop policy if exists coach_update_modules on public.formation_modules;
create policy coach_update_modules on public.formation_modules for update using (public.can_edit_formation(formation_id)) with check (public.can_edit_formation(formation_id));
drop policy if exists coach_delete_modules on public.formation_modules;
create policy coach_delete_modules on public.formation_modules for delete using (public.can_edit_formation(formation_id));

drop policy if exists coach_insert_sections on public.formation_sections;
create policy coach_insert_sections on public.formation_sections for insert with check (
  public.can_edit_formation((select m.formation_id from public.formation_modules m where m.id = module_id))
);
drop policy if exists coach_update_sections on public.formation_sections;
create policy coach_update_sections on public.formation_sections for update using (
  public.can_edit_formation((select m.formation_id from public.formation_modules m where m.id = module_id))
);
drop policy if exists coach_delete_sections on public.formation_sections;
create policy coach_delete_sections on public.formation_sections for delete using (
  public.can_edit_formation((select m.formation_id from public.formation_modules m where m.id = module_id))
);

drop policy if exists coach_insert_lessons on public.formation_lessons;
create policy coach_insert_lessons on public.formation_lessons for insert with check (
  public.can_edit_formation((select m.formation_id from public.formation_sections s join public.formation_modules m on m.id = s.module_id where s.id = section_id))
);
drop policy if exists coach_update_lessons on public.formation_lessons;
create policy coach_update_lessons on public.formation_lessons for update using (
  public.can_edit_formation((select m.formation_id from public.formation_sections s join public.formation_modules m on m.id = s.module_id where s.id = section_id))
);
drop policy if exists coach_delete_lessons on public.formation_lessons;
create policy coach_delete_lessons on public.formation_lessons for delete using (
  public.can_edit_formation((select m.formation_id from public.formation_sections s join public.formation_modules m on m.id = s.module_id where s.id = section_id))
);

notify pgrst, 'reload schema';
