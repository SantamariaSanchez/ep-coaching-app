-- Remet la clé étrangère food_logs.food_id -> foods(id), absente de la base
-- de prod (constaté le 2026-09-27 : "Could not find a relationship between
-- 'food_logs' and 'foods'"). Le code ne dépend plus de cette clé (voir
-- attachFoods dans utils/nutrition.ts), elle sert à l'intégrité des données.
-- Idempotent : ne fait rien si la clé existe déjà.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.food_logs'::regclass
      and contype = 'f'
      and confrelid = 'public.foods'::regclass
  ) then
    -- Lignes qui pointent vers un aliment supprimé : même effet que le
    -- "on delete set null" d'origine.
    update public.food_logs fl
      set food_id = null
      where food_id is not null
        and not exists (select 1 from public.foods f where f.id = fl.food_id);

    alter table public.food_logs
      add constraint food_logs_food_id_fkey
      foreign key (food_id) references public.foods(id) on delete set null;
  end if;
end $$;

create index if not exists food_logs_client_date_idx on public.food_logs (client_id, logged_at);

notify pgrst, 'reload schema';
