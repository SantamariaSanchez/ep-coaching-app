-- « Qu'est-ce qui t'a fait hésiter avant de te lancer ? » (transcripts Skali) :
-- les objections réelles, à traiter dans le contenu et en appel.
ALTER TABLE public.client_intake ADD COLUMN IF NOT EXISTS why_hesitated text;
