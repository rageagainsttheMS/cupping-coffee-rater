begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;
delete from public.places_search_log;

select plan(16);

insert into public.cafes (id, google_place_id, name, location) values
  ('10000000-0000-4000-8000-000000000001', 'in_1', 'Inside One',
   st_setsrid(st_makepoint(144.9780, -37.8000), 4326)::geography),
  ('10000000-0000-4000-8000-000000000002', 'in_2', 'Inside Two',
   st_setsrid(st_makepoint(144.9790, -37.8010), 4326)::geography),
  ('10000000-0000-4000-8000-000000000003', 'out_3', 'Outside',
   st_setsrid(st_makepoint(145.2000, -37.9000), 4326)::geography);

-- count_cafes_in_box
select is(public.count_cafes_in_box(144.97, -37.81, 144.99, -37.79), 2,
  'counts only the cafes inside the box');
select is(public.count_cafes_in_box(144.0, -38.5, 146.0, -37.0), 3, 'a wider box counts all cafes');

-- upsert_cafes inserts new cafes and returns them with coordinates.
select is(
  (select count(*)::int from public.upsert_cafes(
    '[{"google_place_id": "g_new", "name": "New Cafe", "suburb": "Fitzroy", "lat": -37.8, "lng": 144.98}]')),
  1, 'upsert_cafes returns the cafe it stored');
select is((select name from public.cafes where google_place_id = 'g_new'), 'New Cafe',
  'a new place is inserted');
select is(
  (select round(st_y(location::geometry)::numeric, 3) from public.cafes where google_place_id = 'g_new'),
  -37.800, 'the location is built from lat and lng');

-- Upserting the same place again updates it and refreshes refreshed_at, with no duplicate row.
update public.cafes set refreshed_at = now() - interval '40 days' where google_place_id = 'g_new';
select public.upsert_cafes(
  '[{"google_place_id": "g_new", "name": "Renamed Cafe", "suburb": "Carlton", "lat": -37.801, "lng": 144.981}]');
select is((select count(*)::int from public.cafes where google_place_id = 'g_new'), 1,
  'upserting a known place id does not duplicate it');
select is((select name from public.cafes where google_place_id = 'g_new'), 'Renamed Cafe',
  'upserting updates the name');
select ok((select refreshed_at > now() - interval '1 minute' from public.cafes where google_place_id = 'g_new'),
  'upserting refreshes refreshed_at');
select is(
  (select count(*)::int from public.reviews r join public.cafes c on c.id = r.cafe_id
   where c.google_place_id = 'g_new'),
  0, 'upserting never touches reviews');

-- refresh_cafe updates name and coordinates for a stored cafe.
select public.refresh_cafe('10000000-0000-4000-8000-000000000001', 'Inside One (updated)', -37.8100, 144.9900);
select is((select name from public.cafes where id = '10000000-0000-4000-8000-000000000001'),
  'Inside One (updated)', 'refresh_cafe updates the name');
select is(
  (select round(st_x(location::geometry)::numeric, 4) from public.cafes
   where id = '10000000-0000-4000-8000-000000000001'),
  144.9900, 'refresh_cafe updates the coordinates');

-- places_search_log: one row per searched area, service role only.
insert into public.places_search_log (search_key, result_count) values ('t:-3780:14497', 12);
select is((select result_count from public.places_search_log where search_key = 't:-3780:14497'), 12,
  'a search is logged against its key');

set local role authenticated;
select throws_ok($$ select * from public.places_search_log $$, '42501', null,
  'signed-in users cannot read the search log');
select throws_ok($$ select public.count_cafes_in_box(0, 0, 1, 1) $$, '42501', null,
  'signed-in users cannot call count_cafes_in_box');
select throws_ok($$ select * from public.upsert_cafes('[]') $$, '42501', null,
  'signed-in users cannot call upsert_cafes');
select throws_ok(
  $$ select public.refresh_cafe('10000000-0000-4000-8000-000000000001', 'x', 0, 0) $$, '42501', null,
  'signed-in users cannot call refresh_cafe');

select * from finish();
rollback;
