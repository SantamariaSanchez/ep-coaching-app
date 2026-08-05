-- Deja appliquee en production via le MCP Supabase le 2026-08-05.
--
-- 1. Les fonctions de trigger ne doivent pas etre exposees comme RPC PostgREST.
--    Un appel direct echouerait de toute facon ("trigger functions can only be
--    called as triggers"), mais autant ne pas les publier dans l'API.
revoke all on function public.sync_profile_mfa_enabled() from public, anon, authenticated;

-- 2. Correctif : protect_profile_privileged_columns remettait mfa_enabled a son
--    ancienne valeur, y compris quand c'etait le trigger de synchronisation
--    (sync_profile_mfa_enabled) qui ecrivait. Resultat, activer la 2FA ne
--    mettait jamais profiles.mfa_enabled a true : GoTrue n'ecrit pas avec le
--    role service_role, la seule exemption prevue.
--
--    Plutot que de recopier l'ancienne valeur, on recalcule desormais la
--    colonne depuis sa source de verite (auth.mfa_factors). C'est a la fois
--    plus sur (impossible de se declarer 2FA active ou inactive par un PATCH
--    direct sur son profil, quelle que soit la valeur envoyee) et compatible
--    avec le trigger de synchronisation, qui ecrit exactement la meme valeur.
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

  -- Toujours la verite d'auth.mfa_factors, jamais ce que l'appelant envoie.
  new.mfa_enabled := exists (
    select 1 from auth.mfa_factors f
    where f.user_id = old.id
      and f.status = 'verified'
  );

  return new;
end;
$function$;

revoke all on function public.protect_profile_privileged_columns() from public, anon, authenticated;
