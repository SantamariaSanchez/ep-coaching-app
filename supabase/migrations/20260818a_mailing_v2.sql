-- Mailing v2 (2026-08-18) : suite de l'audit Axe V + retour direct de
-- l'utilisateur sur les questions posées ("dupliquer un envoi précédent",
-- "programmer un envoi", "aperçu avant l'envoi réel", "bannière/logo de
-- marque automatique", et surtout "je dois pouvoir envoyer soit à tout le
-- monde... soit que aux membres soit que aux coachs").
--
-- html_content : le corps réel de l'envoi, jamais stocké jusqu'ici (seul le
-- sujet l'était) — nécessaire pour dupliquer un envoi passé ou en revoir le
-- contenu exact.
-- audience : quelle liste de destinataires a été visée (mes_clients_actifs
-- / tous_les_membres / coachs / liste Brevo existante par id), pour
-- affichage dans l'historique. Valeur par défaut sur les lignes déjà en
-- base = le seul comportement qui existait avant ce jour.
-- scheduled_at : horodatage d'un envoi programmé (Brevo scheduledAt), NULL
-- pour un envoi immédiat classique. status gagne la valeur 'scheduled'
-- pour ces lignes-là, mis à jour "sent" seulement de façon optimiste (pas
-- de confirmation webhook Brevo dans cette version).
alter table public.coach_mailings
  add column if not exists html_content text,
  add column if not exists audience text not null default 'clients_actifs',
  add column if not exists scheduled_at timestamptz;

alter table public.coach_mailings drop constraint if exists coach_mailings_status_check;
alter table public.coach_mailings add constraint coach_mailings_status_check
  check (status in ('sent', 'failed', 'scheduled'));
