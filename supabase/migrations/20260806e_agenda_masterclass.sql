-- Agenda masterclass — icône par bloc, pour une identification visuelle
-- instantanée en plus de la couleur (voir lib/agenda-presets.ts pour la
-- liste des clés supportées : salle, travail, repas, sommeil, trajet,
-- rendezvous, etude, pause). Nullable : un bloc peut rester "libre",
-- affiché avec juste sa couleur comme avant.
alter table public.schedule_blocks
  add column if not exists icon text;
