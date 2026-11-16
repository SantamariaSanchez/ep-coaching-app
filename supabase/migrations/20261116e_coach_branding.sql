-- Marque personnalisée des coachs Premium (200 €/mois) : nom, couleur et
-- logo appliqués à l'appli de leurs clients (lib/coach-branding.ts).
alter table public.profiles add column if not exists brand_name text check (brand_name is null or char_length(brand_name) <= 40);
alter table public.profiles add column if not exists brand_color text check (brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$');
alter table public.profiles add column if not exists brand_logo_url text check (brand_logo_url is null or char_length(brand_logo_url) <= 500);

-- Logos publics (affichés à des clients connectés), écrits seulement par le
-- serveur (client admin) : aucune policy d'écriture côté utilisateur.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-logos', 'brand-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
