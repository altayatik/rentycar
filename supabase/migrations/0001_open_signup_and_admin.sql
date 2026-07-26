-- =====================================================================
-- RentyCar — open signup + admin control panel
--
-- Run this ONCE in the Supabase SQL editor (or `supabase db push`).
-- It is idempotent: re-running it is safe.
--
-- What changes:
--   1. Signup no longer requires an invite code. New accounts land in
--      'pending' and cannot submit reports until an admin approves them.
--      A valid invite code auto-approves instantly.
--   2. Optional email at signup, so password reset actually works.
--   3. Users can finally soft-delete and rename their own stuff
--      (both were impossible under the old policies).
--   4. Admin RPCs for users, reports, invites, and site stats.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profile columns: approval state + login kind
-- ---------------------------------------------------------------------

alter table public.profiles
  add column if not exists status text not null default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_status_check' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('pending', 'approved', 'suspended'));
  end if;
end $$;

alter table public.profiles add column if not exists approved_at timestamptz;
alter table public.profiles add column if not exists approved_by uuid references auth.users(id) on delete set null;
-- True when this account authenticates with a real email instead of the
-- synthetic <username>@rentycar.local address. Needed so the login screen
-- knows to ask for an email WITHOUT ever disclosing the address itself.
alter table public.profiles add column if not exists uses_email_login boolean not null default false;
alter table public.profiles add column if not exists suspended_reason text;

-- Everyone who already had an account keeps working. Only signups from
-- this point forward go through the approval queue.
update public.profiles
set status = 'approved',
    approved_at = coalesce(approved_at, now())
where status = 'pending';

create index if not exists profiles_status_idx on public.profiles(status);

-- ---------------------------------------------------------------------
-- 2. Invite codes gain labels + expiry (still optional at signup)
-- ---------------------------------------------------------------------

alter table public.invite_codes add column if not exists label text;
alter table public.invite_codes add column if not exists expires_at timestamptz;
alter table public.invite_codes add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.invite_codes add column if not exists revoked_at timestamptz;

-- ---------------------------------------------------------------------
-- 3. Helper predicates
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'approved'
  );
$$;

-- Gate for anything that writes real content.
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'approved'
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_approved() to authenticated;

-- ---------------------------------------------------------------------
-- 4. Signup: invite optional, approval queue, optional email
-- ---------------------------------------------------------------------

create or replace function public.validate_invite_signup(target_username text, target_invite_code text)
returns table (ok boolean, message text)
language sql
security definer
set search_path = public
as $$
  with input as (
    select
      lower(trim(coalesce(target_username, ''))) as username,
      upper(trim(coalesce(target_invite_code, ''))) as invite_code
  )
  select
    case
      when input.username !~ '^[a-z0-9_-]{3,32}$' then false
      when exists (select 1 from public.profiles p where p.username = input.username) then false
      -- Blank invite code is now allowed; it just means "join the queue".
      when input.invite_code <> '' and not exists (
        select 1 from public.invite_codes ic
        where ic.code = input.invite_code
          and ic.used_at is null
          and ic.revoked_at is null
          and (ic.expires_at is null or ic.expires_at > now())
      ) then false
      else true
    end as ok,
    case
      when input.username !~ '^[a-z0-9_-]{3,32}$' then 'Username must be 3-32 characters and use only letters, numbers, underscores, or dashes.'
      when exists (select 1 from public.profiles p where p.username = input.username) then 'Username is already taken.'
      when input.invite_code <> '' and not exists (
        select 1 from public.invite_codes ic
        where ic.code = input.invite_code
          and ic.used_at is null
          and ic.revoked_at is null
          and (ic.expires_at is null or ic.expires_at > now())
      ) then 'Invite code is invalid, expired, or already used.'
      when input.invite_code = '' then 'Ready. Your account will need admin approval before you can post.'
      else 'Ready. Your invite code grants instant access.'
    end as message
  from input;
$$;

grant execute on function public.validate_invite_signup(text, text) to anon, authenticated;

create or replace function public.handle_invited_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_code text := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
  requested_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_nickname text := trim(coalesce(new.raw_user_meta_data ->> 'nickname', ''));
  wants_email_login boolean := coalesce((new.raw_user_meta_data ->> 'uses_email_login')::boolean, false);
  invite_row public.invite_codes%rowtype;
  new_status text := 'pending';
