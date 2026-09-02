-- Retour direct 2026-09-02 : "les notes de tournage enleve ca me sert a rien"
-- -- shot_notes retire completement (colonne, generation, affichage).
-- A la place : instagram_caption, la vraie description Instagram a poster
-- avec le reel (structure 3 blocs = ouverture COMMENTE [numero] / corps en
-- "je" confession / fermeture COMMENTE [numero], voir Notion Guide redaction
-- description Instagram), demandee explicitement ("dans notion tu as
-- comment ecrire une description insta... je la veux dans mon appli dans
-- studio creatif").
alter table coach_scripts drop column if exists shot_notes;
alter table coach_scripts add column if not exists instagram_caption text;

comment on column coach_scripts.instagram_caption is 'Description Instagram a poster avec le reel : ouverture "Abonne toi a @santamariasanchez_ et COMMENTE [numero]", corps en "je" (confession, cout, declic), fermeture "Commente [numero] si...". Le numero doit etre un vrai numero du catalogue lead_magnets (voir Notion Numero CTA des Leadmagnet), coherent avec source_reference.';

comment on column coach_scripts.cta is 'Appel a l''action PARLE a la camera dans la video elle meme (distinct de instagram_caption, la description postee a cote) : doit citer le meme numero de leadmagnet que source_reference, formule naturellement (ex: "y a un guide qui detaille ca, commente 362 si tu veux que je te l''envoie").';

-- On efface les 20 scripts du premier lot, qui ne respectaient ni le CTA
-- reel (numero leadmagnet) ni la longueur proportionnelle a la duree, pour
-- que la prochaine production reelle (corrigee) reparte propre.
delete from coach_scripts where coach_id = '845b826a-0e2f-4c44-8130-a8fe1e925351';
