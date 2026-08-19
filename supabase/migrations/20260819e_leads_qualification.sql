-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Qualification automatique des leads par l'agent Setter
-- À EXÉCUTER MANUELLEMENT dans le Supabase SQL Editor (voir AGENTS.md).
-- ═══════════════════════════════════════════════════════════════════════
-- Demande directe 2026-08-19 : "les agents IA doivent gérer EP Coaching,
-- l'acquisition client c'est le focus actuel" — confirmé "envoi
-- automatique réel par email (Brevo)" plutôt qu'un brouillon à valider.
-- qualification_sent_at évite de recontacter deux fois la même personne
-- (un email peut avoir plusieurs lignes leads s'il télécharge plusieurs
-- guides) — voir lib/lead-qualification.ts.

alter table public.leads add column if not exists qualification_sent_at timestamptz;
