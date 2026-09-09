-- ==============================================================================
-- Supabase PostgreSQL Schema for Appointment Scheduling SaaS (Hebrew / RTL)
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. BUSINESSES TABLE
create table if not exists public.businesses (
    id uuid primary key default uuid_generate_v4(),
    slug text unique not null,
    name text not null,
    owner_phone text not null,
    owner_email text,
    password text,
    google_id text,
    pin text default '1234',
    working_hours jsonb not null default '{
        "sunday":    { "open": "09:00", "close": "19:00", "active": true, "lunch_break": { "active": true, "start": "13:00", "end": "14:00" } },
        "monday":    { "open": "09:00", "close": "19:00", "active": true, "lunch_break": { "active": true, "start": "13:00", "end": "14:00" } },
        "tuesday":   { "open": "09:00", "close": "19:00", "active": true, "lunch_break": { "active": true, "start": "13:00", "end": "14:00" } },
        "wednesday": { "open": "09:00", "close": "19:00", "active": true, "lunch_break": { "active": true, "start": "13:00", "end": "14:00" } },
        "thursday":  { "open": "09:00", "close": "20:00", "active": true, "lunch_break": { "active": true, "start": "13:00", "end": "14:00" } },
        "friday":    { "open": "08:30", "close": "14:00", "active": true, "lunch_break": { "active": false, "start": "12:00", "end": "12:30" } },
        "saturday":  { "open": "00:00", "close": "00:00", "active": false }
    }'::jsonb,
    created_at timestamptz not null default now()
);

-- Index for slug lookups
create index if not exists idx_businesses_slug on public.businesses (slug);

-- 2. SERVICES TABLE
create table if not exists public.services (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references public.businesses(id) on delete cascade,
    name text not null,
    duration_minutes integer not null check (duration_minutes > 0),
    buffer_minutes integer not null default 5 check (buffer_minutes >= 0),
    price numeric not null default 0 check (price >= 0),
    created_at timestamptz not null default now()
);

-- Index for business services
create index if not exists idx_services_business on public.services (business_id);

-- 3. CLIENTS TABLE
create table if not exists public.clients (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references public.businesses(id) on delete cascade,
    phone text not null,
    first_name text not null,
    last_name text not null,
    email text,
    google_id text,
    auth_provider text default 'guest',
    created_at timestamptz not null default now(),
    constraint uq_business_client_phone unique (business_id, phone)
);

-- Fast lookup per business & phone
create index if not exists idx_clients_business_phone on public.clients (business_id, phone);

-- 4. APPOINTMENTS TABLE
create table if not exists public.appointments (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid not null references public.businesses(id) on delete cascade,
    service_id uuid references public.services(id) on delete set null,
    client_id uuid not null references public.clients(id) on delete cascade,
    start_time timestamptz not null,
    end_time timestamptz not null,
    status text not null check (status in ('confirmed', 'cancelled')) default 'confirmed',
    reminder_sent boolean not null default false,
    notes text,
    created_at timestamptz not null default now(),
    constraint check_valid_time_range check (end_time > start_time)
);

-- Fast lookup for checking slot availability and reminders
create index if not exists idx_appointments_business_dates on public.appointments (business_id, start_time, end_time);
create index if not exists idx_appointments_reminders on public.appointments (reminder_sent, start_time) where status = 'confirmed';

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

-- Public read access for businesses & services (needed for public booking)
create policy "Allow public read for businesses" on public.businesses
    for select using (true);

create policy "Allow public read for services" on public.services
    for select using (true);

-- Public can search clients by phone or insert a new client
create policy "Allow public select on clients for phone lookup" on public.clients
    for select using (true);

create policy "Allow public insert on clients" on public.clients
    for insert with check (true);

-- Public can view appointments to detect collisions & insert new booking
create policy "Allow public select on appointments for slot availability" on public.appointments
    for select using (true);

create policy "Allow public insert on appointments" on public.appointments
    for insert with check (true);

-- Public can update appointment status (for cancellation link)
create policy "Allow cancellation by appointment id" on public.appointments
    for update using (true) with check (status in ('confirmed', 'cancelled'));

