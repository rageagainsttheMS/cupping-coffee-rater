begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(14);

-- Fixtures
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000001', 'a@example.test', '{"display_name":"Ada"}'),
  ('00000000-0000-4000-8000-000000000002', 'b@example.test', '{}');
insert into public.cafes (id, google_place_id, name, location) values
  ('10000000-0000-4000-8000-000000000001', 'place_1', 'Test Cafe',
   st_setsrid(st_makepoint(144.9780, -37.8000), 4326)::geography),
  ('10000000-0000-4000-8000-000000000002', 'place_2', 'Other Cafe',
   st_setsrid(st_makepoint(144.9790, -37.8010), 4326)::geography);

-- Profiles
select is(
  (select display_name from public.profiles where id = '00000000-0000-4000-8000-000000000001'),
  'Ada', 'profile created from auth user metadata');
select is(
  (select display_name from public.profiles where id = '00000000-0000-4000-8000-000000000002'),
  'Coffee lover', 'profile gets a default display name');

-- Cafes
select throws_ok(
  $$insert into public.cafes (google_place_id, name, location)
    values ('place_1', 'Dupe', st_setsrid(st_makepoint(144.9, -37.8), 4326)::geography)$$,
  '23505', null, 'google_place_id must be unique');

-- Drinks seed
select is((select count(*)::int from public.drinks), 21, 'all 21 drinks are seeded');
select is(
  (select array_agg(slug order by slug) from public.drinks where not counts_toward_coffee),
  array['chai', 'hot_chocolate', 'matcha'],
  'chai, matcha and hot chocolate are flagged out of the Coffee average');
select ok(
  (select bool_and(counts_toward_coffee) from public.drinks where slug = 'flat_white'),
  'flat white counts toward Coffee');

-- TDD rule 6 (database half): 3.5 accepted, 3.3 and 0 rejected
insert into public.reviews (id, user_id, cafe_id, comment) values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 'A perfectly fine comment.');

select lives_ok(
  $$insert into public.review_drinks (review_id, drink_id, rating)
    values ('20000000-0000-4000-8000-000000000001', 9, 3.5)$$,
  '3.5 is accepted');
select throws_ok(
  $$insert into public.review_drinks (review_id, drink_id, rating)
    values ('20000000-0000-4000-8000-000000000001', 9, 3.3)$$,
  '23514', null, '3.3 is rejected');
select throws_ok(
  $$insert into public.review_drinks (review_id, drink_id, rating)
    values ('20000000-0000-4000-8000-000000000001', 9, 0)$$,
  '23514', null, '0 is rejected');
select throws_ok(
  $$insert into public.review_drinks (review_id, drink_id, rating)
    values ('20000000-0000-4000-8000-000000000001', 9, 5.5)$$,
  '23514', null, '5.5 is rejected');
select throws_ok(
  $$insert into public.review_ratings (review_id, metric, rating)
    values ('20000000-0000-4000-8000-000000000001', 'food', 2.7)$$,
  '23514', null, 'the same rule applies to food, vibe and work ratings');

-- Comment length
select throws_ok(
  $$insert into public.reviews (user_id, cafe_id, comment, visit_date)
    values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
            'short', current_date - 5)$$,
  '23514', null, 'a comment under 10 characters is rejected');

-- TDD rule 7: a second same-day review by the same user at the same cafe is rejected
select throws_ok(
  $$insert into public.reviews (user_id, cafe_id, comment)
    values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
            'Second visit the same day.')$$,
  '23505', null, 'second same-day review at the same cafe is rejected');
select lives_ok(
  $$insert into public.reviews (user_id, cafe_id, comment, visit_date)
    values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
            'Another day, another coffee.', current_date - 1)$$,
  'the same user can review the same cafe on a different day');

select * from finish();
rollback;
