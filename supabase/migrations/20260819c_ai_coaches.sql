-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Coachs IA client-facing (demande directe 2026-08-19)
-- À EXÉCUTER MANUELLEMENT dans le Supabase SQL Editor (tentative
-- d'application directe via l'outil MCP refusée par le classificateur de
-- permissions de la session qui l'a écrite).
-- ═══════════════════════════════════════════════════════════════════════
-- 10 coachs IA visibles dans l'annuaire public /coachs et le choix de
-- coach côté client, au même titre qu'un coach humain tiers (même modèle
-- profiles/role='coach'). is_ai_coach déclenche le badge "Coach IA" dans
-- toute l'UI cliente (transparence non négociable, voir lib/ai-coaches.ts
-- et MASTERCLASS.md Axe AE) ; ai_coach_key relie la ligne à sa fiche
-- (bio, spécialités, system prompt) dans lib/ai-coaches.ts.

alter table public.profiles add column if not exists is_ai_coach boolean not null default false;
alter table public.profiles add column if not exists ai_coach_key text;

create index if not exists idx_profiles_is_ai_coach on public.profiles (is_ai_coach) where is_ai_coach = true;
