-- Phase 2: deny-all for browser roles. Requires the new application code
-- (all data access via service_role on the server) + SESSION_SECRET env var.

drop policy if exists "Allow public read for businesses" on public.businesses;
drop policy if exists "Allow public read for services" on public.services;
drop policy if exists "Allow public select on clients for phone lookup" on public.clients;
drop policy if exists "Allow public insert on clients" on public.clients;
drop policy if exists "Allow public select on appointments for slot availability" on public.appointments;
drop policy if exists "Allow public insert on appointments" on public.appointments;
drop policy if exists "Allow cancellation by appointment id" on public.appointments;
drop policy if exists "Allow service_role full access to businesses" on public.businesses;
drop policy if exists "Allow service_role full access to services" on public.services;
drop policy if exists "Allow service_role full access to clients" on public.clients;
drop policy if exists "Allow service_role full access to appointments" on public.appointments;

revoke all on public.businesses, public.services, public.clients, public.appointments from anon, authenticated;

create extension if not exists pgcrypto with schema extensions;
update public.businesses
   set password = extensions.crypt(password, extensions.gen_salt('bf', 11))
 where password is not null and password !~ '^[$]2[aby][$]';
