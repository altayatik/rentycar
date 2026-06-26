create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null default 'reporter' check (role in ('admin', 'reporter')),
  created_at timestamptz default now()
);

alter table public.profiles add column if not exists nickname text;

create table if not exists public.airports (
  id uuid primary key default gen_random_uuid(),
  iata_code text unique not null,
  name text not null,
  city text not null,
  state text not null,
  country text not null default 'US' check (country in ('US', 'CA')),
  region_code text,
  region_name text,
  latitude numeric not null,
  longitude numeric not null,
  is_commercial boolean not null default true,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.airports add column if not exists country text not null default 'US';
alter table public.airports add column if not exists region_code text;
alter table public.airports add column if not exists region_name text;
alter table public.airports add column if not exists is_commercial boolean not null default true;
update public.airports
set
  region_code = coalesce(region_code, state),
  region_name = coalesce(region_name, state)
where region_code is null or region_name is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'airports_country_check'
      and conrelid = 'public.airports'::regclass
  ) then
    alter table public.airports
    add constraint airports_country_check check (country in ('US', 'CA'));
  end if;
end $$;

create table if not exists public.rental_companies (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  type text not null default 'traditional_rental' check (type in ('traditional_rental', 'car_sharing', 'peer_to_peer')),
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.rental_companies add column if not exists type text not null default 'traditional_rental';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rental_companies_type_check'
      and conrelid = 'public.rental_companies'::regclass
  ) then
    alter table public.rental_companies
    add constraint rental_companies_type_check
    check (type in ('traditional_rental', 'car_sharing', 'peer_to_peer'));
  end if;
end $$;

