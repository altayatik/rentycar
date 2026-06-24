create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null default 'reporter' check (role in ('admin', 'reporter')),
  created_at timestamptz default now()
);

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
