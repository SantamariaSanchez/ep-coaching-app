-- Ajoute "funnel" aux origines possibles d'une idée de contenu : la page
-- "Développer mon business" (app/dashboard/coach/business) affichait le
-- funnel TOF/MOF/BOF en pure lecture, sans aucune action possible dessus.
-- Chaque idée de format peut désormais être ajoutée en un geste au Studio
-- créatif du coach (voir createContentIdeaFromFunnel dans
-- app/dashboard/coach/studio/actions.ts), au lieu de rester une simple
-- suggestion qu'il fallait recopier à la main.
--
-- Appliquée en prod le 2026-09-08 (migration cadmwvrsjklgtrrebflz
-- 20260908..._content_ideas_funnel_source), ce fichier rejoint le repo
-- après coup.

alter table public.content_ideas drop constraint content_ideas_source_check;
alter table public.content_ideas add constraint content_ideas_source_check
  check (source in ('manuel', 'question', 'funnel'));

comment on column public.content_ideas.source is
  'Origine de l''idee : manuel (saisie directe), question (issue d''une question de membre), funnel (issue du funnel TOF/MOF/BOF de la page business). Voir lib/coach-business.ts.';
