-- Langue des notifications (2026-10-08) : une notification part souvent sans
-- que son destinataire ait l'appli ouverte (rappel automatique, action du
-- coach). On retient donc la dernière langue dans laquelle l'appli s'est
-- affichée chez lui (son choix, sinon la langue du téléphone), à part du
-- choix explicite `locale` qui reste prioritaire. Voir lib/notification-i18n.ts.
alter table public.user_settings
  add column if not exists ui_locale text check (ui_locale in ('fr', 'en'));
