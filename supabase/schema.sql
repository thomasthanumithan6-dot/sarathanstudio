-- ============================================================
-- Sarathan Studio - Supabase schema
-- Run this in Supabase Dashboard -> SQL Editor -> New query.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- Profiles (one row per auth user) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- Packages ----------
create table if not exists public.packages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price_lkr integer not null check (price_lkr >= 0),
  description text,
  created_at timestamptz not null default now()
);

-- ---------- Bookings ----------
create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references auth.users (id) on delete set null,
  name text not null,
  phone text not null,
  event_type text not null,
  event_date date not null,
  location text,
  created_at timestamptz not null default now()
);

-- ---------- Private customer galleries ----------
create table if not exists public.galleries (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default uuid_generate_v4(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  title text,
  url text not null,
  created_at timestamptz not null default now()
);

-- ---------- Customer photo selections ----------
create table if not exists public.selections (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  photo_id uuid not null references public.photos (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, photo_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.packages enable row level security;
alter table public.bookings enable row level security;
alter table public.galleries enable row level security;
alter table public.photos enable row level security;
alter table public.selections enable row level security;

-- profiles: users read their own row; admins read everything.
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- packages: readable by everyone (public pricing); writable by admins.
create policy "packages_public_read"
  on public.packages for select
  using (true);

create policy "packages_admin_write"
  on public.packages for all
  using (public.is_admin())
  with check (public.is_admin());

-- bookings: anyone may create one; owners and admins can read.
create policy "bookings_anyone_insert"
  on public.bookings for insert
  with check (true);

create policy "bookings_owner_or_admin_read"
  on public.bookings for select
  using (auth.uid() = customer_id or public.is_admin());

-- galleries: only the owning customer or an admin can see them.
create policy "galleries_owner_or_admin_read"
  on public.galleries for select
  using (auth.uid() = customer_id or public.is_admin());

create policy "galleries_admin_write"
  on public.galleries for all
  using (public.is_admin())
  with check (public.is_admin());

-- photos: visible only if the parent gallery belongs to the customer (or admin).
create policy "photos_owner_or_admin_read"
  on public.photos for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.galleries g
      where g.id = gallery_id and g.customer_id = auth.uid()
    )
  );

create policy "photos_admin_write"
  on public.photos for all
  using (public.is_admin())
  with check (public.is_admin());

-- selections: customers manage their own; admins can read all.
create policy "selections_owner_write"
  on public.selections for insert
  with check (auth.uid() = customer_id);

create policy "selections_owner_or_admin_read"
  on public.selections for select
  using (auth.uid() = customer_id or public.is_admin());

create policy "selections_owner_delete"
  on public.selections for delete
  using (auth.uid() = customer_id);

-- ============================================================
-- Seed packages (safe to re-run)
-- ============================================================

insert into public.packages (name, price_lkr, description)
values
  ('Wedding Package', 45000, 'Wedding day photography.'),
  ('Birthday Package', 15000, 'Birthday event photography.'),
  ('Studio Package', 10000, 'Portrait and family photos.')
on conflict do nothing;
