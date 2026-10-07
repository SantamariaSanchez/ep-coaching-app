-- Inventaire de courses (stock du placard et du frigo) : retour direct du
-- fondateur le 2026-10-07, « j'ai acheté 3 bananes, je logue 1 banane, il doit
-- m'en rester 2, et je sais quand racheter sans ouvrir le frigo ».
--
-- pantry_items : un article en stock par utilisateur, compté dans son unité
-- naturelle (grammes, pièces ou millilitres). Pour les pièces, le poids d'une
-- pièce sert à convertir les grammes loggés (une banane d'environ 120 g).
-- pantry_movements : historique des entrées et sorties, pour comprendre le
-- stock et pouvoir annuler proprement la sortie d'un repas supprimé.
--
-- Le stock baisse tout seul via un déclencheur sur food_logs : peu importe
-- l'écran qui a enregistré le repas (tracker, plan, recette, scan...), un
-- aliment mangé qui existe dans le stock en est retiré. Supprimer ou corriger
-- le repas remet la différence en stock.

create table if not exists public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid,
  name text not null check (length(name) between 1 and 120),
  category text not null default 'Divers',
  unit text not null default 'g' check (unit in ('g', 'piece', 'ml')),
  quantity numeric not null default 0 check (quantity >= 0),
  grams_per_unit numeric check (grams_per_unit is null or grams_per_unit > 0),
  low_threshold numeric check (low_threshold is null or low_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pantry_items_owner_food_uniq on public.pantry_items(owner_id, food_id) where food_id is not null;
create index if not exists pantry_items_owner_idx on public.pantry_items(owner_id);

create table if not exists public.pantry_movements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.pantry_items(id) on delete cascade,
  delta numeric not null,
  reason text not null check (reason in ('achat', 'repas', 'ajustement', 'jete')),
  food_log_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists pantry_movements_item_idx on public.pantry_movements(item_id, created_at desc);
create index if not exists pantry_movements_log_idx on public.pantry_movements(food_log_id) where food_log_id is not null;

alter table public.pantry_items enable row level security;
alter table public.pantry_movements enable row level security;

drop policy if exists pantry_items_owner on public.pantry_items;
create policy pantry_items_owner on public.pantry_items
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists pantry_movements_owner on public.pantry_movements;
create policy pantry_movements_owner on public.pantry_movements
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Grammes d'un repas convertis dans l'unité de l'article.
create or replace function public.pantry_grams_to_unit(p_grams numeric, p_unit text, p_grams_per_unit numeric)
returns numeric language sql immutable as $$
  select case
    when p_unit = 'piece' then p_grams / coalesce(nullif(p_grams_per_unit, 0), 100)
    else p_grams
  end
$$;

create or replace function public.pantry_on_food_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_item public.pantry_items%rowtype;
  v_delta numeric;
  v_old_delta numeric;
begin
  if tg_op = 'INSERT' then
    if new.food_id is null or coalesce(new.quantity_g, 0) <= 0 then return new; end if;
    select * into v_item from public.pantry_items where owner_id = new.client_id and food_id = new.food_id limit 1;
    if not found then return new; end if;
    v_delta := public.pantry_grams_to_unit(new.quantity_g, v_item.unit, v_item.grams_per_unit);
    -- Le stock ne descend jamais sous zéro ; la sortie enregistrée est celle
    -- réellement retirée, pour qu'une suppression du repas rende le bon montant.
    v_delta := least(v_delta, v_item.quantity);
    if v_delta <= 0 then return new; end if;
    update public.pantry_items set quantity = quantity - v_delta, updated_at = now() where id = v_item.id;
    insert into public.pantry_movements(owner_id, item_id, delta, reason, food_log_id)
      values (new.client_id, v_item.id, -v_delta, 'repas', new.id);
    return new;
  elsif tg_op = 'DELETE' then
    select coalesce(sum(delta), 0) into v_old_delta from public.pantry_movements where food_log_id = old.id;
    if v_old_delta < 0 then
      update public.pantry_items i set quantity = i.quantity - v_old_delta, updated_at = now()
        from (select distinct item_id from public.pantry_movements where food_log_id = old.id) m
        where i.id = m.item_id;
      delete from public.pantry_movements where food_log_id = old.id;
    end if;
    return old;
  elsif tg_op = 'UPDATE' then
    if new.quantity_g is not distinct from old.quantity_g and new.food_id is not distinct from old.food_id then return new; end if;
    -- On annule l'ancienne sortie puis on applique la nouvelle.
    select coalesce(sum(delta), 0) into v_old_delta from public.pantry_movements where food_log_id = old.id;
    if v_old_delta < 0 then
      update public.pantry_items i set quantity = i.quantity - v_old_delta, updated_at = now()
        from (select distinct item_id from public.pantry_movements where food_log_id = old.id) m
        where i.id = m.item_id;
      delete from public.pantry_movements where food_log_id = old.id;
    end if;
    if new.food_id is null or coalesce(new.quantity_g, 0) <= 0 then return new; end if;
    select * into v_item from public.pantry_items where owner_id = new.client_id and food_id = new.food_id limit 1;
    if not found then return new; end if;
    v_delta := least(public.pantry_grams_to_unit(new.quantity_g, v_item.unit, v_item.grams_per_unit), v_item.quantity);
    if v_delta <= 0 then return new; end if;
    update public.pantry_items set quantity = quantity - v_delta, updated_at = now() where id = v_item.id;
    insert into public.pantry_movements(owner_id, item_id, delta, reason, food_log_id)
      values (new.client_id, v_item.id, -v_delta, 'repas', new.id);
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists food_logs_pantry on public.food_logs;
create trigger food_logs_pantry
  after insert or update or delete on public.food_logs
  for each row execute function public.pantry_on_food_log();
