-- Retour direct 2026-09-01 (correction chef) : les blocs importés depuis
-- Google Calendar (rendez-vous coiffeur, appels de vente, sales calls...)
-- étaient traités comme le reste de schedule_blocks, un gabarit RECURRENT
-- par jour de semaine — donc un rendez-vous coiffeur ponctuel se remettait
-- à réapparaître CHAQUE semaine indéfiniment au lieu de disparaître après
-- sa date réelle. "mon rdv chez le coiffeur c'était aujourd'hui donc t'es
-- censé l'enlever que ce soir à minuit" : un bloc ponctuel doit vivre pour
-- UNE date précise, pas pour un jour de semaine récurrent.
--
-- specific_date NULL = comportement inchangé, gabarit récurrent chaque
-- semaine (emploi du temps fixe manuel, ET les vraies séries récurrentes
-- Google Calendar comme les lives hebdo du mastermind Circle qui doivent
-- rester chaque semaine).
-- specific_date renseigné = bloc ponctuel valable UNIQUEMENT ce jour-là,
-- day_of_week reste cohérent avec cette date pour l'affichage, mais un
-- nettoyage quotidien (voir routine "Sync Google Calendar") supprime tout
-- bloc dont specific_date est dans le passé.
alter table schedule_blocks
  add column if not exists specific_date date;

comment on column schedule_blocks.specific_date is 'Si renseigné, ce bloc ne vaut que pour cette date précise (rendez-vous ponctuel importé de Google Calendar), supprimé automatiquement une fois passé. Si NULL, gabarit récurrent chaque semaine (comportement historique).';

create index if not exists schedule_blocks_specific_date_idx on schedule_blocks(specific_date) where specific_date is not null;
