-- Additive THOMA staff access. Existing customer/admin tables and policies remain intact.
-- Run after supabase/schema.sql in the Supabase SQL Editor.

create table if not exists public.studio_staff_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  permissions text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  constraint studio_staff_access_known_permissions check (
    permissions <@ array[
      'bookings.read',
      'customers.read',
      'galleries.read',
      'selections.read',
      'payments.read'
    ]::text[]
  )
);

alter table public.studio_staff_access enable row level security;

drop policy if exists "studio_staff_access_owner_manage" on public.studio_staff_access;
create policy "studio_staff_access_owner_manage"
  on public.studio_staff_access for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "studio_staff_access_self_read" on public.studio_staff_access;
create policy "studio_staff_access_self_read"
  on public.studio_staff_access for select
  using (user_id = auth.uid());

grant select, insert, update, delete on public.studio_staff_access to authenticated;

create table if not exists public.thoma_conversations (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thoma_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.thoma_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 20000),
  created_at timestamptz not null default now()
);

create index if not exists thoma_messages_conversation_created_idx
  on public.thoma_messages (conversation_id, created_at);

alter table public.thoma_conversations enable row level security;
alter table public.thoma_messages enable row level security;

drop policy if exists "thoma_conversations_select_own" on public.thoma_conversations;
create policy "thoma_conversations_select_own"
  on public.thoma_conversations for select
  using (user_id = auth.uid());

drop policy if exists "thoma_messages_select_own" on public.thoma_messages;
create policy "thoma_messages_select_own"
  on public.thoma_messages for select
  using (user_id = auth.uid());

grant select on public.thoma_conversations, public.thoma_messages to authenticated;

