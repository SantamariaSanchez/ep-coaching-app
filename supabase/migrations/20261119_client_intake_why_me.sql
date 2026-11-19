-- « Pourquoi moi plutôt qu'un autre coach ? » (dépôt du 18/11) : la raison
-- du choix, pour savoir quoi mettre en avant dans le marketing.
ALTER TABLE public.client_intake ADD COLUMN IF NOT EXISTS why_me text;
