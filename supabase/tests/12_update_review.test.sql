begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(23);

insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@example.test',
       jsonb_build_object('display_name', 'User ' || g)
from generate_series(1, 5) g;

insert into public.cafes (id, google_place_id, name, suburb, location)
values ('10000000-0000-4000-8000-000000000001', 'place_1', 'Cafe 1', 'Fitzroy',
        st_setsrid(st_makepoint(144.9780, -37.8000), 4326)::geography);

create function pg_temp.uid(n int) returns uuid language sql as
  $$ select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.act_as(n int) returns void language sql as
  $$ select set_config('request.jwt.claims',
       json_build_object('sub', pg_temp.uid(n), 'role', 'authenticated')::text, true) $$;
create function pg_temp.tag(m text, l text) returns smallint language sql as
  $$ select id from public.tags where metric = m::public.metric and label = l $$;

-- Reviews 2 to 4 give the cafe a Coffee score. Review 1 (user 1) is the one edited: two drinks, Food 4,
-- Work 5, tags Smooth (coffee) and Wifi (work). Review 5 (user 5) is hidden.
insert into public.reviews (id, user_id, cafe_id, comment, visit_date, created_at, hidden_at)
select ('20000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, pg_temp.uid(g),
       '10000000-0000-4000-8000-000000000001', 'Review number ' || g || ' here.',
       current_date - 30, now() - interval '30 days',
       case when g = 5 then now() end
from generate_series(1, 5) g;
insert into public.review_drinks (review_id, drink_id, rating) values
  ('20000000-0000-4000-8000-000000000001', 9, 4.5),
  ('20000000-0000-4000-8000-000000000001', 10, 3.5),
  ('20000000-0000-4000-8000-000000000002', 9, 4),
  ('20000000-0000-4000-8000-000000000003', 9, 4),
  ('20000000-0000-4000-8000-000000000004', 9, 4),
  ('20000000-0000-4000-8000-000000000005', 9, 4);
insert into public.review_ratings (review_id, metric, rating) values
  ('20000000-0000-4000-8000-000000000001', 'food', 4),
  ('20000000-0000-4000-8000-000000000001', 'work', 5);
insert into public.review_tags (review_id, tag_id) values
  ('20000000-0000-4000-8000-000000000001', pg_temp.tag('coffee', 'Smooth')),
  ('20000000-0000-4000-8000-000000000001', pg_temp.tag('work', 'Wifi'));

-- An inactive tag, for the retired-tag test.
update public.tags set active = false where metric = 'vibe' and label = (
  select label from public.tags where metric = 'vibe' order by sort_order limit 1);

set local role authenticated;
select pg_temp.act_as(1);

-- A review from 30 days ago can still be edited: there is no time limit.
select is(
  (public.update_review(
     '20000000-0000-4000-8000-000000000001',
     '[{"drink_id": 9, "rating": 2}, {"drink_id": 10, "rating": 3.5}]',
     p_food => 4.5, p_vibe => 3.5, p_work => null,
     p_tags => jsonb_build_array(pg_temp.tag('coffee', 'Strong'), pg_temp.tag('food', 'Pastries')),
     p_comment => 'Edited: much weaker than I remembered.')
   -> 'before' -> 'coffee' ->> 'count'),
  '5', 'edit: an old review can be edited, and the response reports the Coffee count before');
select is(
  (select rating::text from public.review_drinks
   where review_id = '20000000-0000-4000-8000-000000000001' and drink_id = 9),
  '2', 'edit: a drink''s rating is updated');
select is(
  (select rating::text from public.review_drinks
   where review_id = '20000000-0000-4000-8000-000000000001' and drink_id = 10),
  '3.5', 'edit: a drink left unchanged keeps its rating');
select is(
  (select rating::text from public.review_ratings
   where review_id = '20000000-0000-4000-8000-000000000001' and metric = 'food'),
  '4.5', 'edit: Food is updated');
select is(
  (select rating::text from public.review_ratings
   where review_id = '20000000-0000-4000-8000-000000000001' and metric = 'vibe'),
  '3.5', 'edit: Vibe can be added');
select ok(
  not exists (select 1 from public.review_ratings
              where review_id = '20000000-0000-4000-8000-000000000001' and metric = 'work'),
  'edit: Didn''t try removes the Work rating');
select is(
  (select array_agg(tag_id order by tag_id)::text from public.review_tags
   where review_id = '20000000-0000-4000-8000-000000000001'),
  (select array_agg(t order by t)::text from unnest(array[
     pg_temp.tag('coffee', 'Strong'), pg_temp.tag('food', 'Pastries')]) t),
  'edit: tags are replaced, so Wifi is gone with the Work rating');
select is(
  (select comment from public.reviews where id = '20000000-0000-4000-8000-000000000001'),
  'Edited: much weaker than I remembered.', 'edit: the comment is updated');
select isnt(
  (select edited_at from public.reviews where id = '20000000-0000-4000-8000-000000000001'),
  null, 'edit: edited_at is set');
select is(
  (select visit_date from public.reviews where id = '20000000-0000-4000-8000-000000000001'),
  current_date - 30, 'edit: the visit date is unchanged');
select ok(
  (select score from public.cafe_scores
   where cafe_id = '10000000-0000-4000-8000-000000000001' and metric = 'coffee') is not null,
  'edit: the cafe keeps its Coffee score');

-- Reading back ------------------------------------------------------------------------------------
select isnt(
  (select edited_at from public.my_reviews() where review_id = '20000000-0000-4000-8000-000000000001'),
  null, 'my_reviews: returns edited_at');
select is(
  (select jsonb_array_length(tags) from public.my_reviews()
   where review_id = '20000000-0000-4000-8000-000000000001'),
  2, 'my_reviews: returns the review''s tags');
select isnt(
  (select edited_at from public.cafe_reviews('10000000-0000-4000-8000-000000000001')
   where review_id = '20000000-0000-4000-8000-000000000001'),
  null, 'cafe_reviews: returns edited_at');
select is(
  (select edited_at from public.cafe_reviews('10000000-0000-4000-8000-000000000001')
   where review_id = '20000000-0000-4000-8000-000000000002'),
  null, 'cafe_reviews: an unedited review has no edited_at');

-- Refusals ----------------------------------------------------------------------------------------
select throws_ok(
  $$ select public.update_review('20000000-0000-4000-8000-000000000001',
       '[{"drink_id": 9, "rating": 2}]', p_comment => 'Dropping a drink is not allowed.') $$,
  '22023', 'invalid_drinks', 'refused: a drink cannot be removed');
select throws_ok(
  $$ select public.update_review('20000000-0000-4000-8000-000000000001',
       '[{"drink_id": 9, "rating": 2}, {"drink_id": 11, "rating": 3}]',
       p_comment => 'Swapping a drink is not allowed.') $$,
  '22023', 'invalid_drinks', 'refused: a drink cannot be swapped for another');
select throws_ok(
  $$ select public.update_review('20000000-0000-4000-8000-000000000001',
       '[{"drink_id": 9, "rating": 2}, {"drink_id": 10, "rating": 3.5}]',
       p_comment => 'Short') $$,
  '22023', 'invalid_comment', 'refused: a comment under 10 characters');
select throws_ok(
  $$ select public.update_review('20000000-0000-4000-8000-000000000001',
       '[{"drink_id": 9, "rating": 2}, {"drink_id": 10, "rating": 3.5}]',
       p_work => null, p_tags => jsonb_build_array(pg_temp.tag('work', 'Wifi')),
       p_comment => 'A tag for a metric with no rating.') $$,
  '22023', 'invalid_tags', 'refused: a tag for a metric that is not rated');
select throws_ok(
  $$ select public.update_review('20000000-0000-4000-8000-000000000001',
       '[{"drink_id": 9, "rating": 2}, {"drink_id": 10, "rating": 3.5}]',
       p_vibe => 3, p_tags => jsonb_build_array((select id from public.tags where not active limit 1)),
       p_comment => 'An inactive tag is not allowed.') $$,
  '22023', 'invalid_tags', 'refused: a retired tag');
select throws_ok(
  $$ select public.update_review('20000000-0000-4000-8000-000000000002',
       '[{"drink_id": 9, "rating": 5}]', p_comment => 'This belongs to someone else.') $$,
  'P0002', 'review_not_found', 'refused: another user''s review');

select pg_temp.act_as(5);
select throws_ok(
  $$ select public.update_review('20000000-0000-4000-8000-000000000005',
       '[{"drink_id": 9, "rating": 5}]', p_comment => 'A hidden review stays hidden.') $$,
  'P0002', 'review_not_found', 'refused: a hidden review');

reset role;
set local role anon;
select throws_ok(
  $$ select public.update_review('20000000-0000-4000-8000-000000000001',
       '[{"drink_id": 9, "rating": 5}]', p_comment => 'Not signed in at all here.') $$,
  '42501', null, 'anon cannot execute update_review');
reset role;

select * from finish();
rollback;
