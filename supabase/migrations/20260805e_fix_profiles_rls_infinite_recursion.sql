-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Fix panne critique : recursion infinie RLS sur profiles
-- Deja appliquee en prod via MCP Supabase, ce fichier est pour tracabilite
-- ═══════════════════════════════════════════════════════════════════════
-- La policy "Coach reads all profiles" faisait un SELECT direct sur
-- profiles dans sa propre condition USING. Tant que la RLS etait
-- desactivee sur profiles, ca ne posait aucun probleme (policy inerte).
-- Des qu'une vague de securite recente a active la RLS sur profiles
-- (protect_profile_privileged_columns), Postgres a detecte une recursion
-- infinie sur CETTE policy a chaque requete sur profiles, renvoyant une
-- erreur 500 sur toute lecture, y compris la lecture de son propre profil
-- au chargement de l'app (panne totale cote client, ecran noir/rouge vide
-- signalee le 2026-08-05, confirmee dans les logs Postgres : "infinite
-- recursion detected in policy for relation profiles").
--
-- Fix : remplace la sous-requete recursive par is_own_coach()/
-- is_platform_owner(), des fonctions SECURITY DEFINER qui contournent la
-- RLS en interne (meme pattern deja utilise partout ailleurs dans le
-- repo). Recadre aussi la portee : un coach ne voit plus TOUS les profils
-- de la plateforme, mais seulement les siens (plus son propre profil),
-- coherent avec le cloisonnement multi-coach applique partout ailleurs.
-- Le fondateur (is_platform_owner) garde une vue complete pour les
-- fonctions d'admin.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "Coach reads all profiles" on public.profiles;
create policy "Coach reads all profiles" on public.profiles
  for select using (
    auth.uid() = id
    or public.is_own_coach(id)
    or public.is_platform_owner()
  );
