-- Logbook en séance refait (2026-10-14, retour direct du fondateur : « si je
-- supprime un exo il réapparaît quand je rouvre l'appli parce que mon tel
-- s'est éteint 5 min », « si je switch les exos ça doit rester », « des
-- myo-reps, des rest-pause, pas juste une note mais un vrai truc »,
-- « filmer ma série et l'envoyer à mon coach avec un petit bouton »).
--
-- sessions.live_state : état de la séance en cours (ordre des exercices,
--   exercices retirés, remplacés ou ajoutés, « machine prise », séries
--   saisies mais pas encore validées, chrono de repos). Écrit à chaque
--   changement par components/client/SessionView.tsx en plus du stockage
--   local du téléphone : la séance reprend à l'identique même si l'appli est
--   tuée, ou depuis un autre appareil.
-- session_sets.details : détail d'une série à technique (myo-reps : mini-
--   séries, rest-pause : reps après chaque pause, dégressive : paliers de
--   charge, partielles). reps_actual garde la série principale.
-- session_sets.video_sent_at : moment où la vidéo de la série a été envoyée
--   au coach dans la messagerie (bouton « Envoyer au coach »).
--
-- Rejouable sans risque. Le code tourne avec ou sans cette migration (repli
-- automatique : sans live_state la séance ne vit que sur le téléphone, sans
-- details le détail part dans la note de la série).

alter table public.sessions
  add column if not exists live_state jsonb,
  add column if not exists live_state_updated_at timestamptz;

alter table public.session_sets
  add column if not exists details jsonb,
  add column if not exists video_sent_at timestamptz;

-- Garde-fou de taille : l'état d'une séance pèse quelques Ko, jamais des Mo.
alter table public.sessions drop constraint if exists sessions_live_state_size_chk;
alter table public.sessions
  add constraint sessions_live_state_size_chk
  check (live_state is null or octet_length(live_state::text) <= 262144) not valid;

alter table public.session_sets drop constraint if exists session_sets_details_size_chk;
alter table public.session_sets
  add constraint session_sets_details_size_chk
  check (details is null or octet_length(details::text) <= 8192) not valid;
