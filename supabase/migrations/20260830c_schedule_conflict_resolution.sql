-- Ajustement reel de l'agenda quand un nouvel evenement est insere (demande
-- explicite 2026-08-30 : "faut pas juste chevaucher les autres mais que
-- l'emploi du temps s'ajuste, faire de la place et decaler/raccourcir les
-- blocs autour"). Jusqu'ici, la sync Google Calendar (et n'importe quel
-- ajout) inserait un bloc sans jamais toucher aux blocs deja presents au
-- meme horaire, ce qui produisait de vrais chevauchements visibles (ex.
-- "Appel Vente - Will" pose pile sur "Seance : Upper" le meme jour).
--
-- Cette fonction fait la place pour un nouveau creneau [p_new_start,
-- p_new_end) sur un jour donne, en ajustant TOUS les blocs existants qui le
-- chevauchent (peu importe leur source, manuel ou google_calendar) :
--   - bloc qui contient entierement le nouveau creneau -> decoupe en deux
--     (avant / apres), rien n'est perdu du contenu existant autour
--   - bloc qui deborde seulement sur le debut du nouveau creneau -> sa fin
--     est raccourcie pour s'arreter au debut du nouveau creneau
--   - bloc qui deborde seulement sur la fin du nouveau creneau -> son debut
--     est repousse a la fin du nouveau creneau
--   - bloc entierement recouvert par le nouveau creneau -> supprime (plus
--     de place pour lui du tout)
-- Un nettoyage final supprime tout bloc degenere (duree nulle ou negative)
-- laisse par un decoupage pile sur une frontiere existante.
create or replace function resolve_schedule_conflict(
  p_owner_id uuid,
  p_day_of_week int,
  p_new_start time,
  p_new_end time,
  p_exclude_id uuid default null
) returns void
language plpgsql
as $$
declare
  b record;
begin
  for b in
    select id, start_time, end_time
    from schedule_blocks
    where owner_id = p_owner_id
      and day_of_week = p_day_of_week
      and (p_exclude_id is null or id <> p_exclude_id)
      and start_time < p_new_end
      and end_time > p_new_start
  loop
    if b.start_time < p_new_start and b.end_time > p_new_end then
      -- Le bloc existant contient entierement le nouveau creneau : on garde
      -- sa moitie "apres" comme nouvelle ligne AVANT de raccourcir
      -- l'original (b.end_time capture ici, pas relu depuis la table apres
      -- coup, sinon on recopierait la valeur deja modifiee).
      insert into schedule_blocks (owner_id, day_of_week, start_time, end_time, label, color, icon, notes, tasks, notify, source)
      select owner_id, day_of_week, p_new_end, b.end_time, label, color, icon, notes, tasks, notify, source
      from schedule_blocks where id = b.id;
      update schedule_blocks set end_time = p_new_start where id = b.id;
    elsif b.start_time < p_new_start then
      -- Deborde seulement sur le debut du nouveau creneau : on raccourcit sa fin.
      update schedule_blocks set end_time = p_new_start where id = b.id;
    elsif b.end_time > p_new_end then
      -- Deborde seulement sur la fin du nouveau creneau : on repousse son debut.
      update schedule_blocks set start_time = p_new_end where id = b.id;
    else
      -- Entierement recouvert par le nouveau creneau : plus de place pour lui.
      delete from schedule_blocks where id = b.id;
    end if;
  end loop;

  -- Filet de securite : un decoupage pile sur une frontiere identique peut
  -- laisser un bloc a duree nulle ou negative, jamais affichable.
  delete from schedule_blocks
  where owner_id = p_owner_id
    and day_of_week = p_day_of_week
    and start_time >= end_time;
end;
$$;

comment on function resolve_schedule_conflict is 'Fait de la place pour un nouveau creneau [p_new_start, p_new_end) sur un jour donne en decoupant/raccourcissant/supprimant les blocs schedule_blocks existants qui le chevauchent. A appeler AVANT d''inserer ou deplacer un bloc (sync Google Calendar ou ajout manuel).';
