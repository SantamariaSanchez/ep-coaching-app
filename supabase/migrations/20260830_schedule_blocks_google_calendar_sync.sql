-- Pont Google Calendar -> agenda de l'app (demande explicite 2026-08-30) :
-- quand Santamaria ajoute un vrai rendez-vous externe (appel, Calendly...) a
-- son Google Calendar, une routine cloud recurrente (Notion/Supabase/Google
-- Calendar MCP) doit le detecter et refleter automatiquement un bloc
-- correspondant dans schedule_blocks, sans que ca reste un import manuel.
--
-- Deux colonnes suffisent a rendre cette synchronisation idempotente et
-- reversible :
--   - google_event_id : l'id de l'evenement Google Calendar d'origine, sert
--     de cle pour upsert (jamais de doublon si la routine tourne plusieurs
--     fois) et pour supprimer le bloc si l'evenement est annule cote Google.
--   - source : distingue un bloc cree a la main (comportement historique,
--     jamais touche par la routine) d'un bloc importe automatiquement, pour
--     que l'UI puisse un jour l'annoter differemment si besoin.
--
-- Limite assumee (documentee aussi dans la routine elle-meme) : schedule_blocks
-- reste un gabarit recurrent par jour_de_semaine, sans notion de date precise.
-- Un rendez-vous ponctuel Google Calendar est donc reflete sur son
-- jour-de-semaine + heure, pas sur une date calendaire unique : il continuera
-- a apparaitre chaque semaine dans l'appli tant qu'il n'est pas supprime a la
-- main. C'est un compromis assume plutot qu'une vraie vue calendrier
-- naviguable (chantier plus large, pas fait ici).
alter table schedule_blocks
  add column if not exists google_event_id text,
  add column if not exists source text not null default 'manual';

comment on column schedule_blocks.google_event_id is 'Id de l''evenement Google Calendar d''origine si ce bloc a ete importe automatiquement (sync GCal -> app), sinon null.';
comment on column schedule_blocks.source is 'manual (cree a la main dans l''appli, comportement historique) ou google_calendar (importe automatiquement).';

-- Idempotence de la sync : un meme evenement Google Calendar ne doit jamais
-- produire deux blocs pour le meme owner, meme si la routine tourne plusieurs
-- fois avant que l'evenement change.
create unique index if not exists schedule_blocks_owner_google_event_id_key
  on schedule_blocks (owner_id, google_event_id)
  where google_event_id is not null;
