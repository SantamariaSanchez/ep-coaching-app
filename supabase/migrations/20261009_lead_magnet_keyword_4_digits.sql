-- lpad(n, 3, '0') tronque au lieu de rallonger : 1000 devenait « 100 »
-- (doublon, insertion refusée). On garde 001 à 999 et on passe ensuite
-- à 1000, 1001...
create or replace function public.lead_magnet_next_keyword() returns text
language sql volatile as $$
  select case when n < 1000 then lpad(n::text, 3, '0') else n::text end
  from (select nextval('public.lead_magnets_keyword_seq') as n) s
$$;

alter table public.lead_magnets alter column keyword set default public.lead_magnet_next_keyword();

select setval('public.lead_magnets_keyword_seq', greatest(999, (select max(keyword::bigint) from public.lead_magnets where keyword ~ '^\d+$')), true);