-- Full admin access via service role
create policy "Allow service_role full access to businesses" on public.businesses
    for all using (auth.role() = 'service_role');
create policy "Allow service_role full access to services" on public.services
    for all using (auth.role() = 'service_role');
create policy "Allow service_role full access to clients" on public.clients
    for all using (auth.role() = 'service_role');
create policy "Allow service_role full access to appointments" on public.appointments
    for all using (auth.role() = 'service_role');

-- ==============================================================================
-- SEED DATA (ISRAELI BUSINESSES, SERVICES, CLIENTS)
-- ==============================================================================
do $$
declare
    dan_id uuid := 'a1111111-1111-1111-1111-111111111111'::uuid;
    maya_id uuid := 'b2222222-2222-2222-2222-222222222222'::uuid;
    s_haircut uuid := 'c1111111-1111-1111-1111-111111111111'::uuid;
    s_beard uuid := 'c2222222-2222-2222-2222-222222222222'::uuid;
    s_combo uuid := 'c3333333-3333-3333-3333-333333333333'::uuid;
    s_nails uuid := 'c4444444-4444-4444-4444-444444444444'::uuid;
    s_pedicure uuid := 'c5555555-5555-5555-5555-555555555555'::uuid;
    c_yossi uuid := 'd1111111-1111-1111-1111-111111111111'::uuid;
    c_noa uuid := 'd2222222-2222-2222-2222-222222222222'::uuid;
begin
    -- 1. Businesses
    insert into public.businesses (id, slug, name, owner_phone, working_hours)
    values 
    (
        dan_id,
        'barber-dan',
        'מספרת דניאל - Barber Dan',
        '0541234567',
        '{
            "sunday":    { "open": "09:00", "close": "19:00", "active": true },
            "monday":    { "open": "09:00", "close": "19:00", "active": true },
            "tuesday":   { "open": "09:00", "close": "19:00", "active": true },
            "wednesday": { "open": "09:00", "close": "19:00", "active": true },
            "thursday":  { "open": "09:00", "close": "20:00", "active": true },
            "friday":    { "open": "08:30", "close": "14:00", "active": true },
            "saturday":  { "open": "00:00", "close": "00:00", "active": false }
        }'::jsonb
    ),
    (
        maya_id,
        'maya-nails',
        'סטודיו מיה - ציפורניים ויופי',
        '0529876543',
        '{
            "sunday":    { "open": "09:30", "close": "18:30", "active": true },
            "monday":    { "open": "09:30", "close": "18:30", "active": true },
            "tuesday":   { "open": "09:30", "close": "18:30", "active": true },
            "wednesday": { "open": "09:30", "close": "18:30", "active": true },
            "thursday":  { "open": "09:30", "close": "19:30", "active": true },
            "friday":    { "open": "09:00", "close": "13:30", "active": true },
            "saturday":  { "open": "00:00", "close": "00:00", "active": false }
        }'::jsonb
    )
    on conflict (slug) do nothing;

    -- 2. Services for Barber Dan
    insert into public.services (id, business_id, name, duration_minutes, buffer_minutes, price)
    values
    (s_haircut, dan_id, 'תספורת גברים קלאסית', 30, 5, 80),
    (s_beard,   dan_id, 'עיצוב וסידור זקן', 20, 5, 45),
    (s_combo,   dan_id, 'חבילת VIP: תספורת + זקן + חפיפה', 50, 10, 115)
    on conflict (id) do nothing;

    -- Services for Maya Nails
    insert into public.services (id, business_id, name, duration_minutes, buffer_minutes, price)
    values
    (s_nails,    maya_id, 'לק ג''ל ומניקור רוסי', 60, 10, 140),
    (s_pedicure, maya_id, 'פדיקור ספא מפנק', 50, 10, 160)
    on conflict (id) do nothing;

    -- 3. Clients
    insert into public.clients (id, business_id, phone, first_name, last_name)
    values
    (c_yossi, dan_id, '0501234567', 'יוסי', 'כהן'),
    (c_noa,   maya_id, '0523334444', 'נועה', 'לוי')
    on conflict (business_id, phone) do nothing;

end $$;
