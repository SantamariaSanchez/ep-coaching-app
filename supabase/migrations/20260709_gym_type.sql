-- Catégorise chaque salle : commerciale (grande enseigne), indépendante
-- (salle hardcore/bodybuilding non franchisée), ou associative.
ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('commerciale', 'independante', 'associative')) DEFAULT 'independante';
