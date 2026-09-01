-- La migration 20260802_founder_display_name avait pose "Santamaria Sanchez"
-- avec un accent aigu (Sánchez). L'orthographe correcte, confirmee dans
-- Notion et deja utilisee dans les repos ep-site/ep-coaching-formulaires,
-- est un accent grave (Sànchez). Corrige la seule ligne concernee.
update profiles set full_name = 'Santamaria Sànchez' where id = '845b826a-0e2f-4c44-8130-a8fe1e925351' and full_name = 'Santamaria Sánchez';
