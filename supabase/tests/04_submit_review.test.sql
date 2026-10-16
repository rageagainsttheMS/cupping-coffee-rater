begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(21);

-- Fixtures. The cafe sits at (144.9780, -37.8000).
insert into auth.users (id, email)
select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@example.test'
from generate_series(1, 6) g;

insert into public.cafes (id, google_place_id, name, location)
select ('10000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'place_' || g, 'Cafe ' || g,
       st_setsrid(st_makepoint(144.9780 + (g - 1) * 0.01, -37.8000), 4326)::geography
from generate_series(1, 12) g;

create function pg_temp.uid(n int) returns uuid language sql as
  $$ select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.cid(n int) returns uuid language sql as
  $$ select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.act_as(n int) returns void language sql as
  $$ select set_config('request.jwt.claims',
       json_build_object('sub', pg_temp.uid(n), 'role', 'authenticated')::text, true) $$;

-- 0.0009 degrees of latitude is about 100 m, so use small offsets for the radius checks.
-- 80 m north is about 0.00072 degrees; 150 m north is about 0.00135 degrees.

set local role authenticated;
select pg_temp.act_as(1);

-- TDD rule 8: a review 80 m away is verified; 150 m is not; no location is not.
select is(
  (public.submit_review(gen_random_uuid(), pg_temp.cid(1),
     '[{"drink_id": 9, "rating": 4.5, "milk": "oat", "price_aud": 5.5}]',
     p_comment => 'Smooth and well made.', p_lat => -37.8000 + 0.00072, p_lng => 144.9780) ->> 'verified')::boolean,
  true, 'a review 80 m from the cafe is verified');
select pg_temp.act_as(2);
select is(
  (public.submit_review(gen_random_uuid(), pg_temp.cid(1),
     '[{"drink_id": 9, "rating": 4}]',
     p_comment => 'Decent but a bit hot.', p_lat => -37.8000 + 0.00135, p_lng => 144.9780) ->> 'verified')::boolean,
  false, 'a review 150 m from the cafe is not verified');
select pg_temp.act_as(3);
select is(
  (public.submit_review(gen_random_uuid(), pg_temp.cid(1),
     '[{"drink_id": 9, "rating": 4}]', p_comment => 'No location shared here.') ->> 'verified')::boolean,
  false, 'a review without a location is not verified');

-- The stored row matches the returned flag, and child rows were written.
select is((select count(*)::int from public.review_drinks where milk = 'oat' and price_aud = 5.5), 1,
  'drink details are stored with milk and price');

-- Before / after scores for the "Posted" screen.
select pg_temp.act_as(4);
select is(
  public.submit_review(gen_random_uuid(), pg_temp.cid(1),
    '[{"drink_id": 9, "rating": 4}]', p_food => 4, p_comment => 'Toastie was great too.')
    -> 'before' -> 'coffee' ->> 'count',
  '3', 'before-scores report the previous Coffee count');
select pg_temp.act_as(5);
select is(
  public.submit_review(gen_random_uuid(), pg_temp.cid(1),
    '[{"drink_id": 9, "rating": 4}]', p_comment => 'Consistent as always.')
    -> 'after' -> 'coffee' ->> 'count',
  '5', 'after-scores report the new Coffee count');
select isnt(
  (select score from public.cafe_scores where cafe_id = pg_temp.cid(1) and metric = 'coffee'),
  null, 'the cafe now has a Coffee score');

-- Invalid payloads are rejected.
select pg_temp.act_as(6);
select throws_ok(
  format($$select public.submit_review(gen_random_uuid(), %L, '[{"drink_id": 9, "rating": 3.3}]',
    p_comment => 'Rating is not a half step.')$$, pg_temp.cid(2)),
  '23514', null, 'a 3.3 rating is rejected');
select throws_ok(
  format($$select public.submit_review(gen_random_uuid(), %L, '[]', p_comment => 'No drinks at all here.')$$,
    pg_temp.cid(2)),
  '22023', 'invalid_drinks', 'an empty drinks list is rejected');
select throws_ok(
  format($$select public.submit_review(gen_random_uuid(), %L, '[{"drink_id": 9, "rating": 4}]',
    p_comment => 'short')$$, pg_temp.cid(2)),
  '23514', null, 'a too-short comment is rejected');
select throws_ok(
  format($$select public.submit_review(gen_random_uuid(), %L, '[{"drink_id": 9, "rating": 4}]',
    p_food => 6, p_comment => 'Food rating out of range.')$$, pg_temp.cid(2)),
  '23514', null, 'an out-of-range food rating is rejected');
select throws_ok(
  format($$select public.submit_review(gen_random_uuid(), %L, '[{"drink_id": 9, "rating": 4, "milk": "goat"}]',
    p_comment => 'Unknown milk type used.')$$, pg_temp.cid(2)),
  '22P02', null, 'an unknown milk type is rejected');
select throws_ok(
  format($$select public.submit_review(gen_random_uuid(), %L, '[{"drink_id": 9, "rating": 4}]',
    p_comment => 'Location with only a latitude.', p_lat => -37.8)$$, pg_temp.cid(2)),
  '22023', 'invalid_location', 'a latitude without a longitude is rejected');
select throws_ok(
  format($$select public.submit_review(gen_random_uuid(), %L, '[{"drink_id": 9, "rating": 4}]',
    p_comment => 'Photo belongs to someone else.', p_photo_path => %L)$$,
    pg_temp.cid(2), pg_temp.uid(1) || '/photo.jpg'),
  '22023', 'invalid_photo_path', 'a photo path outside the user''s own folder is rejected');
select lives_ok(
  format($$select public.submit_review(gen_random_uuid(), %L, '[{"drink_id": 9, "rating": 4}]',
    p_comment => 'Photo in my own folder.', p_photo_path => %L, p_photo_width => 800, p_photo_height => 600)$$,
    pg_temp.cid(3), pg_temp.uid(6) || '/photo.jpg'),
  'a photo path in the user''s own folder is accepted');

-- Same-day duplicate through the function (TDD rule 7).
select throws_ok(
  format($$select public.submit_review(gen_random_uuid(), %L, '[{"drink_id": 9, "rating": 4}]',
    p_comment => 'Second review the same day.')$$, pg_temp.cid(3)),
  '23505', null, 'a second same-day review at the same cafe is rejected');

-- Rate limit: 10 reviews in 24 hours. User 6 already has one (cafe 3), so 9 more reach the limit.
select is((select count(*)::int from public.reviews where user_id = pg_temp.uid(6)), 1,
  'user 6 has one review so far');
select lives_ok(
  format($$select public.submit_review(gen_random_uuid(), pg_temp.cid(g), '[{"drink_id": 9, "rating": 4}]',
    p_comment => 'Filling up the daily quota.') from generate_series(4, 12) g$$),
  'a user can post up to the daily limit');
select throws_ok(
  format($$select public.submit_review(gen_random_uuid(), %L, '[{"drink_id": 9, "rating": 4}]',
    p_comment => 'One review too many today.')$$, pg_temp.cid(2)),
  'P0001', 'rate_limit_exceeded', 'the eleventh review in 24 hours is rejected');

-- Signed-out and anonymous callers cannot use the function.
reset role;
select set_config('request.jwt.claims', '', true);
set local role authenticated;
select throws_ok(
  format($$select public.submit_review(gen_random_uuid(), %L, '[{"drink_id": 9, "rating": 4}]',
    p_comment => 'No signed in user here.')$$, pg_temp.cid(2)),
  '28000', 'not_authenticated', 'a call with no user is rejected');
reset role;
set local role anon;
select throws_ok(
  format($$select public.submit_review(gen_random_uuid(), %L, '[{"drink_id": 9, "rating": 4}]',
    p_comment => 'Anonymous caller here.')$$, pg_temp.cid(2)),
  '42501', null, 'anon cannot execute submit_review');
reset role;

select * from finish();
rollback;
