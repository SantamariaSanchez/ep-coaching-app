-- Studio créatif (2026-10-21, demande du fondateur : « ajoute plus de
-- formats : du B-roll texte donc voix off, du yap, des tier lists, le clone
-- donc 2 personnes, le question-réponse, le cas client, plein de formats »).
--
-- Le FORMAT DE CONTENU (face caméra, B-roll + voix off, yap, tier list,
-- clone, question/réponse, cas client, réaction, mythe vs réalité, tuto à
-- l'écran, storytelling, carrousel...) est distinct de la plateforme
-- (`platform`) et de la durée court/long (`format`, colonne historique).
-- Liste des valeurs : lib/content-formats.ts (CONTENT_FORMATS). Contrainte
-- volontairement tolérante (longueur, pas de liste fermée) pour pouvoir
-- ajouter un format sans nouvelle migration, même choix que `platform`.
-- Rejouable sans risque. Aucune donnée existante modifiée : tous les scripts
-- actuels prennent la valeur par défaut 'face_cam'.

alter table public.coach_scripts
  add column if not exists content_format text not null default 'face_cam';

alter table public.coach_scripts
  drop constraint if exists coach_scripts_content_format_check;
alter table public.coach_scripts
  add constraint coach_scripts_content_format_check
  check (char_length(content_format) between 1 and 40);

comment on column public.coach_scripts.content_format is
  'Format de contenu (face_cam, broll_voix_off, yap, tier_list, clone, question_reponse, cas_client, reaction, mythe_realite, tuto_ecran, liste, storytelling, reponse_commentaire, journee_type, demo_exercice, carrousel), voir lib/content-formats.ts. Distinct de platform et de format (court/long).';

-- Idées de contenu : format suggéré, optionnel (null = pas encore décidé).
alter table public.content_ideas
  add column if not exists content_format text;

alter table public.content_ideas
  drop constraint if exists content_ideas_content_format_check;
alter table public.content_ideas
  add constraint content_ideas_content_format_check
  check (content_format is null or char_length(content_format) between 1 and 40);

comment on column public.content_ideas.content_format is
  'Format de contenu suggéré pour cette idée (mêmes valeurs que coach_scripts.content_format), optionnel.';
