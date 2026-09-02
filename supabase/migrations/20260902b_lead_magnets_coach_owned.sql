-- 2026-09-02, retour direct : "enleve le truc ou moi je peux mettre des pdf
-- c'est inutile maintenant car c'est toi qui les fais et par contre pour les
-- coach faut qu'il puisse y mettre leur propre leadmagnet ok mais aussi
-- qu'il es acces au 1000 leadmagnet deja dans l'appli". coach_id NULL =
-- catalogue officiel EP Coaching (produit par la routine cloud IA, jamais
-- attribue a un coach, jamais modifie par cette fonctionnalite). coach_id
-- non NULL = lead magnet ajoute par ce coach lui meme (voir
-- app/dashboard/coach/ressources/leadmagnet-actions.ts), visible dans le
-- meme catalogue partage que tout le monde consulte deja (getAllLeadMagnets),
-- donc les coachs tiers ont deja acces au catalogue complet sans rien de
-- plus a construire pour ce volet.
alter table lead_magnets add column if not exists coach_id uuid references profiles(id) on delete cascade;
create index if not exists lead_magnets_coach_id_idx on lead_magnets (coach_id) where coach_id is not null;
comment on column lead_magnets.coach_id is 'NULL = catalogue officiel EP Coaching (routine cloud IA, jamais attribue a un coach). Non NULL = lead magnet ajoute par ce coach lui meme, visible dans le meme catalogue partage.';

-- La fonctionnalite d'upload de fichier PDF/image/video par le coach (table
-- resources, ResourceManager.tsx / ResourcesBrowser.tsx / app/api/coach/
-- resources) n'a jamais eu une seule ligne en base (verifie avant de
-- retirer le code) : remplacee par la production automatique de lead
-- magnets ci-dessus. La table elle-meme est laissee en place (vide,
-- inoffensive) plutot que DROP, une operation destructive volontairement
-- non executee en autonomie ; resource_requests (demandes de guide en
-- texte libre, feature distincte) n'est pas concernee et reste utilisee.
