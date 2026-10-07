-- Réglages du compte (2026-10-07) : ceux qui doivent suivre la personne sur
-- tous ses appareils ou être lus côté serveur. Les réglages propres à un
-- appareil (son, vibration, repos par défaut, page d'ouverture) vivent sur
-- l'appareil, voir lib/device-settings.ts.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  pantry_auto boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists user_settings_owner on public.user_settings;
create policy user_settings_owner on public.user_settings
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Le stock ne baisse tout seul que si la personne l'a laissé activé.
create or replace function public.pantry_auto_enabled(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select pantry_auto from public.user_settings where user_id = p_user), true)
$$;

create or replace function public.pantry_on_food_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_item public.pantry_items%rowtype;
  v_delta numeric;
  v_old_delta numeric;
begin
  if tg_op = 'INSERT' then
    if new.food_id is null or coalesce(new.quantity_g, 0) <= 0 or not public.pantry_auto_enabled(new.client_id) then return new; end if;
    select * into v_item from public.pantry_items where owner_id = new.client_id and food_id = new.food_id limit 1;
    if not found then return new; end if;
    v_delta := least(public.pantry_grams_to_unit(new.quantity_g, v_item.unit, v_item.grams_per_unit), v_item.quantity);
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
    select coalesce(sum(delta), 0) into v_old_delta from public.pantry_movements where food_log_id = old.id;
    if v_old_delta < 0 then
      update public.pantry_items i set quantity = i.quantity - v_old_delta, updated_at = now()
        from (select distinct item_id from public.pantry_movements where food_log_id = old.id) m
        where i.id = m.item_id;
      delete from public.pantry_movements where food_log_id = old.id;
    end if;
    if new.food_id is null or coalesce(new.quantity_g, 0) <= 0 or not public.pantry_auto_enabled(new.client_id) then return new; end if;
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