create or replace function public.thoma_save_conversation(
  p_conversation_id uuid,
  conversation_title text,
  conversation_messages jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  message_entry jsonb;
  message_role text;
  message_content text;
  message_created_at timestamptz;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if conversation_title is null or char_length(conversation_title) > 80 then
    raise exception 'Invalid conversation title';
  end if;
  if conversation_messages is null or jsonb_typeof(conversation_messages) <> 'array' or jsonb_array_length(conversation_messages) > 80 then
    raise exception 'Invalid conversation messages';
  end if;

  insert into public.thoma_conversations (id, user_id, title, updated_at)
  values (p_conversation_id, current_user_id, conversation_title, now())
  on conflict (id) do update
    set title = excluded.title, updated_at = now()
    where public.thoma_conversations.user_id = current_user_id;

  if not found then
    raise exception 'Conversation not found';
  end if;

  delete from public.thoma_messages
  where thoma_messages.conversation_id = p_conversation_id
    and user_id = current_user_id;

  for message_entry in select value from jsonb_array_elements(conversation_messages)
  loop
    message_role := message_entry ->> 'role';
    message_content := message_entry ->> 'content';
    if message_role not in ('user', 'assistant') or message_content is null or char_length(message_content) > 20000 then
      raise exception 'Invalid message';
    end if;
    message_created_at := coalesce((message_entry ->> 'created_at')::timestamptz, now());

    insert into public.thoma_messages (conversation_id, user_id, role, content, created_at)
    values (p_conversation_id, current_user_id, message_role, message_content, message_created_at);
  end loop;
end;
$$;

create or replace function public.thoma_delete_conversation(p_conversation_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_conversation_id is null then
    delete from public.thoma_conversations where user_id = auth.uid();
  else
    delete from public.thoma_conversations
    where id = p_conversation_id and user_id = auth.uid();
  end if;
end;
$$;

revoke all on function public.thoma_save_conversation(uuid, text, jsonb) from public;
revoke all on function public.thoma_delete_conversation(uuid) from public;
grant execute on function public.thoma_save_conversation(uuid, text, jsonb) to authenticated;
grant execute on function public.thoma_delete_conversation(uuid) to authenticated;

create or replace function public.thoma_studio_lookup(
  lookup_type text,
  search_term text default null,
  target_date date default null
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, auth, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  owner_access boolean := public.is_admin();
  staff_permissions text[];
  safe_term text := trim(coalesce(search_term, ''));
  requested_date date := coalesce(target_date, (now() at time zone 'Asia/Colombo')::date);
  result jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select permissions into staff_permissions
  from public.studio_staff_access
  where user_id = current_user_id;

  if not owner_access and staff_permissions is null then
    raise exception 'Studio staff access required';
  end if;

  if lookup_type = 'todays_bookings' then
    if not owner_access and not coalesce(staff_permissions @> array['bookings.read']::text[], false) then
      raise exception 'Bookings permission required';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', b.name,
      'event_type', b.event_type,
      'event_date', b.event_date,
      'location', b.location,
      'booking_status', b.booking_status,
      'phone', case when owner_access or staff_permissions @> array['customers.read']::text[] then b.phone else null end,
      'payment_status', case when owner_access or staff_permissions @> array['payments.read']::text[] then b.payment_status else null end
    ) order by b.event_date), '[]'::jsonb)
    into result
    from public.bookings b
    where b.event_date = requested_date
      and b.booking_status <> 'cancelled';

  elsif lookup_type = 'pending_payments' then
    if not owner_access and not coalesce(staff_permissions @> array['payments.read']::text[], false) then
      raise exception 'Payments permission required';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', b.name,
      'event_type', b.event_type,
      'event_date', b.event_date,
      'payment_status', b.payment_status
    ) order by b.event_date), '[]'::jsonb)
    into result
    from public.bookings b
    where b.payment_status in ('unpaid', 'advance')
      and b.booking_status <> 'cancelled';

  elsif lookup_type = 'search_customers' then
    if not owner_access and not coalesce(staff_permissions @> array['customers.read']::text[], false) then
      raise exception 'Customer permission required';
    end if;
    if length(safe_term) < 2 then
      raise exception 'Enter at least two characters to search customers';
    end if;
    select coalesce(jsonb_agg(match_row), '[]'::jsonb)
    into result
    from (
      select jsonb_build_object(
        'customer_code', c.customer_code,
        'name', p.full_name,
        'event_type', c.event_type,
        'status', c.status,
        'phone', p.phone
      ) as match_row
      from public.customers c
      join public.profiles p on p.id = c.profile_id
      where p.full_name ilike '%' || safe_term || '%'
         or p.phone ilike '%' || safe_term || '%'
         or c.customer_code ilike '%' || safe_term || '%'
      order by c.created_at desc
      limit 10
    ) matches;

  elsif lookup_type = 'gallery_status' then
    if not owner_access and not coalesce(staff_permissions @> array['galleries.read']::text[], false) then
      raise exception 'Gallery permission required';
    end if;
    select coalesce(jsonb_agg(match_row), '[]'::jsonb)
    into result
    from (
      select jsonb_build_object(
        'gallery', g.title,
        'customer_code', c.customer_code,
        'customer_name', p.full_name,
        'created_at', g.created_at
      ) as match_row
      from public.galleries g
      join public.customers c on c.id = g.customer_id
      join public.profiles p on p.id = c.profile_id
      where safe_term = ''
         or p.full_name ilike '%' || safe_term || '%'
         or c.customer_code ilike '%' || safe_term || '%'
         or g.title ilike '%' || safe_term || '%'
      order by g.created_at desc
      limit 20
    ) matches;

  elsif lookup_type = 'selection_status' then
    if not owner_access and not coalesce(staff_permissions @> array['selections.read']::text[], false) then
      raise exception 'Photo selection permission required';
    end if;
    select coalesce(jsonb_agg(match_row), '[]'::jsonb)
    into result
    from (
      select jsonb_build_object(
        'customer_code', c.customer_code,
        'customer_name', p.full_name,
        'status', s.status,
        'photo_count', count(*)
      ) as match_row, max(s.created_at) as last_updated
      from public.photo_selections s
      join public.customers c on c.id = s.customer_id
      join public.profiles p on p.id = c.profile_id
      where safe_term = ''
         or p.full_name ilike '%' || safe_term || '%'
         or c.customer_code ilike '%' || safe_term || '%'
      group by c.customer_code, p.full_name, s.status
      order by max(s.created_at) desc
      limit 20
    ) matches;

  else
    raise exception 'Unsupported studio lookup';
  end if;

  return result;
end;
$$;

revoke all on function public.thoma_studio_lookup(text, text, date) from public;
grant execute on function public.thoma_studio_lookup(text, text, date) to authenticated;