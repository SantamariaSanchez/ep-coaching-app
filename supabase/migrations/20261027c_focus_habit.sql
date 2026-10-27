-- Une seule habitude à la fois (Mastermind, arrivée du client : une première
-- habitude simple pour une victoire rapide en 2 semaines, 3 à 5 choses et pas
-- tout d'un coup). L'habitude du moment et sa date de départ.
alter table public.profiles add column if not exists focus_habit_key text;
alter table public.profiles add column if not exists focus_habit_since date;
comment on column public.profiles.focus_habit_key is 'Clé de l''habitude du moment (lib/mindset-content.ts HABITS). Une seule à la fois, 14 jours.';
