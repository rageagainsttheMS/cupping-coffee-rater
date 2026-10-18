-- Support for the Google Places Edge Functions (places-search, places-details).
-- Everything here is for the service role only. The app never calls these directly.

-- One row per area or text query already searched, so the same search is not paid for twice.
create table public.places_search_log (
  search_key text primary key,
  searched_at timestamptz not null default now(),
  result_count integer not null default 0
);

alter table public.places_search_log enable row level security;
revoke all on public.places_search_log from anon, authenticated;

-- How many stored cafes fall inside a bounding box. Used to skip Google when the area is covered.
create function public.count_cafes_in_box(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
returns integer
language sql
stable
set search_path = public, extensions
as $$
  select count(*)::int
  from public.cafes c
  where c.location && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography;
$$;

-- Insert places found by Google, or refresh the ones we already hold. Keyed by Google place id.
-- Input: [{"google_place_id", "name", "suburb", "lat", "lng"}]. Reviews are never touched.
create function public.upsert_cafes(p_cafes jsonb)
returns table (
  id uuid,
  google_place_id text,
  name text,
  suburb text,
  lat double precision,
  lng double precision
)
language sql
set search_path = public, extensions
as $$
  with input as (
    select x.google_place_id, x.name, x.suburb, x.lat, x.lng
    from jsonb_to_recordset(p_cafes)
      as x (google_place_id text, name text, suburb text, lat double precision, lng double precision)
  ),
  stored as (
    insert into public.cafes (google_place_id, name, suburb, location, refreshed_at)
    select i.google_place_id, i.name, i.suburb,
           st_setsrid(st_makepoint(i.lng, i.lat), 4326)::geography, now()
    from input i
    on conflict (google_place_id) do update
      set name = excluded.name,
          suburb = excluded.suburb,
          location = excluded.location,
          refreshed_at = now()
    returning *
  )
  select s.id, s.google_place_id, s.name, s.suburb,
         st_y(s.location::geometry), st_x(s.location::geometry)
  from stored s;
$$;

-- Refresh one stored cafe from a Place Details response (name and coordinates only).
create function public.refresh_cafe(
  p_cafe_id uuid,
  p_name text,
  p_lat double precision,
  p_lng double precision
)
returns void
language sql
set search_path = public, extensions
as $$
  update public.cafes
  set name = p_name,
      location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      refreshed_at = now()
  where id = p_cafe_id;
$$;

revoke execute on function
  public.count_cafes_in_box(double precision, double precision, double precision, double precision),
  public.upsert_cafes(jsonb),
  public.refresh_cafe(uuid, text, double precision, double precision)
from public, anon, authenticated;
grant execute on function
  public.count_cafes_in_box(double precision, double precision, double precision, double precision),
  public.upsert_cafes(jsonb),
  public.refresh_cafe(uuid, text, double precision, double precision)
to service_role;
