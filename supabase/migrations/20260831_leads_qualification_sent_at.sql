-- Bug reel trouve le 2026-08-31 : utils/leads.ts (getAllLeads, page
-- /dashboard/coach/admin/leads) et lib/lead-qualification.ts
-- (maybeSendLeadQualification, agent Setter) referencent tous les deux une
-- colonne leads.qualification_sent_at qui n'a jamais existe en base. La
-- requete Postgrest echoue silencieusement (l'erreur n'est jamais verifiee
-- dans le code appelant), donc la page Leads affichait toujours "0 lead"
-- meme quand des leads reels existaient, et le dedoublonnage de l'agent
-- Setter (ne jamais qualifier deux fois le meme lead) ne fonctionnait pas
-- du tout.
alter table leads
  add column if not exists qualification_sent_at timestamptz;

comment on column leads.qualification_sent_at is 'Date d''envoi de l''email de qualification par l''agent Setter (lib/lead-qualification.ts), null si pas encore envoye. Sert aussi au badge "Qualifie" sur /dashboard/coach/admin/leads.';
