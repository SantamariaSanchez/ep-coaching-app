-- Apparence choisie (fond + couleur, ex. « claire:bleu ») : suit la personne
-- sur tous ses appareils au lieu de rester sur un seul navigateur.
alter table public.user_settings add column if not exists appearance text;
