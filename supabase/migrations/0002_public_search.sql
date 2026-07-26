-- =====================================================================
-- RentyCar — server-side public search
--
-- Run in the Supabase SQL editor after 0001. Idempotent.
--
-- WHY THIS EXISTS
-- The home page used to search by pulling `public_recent_reports` (which
-- is capped at 100 rows) into the browser and filtering that array. Any
-- report older than the newest 100 was therefore invisible to search, no
-- matter what you typed. This moves the filtering into Postgres so search
-- covers the whole register.
-- =====================================================================

drop function if exists public.search_public_reports(
  text, text, text, text, text, text, text, text, int, int, date, date, int
);

create or replace function public.search_public_reports(
  airport_q      text default null,
  company_q      text default null,
  plate_q        text default null,
  country_q      text default null,
  region_q       text default null,   -- region_code only; country_q narrows it
  make_q         text default null,
  model_q        text default null,
  condition_q    text default null,
  mileage_min    int  default null,
  mileage_max    int  default null,
  observed_from  date default null,
  observed_to    date default null,
  max_rows       int  default 200
)
returns table (
  airport_code text,
  airport_name text,
  airport_city text,
  airport_country text,
  airport_region_code text,
  airport_region_name text,
  rental_company_name text,
  rental_company_type text,
  make text,
  model text,
  year int,
  "trim" text,   -- quoted: trim is a reserved word in Postgres
  mileage int,
  exterior_condition text,
  interior_condition text,
  tire_condition text,
  drivetrain text,
  fuel_type text,
  fuel_octane text,
  ev_charging_speed text,
  fuel_level_percent int,
  lane_centering boolean,
  lane_departure_assist boolean,
  adaptive_cruise_control boolean,
  early_collision_prevention boolean,
  license_plate text,
  license_plate_state text,
  observed_date timestamptz,
  total_matches bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with matched as (
    select
      a.iata_code, a.name as airport_name, a.city, a.country,
      a.region_code, a.region_name,
      rc.name as company_name, rc.type as company_type,
      cm.name as make_name, cmo.name as model_name,
      vr.year, vr."trim", vr.mileage,
      vr.exterior_condition, vr.interior_condition, vr.tire_condition,
      vr.drivetrain, vr.fuel_type, vr.fuel_octane, vr.ev_charging_speed,
      vr.fuel_level_percent,
      vr.lane_centering, vr.lane_departure_assist,
      vr.adaptive_cruise_control, vr.early_collision_prevention,
      vr.license_plate, vr.license_plate_state,
      vr.observed_at, vr.created_at
    from public.vehicle_reports vr
    join public.airports a          on a.id = vr.airport_id
    join public.rental_companies rc on rc.id = vr.rental_company_id
    join public.car_makes cm        on cm.id = vr.make_id
    join public.car_models cmo      on cmo.id = vr.model_id
    where vr.deleted_at is null
      and a.is_active and rc.is_active and cm.is_active and cmo.is_active

      -- Airport free text matches code, name or city.
      and (
        nullif(trim(airport_q), '') is null
        or a.iata_code ilike '%' || trim(airport_q) || '%'
        or a.name      ilike '%' || trim(airport_q) || '%'
        or a.city      ilike '%' || trim(airport_q) || '%'
      )
      and (nullif(trim(company_q), '') is null or rc.name ilike '%' || trim(company_q) || '%')

      -- Plate comparison ignores spaces and dashes on both sides.
      and (
        nullif(trim(plate_q), '') is null
        or regexp_replace(upper(coalesce(vr.license_plate, '')), '[^A-Z0-9]', '', 'g')
           like '%' || regexp_replace(upper(plate_q), '[^A-Z0-9]', '', 'g') || '%'
      )

      and (nullif(trim(country_q), '') is null or a.country = trim(country_q))
      and (nullif(trim(region_q), '')  is null or a.region_code = trim(region_q))
      and (nullif(trim(make_q), '')    is null or cm.name = trim(make_q))
      and (nullif(trim(model_q), '')   is null or cmo.name = trim(model_q))
      and (
        nullif(trim(condition_q), '') is null
        or vr.exterior_condition = trim(condition_q)
        or vr.interior_condition = trim(condition_q)
      )
      and (mileage_min is null or coalesce(vr.mileage, 0) >= mileage_min)
      and (mileage_max is null or coalesce(vr.mileage, 0) <= mileage_max)
      and (observed_from is null or vr.observed_at >= observed_from)
      and (observed_to   is null or vr.observed_at < (observed_to + 1))
  )
  select
    m.iata_code, m.airport_name, m.city, m.country,
    m.region_code, m.region_name,
    m.company_name, m.company_type,
    m.make_name, m.model_name,
    m.year, m."trim", m.mileage,
    m.exterior_condition, m.interior_condition, m.tire_condition,
    m.drivetrain, m.fuel_type, m.fuel_octane, m.ev_charging_speed,
    m.fuel_level_percent,
    m.lane_centering, m.lane_departure_assist,
    m.adaptive_cruise_control, m.early_collision_prevention,
    m.license_plate, m.license_plate_state,
    m.observed_at,
    count(*) over () as total_matches
  from matched m
  order by m.observed_at desc, m.created_at desc
  limit greatest(least(max_rows, 500), 1);
$$;

grant execute on function public.search_public_reports(
  text, text, text, text, text, text, text, text, int, int, date, date, int
) to anon, authenticated;

-- Helpful for the ILIKE lookups above.
create index if not exists airports_name_lower_idx on public.airports (lower(name));
create index if not exists airports_city_lower_idx on public.airports (lower(city));
create index if not exists rental_companies_name_lower_idx on public.rental_companies (lower(name));

notify pgrst, 'reload schema';
