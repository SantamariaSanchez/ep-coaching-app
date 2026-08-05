-- Verification d'email reelle.
-- Les comptes etaient crees avec email_confirm: true sans jamais verifier que
-- l'adresse existe. On suit desormais la verification dans profiles.
--
-- Deja appliquee en production via le MCP Supabase le 2026-08-05.
alter table public.profiles
  add column if not exists email_verified_at timestamptz;

-- Backfill : tous les comptes deja en place sont consideres verifies, sinon
-- chaque membre existant verrait apparaitre un bandeau du jour au lendemain.
-- Seules les nouvelles inscriptions demarrent non verifiees.
update public.profiles
  set email_verified_at = coalesce(start_date::timestamptz, now())
  where email_verified_at is null;

-- email et email_verified_at rejoignent les colonnes qu'un utilisateur ne peut
-- pas modifier lui meme via un appel direct a l'API REST : sans ca, n'importe
-- qui pourrait se marquer verifie ou changer l'email affiche a son coach.
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

  return new;
end;
$function$;
