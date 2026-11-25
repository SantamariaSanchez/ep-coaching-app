-- Studio (25/11) : chaque script a deux versions et un brouillon.
-- bullets : version « Points clés » (idée principale, points, CTA), pour
-- tourner sans lire un texte mot pour mot. Forme : {"main": "...",
-- "points": ["...", "..."], "cta": "..."}.
-- draft : brouillon libre où le coach réfléchit avant d'écrire.
alter table public.coach_scripts add column if not exists bullets jsonb;
alter table public.coach_scripts add column if not exists draft text;
