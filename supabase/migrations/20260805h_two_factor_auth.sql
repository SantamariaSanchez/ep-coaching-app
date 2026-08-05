-- Double authentification (TOTP natif Supabase Auth).
-- profiles.mfa_enabled est un miroir de auth.mfa_factors, tenu a jour par un
-- trigger : le middleware peut ainsi savoir en une seule lecture de profil si
-- un compte doit passer par un code, sans appel reseau supplementaire.
--
-- Deja appliquee en production via le MCP Supabase le 2026-08-05.
--
-- Depannage, si besoin un jour :
--   * desactiver l'obligation de 2FA du fondateur (retour arriere immediat) :
--       update public.profiles set mfa_enabled = true where is_platform_owner;
--     (ou retirer le bloc correspondant dans proxy.ts)
--   * compte bloque parce qu'il a perdu son application d'authentification :
--       delete from auth.mfa_factors where user_id = '<id du compte>';
--     le trigger remet mfa_enabled a false tout seul.
alter table public.profiles
  add column if not exists mfa_enabled boolean not null default false;

create or replace function public.sync_profile_mfa_enabled()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
begin
  update public.profiles
     set mfa_enabled = exists (
       select 1 from auth.mfa_factors f
       where f.user_id = v_user
         and f.status = 'verified'
     )
   where id = v_user;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_profile_mfa_enabled on auth.mfa_factors;
create trigger sync_profile_mfa_enabled
after insert or update or delete on auth.mfa_factors
for each row execute function public.sync_profile_mfa_enabled();

-- Backfill pour les facteurs deja enroles (aucun a ce jour, mais idempotent).
update public.profiles p
   set mfa_enabled = exists (
     select 1 from auth.mfa_factors f
     where f.user_id = p.id and f.status = 'verified'
   );

-- mfa_enabled rejoint les colonnes qu'un utilisateur ne peut pas modifier
-- lui meme : sans ca, quelqu'un pourrait desactiver le controle 2FA du
-- middleware par un simple PATCH sur son propre profil.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  new.role := old.role;
  new.is_platform_owner := old.is_platform_owner;
  new.coach_id := old.coach_id;
  new.subscription_status := old.subscription_status;
  new.subscription_plan := old.subscription_plan;
  new.stripe_customer_id := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.platform_subscription_status := old.platform_subscription_status;
  new.platform_stripe_customer_id := old.platform_stripe_customer_id;
  new.platform_stripe_subscription_id := old.platform_stripe_subscription_id;
  new.status := old.status;
  new.invite_code := old.invite_code;
  new.checkin_day := old.checkin_day;
  new.next_billing_date := old.next_billing_date;
  new.external_payment_link := old.external_payment_link;
  new.email := old.email;
  new.email_verified_at := old.email_verified_at;
  new.mfa_enabled := old.mfa_enabled;

  return new;
end;
$function$;
