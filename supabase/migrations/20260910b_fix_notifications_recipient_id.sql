-- BUG CRITIQUE trouvé le 2026-09-10 (retour direct : "les notif et le son
-- ne marchent jamais, aucune notif reçue aujourd'hui, réveillé en retard") :
-- la table public.notifications porte en base une colonne recipient_id
-- uuid NOT NULL (avec sa propre FK vers auth.users), introduite hors des
-- migrations suivies dans ce dépôt (aucune trace dans supabase/migrations
-- avant ce fichier). Or utils/insert-notification.ts (et donc TOUT appel
-- à insertNotification — agenda, messagerie, escalade IA, etc.) n'a
-- jamais rempli que la colonne user_id, la seule prévue par la migration
-- d'origine (20260712_notifications.sql). Résultat : CHAQUE insert dans
-- notifications violait la contrainte NOT NULL sur recipient_id et
-- échouait, mais le client Supabase JS ne lève pas d'exception sur une
-- erreur d'insert non vérifiée (le code ne teste pas .error) — l'échec
-- était donc totalement silencieux. Confirmé en base : la table
-- notifications est restée VIDE depuis sa création, tous utilisateurs
-- confondus, malgré des dizaines de rappels d'agenda envoyés par jour.
--
-- Correction en deux temps :
-- 1) recipient_id devient nullable : rien dans le code applicatif ne le
--    lit ni ne l'écrit, le rendre optionnel élimine l'échec immédiatement.
-- 2) Trigger de synchronisation (ceinture et bretoles) : si une future
--    requête (ou un outil externe) réécrit recipient_id sans passer par
--    insertNotification(), user_id reste rempli automatiquement, et
--    vice-versa — les deux policies RLS existantes lisent déjà l'un OU
--    l'autre (user_id = auth.uid() OR recipient_id = auth.uid()).
alter table public.notifications alter column recipient_id drop not null;

create or replace function public.sync_notifications_recipient_user_id()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null and new.recipient_id is not null then
    new.user_id := new.recipient_id;
  elsif new.recipient_id is null and new.user_id is not null then
    new.recipient_id := new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_notifications_recipient_user_id on public.notifications;
create trigger trg_sync_notifications_recipient_user_id
  before insert or update on public.notifications
  for each row
  execute function public.sync_notifications_recipient_user_id();

-- Rattrapage : aucune ligne historique à corriger, la table était vide
-- (confirmé avant d'écrire cette migration), donc pas de backfill nécessaire.
