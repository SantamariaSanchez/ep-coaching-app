-- Titre en francais pour les articles scientifiques — jusqu'ici seul un
-- resume optionnel (summary_fr) existait, le titre lui-meme restait toujours
-- en anglais brut (tel quel depuis PubMed), ce qui rend la bibliotheque
-- difficile a parcourir pour un client non anglophone.

ALTER TABLE public.science_articles
  ADD COLUMN IF NOT EXISTS title_fr text;
