-- Relie chaque ligne workout_logs à la séance (sessions) qui l'a créée.
--
-- Retour direct 2026-09-09 (note laissée sur une séance "Pull") : "faut un
-- bouton retour en arrière" pour rouvrir une séance terminée par erreur.
-- Jusqu'ici, workout_logs (volume par muscle, voir VolumeIntensitySection)
-- n'avait aucun lien vers la séance qui l'a produit — seul personal_records
-- avait déjà session_id. Sans ce lien, impossible de retirer proprement les
-- lignes de volume d'UNE séance précise en cas d'annulation (une tentative
-- par correspondance de date/heure aurait été fragile et pourrait supprimer
-- le volume d'une autre séance du même jour).
--
-- Nullable + ON DELETE SET NULL : les lignes déjà existantes (créées avant
-- cette colonne) restent valides, jamais cassées par une suppression de
-- séance ancienne.
alter table public.workout_logs
  add column if not exists session_id uuid references public.sessions(id) on delete set null;

create index if not exists workout_logs_session_id_idx on public.workout_logs(session_id);
