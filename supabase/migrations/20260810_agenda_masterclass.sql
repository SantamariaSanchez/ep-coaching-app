-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Agenda masterclass : tâches par bloc, notif au début d'un
-- bloc, et reconstruction complète de la semaine perso du coach (les
-- séances lundi/vendredi retirées, vrais noms de séance, 5 repas, lives de
-- la formation TheModernPrepDad, création de contenu détaillée, lecture).
-- Exécute dans Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Nouvelles colonnes sur schedule_blocks -------------------------------
alter table public.schedule_blocks
  add column if not exists tasks text[] not null default '{}',
  add column if not exists notify boolean not null default false,
  add column if not exists last_notified_at timestamptz;

-- 2. Reconstruction complète de la semaine du coach -----------------------
-- (owner_id = son propre compte coach, id vérifié en base avant d'écrire ceci)

delete from public.schedule_blocks where owner_id = '845b826a-0e2f-4c44-8130-a8fe1e925351';

-- ── Mardi (2) — jour de séance : Push, live Closing Mastery le matin ──────
insert into public.schedule_blocks (owner_id, day_of_week, start_time, end_time, label, color, icon, notes, tasks, notify) values
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '07:15', '07:45', 'Repas 1', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '08:00', '09:00', 'Closing Mastery (live)', '#60a5fa', 'etude', 'Formation TheModernPrepDad', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '10:45', '11:15', 'Repas 2', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '11:30', '12:00', 'Pas (aller chez mamie)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '12:00', '13:00', 'Repas 3 : déjeuner chez mamie', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '13:10', '13:15', 'Trajet (papi vers Quintal)', '#4ade80', 'trajet', 'En voiture, 5 min', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '13:25', '14:15', 'Création de contenu : tournage', '#60a5fa', 'travail', 'À Quintal', array['Filmer 3 courtes vidéos (reels/TikTok)', 'Prépare cadrage, lumière et micro avant de lancer'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '14:30', '15:00', 'Création de contenu : montage', '#60a5fa', 'travail', 'À Quintal', array['Monter les vidéos tournées', 'Ajouter sous-titres et musique', 'Exporter en format vertical 9:16'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '15:15', '16:45', 'Pas (retour de Quintal)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '17:00', '17:30', 'Repas 4', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '17:45', '18:15', 'Pas (aller à la salle)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '18:15', '19:15', 'Séance : Push', '#E01E1E', 'salle', 'Rotation 5 jours (Push/Pull/Legs-Épaules/Upper/Legs-Biceps)', array['Vérifie dans Programme si ta rotation a avancé avant de commencer'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '19:30', '20:00', 'Pas (retour de la salle)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '20:15', '21:00', 'Repas 5 : dîner', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 2, '21:15', '21:30', 'Lecture', '#fbbf24', 'pause', null, '{}', true);

-- ── Mercredi (3) — jour de séance : Pull, live Q&R le matin ───────────────
insert into public.schedule_blocks (owner_id, day_of_week, start_time, end_time, label, color, icon, notes, tasks, notify) values
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '07:15', '07:45', 'Repas 1', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '08:00', '08:30', 'Live question réponse', '#60a5fa', 'etude', 'Formation TheModernPrepDad', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '10:45', '11:15', 'Repas 2', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '11:30', '12:00', 'Pas (aller chez mamie)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '12:00', '13:00', 'Repas 3 : déjeuner chez mamie', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '13:10', '13:15', 'Trajet (papi vers Quintal)', '#4ade80', 'trajet', 'En voiture, 5 min', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '13:25', '14:15', 'Création de contenu : tournage', '#60a5fa', 'travail', 'À Quintal', array['Filmer 3 courtes vidéos (reels/TikTok)', 'Prépare cadrage, lumière et micro avant de lancer'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '14:30', '15:00', 'Création de contenu : montage', '#60a5fa', 'travail', 'À Quintal', array['Monter les vidéos tournées', 'Ajouter sous-titres et musique', 'Exporter en format vertical 9:16'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '15:15', '16:45', 'Pas (retour de Quintal)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '17:00', '17:30', 'Repas 4', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '17:45', '18:15', 'Pas (aller à la salle)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '18:15', '19:15', 'Séance : Pull', '#E01E1E', 'salle', 'Rotation 5 jours (Push/Pull/Legs-Épaules/Upper/Legs-Biceps)', array['Vérifie dans Programme si ta rotation a avancé avant de commencer'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '19:30', '20:00', 'Pas (retour de la salle)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '20:15', '21:00', 'Repas 5 : dîner', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 3, '21:15', '21:30', 'Lecture', '#fbbf24', 'pause', null, '{}', true);

-- ── Samedi (6) — jour de séance : Legs / Épaules, pas de live le matin ────
insert into public.schedule_blocks (owner_id, day_of_week, start_time, end_time, label, color, icon, notes, tasks, notify) values
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '07:15', '07:45', 'Repas 1', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '10:45', '11:15', 'Repas 2', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '11:30', '12:00', 'Pas (aller chez mamie)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '12:00', '13:00', 'Repas 3 : déjeuner chez mamie', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '13:10', '13:15', 'Trajet (papi vers Quintal)', '#4ade80', 'trajet', 'En voiture, 5 min', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '13:25', '14:15', 'Création de contenu : tournage', '#60a5fa', 'travail', 'À Quintal', array['Filmer 3 courtes vidéos (reels/TikTok)', 'Prépare cadrage, lumière et micro avant de lancer'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '14:30', '15:00', 'Création de contenu : montage', '#60a5fa', 'travail', 'À Quintal', array['Monter les vidéos tournées', 'Ajouter sous-titres et musique', 'Exporter en format vertical 9:16'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '15:15', '16:45', 'Pas (retour de Quintal)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '17:00', '17:30', 'Repas 4', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '17:45', '18:15', 'Pas (aller à la salle)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '18:15', '19:15', 'Séance : Legs / Épaules', '#E01E1E', 'salle', 'Rotation 5 jours (Push/Pull/Legs-Épaules/Upper/Legs-Biceps)', array['Vérifie dans Programme si ta rotation a avancé avant de commencer'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '19:30', '20:00', 'Pas (retour de la salle)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '20:15', '21:00', 'Repas 5 : dîner', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 6, '21:15', '21:30', 'Lecture', '#fbbf24', 'pause', null, '{}', true);

-- ── Lundi (1) — pas de séance, live formation "Création de contenus" ─────
-- (focus total création de contenu l'après-midi puisque le créneau salle
-- est libre : 0 client pour l'instant, pas de prog/live à préparer)
insert into public.schedule_blocks (owner_id, day_of_week, start_time, end_time, label, color, icon, notes, tasks, notify) values
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '07:15', '07:45', 'Repas 1', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '08:00', '10:00', 'Création de contenus (live formation)', '#60a5fa', 'etude', 'Formation TheModernPrepDad', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '10:45', '11:15', 'Repas 2', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '11:30', '12:00', 'Pas (aller chez mamie)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '12:00', '13:00', 'Repas 3 : déjeuner chez mamie', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '13:10', '13:15', 'Trajet (papi vers Quintal)', '#4ade80', 'trajet', 'En voiture, 5 min', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '13:25', '14:15', 'Création de contenu : tournage', '#60a5fa', 'travail', 'À Quintal', array['Filmer 3 courtes vidéos (reels/TikTok)', 'Prépare cadrage, lumière et micro avant de lancer'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '14:30', '15:00', 'Création de contenu : montage', '#60a5fa', 'travail', 'À Quintal', array['Monter les vidéos tournées', 'Ajouter sous-titres et musique', 'Exporter en format vertical 9:16'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '15:15', '16:45', 'Pas (retour de Quintal)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '17:00', '17:30', 'Repas 4', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '17:45', '18:45', 'Création de contenu : script', '#60a5fa', 'travail', null, array['Écrire 3 scripts ou hooks pour la semaine', 'Prompt Claude : Génère-moi 5 idées de hooks pour un coach sportif en ligne sur le thème du jour'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '19:00', '19:45', 'Création de contenu : prospection', '#60a5fa', 'travail', null, array['Objectif du jour : publier 5 reels', 'Prospecter 10 profils qualifiés sur Instagram/TikTok', 'Relancer les anciens contacts'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '20:00', '20:30', 'Repas 5 : dîner', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 1, '20:45', '21:00', 'Lecture', '#fbbf24', 'pause', null, '{}', true);

-- ── Vendredi (5) — pas de séance, live formation "Création de contenus" ──
insert into public.schedule_blocks (owner_id, day_of_week, start_time, end_time, label, color, icon, notes, tasks, notify) values
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '07:15', '07:45', 'Repas 1', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '08:00', '10:00', 'Création de contenus (live formation)', '#60a5fa', 'etude', 'Formation TheModernPrepDad', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '10:45', '11:15', 'Repas 2', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '11:30', '12:00', 'Pas (aller chez mamie)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '12:00', '13:00', 'Repas 3 : déjeuner chez mamie', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '13:10', '13:15', 'Trajet (papi vers Quintal)', '#4ade80', 'trajet', 'En voiture, 5 min', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '13:25', '14:15', 'Création de contenu : tournage', '#60a5fa', 'travail', 'À Quintal', array['Filmer 3 courtes vidéos (reels/TikTok)', 'Prépare cadrage, lumière et micro avant de lancer'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '14:30', '15:00', 'Création de contenu : montage', '#60a5fa', 'travail', 'À Quintal', array['Monter les vidéos tournées', 'Ajouter sous-titres et musique', 'Exporter en format vertical 9:16'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '15:15', '16:45', 'Pas (retour de Quintal)', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '17:00', '17:30', 'Repas 4', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '17:45', '18:45', 'Création de contenu : script', '#60a5fa', 'travail', null, array['Écrire 3 scripts ou hooks pour la semaine', 'Prompt Claude : Génère-moi 5 idées de hooks pour un coach sportif en ligne sur le thème du jour'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '19:00', '19:45', 'Création de contenu : prospection', '#60a5fa', 'travail', null, array['Objectif du jour : publier 5 reels', 'Prospecter 10 profils qualifiés sur Instagram/TikTok', 'Relancer les anciens contacts'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '20:00', '20:30', 'Repas 5 : dîner', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 5, '20:45', '21:00', 'Lecture', '#fbbf24', 'pause', null, '{}', true);

-- ── Jeudi (4) — repos entraînement, live Closing Mastery, pas de Quintal ──
insert into public.schedule_blocks (owner_id, day_of_week, start_time, end_time, label, color, icon, notes, tasks, notify) values
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '07:15', '07:45', 'Repas 1', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '08:00', '09:00', 'Closing Mastery (live)', '#60a5fa', 'etude', 'Formation TheModernPrepDad', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '09:15', '10:15', 'Création de contenu : script', '#60a5fa', 'travail', null, array['Écrire 3 scripts ou hooks pour la semaine', 'Prompt Claude : Génère-moi 5 idées de hooks pour un coach sportif en ligne sur le thème du jour'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '10:45', '11:15', 'Repas 2', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '11:30', '12:00', 'Pas', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '12:00', '13:00', 'Repas 3 : déjeuner', '#fbbf24', 'repas', 'Jour de repos', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '13:15', '14:45', 'Création de contenu : tournage', '#60a5fa', 'travail', null, array['Filmer 3 courtes vidéos (reels/TikTok)', 'Prépare cadrage, lumière et micro avant de lancer'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '15:00', '15:30', 'Pas', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '15:45', '16:45', 'Création de contenu : montage', '#60a5fa', 'travail', null, array['Monter les vidéos tournées', 'Ajouter sous-titres et musique', 'Exporter en format vertical 9:16'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '17:00', '17:30', 'Repas 4', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '17:45', '18:45', 'Création de contenu : prospection', '#60a5fa', 'travail', null, array['Objectif du jour : publier 5 reels', 'Prospecter 10 profils qualifiés sur Instagram/TikTok', 'Relancer les anciens contacts'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '19:00', '19:30', 'Repas 5 : dîner', '#fbbf24', 'repas', 'Jour de repos', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 4, '19:45', '20:00', 'Lecture', '#fbbf24', 'pause', null, '{}', true);

-- ── Dimanche (7) — repos entraînement, live à thème en fin de matinée ─────
insert into public.schedule_blocks (owner_id, day_of_week, start_time, end_time, label, color, icon, notes, tasks, notify) values
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '07:15', '07:45', 'Repas 1', '#fbbf24', 'repas', null, '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '08:00', '09:00', 'Création de contenu : script', '#60a5fa', 'travail', null, array['Écrire 3 scripts ou hooks pour la semaine', 'Prompt Claude : Génère-moi 5 idées de hooks pour un coach sportif en ligne sur le thème du jour'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '09:30', '10:30', 'Live à thème (formation)', '#60a5fa', 'etude', 'Formation TheModernPrepDad', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '10:45', '11:15', 'Repas 2', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '11:30', '12:00', 'Pas', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '12:00', '13:00', 'Repas 3 : déjeuner', '#fbbf24', 'repas', 'Jour de repos', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '13:15', '14:45', 'Création de contenu : tournage', '#60a5fa', 'travail', null, array['Filmer 3 courtes vidéos (reels/TikTok)', 'Prépare cadrage, lumière et micro avant de lancer'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '15:00', '15:30', 'Pas', '#4ade80', 'pas', null, array['Écoute un podcast ou un livre audio'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '15:45', '16:45', 'Création de contenu : montage', '#60a5fa', 'travail', null, array['Monter les vidéos tournées', 'Ajouter sous-titres et musique', 'Exporter en format vertical 9:16'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '17:00', '17:30', 'Repas 4', '#fbbf24', 'repas', null, array['Regarde une vidéo YouTube'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '17:45', '18:45', 'Création de contenu : prospection', '#60a5fa', 'travail', null, array['Objectif du jour : publier 5 reels', 'Prospecter 10 profils qualifiés sur Instagram/TikTok', 'Relancer les anciens contacts'], true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '19:00', '19:30', 'Repas 5 : dîner', '#fbbf24', 'repas', 'Jour de repos', '{}', true),
('845b826a-0e2f-4c44-8130-a8fe1e925351', 7, '19:45', '20:00', 'Lecture', '#fbbf24', 'pause', null, '{}', true);
