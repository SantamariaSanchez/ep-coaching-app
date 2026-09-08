-- La candidature sur /carrieres se limitait à nom/email/téléphone : aucun
-- moyen de savoir si le candidat est aligné avec EP Coaching avant de lui
-- répondre. Demande directe du 2026-09-08 : "il faut vraiment une
-- architecture ultra complète de A à Z... qualifier les candidats alignés
-- avec la vision de EP Coaching, et postuler ne doit pas être juste un
-- email".
--
-- Colonne séparée de `notes` : `notes` reste les notes internes du coach sur
-- le candidat (déjà existant, éditable depuis Organisation), `answers` est
-- ce que le candidat a lui-même répondu à la candidature.
--
-- Appliquée en prod le 2026-09-08 (migration cadmwvrsjklgtrrebflz
-- job_applications_qualifying_answers), ce fichier rejoint le repo après
-- coup.

alter table public.job_applications add column if not exists answers jsonb;

comment on column public.job_applications.answers is
  'Reponses du candidat aux questions de qualification posees sur /carrieres (motivation, disponibilite, experience, lien). jsonb libre, voir QUALIFYING_QUESTIONS dans app/carrieres/actions.ts. Distinct de la colonne notes, qui reste les notes internes du coach sur le candidat.';
