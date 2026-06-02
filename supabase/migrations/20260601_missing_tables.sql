-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Tables manquantes
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── 1. MESSAGES ──────────────────────────────────────────────

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'text' check (type in ('text', 'voice')),
  content text,
  voice_url text,
  voice_duration_seconds integer,
  is_read boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);
create index if not exists idx_messages_receiver on public.messages(receiver_id, is_read);

alter table public.messages enable row level security;

drop policy if exists "Users can read their messages" on public.messages;
create policy "Users can read their messages" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can insert their messages" on public.messages;
create policy "Users can insert their messages" on public.messages
  for insert with check (auth.uid() = sender_id);

drop policy if exists "Users can update read status" on public.messages;
create policy "Users can update read status" on public.messages
  for update using (auth.uid() = receiver_id);

-- ── 2. PUSH SUBSCRIPTIONS ────────────────────────────────────

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage their push sub" on public.push_subscriptions;
create policy "Users manage their push sub" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── 3. FOODS ────────────────────────────────────────────────

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  calories_per_100 numeric not null default 0,
  proteins_per_100 numeric not null default 0,
  carbs_per_100 numeric not null default 0,
  fats_per_100 numeric not null default 0,
  fibers_per_100 numeric default 0,
  is_custom boolean default false,
  created_by uuid references auth.users(id) on delete set null,
  -- Micros (per 100g)
  vitamin_d numeric default 0,
  vitamin_c numeric default 0,
  vitamin_a numeric default 0,
  vitamin_e numeric default 0,
  vitamin_k numeric default 0,
  vitamin_b1 numeric default 0,
  vitamin_b2 numeric default 0,
  vitamin_b3 numeric default 0,
  vitamin_b6 numeric default 0,
  vitamin_b9 numeric default 0,
  vitamin_b12 numeric default 0,
  calcium numeric default 0,
  iron numeric default 0,
  magnesium numeric default 0,
  zinc numeric default 0,
  potassium numeric default 0,
  sodium numeric default 0,
  omega3 numeric default 0
);

alter table public.foods enable row level security;

drop policy if exists "Anyone can read foods" on public.foods;
create policy "Anyone can read foods" on public.foods for select using (true);

drop policy if exists "Users can create custom foods" on public.foods;
create policy "Users can create custom foods" on public.foods
  for insert with check (auth.uid() = created_by);

-- ── 4. FOOD_LOGS ────────────────────────────────────────────

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  meal_slot text not null default 'breakfast',
  quantity_g numeric not null default 100,
  logged_at date not null default current_date,
  calories numeric default 0,
  proteins numeric default 0,
  carbs numeric default 0,
  fats numeric default 0,
  fibers numeric default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_food_logs_client_date on public.food_logs(client_id, logged_at);

alter table public.food_logs enable row level security;

drop policy if exists "Clients manage their food logs" on public.food_logs;
create policy "Clients manage their food logs" on public.food_logs
  for all using (auth.uid() = client_id) with check (auth.uid() = client_id);

-- ── 5. NUTRITION_PROFILES ───────────────────────────────────

create table if not exists public.nutrition_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade unique,
  calories_target numeric,
  proteins_target numeric,
  carbs_target numeric,
  fats_target numeric,
  tdee numeric,
  bmr numeric,
  phase text check (phase in ('deficit', 'maintenance', 'surplus')),
  updated_at timestamptz default now()
);

alter table public.nutrition_profiles enable row level security;

drop policy if exists "Client reads own nutrition profile" on public.nutrition_profiles;
create policy "Client reads own nutrition profile" on public.nutrition_profiles
  for select using (auth.uid() = client_id);

-- Coach writes via service_role (admin client in code) — no RLS needed for that

-- ── 6. SESSIONS (logbook) ───────────────────────────────────

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid,
  day_label text not null default 'Séance libre',
  muscle_groups text[],
  session_date date not null default current_date,
  warmup_duration_seconds integer,
  warmup_validated boolean default false,
  duration_minutes integer,
  general_feeling integer check (general_feeling between 1 and 5),
  energy_level integer check (energy_level between 1 and 5),
  pump integer check (pump between 1 and 5),
  notes text,
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_client on public.sessions(client_id, session_date desc);

alter table public.sessions enable row level security;

