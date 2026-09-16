-- Cache des URLs signées Supabase Storage pour les photos privées (suivi
-- photo, progression personnelle, avatars).
--
-- Contexte (MASTERCLASS.md Axe CH, chantier egress identifié le 2026-09-16) :
-- utils/photos.ts, utils/personal-photos.ts et utils/avatar.ts généraient une
-- NOUVELLE createSignedUrl (jeton différent) à CHAQUE chargement de page pour
-- la même photo. Résultat : aucun cache navigateur possible, même pour une
-- photo déjà vue 10 fois par le même client ou le même coach — chaque
-- affichage retéléchargeait l'original depuis Supabase Storage.
--
-- Cette table sert de raccourci de génération (voir utils/signed-url-cache.ts) :
-- avant de signer une nouvelle URL, on vérifie si une entrée en cache existe
-- et n'expire pas dans les prochaines minutes ; si oui elle est réutilisée
-- (même URL d'un chargement à l'autre, donc le navigateur peut enfin mettre
-- l'image en cache HTTP). Elle ne change RIEN aux permissions : la lecture
-- applicative continue de passer par les mêmes vérifications qu'avant (RLS
-- sur la ligne qui référence ce storage_path, guard de rôle...) avant même
-- d'appeler la fonction qui lit ce cache — ce n'est qu'un index technique
-- storage_path -> URL déjà signée, jamais un nouveau chemin d'accès public.
--
-- Accessible uniquement via createAdminClient() (service_role), même pattern
-- que auth_login_attempts (20260805f) : aucune policy, RLS activée pour
-- bloquer anon/authenticated par défaut. Rien n'est appelable depuis le
-- navigateur.

create table if not exists public.signed_url_cache (
  bucket        text        not null,
  storage_path  text        not null,
  signed_url    text        not null,
  expires_at    timestamptz not null,
  updated_at    timestamptz not null default now(),
  primary key (bucket, storage_path)
);

-- Utile si on ajoute un jour un ménage périodique des entrées expirées
-- (pas fait ici : la table reste petite, une ligne par photo réellement
-- consultée, et une entrée périmée est de toute façon sans risque de
-- sécurité, voir invalidateSignedUrlCache).
create index if not exists signed_url_cache_expires_at_idx
  on public.signed_url_cache (expires_at);

alter table public.signed_url_cache enable row level security;
-- Aucune policy volontairement : seule la service_role (qui bypass RLS) lit/écrit.

revoke all on table public.signed_url_cache from anon, authenticated;
