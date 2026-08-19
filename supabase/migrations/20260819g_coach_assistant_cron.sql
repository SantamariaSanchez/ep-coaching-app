-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Programme le cron "assistant coach" via Supabase pg_cron
-- Déjà exécuté manuellement en production avec le vrai secret (jobid 32,
-- lu directement depuis un autre job pg_cron déjà actif via le MCP
-- Supabase — l'utilisatrice n'a rien eu à copier/coller) — ce fichier
-- documente le changement avec le placeholder habituel, comme les autres
-- migrations de cron déjà commitées (voir 20260814c_expire_trials_cron.sql).
-- ═══════════════════════════════════════════════════════════════════════
-- Découverte en auditant les routes app/api/cron/* (Axe 10, VISION.md) :
-- TOUTES tournent déjà réellement en production via Supabase pg_cron
-- (pg_net.http_get vers l'URL de prod), complètement indépendant de
-- vercel.json — le plan Vercel ne permet qu'un cron quotidien de toute
-- façon, pg_cron est le vrai mécanisme de planification de cette appli.
--
-- Deux effets de cette découverte :
-- 1. /api/cron/coach-assistant (ajouté dans vercel.json au commit
--    précédent) doit suivre le même mécanisme que toutes les autres
--    routes plutôt que rester un cas particulier — programmé ici,
--    retiré de vercel.json dans le même commit que cette migration.
-- 2. Bug réel découvert au passage : /api/cron/weekly-sleep-recap
--    tournait DEUX FOIS chaque dimanche 19h UTC (vercel.json ET un job
--    pg_cron jobid 22 déjà actif, même schedule, même URL) — retiré de
--    vercel.json également, pg_cron (déjà actif) reste la seule source.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('coach-assistant')
where exists (select 1 from cron.job where jobname = 'coach-assistant');

select cron.schedule(
  'coach-assistant',
  '17 6 * * *',
  $$
  select net.http_get(
    url := 'https://ep-coaching.vercel.app/api/cron/coach-assistant',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);
