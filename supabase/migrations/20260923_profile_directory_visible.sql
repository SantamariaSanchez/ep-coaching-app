-- Axe FP (MASTERCLASS.md) — audit "Paramètres" (2026-09-23) : aucune
-- rubrique Confidentialité, aucun moyen pour un coach de se retirer de
-- l'annuaire public /coachs sans désactiver "accepting_new_clients"
-- (qui a un sens différent : accepter ou non de NOUVEAUX clients, pas être
-- visible ou non). Nullable, default true : comportement actuel inchangé
-- pour tout coach existant tant qu'il ne désactive pas explicitement.

alter table public.profiles add column if not exists directory_visible boolean default true;

comment on column public.profiles.directory_visible is
  'Visible dans l''annuaire public /coachs. NULL ou true = visible (comportement historique). false = coach masqué de l''annuaire, décision explicite du coach depuis Paramètres > Confidentialité.';
