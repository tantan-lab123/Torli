-- Phase 1: safe to apply BEFORE the new application code is deployed
-- (does not remove any access the currently deployed app relies on).

-- 1. The anon/authenticated roles never need these. TRUNCATE is not covered by RLS at all.
revoke truncate, trigger, references, delete
  on public.businesses, public.services, public.clients, public.appointments
  from anon, authenticated;

-- 2. Business rows are only ever written by the server (service_role).
revoke insert, update on public.businesses from anon, authenticated;

-- 3. rls_auto_enable() is an event-trigger helper; it must not be callable via /rest/v1/rpc.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- 4. Legacy plaintext PIN (default '1234' on every business) is unused. Remove it.
alter table public.businesses drop column if exists pin;

-- 5. Make double-booking impossible at the database level (race-condition safe).
--    Half-open ranges: back-to-back appointments are allowed.
create extension if not exists btree_gist with schema extensions;
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    business_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  ) where (status = 'confirmed');

-- NOTE: a unique/digits-only constraint on owner_phone is intentionally NOT added here:
-- two existing rows share the non-normalised phone "055-6664314". Resolve them manually first.
