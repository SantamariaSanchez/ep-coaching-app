-- Paramètres > Confidentialité côté membre (2026-09-27) : le classement
-- communautaire (/dashboard/client/communaute/classement) affichait d'office
-- nom, photo et points de tout membre ayant gagné au moins un point, tous
-- coachs confondus, sans aucun moyen de s'en retirer. Pendant exact de
-- directory_visible côté coach. Nullable, default true : comportement actuel
-- inchangé tant que le membre ne se masque pas explicitement.

alter table public.profiles add column if not exists leaderboard_visible boolean default true;

comment on column public.profiles.leaderboard_visible is
  'Visible des autres membres dans le classement communautaire. NULL ou true = visible (comportement historique). false = masqué pour les autres, le membre voit toujours sa propre position. Décision explicite depuis Paramètres > Confidentialité.';
