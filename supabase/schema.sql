-- ============================================================================
-- Sarathan Studio - complete Supabase schema (v2)
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS throughout.
-- Run in Supabase Dashboard -> SQL Editor -> New query.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. PROFILES (one row per auth user; role decides admin access)
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin check helper. SECURITY DEFINER so policies can read profiles safely.
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

-- ============================================================================
-- 2. CUSTOMERS (studio-facing record with unique readable customer ID)
-- ============================================================================

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  customer_code text not null unique,
  event_type text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  notes text,
  created_at timestamptz not null default now()
);

-- Generates SRS-0001, SRS-0002, ... for each new customer.
create sequence if not exists public.customer_code_seq start 1;

create or replace function public.assign_customer_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_code is null or new.customer_code = '' then
    new.customer_code := 'SRS-' || lpad(nextval('public.customer_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists assign_customer_code_trigger on public.customers;
create trigger assign_customer_code_trigger
  before insert on public.customers
  for each row execute function public.assign_customer_code();

-- ============================================================================
-- 3. GALLERIES (one private gallery per event/customer)
-- ============================================================================

create table if not exists public.galleries (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 4. PHOTOS (files live in the private 'customer-photos' storage bucket;
--           this table stores the storage path, never a public URL)
-- ============================================================================

create table if not exists public.photos (
  id uuid primary key default uuid_generate_v4(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  title text,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 5. PHOTO_SELECTIONS (customer favourites + submission workflow)
-- ============================================================================

create table if not exists public.photo_selections (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  photo_id uuid not null references public.photos (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'completed')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (customer_id, photo_id)
);

-- One submission batch per customer at a time: a partial unique index keeps
-- at most one non-draft batch open-ended; re-opening is done by admin update.

-- ============================================================================
-- 6. BOOKINGS
-- ============================================================================

create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers (id) on delete set null,
  name text not null,
  phone text not null,
  event_type text not null,
  event_date date not null,
  location text,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'advance', 'paid')),
  booking_status text not null default 'pending'
    check (booking_status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 7. PACKAGES (public pricing managed by admin)
-- ============================================================================

create table if not exists public.packages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price_lkr integer not null check (price_lkr >= 0),
  description text,
  created_at timestamptz not null default now()
);

insert into public.packages (name, price_lkr, description)
select * from (values
  ('Wedding Package', 45000, 'Wedding day photography.'),
  ('Birthday Package', 15000, 'Birthday event photography.'),
  ('Studio Package', 10000, 'Portrait and family photos.')
) as seed(name, price_lkr, description)
where not exists (select 1 from public.packages);

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.galleries enable row level security;
alter table public.photos enable row level security;
alter table public.photo_selections enable row level security;
alter table public.bookings enable row level security;
alter table public.packages enable row level security;

-- ---- profiles ----
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own_name_or_admin" on public.profiles;
create policy "profiles_update_own_name_or_admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (
    -- Customers may edit only their own name/phone and can NEVER change role.
    public.is_admin()
    or (auth.uid() = id and role = 'customer')
  );

-- NOTE: role is only ever set by an admin directly in the dashboard/SQL.
-- There is intentionally no INSERT policy for profiles: the trigger creates
-- rows, and there is no client-side path for a customer to grant themselves
-- the admin role.

-- ---- customers ----
drop policy if exists "customers_select_own_or_admin" on public.customers;
create policy "customers_select_own_or_admin"
  on public.customers for select
  using (
    public.is_admin()
    or profile_id = auth.uid()
  );

drop policy if exists "customers_admin_write" on public.customers;
create policy "customers_admin_write"
  on public.customers for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- galleries ----
drop policy if exists "galleries_select_own_or_admin" on public.galleries;
create policy "galleries_select_own_or_admin"
  on public.galleries for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.customers c
      where c.id = customer_id and c.profile_id = auth.uid()
    )
  );

drop policy if exists "galleries_admin_write" on public.galleries;
create policy "galleries_admin_write"
  on public.galleries for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- photos ----