begin
  if requested_username !~ '^[a-z0-9_-]{3,32}$' then
    raise exception 'Username must be 3-32 characters and use only letters, numbers, underscores, or dashes.';
  end if;

  if length(requested_nickname) < 2 or length(requested_nickname) > 40 then
    raise exception 'Nickname must be 2-40 characters.';
  end if;

  -- An invite code is optional now. If one is supplied it must be valid,
  -- and it buys instant access instead of sitting in the queue.
  if invite_code <> '' then
    select * into invite_row
    from public.invite_codes
    where code = invite_code
      and used_at is null
      and revoked_at is null
      and (expires_at is null or expires_at > now())
    for update;

    if not found then
      raise exception 'Invite code is invalid, expired, or already used.';
    end if;

    new_status := 'approved';
  end if;

  insert into public.profiles (id, username, nickname, role, status, approved_at, uses_email_login)
  values (
    new.id,
    requested_username,
    requested_nickname,
    'reporter',
    new_status,
    case when new_status = 'approved' then now() else null end,
    wants_email_login
  );

  if invite_row.id is not null then
    update public.invite_codes
    set used_at = now(), used_by = new.id
    where id = invite_row.id;
  end if;

  return new;
exception
  when unique_violation then
    raise exception 'Username is already taken.';
end;
$$;

drop trigger if exists rentycar_invited_signup on auth.users;
create trigger rentycar_invited_signup
after insert on auth.users
for each row
execute function public.handle_invited_signup();

-- ---------------------------------------------------------------------
-- 5. Login helper — how does this username authenticate?
--
-- Returns a KIND only, never an email address, so this cannot be used to
-- harvest addresses by walking the (publicly visible) username list.
-- ---------------------------------------------------------------------

create or replace function public.login_kind_for_username(target_username text)
returns table (kind text)
language sql
security definer
set search_path = public
as $$
  select case
    when not exists (
      select 1 from public.profiles p
      where p.username = lower(trim(coalesce(target_username, '')))
    ) then 'unknown'
    when exists (
      select 1 from public.profiles p
      where p.username = lower(trim(coalesce(target_username, '')))
        and p.uses_email_login
    ) then 'email'
    else 'pseudo'
  end as kind;
$$;