drop policy if exists "Clients manage their sessions" on public.sessions;
create policy "Clients manage their sessions" on public.sessions
  for all using (auth.uid() = client_id) with check (auth.uid() = client_id);

-- ── 7. SESSION_SETS ─────────────────────────────────────────

create table if not exists public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  exercise_id uuid,
  exercise_name text not null,
  muscle_group text,
  set_number integer not null,
  reps_target text,
  reps_actual integer,
  weight_kg numeric,
  previous_weight_kg numeric,
  rir_target integer,
  rir_actual integer,
  standardization_score integer check (standardization_score between 1 and 5),
  rest_duration_seconds integer,
  is_pr boolean default false,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.session_sets enable row level security;

drop policy if exists "Clients manage their session sets" on public.session_sets;
create policy "Clients manage their session sets" on public.session_sets
  for all using (
    exists (select 1 from public.sessions where id = session_id and client_id = auth.uid())
  );

-- ── 8. PERSONAL_RECORDS ─────────────────────────────────────

create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  weight_kg numeric not null,
  reps integer,
  achieved_at date default current_date,
  session_id uuid references public.sessions(id) on delete set null
);

alter table public.personal_records enable row level security;

drop policy if exists "Clients manage their PRs" on public.personal_records;
create policy "Clients manage their PRs" on public.personal_records
  for all using (auth.uid() = client_id) with check (auth.uid() = client_id);

-- ── 9. REMINDERS ────────────────────────────────────────────

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  time text not null,
  days text[] not null default '{lun,mar,mer,jeu,ven,sam,dim}',
  is_active boolean default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.reminders enable row level security;

drop policy if exists "Clients manage their reminders" on public.reminders;
create policy "Clients manage their reminders" on public.reminders
  for all using (auth.uid() = client_id) with check (auth.uid() = client_id);

-- ── 10. ROADMAPS ────────────────────────────────────────────

create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade unique,
  created_by uuid references auth.users(id),
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.roadmap_phases (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  type text not null,
  label text not null,
  start_date date not null,
  end_date date not null,
  notes text,
  position integer default 0
);

create table if not exists public.roadmap_objectives (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  type text not null,
  label text not null,
  target_date date not null,
  target_value numeric,
  target_unit text,
  description text,
  term text not null check (term in ('short', 'medium', 'long')),
  is_achieved boolean default false,
  achieved_at date
);

alter table public.roadmaps enable row level security;
alter table public.roadmap_phases enable row level security;
alter table public.roadmap_objectives enable row level security;

drop policy if exists "Roadmap access" on public.roadmaps;
create policy "Roadmap access" on public.roadmaps for select
  using (auth.uid() = client_id or auth.uid() = created_by);

drop policy if exists "Roadmap phases access" on public.roadmap_phases;
create policy "Roadmap phases access" on public.roadmap_phases for select
  using (exists (select 1 from public.roadmaps where id = roadmap_id and (client_id = auth.uid() or created_by = auth.uid())));

drop policy if exists "Roadmap objectives access" on public.roadmap_objectives;
create policy "Roadmap objectives access" on public.roadmap_objectives for select
  using (exists (select 1 from public.roadmaps where id = roadmap_id and (client_id = auth.uid() or created_by = auth.uid())));

-- ── 11. FOODS DE BASE ───────────────────────────────────────