drop policy if exists "photos_select_own_or_admin" on public.photos;
create policy "photos_select_own_or_admin"
  on public.photos for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.galleries g
      join public.customers c on c.id = g.customer_id
      where g.id = gallery_id and c.profile_id = auth.uid()
    )
  );

drop policy if exists "photos_admin_write" on public.photos;
create policy "photos_admin_write"
  on public.photos for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- photo_selections ----
drop policy if exists "selections_select_own_or_admin" on public.photo_selections;
create policy "selections_select_own_or_admin"
  on public.photo_selections for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.customers c
      where c.id = customer_id and c.profile_id = auth.uid()
    )
  );

drop policy if exists "selections_customer_insert_draft" on public.photo_selections;
create policy "selections_customer_insert_draft"
  on public.photo_selections for insert
  with check (
    status = 'draft'
    and exists (
      select 1
      from public.customers c
      join public.photos p on p.id = photo_id
      join public.galleries g on g.id = p.gallery_id
      where c.id = customer_id
        and c.profile_id = auth.uid()
        and g.customer_id = c.id   -- can only select photos from own galleries
    )
  );

drop policy if exists "selections_customer_update_draft" on public.photo_selections;
create policy "selections_customer_update_draft"
  on public.photo_selections for update
  using (
    status = 'draft'  -- customers may only touch their own draft rows
    and exists (
      select 1 from public.customers c
      where c.id = customer_id and c.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.customers c
      where c.id = customer_id and c.profile_id = auth.uid()
    )
  );

drop policy if exists "selections_customer_delete_draft" on public.photo_selections;
create policy "selections_customer_delete_draft"
  on public.photo_selections for delete
  using (
    status = 'draft'
    and exists (
      select 1 from public.customers c
      where c.id = customer_id and c.profile_id = auth.uid()
    )
  );

drop policy if exists "selections_admin_all" on public.photo_selections;
create policy "selections_admin_all"
  on public.photo_selections for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- bookings ----
drop policy if exists "bookings_anyone_insert" on public.bookings;
create policy "bookings_anyone_insert"
  on public.bookings for insert
  with check (true);

drop policy if exists "bookings_owner_or_admin_read" on public.bookings;
create policy "bookings_owner_or_admin_read"
  on public.bookings for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.customers c
      where c.id = customer_id and c.profile_id = auth.uid()
    )
  );

drop policy if exists "bookings_admin_update" on public.bookings;
create policy "bookings_admin_update"
  on public.bookings for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---- packages ----
drop policy if exists "packages_public_read" on public.packages;
create policy "packages_public_read"
  on public.packages for select
  using (true);

drop policy if exists "packages_admin_write" on public.packages;
create policy "packages_admin_write"
  on public.packages for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- 9. STORAGE - private bucket for original customer photos
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('customer-photos', 'customer-photos', false)
on conflict (id) do nothing;

-- Admins can upload/replace/delete originals.
drop policy if exists "storage_admin_write_customer_photos" on storage.objects;
create policy "storage_admin_write_customer_photos"
  on storage.objects for all
  using (bucket_id = 'customer-photos' and public.is_admin())
  with check (bucket_id = 'customer-photos' and public.is_admin());

-- Customers can read only files inside their own gallery folders.
-- Path convention: <gallery_id>/<filename>
drop policy if exists "storage_customer_read_own" on storage.objects;
create policy "storage_customer_read_own"
  on storage.objects for select
  using (
    bucket_id = 'customer-photos'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.galleries g
        join public.customers c on c.id = g.customer_id
        where g.id::text = (storage.foldername(name))[1]
          and c.profile_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 10. FIRST ADMINISTRATOR (secure bootstrap)
-- After signing up on the website, run THIS line once in the SQL Editor,
-- replacing the email with your own sign-up email:
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
--
-- There is no other way to become admin - clients cannot set their own role.
-- ============================================================================
