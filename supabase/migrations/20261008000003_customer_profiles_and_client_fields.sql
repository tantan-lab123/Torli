-- Customers who sign in with Google save their details once; next booking is one tap.
create table if not exists public.customer_profiles (
    google_id   text primary key,           -- Supabase Auth user id (verified server-side)
    email       text not null,
    first_name  text not null,
    last_name   text not null,
    phone       text not null,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
alter table public.customer_profiles enable row level security;
revoke all on public.customer_profiles from anon, authenticated;  -- server (service_role) only

-- The owner's address book keeps birthday and internal notes (previously browser-only).
alter table public.clients add column if not exists birthday text;
alter table public.clients add column if not exists notes text;
