-- 1) Décalage d'une séance du programme « juste cette semaine » :
--    une ligne par (séance, semaine) qui remplace le weekday du modèle pour
--    la semaine commençant le lundi week_start. Le modèle (program_days.weekday)
--    ne bouge pas ; « à chaque semaine » modifie directement program_days.weekday.
create table if not exists public.program_day_moves (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  day_id uuid not null references public.program_days(id) on delete cascade,
  week_start date not null,
  weekday smallint not null check (weekday between 1 and 7),
  created_at timestamptz not null default now(),
  unique (day_id, week_start)
);
create index if not exists program_day_moves_program_week_idx on public.program_day_moves (program_id, week_start);
-- RLS activée sans politique : lecture/écriture uniquement via le serveur (client admin).
alter table public.program_day_moves enable row level security;

-- 2) Photo d'un exercice (en plus de video_url).
--    Pour un exercice de la bibliothèque (is_official = true), video_url et
--    image_url sont la démonstration affichée automatiquement au client.
--    Pour un exercice créé par un coach (is_official = false), ce sont ses médias.
alter table public.exercise_library add column if not exists image_url text;
comment on column public.exercise_library.image_url is 'Photo de démonstration (URL publique, bucket exercise-images ou lien). Complète video_url.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-images', 'exercise-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- Mêmes règles que exercise-videos : lecture publique, envoi et suppression réservés au coach.
create policy "exercise-images public read" on storage.objects for select to public using (bucket_id = 'exercise-images');
create policy "exercise-images coach upload" on storage.objects for insert to authenticated with check (bucket_id = 'exercise-images' and is_coach());
create policy "exercise-images coach delete" on storage.objects for delete to public using (bucket_id = 'exercise-images' and is_coach());