create table if not exists public.car_makes (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.car_models (
  id uuid primary key default gen_random_uuid(),
  make_id uuid references public.car_makes(id) on delete cascade,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  constraint car_models_make_name_unique unique (make_id, name)
);

create table if not exists public.vehicle_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  airport_id uuid references public.airports(id) not null,
  rental_company_id uuid references public.rental_companies(id) not null,
  make_id uuid references public.car_makes(id) not null,
  model_id uuid references public.car_models(id) not null,
  year int check (year >= 1990 and year <= 2100),
  trim text,
  mileage int check (mileage >= 0),
  exterior_condition text not null check (exterior_condition in ('excellent', 'good', 'fair', 'poor')),
  interior_condition text not null check (interior_condition in ('excellent', 'good', 'fair', 'poor')),
  fuel_or_battery_level text,
  notes text,
  photo_url text,
  observed_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- Added for: ADAS option boxes, fuel type/octane/EV charging speed, tire condition,
-- optional license plate + state, and a 0-100 fuel/battery level slider.
alter table public.vehicle_reports add column if not exists lane_centering boolean not null default false;
alter table public.vehicle_reports add column if not exists lane_departure_assist boolean not null default false;
alter table public.vehicle_reports add column if not exists adaptive_cruise_control boolean not null default false;
alter table public.vehicle_reports add column if not exists early_collision_prevention boolean not null default false;
alter table public.vehicle_reports add column if not exists fuel_type text;
alter table public.vehicle_reports add column if not exists fuel_octane text;
alter table public.vehicle_reports add column if not exists ev_charging_speed text;
alter table public.vehicle_reports add column if not exists fuel_level_percent int;
alter table public.vehicle_reports add column if not exists tire_condition text;
alter table public.vehicle_reports add column if not exists drivetrain text;
alter table public.vehicle_reports add column if not exists license_plate text;
alter table public.vehicle_reports add column if not exists license_plate_state text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vehicle_reports_fuel_type_check' and conrelid = 'public.vehicle_reports'::regclass
  ) then
    alter table public.vehicle_reports
    add constraint vehicle_reports_fuel_type_check
    check (fuel_type is null or fuel_type in ('gasoline', 'phev', 'hybrid', 'bev', 'hydrogen', 'diesel'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'vehicle_reports_fuel_octane_check' and conrelid = 'public.vehicle_reports'::regclass
  ) then
    alter table public.vehicle_reports
    add constraint vehicle_reports_fuel_octane_check
    check (fuel_octane is null or fuel_octane in ('regular', 'midgrade', 'premium'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'vehicle_reports_ev_charging_speed_check' and conrelid = 'public.vehicle_reports'::regclass
  ) then
    alter table public.vehicle_reports
    add constraint vehicle_reports_ev_charging_speed_check
    check (ev_charging_speed is null or ev_charging_speed in ('level_2', 'dcfc_150', 'dcfc_250', 'dcfc_350'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'vehicle_reports_fuel_level_percent_check' and conrelid = 'public.vehicle_reports'::regclass
  ) then
    alter table public.vehicle_reports
    add constraint vehicle_reports_fuel_level_percent_check
    check (fuel_level_percent is null or (fuel_level_percent >= 0 and fuel_level_percent <= 100));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'vehicle_reports_tire_condition_check' and conrelid = 'public.vehicle_reports'::regclass
  ) then
    alter table public.vehicle_reports
    add constraint vehicle_reports_tire_condition_check
    check (tire_condition is null or tire_condition in ('brand_new', 'decent', 'almost_bald'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'vehicle_reports_drivetrain_check' and conrelid = 'public.vehicle_reports'::regclass
  ) then
    alter table public.vehicle_reports
    add constraint vehicle_reports_drivetrain_check
    check (drivetrain is null or drivetrain in ('fwd', 'rwd', 'awd', '4wd'));
  end if;
end $$;

create index if not exists vehicle_reports_airport_id_idx on public.vehicle_reports(airport_id);
create index if not exists vehicle_reports_rental_company_id_idx on public.vehicle_reports(rental_company_id);
create index if not exists vehicle_reports_make_id_idx on public.vehicle_reports(make_id);
create index if not exists vehicle_reports_model_id_idx on public.vehicle_reports(model_id);
create index if not exists vehicle_reports_observed_at_idx on public.vehicle_reports(observed_at);
create index if not exists vehicle_reports_deleted_at_idx on public.vehicle_reports(deleted_at);
create index if not exists vehicle_reports_license_plate_idx on public.vehicle_reports(upper(license_plate));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_vehicle_reports_updated_at on public.vehicle_reports;
create trigger set_vehicle_reports_updated_at
before update on public.vehicle_reports
for each row
execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.airports enable row level security;
alter table public.rental_companies enable row level security;
alter table public.car_makes enable row level security;
alter table public.car_models enable row level security;
alter table public.vehicle_reports enable row level security;

drop policy if exists "Profiles are readable by owner or admin" on public.profiles;
create policy "Profiles are readable by owner or admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Active airports are public" on public.airports;
create policy "Active airports are public"
on public.airports
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage airports" on public.airports;
create policy "Admins can manage airports"
on public.airports
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Active rental companies are public" on public.rental_companies;
create policy "Active rental companies are public"
on public.rental_companies
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage rental companies" on public.rental_companies;
create policy "Admins can manage rental companies"
on public.rental_companies
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Active car makes are public" on public.car_makes;
create policy "Active car makes are public"
on public.car_makes
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage car makes" on public.car_makes;
create policy "Admins can manage car makes"
on public.car_makes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Active car models are public" on public.car_models;
create policy "Active car models are public"
on public.car_models
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage car models" on public.car_models;
create policy "Admins can manage car models"
on public.car_models
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can insert their reports" on public.vehicle_reports;
create policy "Authenticated users can insert their reports"
on public.vehicle_reports
for insert
to authenticated
with check (reporter_id = auth.uid() and deleted_at is null);

drop policy if exists "Authenticated users can read their own reports" on public.vehicle_reports;
create policy "Authenticated users can read their own reports"
on public.vehicle_reports
for select
to authenticated
using (reporter_id = auth.uid());

drop policy if exists "Authenticated users can update their own active reports" on public.vehicle_reports;
create policy "Authenticated users can update their own active reports"
on public.vehicle_reports
for update
to authenticated
using (reporter_id = auth.uid() and deleted_at is null)
with check (reporter_id = auth.uid() and deleted_at is null);

drop policy if exists "Admins can manage all reports" on public.vehicle_reports;
create policy "Admins can manage all reports"
on public.vehicle_reports
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop view if exists public.public_recent_reports;
drop view if exists public.public_rental_company_stats;
drop view if exists public.public_region_stats;
drop view if exists public.public_airport_stats;

create view public.public_airport_stats as
select
  a.id as airport_id,
  a.iata_code,
  a.name as airport_name,
  a.city,
  a.state,
  a.country,
  a.region_code,
  a.region_name,
  a.latitude,
  a.longitude,
  count(vr.id)::int as report_count,
  count(distinct vr.rental_company_id)::int as rental_company_count,
  round(avg(vr.mileage))::int as average_mileage,
  max(vr.observed_at) as latest_report_date
from public.airports a
left join public.vehicle_reports vr
  on vr.airport_id = a.id
  and vr.deleted_at is null
where a.is_active = true
group by
  a.id,
  a.iata_code,
  a.name,
  a.city,
  a.state,
  a.country,
  a.region_code,
  a.region_name,
  a.latitude,
  a.longitude;

create view public.public_recent_reports as
select
  a.iata_code as airport_code,
  a.name as airport_name,
  a.city as airport_city,
  a.country as airport_country,
  a.region_code as airport_region_code,
  a.region_name as airport_region_name,
  rc.name as rental_company_name,
  rc.type as rental_company_type,
  cm.name as make,
  cmo.name as model,
  vr.year,
  vr.trim,
  vr.mileage,
  vr.exterior_condition,
  vr.interior_condition,
  vr.tire_condition,
  vr.drivetrain,
  vr.fuel_type,
  vr.fuel_octane,
  vr.ev_charging_speed,
  vr.fuel_level_percent,
  vr.lane_centering,
  vr.lane_departure_assist,
  vr.adaptive_cruise_control,
  vr.early_collision_prevention,
  vr.license_plate,
  vr.license_plate_state,
  vr.observed_at as observed_date
from public.vehicle_reports vr
join public.airports a on a.id = vr.airport_id
join public.rental_companies rc on rc.id = vr.rental_company_id
join public.car_makes cm on cm.id = vr.make_id
join public.car_models cmo on cmo.id = vr.model_id
where vr.deleted_at is null
  and a.is_active = true
  and rc.is_active = true
  and cm.is_active = true
  and cmo.is_active = true
order by vr.observed_at desc, vr.created_at desc
limit 100;

create view public.public_region_stats as
select
  a.country,
  coalesce(a.region_code, a.state) as region_code,
  coalesce(a.region_name, a.state) as region_name,
  count(distinct a.id)::int as airport_count,
  count(vr.id)::int as report_count,
  count(distinct vr.rental_company_id)::int as rental_company_count,
  round(avg(vr.mileage))::int as average_mileage,
  max(vr.observed_at) as latest_report_at
from public.airports a
left join public.vehicle_reports vr
  on vr.airport_id = a.id
  and vr.deleted_at is null
where a.is_active = true
  and a.is_commercial = true
group by a.country, coalesce(a.region_code, a.state), coalesce(a.region_name, a.state);

create view public.public_rental_company_stats as
select
  rc.name as rental_company_name,
  rc.type as rental_company_type,
  count(vr.id)::int as report_count,
  count(distinct vr.airport_id)::int as airport_count,
  count(distinct a.country || '-' || coalesce(a.region_code, a.state))::int as region_count,
  round(avg(vr.mileage))::int as average_mileage,
  max(vr.observed_at) as latest_report_at
from public.rental_companies rc
left join public.vehicle_reports vr
  on vr.rental_company_id = rc.id
  and vr.deleted_at is null
left join public.airports a on a.id = vr.airport_id
where rc.is_active = true
group by rc.name, rc.type;

grant usage on schema public to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant select on public.public_airport_stats to anon, authenticated;
grant select on public.public_recent_reports to anon, authenticated;
grant select on public.public_region_stats to anon, authenticated;
grant select on public.public_rental_company_stats to anon, authenticated;
grant select on public.airports to anon, authenticated;
grant select on public.rental_companies to anon, authenticated;
grant select on public.car_makes to anon, authenticated;
grant select on public.car_models to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.vehicle_reports to authenticated;
grant insert, update on public.airports to authenticated;
grant insert, update on public.rental_companies to authenticated;
grant insert, update on public.car_makes to authenticated;
grant insert, update on public.car_models to authenticated;

-- =====================================================================
-- Friends + stamps (mirrors RentyCar/Supabase/friends_and_stamps.sql
-- and SupabaseSQL/run_this_friend_since_label_update.sql from the app)
-- =====================================================================

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

drop policy if exists "Friendships are visible to participants" on public.friendships;
create policy "Friendships are visible to participants"
on public.friendships
for select
to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "Users can create their own friend requests" on public.friendships;
create policy "Users can create their own friend requests"
on public.friendships
for insert
to authenticated
with check (requester_id = auth.uid() and status = 'pending');

drop policy if exists "Participants can update their friendships" on public.friendships;
create policy "Participants can update their friendships"
on public.friendships
for update
to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid())
with check (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists "Participants can remove friendships" on public.friendships;
create policy "Participants can remove friendships"
on public.friendships
for delete
to authenticated
using (requester_id = auth.uid() or addressee_id = auth.uid());

drop function if exists public.send_friend_request(text);

create or replace function public.send_friend_request(target_username text)
returns table (friendship_id uuid)
language sql
security definer
set search_path = public
as $$
  with my_claims as (
    select
      auth.uid() as user_id,
      lower(trim(coalesce(auth.jwt() -> 'user_metadata' ->> 'username', ''))) as username_claim,
      trim(coalesce(auth.jwt() -> 'user_metadata' ->> 'nickname', '')) as nickname_claim
  ),
  repaired_profile as (
    insert into public.profiles (id, username, nickname, role)
    select
      user_id,
      case
        when username_claim ~ '^[a-z0-9_-]{3,32}$'
          and not exists (select 1 from public.profiles p where p.username = username_claim and p.id <> user_id)
          then username_claim
        else 'user_' || left(replace(user_id::text, '-', ''), 24)
      end,
      nullif(nickname_claim, ''),
      'reporter'
    from my_claims
    where user_id is not null
    on conflict (id) do update
    set nickname = coalesce(public.profiles.nickname, excluded.nickname)
    returning id
  ),
  me as (
    select id from repaired_profile
    union
    select id from public.profiles where id = auth.uid()
    limit 1
  ),
  target as (
    select p.id
    from public.profiles p
    where p.username = lower(trim(target_username))
      and p.id <> auth.uid()
    limit 1
  ),
  existing as (
    select f.id
    from public.friendships f
    join me m on true
    join target t on
      (f.requester_id = m.id and f.addressee_id = t.id)
      or (f.requester_id = t.id and f.addressee_id = m.id)
    limit 1
  ),
  inserted as (
    insert into public.friendships (requester_id, addressee_id, status)
    select me.id, target.id, 'pending'
    from me
    cross join target
    where auth.uid() is not null
      and not exists (select 1 from existing)
    returning id
  )
  select id as friendship_id
  from inserted;
$$;

drop function if exists public.respond_friend_request(uuid, boolean);

create or replace function public.respond_friend_request(target_friendship_id uuid, accept boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.friendships
  set status = 'accepted'
  where accept is true
    and id = target_friendship_id
    and addressee_id = auth.uid()
    and status = 'pending';

  delete from public.friendships
  where accept is false
    and id = target_friendship_id
    and addressee_id = auth.uid()
    and status = 'pending';
$$;

drop function if exists public.remove_friendship(uuid);

create or replace function public.remove_friendship(target_friendship_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.friendships
  where id = target_friendship_id
    and (requester_id = auth.uid() or addressee_id = auth.uid());
$$;

drop function if exists public.list_friends_with_stats();
drop function if exists public.list_friends_with_stats(text);

create or replace function public.list_friends_with_stats(cache_bust text default 'web')
returns table (
  friendship_id uuid,
  profile_id uuid,
  username text,
  nickname text,
  status text,
  direction text,
  stamp_count int,
  top_make text,
  top_company text,
  top_airport text,
  latest_observed_at timestamptz,
  friendship_created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with visible_friendships as (
    select
      f.id as friendship_id,
      f.status,
      f.created_at as friendship_created_at,
      case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id,
      case
        when f.status = 'pending' and f.addressee_id = auth.uid() then 'incoming'
        when f.status = 'pending' and f.requester_id = auth.uid() then 'outgoing'
        else 'accepted'
      end as direction
    from public.friendships f
    where f.requester_id = auth.uid()
       or f.addressee_id = auth.uid()
  ),
  friend_reports as (
    select
      vf.friendship_id,
      vf.friend_id,
      vr.id,
      vr.observed_at,
      cm.name as make_name,
      rc.name as company_name,
      a.iata_code as airport_code
    from visible_friendships vf
    left join public.vehicle_reports vr
      on vf.status = 'accepted'
     and vr.reporter_id = vf.friend_id
     and vr.deleted_at is null
    left join public.car_makes cm on cm.id = vr.make_id
    left join public.rental_companies rc on rc.id = vr.rental_company_id
    left join public.airports a on a.id = vr.airport_id
  )
  select
    vf.friendship_id,
    p.id as profile_id,
    p.username,
    p.nickname,
    vf.status,
    vf.direction,
    count(fr.id)::int as stamp_count,
    (
      select make_name
      from friend_reports r
      where r.friendship_id = vf.friendship_id and make_name is not null
      group by make_name
      order by count(*) desc, make_name asc
      limit 1
    ) as top_make,
    (
      select company_name
      from friend_reports r
      where r.friendship_id = vf.friendship_id and company_name is not null
      group by company_name
      order by count(*) desc, company_name asc
      limit 1
    ) as top_company,
    (
      select airport_code
      from friend_reports r
      where r.friendship_id = vf.friendship_id and airport_code is not null
      group by airport_code
      order by count(*) desc, airport_code asc
      limit 1
    ) as top_airport,
    max(fr.observed_at) as latest_observed_at,
    vf.friendship_created_at
  from visible_friendships vf
  join public.profiles p on p.id = vf.friend_id
  left join friend_reports fr on fr.friendship_id = vf.friendship_id
  group by vf.friendship_id, p.id, p.username, p.nickname, vf.status, vf.direction, vf.friendship_created_at
  order by vf.status asc, stamp_count desc, p.username asc;
$$;

grant select, insert, update, delete on public.friendships to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friendship(uuid) to authenticated;
grant execute on function public.list_friends_with_stats(text) to authenticated;

-- =====================================================================
-- Invite-only signup (mirrors RentyCar/Supabase/invite_signup_copy_paste.sql)
-- =====================================================================

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);

alter table public.invite_codes enable row level security;

drop function if exists public.validate_invite_signup(text, text);

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
      when input.invite_code = '' then false
      when exists (select 1 from public.profiles p where p.username = input.username) then false
      when not exists (select 1 from public.invite_codes ic where ic.code = input.invite_code and ic.used_at is null) then false
      else true
    end as ok,
    case
      when input.username !~ '^[a-z0-9_-]{3,32}$' then 'Username must be 3-32 characters and use only letters, numbers, underscores, or dashes.'
      when input.invite_code = '' then 'Invite code is required.'
      when exists (select 1 from public.profiles p where p.username = input.username) then 'Username is already taken.'
      when not exists (select 1 from public.invite_codes ic where ic.code = input.invite_code and ic.used_at is null) then 'Invite code is invalid or already used.'
      else 'Ready.'
    end as message
  from input;
$$;

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
  invite_row public.invite_codes%rowtype;
begin
  if invite_code = '' then
    raise exception 'Invite code is required.';
  end if;

  if requested_username !~ '^[a-z0-9_-]{3,32}$' then
    raise exception 'Username must be 3-32 characters and use only letters, numbers, underscores, or dashes.';
  end if;

  if length(requested_nickname) < 2 or length(requested_nickname) > 40 then
    raise exception 'Nickname must be 2-40 characters.';
  end if;

  select *
  into invite_row
  from public.invite_codes
  where code = invite_code
    and used_at is null
  for update;

  if not found then
    raise exception 'Invite code is invalid or already used.';
  end if;

  insert into public.profiles (id, username, nickname, role)
  values (new.id, requested_username, requested_nickname, 'reporter');

  update public.invite_codes
  set used_at = now(),
      used_by = new.id
  where id = invite_row.id;

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

grant execute on function public.validate_invite_signup(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
