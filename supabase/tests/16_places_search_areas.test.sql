begin;
create extension if not exists pgtap with schema extensions;

delete from public.places_search_areas;

select plan(9);

-- One search 1000 m around a point, and one from long ago at a second point.
select public.log_area_search(-37.8000, 144.9800, 1000, 12);
select is(
  (select result_count from public.places_search_areas),
  12, 'log_area_search stores the search');

insert into public.places_search_areas (center, radius_m, searched_at) values
  (st_setsrid(st_makepoint(145.1000, -37.9000), 4326)::geography, 3000, now() - interval '40 days');

-- 0.002 degrees of latitude is about 222 m.
select ok(public.area_searched_since(-37.8000, 144.9800, 1000, now() - interval '25 days'),
  'the same circle is covered');
select ok(public.area_searched_since(-37.8020, 144.9800, 500, now() - interval '25 days'),
  'a smaller circle inside the searched one is covered');
select ok(not public.area_searched_since(-37.8020, 144.9800, 900, now() - interval '25 days'),
  'a circle that pokes out of the searched one is not covered');
select ok(not public.area_searched_since(-37.8200, 144.9800, 300, now() - interval '25 days'),
  'a circle elsewhere is not covered');
select ok(public.area_searched_since(-37.8005, 144.9800, 2000, now() - interval '25 days'),
  'a search centred within 100 m counts, whatever its radius');
select ok(not public.area_searched_since(-37.9000, 145.1000, 300, now() - interval '25 days'),
  'an old search does not count');

set local role authenticated;
select throws_ok($$ select public.area_searched_since(0, 0, 1, now()) $$, '42501', null,
  'signed-in users cannot call area_searched_since');
select throws_ok($$ select public.log_area_search(0, 0, 1, 0) $$, '42501', null,
  'signed-in users cannot call log_area_search');

select * from finish();
rollback;
