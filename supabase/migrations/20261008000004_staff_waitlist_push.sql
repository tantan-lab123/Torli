-- Staff accounts (roles), per-employee appointments, waiting list, web-push subscriptions.
-- Every table is RLS-locked: only the server (service_role) can touch them.

create table if not exists public.staff_members (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses(id) on delete cascade,
    name text not null,
    phone text not null check (phone ~ '^[0-9]{10}$'),
    role text not null default 'staff' check (role in ('manager', 'staff')),
    password text,                                  -- bcrypt hash; null = no system login
    is_visible_online boolean not null default true,
    avatar_color text,
    active boolean not null default true,
    created_at timestamptz not null default now()
);
create unique index if not exists uq_staff_phone on public.staff_members (phone);
create index if not exists idx_staff_business on public.staff_members (business_id);

alter table public.appointments
    add column if not exists staff_id uuid references public.staff_members(id) on delete set null;

create table if not exists public.waitlist (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses(id) on delete cascade,
    service_id uuid references public.services(id) on delete set null,
    phone text not null,
    first_name text not null,
    last_name text not null,
    desired_date date not null,                     -- Israel calendar day
    status text not null default 'waiting' check (status in ('waiting', 'slot_open', 'done', 'cancelled')),
    opened_start timestamptz,                       -- the slot that just became free
    created_at timestamptz not null default now()
);
create index if not exists idx_waitlist_business_date on public.waitlist (business_id, desired_date, status);

create table if not exists public.push_subscriptions (
    endpoint text primary key,
    business_id uuid not null references public.businesses(id) on delete cascade,
    staff_id uuid references public.staff_members(id) on delete cascade,
    p256dh text not null,
    auth text not null,
    created_at timestamptz not null default now()
);
create index if not exists idx_push_business on public.push_subscriptions (business_id);

-- Server-side secrets that must not live in the repo (Web Push VAPID key pair).
create table if not exists public.app_secrets (
    key text primary key,
    value text not null,
    created_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;
alter table public.waitlist enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.app_secrets enable row level security;
revoke all on public.staff_members, public.waitlist, public.push_subscriptions, public.app_secrets
    from anon, authenticated;
