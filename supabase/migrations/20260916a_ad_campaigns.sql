-- ═══════════════════════════════════════════════════════════
-- EP Coaching — Suivi de la publicité payante (Google/Meta/TikTok...)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Demande directe du fondateur : aucun outil dans l'appli pour piloter ses
-- campagnes de pub payante (Google Ads, Meta Ads...). Ce N'EST PAS une
-- intégration API avec les régies (pas de credentials, hors scope) : c'est
-- un outil de pilotage MANUEL — le coach saisit ses campagnes et leurs
-- chiffres (copiés depuis les régies) et l'appli calcule les métriques qui
-- servent à décider quoi couper/scaler (CPM, CPC, CTR, coût par lead, ROAS).
-- Scopé par coach_id comme le reste de l'espace "Mon business"
-- (coach_business_goals, coach_network_contacts...), même pattern RLS.

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,

  -- Texte libre tolérant, PAS de check — même choix que
  -- coach_scripts.format (20260815d_coach_scripts.sql) : la régie qui sert
  -- le plus aujourd'hui (Google/Meta/TikTok) n'est pas forcément la seule
  -- demain, et rajouter une plateforme ne doit pas nécessiter de migration.
  -- L'appli propose une liste suggérée (voir lib/ad-campaigns.ts) mais ne
  -- bloque pas une valeur hors liste.
  platform text not null default 'meta',
  objective text not null default 'leads',

  -- Le statut, lui, pilote un vrai comportement applicatif (filtre "actives
  -- seulement", alerte de stagnation ci-dessous ne s'applique qu'aux
  -- campagnes actives) : un check strict est justifié, même logique que
  -- content_ideas.status.
  status text not null default 'active' check (status in ('active', 'pausee', 'terminee')),

  -- Budget quotidien OU total selon comment le coach pilote la campagne
  -- côté régie — les deux sont optionnels et non exclusifs (rien n'empêche
  -- de renseigner les deux à titre indicatif).
  budget_daily numeric(10,2) check (budget_daily is null or budget_daily >= 0),
  budget_total numeric(10,2) check (budget_total is null or budget_total >= 0),

  -- Chiffres cumulés à date, mis à jour à la main par le coach en copiant
  -- depuis la régie. Voir plus bas pourquoi il n'y a pas de table
  -- d'historique jour par jour.
  spend_total numeric(10,2) not null default 0 check (spend_total >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  leads bigint not null default 0 check (leads >= 0),

  -- Optionnel : seul champ qui permet de calculer un vrai ROAS (revenu
  -- généré / dépense). Beaucoup de coachs ne sauront pas relier un lead
  -- publicitaire à une vente précise, donc volontairement facultatif plutôt
  -- que de bloquer la saisie du reste tant que ce chiffre est inconnu.
  revenue_generated numeric(10,2) check (revenue_generated is null or revenue_generated >= 0),

  start_date date,
  end_date date,
  notes text,

  -- Amélioration non demandée explicitement (voir rapport) : quand une
  -- campagne passe en "terminee", ce champ capture POURQUOI elle a été
  -- coupée (ex. "CPL trop élevé, jamais rentable après 200€ dépensés") —
  -- même esprit que les notes d'échec déjà présentes ailleurs dans l'appli
  -- (ex. coach_network_contacts, journal des décisions business). Sans ça,
  -- l'historique des campagnes coupées ne sert à rien pour apprendre.
  stopped_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Choix documenté : PAS de table `ad_campaign_daily_entries` pour un
-- historique jour par jour. Pour un coach solo qui pilote 2-10 campagnes à
-- la main, exiger une saisie quotidienne pour obtenir une courbe est plus
-- de friction que de valeur immédiate — le risque réel est que l'outil soit
-- abandonné après une semaine plutôt qu'ouvert à chaque fois qu'il regarde
-- ses régies. Les totaux cumulés mis à jour à chaque relevé donnent déjà
-- tout ce qu'il faut pour la décision qui compte ("est-ce que je coupe ou
-- je scale ?") : CPM/CPC/CTR/coût par lead/ROAS sur la durée de vie de la
-- campagne. Si un vrai besoin de courbe d'évolution apparaît une fois
-- l'outil utilisé en pratique, cette table s'ajoute proprement plus tard
-- sans casser ad_campaigns (même logique que les colonnes de tracking
-- ajoutées après coup à coach_scripts, 20260910b).

create index if not exists ad_campaigns_coach_idx
  on public.ad_campaigns (coach_id, status);

comment on table public.ad_campaigns is
  'Pilotage manuel des campagnes de pub payante (Google/Meta/TikTok...) par coach. Pas d''intégration API régie : chiffres saisis/copiés à la main par le coach.';
comment on column public.ad_campaigns.platform is
  'Texte libre (ex : google, meta, tiktok, autre) — pas de check, voir commentaire de la table pour rester tolérant si une nouvelle régie apparaît.';
comment on column public.ad_campaigns.objective is
  'Texte libre (ex : leads, ventes, notoriete, autre) — même choix de tolérance que platform.';
comment on column public.ad_campaigns.stopped_reason is
  'Pourquoi cette campagne a été coupée (renseigné quand status passe à terminee) — sert à apprendre de ses échecs plutôt qu''à seulement archiver.';

alter table public.ad_campaigns enable row level security;

-- (select auth.uid()) plutôt qu'un appel nu à auth.uid() — évite d'avoir à
-- corriger après coup pour la perf du plan Postgres (voir
-- 20260814o_rls_initplan_perf_fix.sql, déjà appliqué à d'autres tables).
drop policy if exists "Coach manages own ad campaigns" on public.ad_campaigns;
create policy "Coach manages own ad campaigns" on public.ad_campaigns
  for all using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
