begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@example.test',
       jsonb_build_object('display_name', (array['Ada', 'Ben'])[g])
from generate_series(1, 2) g;

insert into public.cafes (id, google_place_id, name, suburb, location) values
  ('10000000-0000-4000-8000-00000000000a', 'place_a', 'Cafe Alpha', 'Fitzroy',
   st_setsrid(st_makepoint(144.9780, -37.8000), 4326)::geography),
  ('10000000-0000-4000-8000-00000000000b', 'place_b', 'Cafe Bravo', 'Carlton',
   st_setsrid(st_makepoint(144.9780, -37.8018), 4326)::geography);

-- Ada (user 1): review 1 at Alpha (older, with a photo), review 2 at Bravo (newer), review 3 at Bravo
-- (hidden). Ben (user 2): review 4 at Alpha.
insert into public.reviews (id, user_id, cafe_id, comment, beans, hidden_at, created_at, verified, visit_date) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-00000000000a', 'Ada at Alpha, silky and hot.', 'Market Lane', null,
   now() - interval '3 days', true, current_date - 3),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-00000000000b', 'Ada at Bravo, a bit loud.', null, null,
   now() - interval '1 day', false, current_date - 1),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-00000000000b', 'Ada hidden review text.', null, now(),
   now() - interval '2 days', false, current_date - 2),
  ('20000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-00000000000a', 'Ben at Alpha, nice and strong.', null, null,
   now() - interval '1 hour', false, current_date);

insert into public.review_drinks (review_id, drink_id, rating, milk, price_aud) values
  ('20000000-0000-4000-8000-000000000001', 9, 4.5, 'oat', 5.8),
  ('20000000-0000-4000-8000-000000000001', 10, 3.5, null, null),
  ('20000000-0000-4000-8000-000000000002', 9, 4.0, null, null),
  ('20000000-0000-4000-8000-000000000003', 9, 2.0, null, null),
  ('20000000-0000-4000-8000-000000000004', 9, 5.0, null, null);
insert into public.review_ratings (review_id, metric, rating) values
  ('20000000-0000-4000-8000-000000000001', 'work', 5),
  ('20000000-0000-4000-8000-000000000002', 'vibe', 3.5);
insert into public.review_photos (review_id, storage_path, width, height) values
  ('20000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001.jpg', 1200, 1600);

create function pg_temp.act_as(n int) returns void language sql as
  $$ select set_config('request.jwt.claims',
       json_build_object('sub', ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
                         'role', 'authenticated')::text, true) $$;

set local role authenticated;
select pg_temp.act_as(1);

select is(
  (select count(*)::int from public.my_reviews()),
  2, 'my_reviews: returns only the caller''s visible reviews (not others'', not hidden)');
select is(
  (select array_agg(review_id order by created_at desc)::text from public.my_reviews()),
  '{20000000-0000-4000-8000-000000000002,20000000-0000-4000-8000-000000000001}',
  'my_reviews: newest first');
select is(
  (select cafe_name || ' / ' || suburb from public.my_reviews()
   where review_id = '20000000-0000-4000-8000-000000000001'),
  'Cafe Alpha / Fitzroy', 'my_reviews: includes the cafe name and suburb');
select is(
  (select jsonb_array_length(drinks) from public.my_reviews()
   where review_id = '20000000-0000-4000-8000-000000000001'),
  2, 'my_reviews: returns every drink of the visit');
select is(
  (select ratings::text from public.my_reviews()
   where review_id = '20000000-0000-4000-8000-000000000001'),
  '{"work": 5}', 'my_reviews: returns food, vibe and work ratings that were given');
select is(
  (select photo_width from public.my_reviews()
   where review_id = '20000000-0000-4000-8000-000000000001'),
  1200, 'my_reviews: returns the photo');
select pg_temp.act_as(2);
select is(
  (select count(*)::int from public.my_reviews()),
  1, 'my_reviews: another user sees only their own');

reset role;
set local role anon;
select throws_ok($$ select * from public.my_reviews() $$,
  '42501', null, 'anon cannot execute my_reviews');
reset role;

select * from finish();
rollback;
