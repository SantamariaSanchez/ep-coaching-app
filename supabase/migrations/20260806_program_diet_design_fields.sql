-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Phase de conception directement sur le programme / la
-- diète d'un client (plus seulement sur les modèles réutilisables)
-- Exécute dans le Supabase SQL Editor (jamais automatisé par Vercel)
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : program_templates et diet_plan_templates portaient déjà
-- `objective` et `notes` (20260804f / 20260805d), pas les programmes et
-- plans réels d'un client. Résultat : la réflexion de conception (objectif
-- de phase, pourquoi ce split, quoi surveiller) n'existait que dans la
-- bibliothèque de modèles et se perdait dès qu'on travaillait sur mesure
-- pour un client précis. Ces colonnes la rendent persistante là où le
-- coach travaille vraiment : dans la fiche du client.
--
-- Purement additif, colonnes nullables : aucune ligne existante n'est
-- touchée, aucune policy RLS modifiée (donc aucun risque de récursion).
--
-- programs.coach_notes est privé : getActiveProgram() ne le sélectionne
-- que sur demande explicite du côté coach (voir utils/programs.ts), il
-- n'est jamais envoyé dans le payload des pages de l'espace client.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.programs   add column if not exists objective   text;
alter table public.programs   add column if not exists coach_notes text;

-- Côté diète, seulement l'objectif : il est volontairement lisible par le
-- client (« Sèche progressive, 400 kcal sous la maintenance »), c'est un
-- repère utile pour lui, pas une note privée de coach.
alter table public.diet_plans add column if not exists objective   text;

comment on column public.programs.objective     is 'Objectif de phase du programme, saisi par le coach au moment de la conception. Lisible par le client.';
comment on column public.programs.coach_notes   is 'Notes de conception privées du coach. Jamais rendues dans l''espace client.';
comment on column public.diet_plans.objective   is 'Objectif du plan alimentaire, saisi par le coach au moment de la conception. Lisible par le client.';
