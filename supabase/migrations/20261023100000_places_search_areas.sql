-- Map-area searches were logged per ~1.1 km tile, so one search anywhere in a tile (even a 300 m one
-- in a corner) stopped the whole tile being searched again for 25 days. Log each search as the circle
-- it actually covered instead, and count a view as searched only when a recent circle contains it.
-- Text queries keep using places_search_log.

create table public.places_search_areas (
  id bigint generated always as identity primary key,
  center extensions.geography (point, 4326) not null,
  -- How far out the search is complete. Less than the search radius when Google hit its result cap.
  radius_m double precision not null check (radius_m >= 0),
  result_count integer not null default 0,
  searched_at timestamptz not null default now()
);

create index places_search_areas_center_idx on public.places_search_areas using gist (center);

alter table public.places_search_areas enable row level security;
revoke all on public.places_search_areas from anon, authenticated;
grant all on public.places_search_areas to service_role;

-- The tile rows are no longer read.
delete from public.places_search_log where search_key like 't:%';

create function public.log_area_search(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_result_count integer
)
returns void
language sql
set search_path = public, extensions
as $$
  insert into public.places_search_areas (center, radius_m, result_count)
  values (st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m, p_result_count);
$$;

-- True when a search since p_since covered the whole circle. A search centred within 100 m also
-- counts: Google ranks by distance from the centre, so repeating it would return the same places.
create function public.area_searched_since(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_since timestamptz
)
returns boolean
language sql
stable
set search_path = public, extensions
as $$
  with here as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as point)
  select exists (
    select 1
    from public.places_search_areas a, here h
    where a.searched_at >= p_since
      and (st_distance(a.center, h.point) + p_radius_m <= a.radius_m
           or st_dwithin(a.center, h.point, 100))
  );
$$;

revoke execute on function
  public.log_area_search(double precision, double precision, double precision, integer),
  public.area_searched_since(double precision, double precision, double precision, timestamptz)
from public, anon, authenticated;
grant execute on function
  public.log_area_search(double precision, double precision, double precision, integer),
  public.area_searched_since(double precision, double precision, double precision, timestamptz)
to service_role;
