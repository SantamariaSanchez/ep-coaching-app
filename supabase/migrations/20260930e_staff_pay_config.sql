-- Paie de l'équipe (2026-09-30, "si je veux savoir combien payer mon Head of
-- Sales, bam c'est simple") : rémunération réglée par membre.
-- { fixed_eur, rate_pct, base: aucun|ventes_perso|ventes_equipe|setter|piece, piece_eur }
alter table public.staff_members add column if not exists pay_config jsonb not null default '{}'::jsonb;
notify pgrst, 'reload schema';
