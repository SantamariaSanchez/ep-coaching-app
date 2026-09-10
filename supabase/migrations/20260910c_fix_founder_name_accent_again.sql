-- Deuxieme correction de l'accent du nom du fondateur (retour direct
-- 2026-09-10) : la migration 20260901f avait pose "Sànchez" (accent
-- grave sur le a), confirme comme une nouvelle erreur -- l'orthographe
-- correcte est "Sanchéz" (accent aigu sur le e, pas sur le a). Corrige
-- la seule ligne concernee.
update profiles set full_name = 'Santamaria Sanchéz' where id = '845b826a-0e2f-4c44-8130-a8fe1e925351' and full_name = 'Santamaria Sànchez';
