-- Retour direct 2026-09-01 : "je veux absolument toute la data du script,
-- pas seulement le texte" — coach_scripts (Studio créatif) ne stockait que
-- titre + format court/long + contenu brut. Insuffisant pour une vraie
-- production quotidienne (20 scripts/jour, routine cloud "EP Coaching -
-- Production quotidienne de scripts Studio créatif") : il faut le hook, la
-- durée précise, le pilier de contenu, la source réelle dont le script est
-- tiré (jamais inventé de zéro), le CTA, des notes de tournage/montage, et
-- un statut de cycle de vie (à tourner / tourné / publié).
alter table coach_scripts
  add column if not exists duration_seconds integer,
  add column if not exists hook text,
  add column if not exists pillar text,
  add column if not exists source_reference text,
  add column if not exists cta text,
  add column if not exists shot_notes text,
  add column if not exists platform text not null default 'instagram',
  add column if not exists status text not null default 'a_tourner';

alter table coach_scripts
  drop constraint if exists coach_scripts_status_check;
alter table coach_scripts
  add constraint coach_scripts_status_check check (status in ('a_tourner', 'tourne', 'publie'));

comment on column coach_scripts.duration_seconds is 'Durée visée du reel en secondes (30/45/60/90/120/150, max 2min30).';
comment on column coach_scripts.hook is 'Première phrase/accroche, distincte du reste du script (les 2-3 premières secondes décident si on continue à regarder).';
comment on column coach_scripts.pillar is 'Pilier de contenu (voir 📊 Stratégie Contenu Instagram — Funnel 50/25/25 dans Notion), pour varier/diversifier plutôt que répéter toujours le même angle.';
comment on column coach_scripts.source_reference is 'Ce dont le script est réellement tiré (lead magnet, ancien post, email, question client...) — jamais inventé de zéro.';
comment on column coach_scripts.cta is 'Appel à l''action de fin de vidéo.';
comment on column coach_scripts.shot_notes is 'Notes de tournage/montage (b-roll, texte à l''écran, musique) — au-delà du seul texte parlé.';
comment on column coach_scripts.status is 'Cycle de vie : a_tourner (par défaut) -> tourne -> publie.';