insert into public.foods (name, category, calories_per_100, proteins_per_100, carbs_per_100, fats_per_100, fibers_per_100)
select * from (values
  ('Poulet blanc (cuit)', 'Viandes', 165, 31, 0, 3.6, 0),
  ('Bœuf haché 5% (cuit)', 'Viandes', 135, 22, 0, 5, 0),
  ('Dinde escalope (cuite)', 'Viandes', 135, 29, 0, 1.5, 0),
  ('Jambon blanc', 'Viandes', 107, 17, 1.5, 3.7, 0),
  ('Saumon (cuit)', 'Poissons', 208, 20, 0, 13, 0),
  ('Thon en boîte (égoutté)', 'Poissons', 116, 26, 0, 1, 0),
  ('Sardines en boîte', 'Poissons', 200, 24, 0, 11, 0),
  ('Cabillaud (cuit)', 'Poissons', 105, 23, 0, 1, 0),
  ('Crevettes (cuites)', 'Poissons', 99, 18, 0.2, 3, 0),
  ('Œuf entier (cuit)', 'Œufs', 155, 13, 1.1, 11, 0),
  ('Blanc d''œuf (cuit)', 'Œufs', 52, 11, 0.7, 0.2, 0),
  ('Riz blanc (cuit)', 'Féculents', 130, 2.7, 28, 0.3, 0.4),
  ('Riz complet (cuit)', 'Féculents', 123, 2.7, 26, 1, 1.8),
  ('Pâtes (cuites)', 'Féculents', 131, 5, 25, 1.1, 1.8),
  ('Patate douce (cuite)', 'Féculents', 86, 1.6, 20, 0.1, 3),
  ('Pomme de terre (cuite)', 'Féculents', 87, 1.9, 20, 0.1, 1.8),
  ('Flocons d''avoine', 'Céréales', 389, 17, 66, 7, 10),
  ('Pain complet', 'Céréales', 247, 9, 44, 3.4, 6.3),
  ('Quinoa (cuit)', 'Céréales', 120, 4.4, 22, 1.9, 2.8),
  ('Fromage blanc 0%', 'Laitiers', 46, 8, 4, 0.2, 0),
  ('Yaourt grec nature', 'Laitiers', 97, 9, 4, 5, 0),
  ('Lait demi-écrémé', 'Laitiers', 46, 3.2, 4.8, 1.5, 0),
  ('Cottage cheese', 'Laitiers', 98, 11, 3.4, 4.3, 0),
  ('Mozzarella', 'Laitiers', 280, 19, 2.2, 17, 0),
  ('Fromage blanc 20%', 'Laitiers', 78, 8, 4, 3.1, 0),
  ('Amandes', 'Oléagineux', 579, 21, 22, 50, 12.5),
  ('Noix', 'Oléagineux', 654, 15, 14, 65, 6.7),
  ('Beurre de cacahuète', 'Oléagineux', 588, 25, 20, 50, 6),
  ('Avocat', 'Fruits', 160, 2, 9, 15, 6.7),
  ('Huile d''olive', 'Matières grasses', 884, 0, 0, 100, 0),
  ('Banane', 'Fruits', 89, 1.1, 23, 0.3, 2.6),
  ('Pomme', 'Fruits', 52, 0.3, 14, 0.2, 2.4),
  ('Orange', 'Fruits', 47, 0.9, 12, 0.1, 2.4),
  ('Myrtilles', 'Fruits', 57, 0.7, 14, 0.3, 2.4),
  ('Épinards (crus)', 'Légumes', 23, 2.9, 3.6, 0.4, 2.2),
  ('Brocoli (cuit)', 'Légumes', 35, 2.4, 7.2, 0.4, 2.6),
  ('Courgette (cuite)', 'Légumes', 17, 1.2, 3.1, 0.2, 1),
  ('Tomate', 'Légumes', 18, 0.9, 3.9, 0.2, 1.2),
  ('Concombre', 'Légumes', 15, 0.6, 3.6, 0.1, 0.5),
  ('Carottes (crues)', 'Légumes', 41, 0.9, 10, 0.2, 2.8),
  ('Lentilles (cuites)', 'Légumineuses', 116, 9, 20, 0.4, 7.9),
  ('Pois chiches (cuits)', 'Légumineuses', 164, 9, 27, 2.6, 7.6),
  ('Haricots noirs (cuits)', 'Légumineuses', 132, 8.9, 24, 0.5, 8.7),
  ('Edamame (cuit)', 'Légumineuses', 122, 11, 10, 5.2, 5.2),
  ('Tofu ferme', 'Protéines végé', 76, 8, 1.9, 4.8, 0.3),
  ('Tempeh', 'Protéines végé', 193, 19, 9.4, 11, 0),
  ('Whey protéine vanille', 'Compléments', 370, 75, 10, 5, 0),
  ('Granola nature', 'Céréales', 450, 10, 65, 12, 5)
) as t(name, category, calories_per_100, proteins_per_100, carbs_per_100, fats_per_100, fibers_per_100)
where not exists (select 1 from public.foods limit 1);

-- ── 12. REALTIME ────────────────────────────────────────────
-- Activer dans Dashboard > Database > Replication > messages
-- alter publication supabase_realtime add table public.messages;
