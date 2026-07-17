-- Refonte du check-in hebdomadaire : nouvelles questions (attitude, victoires,
-- réflexion, soutien de l'entourage, format de retour préféré) + jour de
-- check-in fixe par client sur le profil.
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS attitude_rating integer CHECK (attitude_rating BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS attitude_explanation text,
  ADD COLUMN IF NOT EXISTS biggest_win_2 text,
  ADD COLUMN IF NOT EXISTS biggest_win_3 text,
  ADD COLUMN IF NOT EXISTS improvement_reflection text,
  ADD COLUMN IF NOT EXISTS entourage_support text,
  ADD COLUMN IF NOT EXISTS plan_adherence_feedback text,
  ADD COLUMN IF NOT EXISTS preferred_feedback_format text CHECK (preferred_feedback_format IN ('ecrit', 'vocal', 'video'));

-- "biggest_win" (existant) devient la 1ère des 3 victoires — pas de migration
-- de données nécessaire, juste réutilisé tel quel par le nouveau formulaire.
-- "work_impact", "upcoming_obstacles" et "video_path"/"photo_paths" (ajoutés
-- le 2026-07-17) sont également réutilisés avec un intitulé mis à jour côté
-- formulaire (événements personnels / anticipation semaine suivante / vidéo
-- de correction technique) plutôt que dupliqués en nouvelles colonnes.

-- Jour de check-in fixe (1 = lundi ... 7 = dimanche, cohérent avec
-- getISOWeek/getWeekStart qui utilisent déjà des semaines lundi→dimanche).
-- Défaut à lundi (1) — laisser la table de suivi vide semble avoir plus
-- de coût (aucun jour bloqué au hasard) que de choisir un jour par défaut
-- explicite que le coach ajustera.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS checkin_day integer NOT NULL DEFAULT 1 CHECK (checkin_day BETWEEN 1 AND 7);
