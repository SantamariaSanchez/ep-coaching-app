-- Agenda, outil de productivité (2026-10-20, retour direct du fondateur :
-- « je dois te demander de modifier mon agenda, ça ne devrait pas être le
-- cas »). Rejouable sans risque (if not exists partout).
--
-- 1) Réglages d'agenda par personne (user_settings) :
--    agenda_day_start / agenda_day_end : début et fin de journée en minutes
--      depuis minuit (360 = 6h, 1320 = 22h). Fin <= début = journée de nuit
--      qui passe minuit (ex. 1200 -> 480 : 20h à 8h).
--    agenda_prefs : choix du générateur « Construire ma semaine » (heure et
--      durée de séance, trajets, blocs de travail et leurs sous-tâches...),
--      gardés pour pré-remplir la fois suivante.
--    agenda_templates : journées types (liste de blocs) réutilisables sur
--      plusieurs jours.
alter table public.user_settings
  add column if not exists agenda_day_start smallint not null default 360,
  add column if not exists agenda_day_end smallint not null default 1320,
  add column if not exists agenda_prefs jsonb not null default '{}'::jsonb,
  add column if not exists agenda_templates jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_settings_agenda_day_start_chk') then
    alter table public.user_settings
      add constraint user_settings_agenda_day_start_chk check (agenda_day_start between 0 and 1439);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_settings_agenda_day_end_chk') then
    alter table public.user_settings
      add constraint user_settings_agenda_day_end_chk check (agenda_day_end between 0 and 1440);
  end if;
end $$;

-- 2) Lien d'un bloc vers ce qu'il représente (schedule_blocks.link_ref) :
--    bloc repas    -> créneau de la diète (breakfast, lunch, dinner...)
--    bloc séance   -> nom de la séance du programme (« Push », « Upper »...)
--    bloc trajet   -> mode de déplacement (marche, velo, voiture, transports)
--    Le lien se résout à l'affichage (séance du programme actif ce jour-là,
--    repas de la diète active) : si le programme ou la diète changent, le
--    bloc pointe toujours vers la bonne chose.
alter table public.schedule_blocks
  add column if not exists link_ref text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'schedule_blocks_link_ref_len_chk') then
    alter table public.schedule_blocks
      add constraint schedule_blocks_link_ref_len_chk check (link_ref is null or length(link_ref) <= 120) not valid;
  end if;
end $$;

notify pgrst, 'reload schema';
