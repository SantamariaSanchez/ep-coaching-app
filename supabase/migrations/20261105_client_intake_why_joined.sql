-- Ce qui a donné envie au client de rejoindre le coach (vidéo, contenu, hésitation).
-- Question ajoutée à la fin du questionnaire d'onboarding ; sert à la création de contenu.
-- Déjà appliquée sur la base (rejouable).
alter table public.client_intake add column if not exists why_joined text;
notify pgrst, 'reload schema';
