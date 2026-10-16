begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(12);

-- Fixtures: cafe 1 inside the box with three flat white ratings, cafe 2 inside with none, cafe 3 outside.
insert into auth.users (id, email)
select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@example.test'
from generate_series(1, 3) g;

insert into public.cafes (id, google_place_id, name, location) values
  ('10000000-0000-4000-8000-000000000001', 'place_1', 'Inside Rated',
   st_setsrid(st_makepoint(144.9780, -37.8000), 4326)::geography),
  ('10000000-0000-4000-8000-000000000002', 'place_2', 'Inside Unrated',
   st_setsrid(st_makepoint(144.9790, -37.8010), 4326)::geography),
  ('10000000-0000-4000-8000-000000000003', 'place_3', 'Outside',
   st_setsrid(st_makepoint(145.2000, -37.9000), 4326)::geography);

insert into public.reviews (id, user_id, cafe_id, comment)
select ('20000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
       ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
       '10000000-0000-4000-8000-000000000001', 'Review number ' || g || ' here.'
from generate_series(1, 3) g;
insert into public.review_drinks (review_id, drink_id, rating)
select ('20000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 9, 4.5
from generate_series(1, 3) g;

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

-- cafes_in_view
select is(
  (select array_agg(name order by name) from public.cafes_in_view(144.97, -37.81, 144.99, -37.79, 'coffee')),
  array['Inside Rated', 'Inside Unrated'], 'only cafes inside the bounding box are returned');
select is(
  (select count(*)::int from public.cafes_in_view(144.0, -38.5, 146.0, -37.0, 'coffee')),
  3, 'a wider box returns all three cafes');
select isnt(
  (select score from public.cafes_in_view(144.97, -37.81, 144.99, -37.79, 'coffee') where name = 'Inside Rated'),
  null, 'a rated cafe has a Coffee score');
select is(
  (select rating_count from public.cafes_in_view(144.97, -37.81, 144.99, -37.79, 'coffee') where name = 'Inside Rated'),
  3::bigint, 'the chosen metric count is returned');
select is(
  (select best_drink from public.cafes_in_view(144.97, -37.81, 144.99, -37.79, 'coffee') where name = 'Inside Rated'),
  'Flat white', 'the best drink is returned');
select is(
  (select has_ratings from public.cafes_in_view(144.97, -37.81, 144.99, -37.79, 'coffee') where name = 'Inside Unrated'),
  false, 'an unrated cafe is flagged has_ratings = false');
select is(
  (select score from public.cafes_in_view(144.97, -37.81, 144.99, -37.79, 'food') where name = 'Inside Rated'),
  null, 'a cafe with no Food ratings has no Food score');
select is(
  (select round(st_x(location::geometry)::numeric, 4) from public.cafes where name = 'Inside Rated'),
  144.9780, 'longitude is stored as x');
select is(
  (select round(lng::numeric, 4) from public.cafes_in_view(144.97, -37.81, 144.99, -37.79, 'coffee') where name = 'Inside Rated'),
  144.9780, 'cafes_in_view returns lng');

reset role;

-- Storage bucket
select is(
  (select row(public, file_size_limit, allowed_mime_types)::text from storage.buckets where id = 'review-photos'),
  '(f,5242880,"{image/jpeg,image/webp}")', 'review-photos bucket is private, 5 MB, JPEG and WebP only');
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and policyname like 'review photos:%'),
  3, 'three storage policies exist for review photos');

-- Upload only into your own folder
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner)
    values ('review-photos', '00000000-0000-4000-8000-000000000002/photo.jpg', auth.uid())$$,
  '42501', null, 'cannot upload into another user''s folder');

select * from finish();
rollback;
