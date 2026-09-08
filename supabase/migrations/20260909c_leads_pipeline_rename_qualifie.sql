-- Correction juste après 20260909b : le statut de pipeline "qualifie"
-- entrait en collision de vocabulaire avec le badge existant "Qualifié par
-- Santiago (IA)" (qualification_sent_at, l'email automatique de l'agent
-- Setter) — deux sens différents du même mot sur le même écran. Renommé en
-- "interesse" avant toute utilisation réelle (aucune ligne n'utilisait
-- encore autre chose que le défaut "nouveau").
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('nouveau', 'contacte', 'interesse', 'converti', 'perdu'));
