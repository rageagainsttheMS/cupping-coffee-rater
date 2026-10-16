begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(14);

-- Fixtures (as postgres, bypassing RLS)
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'b@example.test');
insert into public.cafes (id, google_place_id, name, location) values
  ('10000000-0000-4000-8000-000000000001', 'place_1', 'Test Cafe',
   st_setsrid(st_makepoint(144.9780, -37.8000), 4326)::geography);
insert into public.reviews (id, user_id, cafe_id, comment) values
  ('20000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000a',
   '10000000-0000-4000-8000-000000000001', 'Review written by user A.'),
  ('20000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000b',
   '10000000-0000-4000-8000-000000000001', 'Review written by user B.');
insert into public.review_drinks (review_id, drink_id, rating) values
  ('20000000-0000-4000-8000-00000000000a', 9, 4),
  ('20000000-0000-4000-8000-00000000000b', 9, 5);
insert into public.saved_cafes (user_id, cafe_id) values
  ('00000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000001');

-- Anonymous users read nothing
set local role anon;
select throws_ok('select * from public.cafes', '42501', null, 'anon cannot read cafes');
select throws_ok('select * from public.reviews', '42501', null, 'anon cannot read reviews');
select throws_ok('select * from public.cafe_scores', '42501', null, 'anon cannot read scores');
reset role;

-- Act as user A
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

select is((select count(*)::int from public.cafes), 1, 'signed-in users can read cafes');
select is((select count(*)::int from public.reviews), 2, 'signed-in users can read reviews');

-- No direct inserts
select throws_ok(
  $$insert into public.reviews (user_id, cafe_id, comment)
    values ('00000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001',
            'Trying to bypass submit_review.')$$,
  '42501', null, 'reviews cannot be inserted directly');
select throws_ok(
  $$insert into public.cafes (google_place_id, name, location)
    values ('p', 'Mine', st_setsrid(st_makepoint(144.9, -37.8), 4326)::geography)$$,
  '42501', null, 'signed-in users cannot write cafes');

-- User A cannot edit or delete user B's review
select throws_ok(
  $$update public.reviews set comment = 'Edited by someone else.'
    where id = '20000000-0000-4000-8000-00000000000b'$$,
  '42501', null, 'user A cannot edit reviews');
delete from public.reviews where id = '20000000-0000-4000-8000-00000000000b';
select is(
  (select count(*)::int from public.reviews where id = '20000000-0000-4000-8000-00000000000b'),
  1, 'user A cannot delete user B''s review');
delete from public.reviews where id = '20000000-0000-4000-8000-00000000000a';
select is(
  (select count(*)::int from public.reviews where id = '20000000-0000-4000-8000-00000000000a'),
  0, 'user A can delete their own review');

-- User A cannot read user B's saved cafes
select is((select count(*)::int from public.saved_cafes), 0, 'user A cannot read user B''s saved cafes');

-- Reports are write-only
select lives_ok(
  $$insert into public.review_reports (review_id, reporter_id, reason)
    values ('20000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000a', 'spam')$$,
  'users can report a review');
select throws_ok('select * from public.review_reports', '42501', null, 'users cannot read reports');

-- Blocked users' reviews are hidden from the blocker
reset role;
insert into public.reviews (id, user_id, cafe_id, comment, visit_date) values
  ('20000000-0000-4000-8000-0000000000bb', '00000000-0000-4000-8000-00000000000b',
   '10000000-0000-4000-8000-000000000001', 'Another review by user B.', current_date - 3);
insert into public.user_blocks (blocker_id, blocked_id) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b');
set local role authenticated;
select is(
  (select count(*)::int from public.reviews where user_id = '00000000-0000-4000-8000-00000000000b'),
  0, 'a blocked user''s reviews are not visible to the blocker');

select * from finish();
rollback;
