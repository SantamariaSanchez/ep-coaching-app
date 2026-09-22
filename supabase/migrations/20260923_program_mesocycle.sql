-- Axe FM (MASTERCLASS.md) — chantier explicitement demandé : "périodisation
-- de mésocycle". Le programme est aujourd'hui statique (mêmes séries/reps
-- tant que le coach ne les change pas à la main) : aucune notion de "semaine
-- 3 sur 5", aucune montée de volume programmée à l'avance, un deload
-- seulement DÉTECTÉ après coup par stagnation (ExerciseProgressionChart,
-- Item 12) plutôt que PLANIFIÉ.
--
-- Deux colonnes nullable sur `programs` — un programme sans mésocycle
-- défini garde exactement son comportement actuel (rien ne change tant que
-- le coach ne configure pas explicitement une date de départ + une durée).

alter table public.programs add column if not exists mesocycle_start_date date;
alter table public.programs add column if not exists mesocycle_weeks integer;

comment on column public.programs.mesocycle_start_date is
  'Date de départ du mésocycle en cours. NULL = pas de périodisation suivie pour ce programme (comportement historique, inchangé).';
comment on column public.programs.mesocycle_weeks is
  'Durée totale prévue du mésocycle en semaines (dernière semaine = décharge automatique). Voir lib/mesocycle.ts.';

-- Même pattern que 20260805k_input_hardening_constraints.sql : NOT VALID
-- pour ne pas bloquer les lignes existantes, valide les futures écritures.
alter table public.programs add constraint programs_mesocycle_weeks_range_chk
  check (mesocycle_weeks is null or (mesocycle_weeks >= 2 and mesocycle_weeks <= 12)) not valid;
