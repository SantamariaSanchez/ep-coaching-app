-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Nom d'affichage public du fondateur
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Le nom public/de marque devient "Santamaria Sánchez" (Instagram déjà
-- @santamariasanchez_). L'identité légale (SIRET 10483817200013) reste
-- "Emmanuel Peccoux" dans les CGU/CGV/politique de confidentialité — ce
-- n'est PAS un changement de raison sociale, uniquement le nom affiché
-- dans l'application (profil, messagerie, notifications).
-- ═══════════════════════════════════════════════════════════════════════

update public.profiles
set full_name = 'Santamaria Sánchez'
where is_platform_owner = true;
