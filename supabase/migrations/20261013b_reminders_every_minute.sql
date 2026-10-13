-- Rappels d'agenda à la minute près (2026-10-13, « je reçois jamais les
-- notifs à la bonne heure »). Le job passait toutes les 5 minutes : un bloc
-- à 17h02 partait à 17h05, un bloc à 7h58 à 8h00. Les deux routes ont déjà
-- leur garde-fou « une fois par jour » (last_notified_at / last_sent_at),
-- donc les passer à chaque minute ne crée aucun doublon.
-- Pas besoin du CRON_SECRET ici : on change seulement la fréquence des jobs
-- existants.

select cron.alter_job(jobid, schedule := '* * * * *')
from cron.job
where jobname in ('schedule-block-notify', 'send-client-reminders');