grant execute on function public.login_kind_for_username(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Policy fixes
-- ---------------------------------------------------------------------

-- Users could never edit their own nickname: only admins could update
-- profiles. Let people manage their own row (minus role/status, guarded
-- by the trigger below).
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Stop a user from promoting themselves to admin or self-approving.
create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is NULL for the SQL editor, migrations, service-role keys,
  -- and SECURITY DEFINER maintenance. Those contexts are already trusted,
  -- and RLS governs everything that arrives via PostgREST — so the guard
  -- only needs to police genuine signed-in end users.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'You cannot change your own role.';
  end if;
  if new.status is distinct from old.status then
    raise exception 'You cannot change your own account status.';
  end if;
  if new.username is distinct from old.username then
    raise exception 'Usernames cannot be changed.';
  end if;

  return new;
end;
$$;

drop trigger if exists rentycar_guard_profile_update on public.profiles;
create trigger rentycar_guard_profile_update
before update on public.profiles
for each row
execute function public.guard_profile_self_update();

-- Reports: only approved accounts may post.
-- Both the old AND the new policy name are dropped, so re-running this file
-- is safe. Dropping only the old name meant a second run failed with
-- "policy ... already exists".
drop policy if exists "Authenticated users can insert their reports" on public.vehicle_reports;
drop policy if exists "Approved users can insert their reports" on public.vehicle_reports;
create policy "Approved users can insert their reports"
on public.vehicle_reports
for insert
to authenticated
with check (reporter_id = auth.uid() and deleted_at is null and public.is_approved());

-- BUG FIX: the old update policy had `deleted_at is null` in its WITH
-- CHECK, which made it impossible for a user to ever set deleted_at.
-- Soft-deleting your own report silently failed.
drop policy if exists "Authenticated users can update their own active reports" on public.vehicle_reports;
drop policy if exists "Users can update their own reports" on public.vehicle_reports;
create policy "Users can update their own reports"
on public.vehicle_reports
for update
to authenticated
using (reporter_id = auth.uid())
with check (reporter_id = auth.uid());

-- And allow a genuine hard delete of your own report.
drop policy if exists "Users can delete their own reports" on public.vehicle_reports;
create policy "Users can delete their own reports"
on public.vehicle_reports
for delete
to authenticated
using (reporter_id = auth.uid());

grant delete on public.vehicle_reports to authenticated;

-- Reference data was insert/update-able by ANY authenticated user, not
-- just admins. The grants leaked past the policies. Lock it down.
revoke insert, update on public.airports from authenticated;
revoke insert, update on public.rental_companies from authenticated;
revoke insert, update on public.car_makes from authenticated;
revoke insert, update on public.car_models from authenticated;

grant insert, update, delete on public.airports to authenticated;
grant insert, update, delete on public.rental_companies to authenticated;
grant insert, update, delete on public.car_makes to authenticated;
grant insert, update, delete on public.car_models to authenticated;
-- (RLS still restricts every one of these to admins via the existing
--  "Admins can manage ..." policies; the grants just stop PostgREST from
--  rejecting the request before RLS is consulted.)

-- Invite codes: admins get direct read access for the panel.
drop policy if exists "Admins can manage invite codes" on public.invite_codes;
create policy "Admins can manage invite codes"
on public.invite_codes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.invite_codes to authenticated;

-- ---------------------------------------------------------------------
-- 7. Admin RPCs
-- ---------------------------------------------------------------------

drop function if exists public.admin_list_users();
create or replace function public.admin_list_users()
returns table (
  id uuid,
  username text,
  nickname text,
  role text,
  status text,
  uses_email_login boolean,
  has_email boolean,
  report_count int,
  last_report_at timestamptz,
  created_at timestamptz,
  approved_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.nickname,
    p.role,
    p.status,
    p.uses_email_login,
    (u.email is not null and u.email not like '%@rentycar.local') as has_email,
    count(vr.id) filter (where vr.deleted_at is null)::int as report_count,
    max(vr.observed_at) filter (where vr.deleted_at is null) as last_report_at,
    p.created_at,
    p.approved_at,
    u.last_sign_in_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join public.vehicle_reports vr on vr.reporter_id = p.id
  where public.is_admin()
  group by p.id, p.username, p.nickname, p.role, p.status,
           p.uses_email_login, u.email, p.created_at, p.approved_at, u.last_sign_in_at
  order by
    case p.status when 'pending' then 0 when 'approved' then 1 else 2 end,
    p.created_at desc;
$$;

drop function if exists public.admin_set_user_status(uuid, text, text);
create or replace function public.admin_set_user_status(
  target_user_id uuid,
  new_status text,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.';
  end if;
  if new_status not in ('pending', 'approved', 'suspended') then
    raise exception 'Invalid status.';
  end if;
  if target_user_id = auth.uid() and new_status <> 'approved' then
    raise exception 'You cannot suspend your own account.';
  end if;

  update public.profiles
  set status = new_status,
      approved_at = case when new_status = 'approved' then coalesce(approved_at, now()) else approved_at end,
      approved_by = case when new_status = 'approved' then auth.uid() else approved_by end,
      suspended_reason = case when new_status = 'suspended' then reason else null end
  where id = target_user_id;
end;
$$;

drop function if exists public.admin_set_user_role(uuid, text);
create or replace function public.admin_set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.';
  end if;
  if new_role not in ('admin', 'reporter') then
    raise exception 'Invalid role.';
  end if;
  if target_user_id = auth.uid() and new_role <> 'admin' then
    raise exception 'You cannot remove your own admin access.';
  end if;

  update public.profiles set role = new_role where id = target_user_id;
end;
$$;

drop function if exists public.admin_delete_user(uuid);
create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'You cannot delete your own account.';
  end if;

  -- Reports survive with reporter_id set to null (FK is ON DELETE SET
  -- NULL), so public stats do not suddenly lose history.
  delete from auth.users where id = target_user_id;
end;
$$;

drop function if exists public.admin_stats();
create or replace function public.admin_stats()
returns table (
  total_users int,
  pending_users int,
  suspended_users int,
  admin_users int,
  total_reports int,
  deleted_reports int,
  reports_last_7d int,
  reports_last_30d int,
  signups_last_7d int,
  active_airports int,
  active_companies int,
  unused_invites int
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.profiles)::int,
    (select count(*) from public.profiles where status = 'pending')::int,
    (select count(*) from public.profiles where status = 'suspended')::int,
    (select count(*) from public.profiles where role = 'admin')::int,
    (select count(*) from public.vehicle_reports where deleted_at is null)::int,
    (select count(*) from public.vehicle_reports where deleted_at is not null)::int,
    (select count(*) from public.vehicle_reports where deleted_at is null and created_at > now() - interval '7 days')::int,
    (select count(*) from public.vehicle_reports where deleted_at is null and created_at > now() - interval '30 days')::int,
    (select count(*) from public.profiles where created_at > now() - interval '7 days')::int,
    (select count(*) from public.airports where is_active)::int,
    (select count(*) from public.rental_companies where is_active)::int,
    (select count(*) from public.invite_codes where used_at is null and revoked_at is null)::int
  where public.is_admin();
$$;

-- Daily report counts for the admin sparkline.
drop function if exists public.admin_activity(int);
create or replace function public.admin_activity(days int default 30)
returns table (day date, reports int, signups int)
language sql
security definer
set search_path = public
as $$
  with span as (
    select generate_series(
      (current_date - (greatest(least(days, 365), 1) - 1) * interval '1 day')::date,
      current_date,
      interval '1 day'
    )::date as day
  )
  select
    span.day,
    (select count(*) from public.vehicle_reports vr
      where vr.deleted_at is null and vr.created_at::date = span.day)::int,
    (select count(*) from public.profiles p
      where p.created_at::date = span.day)::int
  from span
  where public.is_admin()
  order by span.day;
$$;

drop function if exists public.admin_create_invites(int, text, timestamptz);
create or replace function public.admin_create_invites(
  how_many int default 1,
  code_label text default null,
  expires timestamptz default null
)
returns table (code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  generated text;
begin
  if not public.is_admin() then
    raise exception 'Admins only.';
  end if;
  if how_many < 1 or how_many > 50 then
    raise exception 'Generate between 1 and 50 codes at a time.';
  end if;

  for i in 1..how_many loop
    loop
      -- Ambiguity-free alphabet: no O/0, no I/1.
      select 'RC-' || string_agg(
               substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                      floor(random() * 32 + 1)::int, 1), '')
        into generated
        from generate_series(1, 6);

      exit when not exists (select 1 from public.invite_codes ic where ic.code = generated);
    end loop;

    insert into public.invite_codes (code, label, expires_at, created_by)
    values (generated, code_label, expires, auth.uid());

    code := generated;
    return next;
  end loop;
end;
$$;

drop function if exists public.admin_list_invites();
create or replace function public.admin_list_invites()
returns table (
  id uuid,
  code text,
  label text,
  created_at timestamptz,
  expires_at timestamptz,
  used_at timestamptz,
  revoked_at timestamptz,
  used_by_username text
)
language sql
security definer
set search_path = public
as $$
  select
    ic.id, ic.code, ic.label, ic.created_at, ic.expires_at,
    ic.used_at, ic.revoked_at, p.username
  from public.invite_codes ic
  left join public.profiles p on p.id = ic.used_by
  where public.is_admin()
  order by ic.created_at desc;
$$;

drop function if exists public.admin_revoke_invite(uuid);
create or replace function public.admin_revoke_invite(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.';
  end if;
  update public.invite_codes
  set revoked_at = now()
  where id = target_invite_id and used_at is null;
end;
$$;

-- Every report, with names resolved, for the moderation table.
drop function if exists public.admin_list_reports(int, int, text, boolean);
create or replace function public.admin_list_reports(
  max_rows int default 200,
  skip_rows int default 0,
  search text default null,
  include_deleted boolean default false
)
returns table (
  id uuid,
  reporter_id uuid,
  reporter_username text,
  airport_code text,
  airport_name text,
  company_name text,
  make_name text,
  model_name text,
  year int,
  mileage int,
  exterior_condition text,
  interior_condition text,
  observed_at timestamptz,
  created_at timestamptz,
  deleted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    vr.id, vr.reporter_id, p.username,
    a.iata_code, a.name, rc.name, cm.name, cmo.name,
    vr.year, vr.mileage, vr.exterior_condition, vr.interior_condition,
    vr.observed_at, vr.created_at, vr.deleted_at
  from public.vehicle_reports vr
  left join public.profiles p on p.id = vr.reporter_id
  left join public.airports a on a.id = vr.airport_id
  left join public.rental_companies rc on rc.id = vr.rental_company_id
  left join public.car_makes cm on cm.id = vr.make_id
  left join public.car_models cmo on cmo.id = vr.model_id
  where public.is_admin()
    and (include_deleted or vr.deleted_at is null)
    and (
      search is null or trim(search) = ''
      or p.username ilike '%' || search || '%'
      or a.iata_code ilike '%' || search || '%'
      or a.name ilike '%' || search || '%'
      or rc.name ilike '%' || search || '%'
      or cm.name ilike '%' || search || '%'
      or cmo.name ilike '%' || search || '%'
    )
  order by vr.created_at desc
  limit greatest(least(max_rows, 500), 1)
  offset greatest(skip_rows, 0);
$$;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_user_status(uuid, text, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_activity(int) to authenticated;
grant execute on function public.admin_create_invites(int, text, timestamptz) to authenticated;
grant execute on function public.admin_list_invites() to authenticated;
grant execute on function public.admin_revoke_invite(uuid) to authenticated;
grant execute on function public.admin_list_reports(int, int, text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Make sure at least one admin exists.
--    Change 'master' if your admin account uses a different username.
-- ---------------------------------------------------------------------

update public.profiles
set role = 'admin', status = 'approved', approved_at = coalesce(approved_at, now())
where username = 'master';

notify pgrst, 'reload schema';
