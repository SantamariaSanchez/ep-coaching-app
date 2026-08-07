-- Rattache (optionnellement) une séance à un vrai jour de la semaine, pour
-- pouvoir la placer contre l'agenda réel du client (schedule_blocks, même
-- convention 1=lundi ... 7=dimanche) au lieu de rester une étiquette abstraite
-- ("Séance A", "Push"...) sans lien avec sa semaine réelle. Nullable : les
-- modèles réutilisables (program_templates, table séparée mais même DayInput
-- côté code) et les séances pas encore placées restent valides sans ça.
alter table program_days
  add column if not exists weekday int check (weekday between 1 and 7);

comment on column program_days.weekday is 'Jour de la semaine réel (1=lundi...7=dimanche), même convention que schedule_blocks.day_of_week. Décision du coach, pas déduit automatiquement.';
