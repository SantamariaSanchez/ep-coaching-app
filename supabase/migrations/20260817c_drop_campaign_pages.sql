-- Retrait de la fonctionnalité "Landing pages de campagne" (demande
-- explicite 2026-08-17 : "landing page la ça sert à rien c'est nul,
-- enlève"). Table vide (0 ligne) au moment du retrait, suppression sans
-- risque de perte de données. Code applicatif retiré dans le même commit
-- (app/c/[slug], lib/campaign-pages.ts, campaign-actions.ts,
-- CampaignPagesManager.tsx).
drop table if exists public.campaign_pages;
