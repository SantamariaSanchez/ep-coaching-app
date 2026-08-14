-- Item 41 (chantier 50 idees) : parrainage avec recompense.
-- Colonnes dediees plutot que de reutiliser invite_code : ce dernier est
-- deja un concept distinct (code de recrutement d'un COACH, filtre par
-- role='coach' partout ou il est lu, voir resolveCoachId dans
-- app/auth/client/actions.ts) — superposer une deuxieme signification
-- dessus aurait rendu les deux flux plus difficiles a auditer separement.
alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id) on delete set null;

create index if not exists profiles_referred_by_idx on public.profiles(referred_by);
