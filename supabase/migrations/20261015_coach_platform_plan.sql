-- Formule payée par un coach tiers (décision du fondateur 2026-10-15) :
-- Standard 20 € = le suivi des clients ; Premium 200 € = en plus la création
-- de contenu (Studio, stats, niche, business, mailing), les 5 formations,
-- les lives et l'IA. Renseignée par le webhook Stripe d'après le Price payé.
-- NULL = coach en accès gratuit (testeur) ou antérieur : accès complet.
alter table public.profiles add column if not exists platform_plan text
  check (platform_plan is null or platform_plan in ('standard', 'premium'));
