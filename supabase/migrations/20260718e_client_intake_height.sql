-- Taille (cm) — présente dans le questionnaire d'onboarding original mais
-- oubliée lors de la création de client_intake. Nécessaire pour calculer
-- automatiquement le TDEE/macros (formule Mifflin-St Jeor) depuis la fiche
-- client sans devoir redemander cette info ailleurs.

ALTER TABLE public.client_intake
  ADD COLUMN IF NOT EXISTS height_cm numeric;
