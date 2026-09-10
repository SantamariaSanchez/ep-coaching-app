-- Retour direct 2026-09-10 ("mon agenda... y'a des trous vides... ajuste
-- tout... que tout les jours finisse a 22h et commence a 6h") : audit
-- complet des 7 jours de schedule_blocks (gabarit recurrent, day_of_week,
-- specific_date is null).
--
-- 1) UN SEUL trou recurrent, identique chaque jour : entre le trajet retour
--    de chez mamie (fin dejeuner) et "Formation perso" a 14h05 -- 1h30 de
--    vide (12h35-14h05) les lundi/mardi/mercredi/jeudi/vendredi/samedi,
--    35 min (13h30-14h05) le dimanche (dejeuner plus tard ce jour-la a
--    cause du Live a theme). Comble avec "Travail : montage", le bloc
--    generique deja utilise partout ailleurs dans la semaine pour ce
--    genre de creneau.
--
-- 2) Fin de journee incoherente : lundi et vendredi finissent deja a 22h00
--    pile (Bilan du jour 21h30-22h00), mais mardi/mercredi/jeudi/samedi/
--    dimanche trainaient jusqu'a 22h30 (Bilan du jour 22h00-22h30), a
--    cause du bloc "Travail : montage" de 20h30-21h30 (1h) sur ces
--    jours-la contre un dejeuner/diner plus resserre les autres jours.
--    Reduit ce bloc a 30 min (20h30-21h00) et avance Repas 5/Bilan de 30
--    min en consequence, pour que les 7 jours finissent a 22h00 pile.

-- 1) Comble le trou de 1h30 (lundi a samedi)
insert into schedule_blocks (owner_id, day_of_week, start_time, end_time, label, color, icon, notify, source)
select '845b826a-0e2f-4c44-8130-a8fe1e925351', d, '12:35:00', '14:05:00', 'Travail : montage', '#60a5fa', 'travail', true, 'manual'
from unnest(array[1,2,3,4,5,6]) as d;

-- 1bis) Comble le trou de 35 min (dimanche, dejeuner decale par le Live)
insert into schedule_blocks (owner_id, day_of_week, start_time, end_time, label, color, icon, notify, source)
values ('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '13:30:00', '14:05:00', 'Travail : montage', '#60a5fa', 'travail', true, 'manual');

-- 2a) Reduit le bloc travail du soir de 1h a 30 min sur les jours qui finissaient a 22h30
update schedule_blocks
set end_time = '21:00:00'
where owner_id = '845b826a-0e2f-4c44-8130-a8fe1e925351'
  and specific_date is null
  and day_of_week in (2,3,4,6,7)
  and label = 'Travail : montage'
  and start_time = '20:30:00' and end_time = '21:30:00';

-- 2b) Avance Repas 5 de 30 min (21h30-22h00 -> 21h00-21h30)
update schedule_blocks
set start_time = '21:00:00', end_time = '21:30:00'
where owner_id = '845b826a-0e2f-4c44-8130-a8fe1e925351'
  and specific_date is null
  and day_of_week in (2,3,4,6,7)
  and label = 'Repas 5 : diner'
  and start_time = '21:30:00' and end_time = '22:00:00';

-- 2c) Avance Bilan du jour de 30 min (22h00-22h30 -> 21h30-22h00)
update schedule_blocks
set start_time = '21:30:00', end_time = '22:00:00'
where owner_id = '845b826a-0e2f-4c44-8130-a8fe1e925351'
  and specific_date is null
  and day_of_week in (2,3,4,6,7)
  and label = 'Bilan du jour'
  and start_time = '22:00:00' and end_time = '22:30:00';
