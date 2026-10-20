begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(23);

insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@example.test',
       jsonb_build_object('display_name', 'User ' || g)
from generate_series(1, 4) g;

insert into public.cafes (id, google_place_id, name, location)
values ('10000000-0000-4000-8000-000000000001', 'place_1', 'Cafe 1',
        st_setsrid(st_makepoint(144.9780, -37.8000), 4326)::geography);

create function pg_temp.uid(n int) returns uuid language sql as
  $$ select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.rid(n int) returns uuid language sql as
  $$ select ('20000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.act_as(n int) returns void language sql as
  $$ select set_config('request.jwt.claims',
       json_build_object('sub', pg_temp.uid(n), 'role', 'authenticated')::text, true) $$;

-- Review n belongs to user n (users 1 to 3), all at Cafe 1 with a flat white and a photo.
insert into public.reviews (id, user_id, cafe_id, comment)
select pg_temp.rid(g), pg_temp.uid(g), '10000000-0000-4000-8000-000000000001',
       'Review number ' || g || ' here.'
from generate_series(1, 3) g;
insert into public.review_drinks (review_id, drink_id, rating)
select pg_temp.rid(g), 9, 4 from generate_series(1, 3) g;
insert into public.review_ratings (review_id, metric, rating)
select pg_temp.rid(g), 'work', 4 from generate_series(1, 3) g;
insert into public.review_tags (review_id, tag_id)
select pg_temp.rid(g), (select id from public.tags where metric = 'coffee' order by sort_order limit 1)
from generate_series(1, 3) g;
insert into public.review_photos (review_id, storage_path)
select pg_temp.rid(g), pg_temp.uid(g)::text || '/' || pg_temp.rid(g)::text || '.jpg'
from generate_series(1, 3) g;
insert into public.saved_cafes (user_id, cafe_id)
select pg_temp.uid(g), '10000000-0000-4000-8000-000000000001' from generate_series(1, 3) g;

set local role authenticated;

-- Reports --------------------------------------------------------------------------------------
select pg_temp.act_as(2);
select lives_ok(
  $$ insert into public.review_reports (review_id, reporter_id, reason, details)
     values (pg_temp.rid(1), pg_temp.uid(2), 'spam', 'Looks like an advert.') $$,
  'report: a user can report a review');
select throws_ok(
  $$ insert into public.review_reports (review_id, reporter_id, reason)
     values (pg_temp.rid(1), pg_temp.uid(2), 'offensive') $$,
  '23505', null, 'report: the same user cannot report the same review twice');
select lives_ok(
  $$ insert into public.review_reports (review_id, reporter_id, reason)
     values (pg_temp.rid(3), pg_temp.uid(2), 'fake') $$,
  'report: the same user can report a different review');
select throws_ok(
  $$ insert into public.review_reports (review_id, reporter_id, reason)
     values (pg_temp.rid(3), pg_temp.uid(3), 'other') $$,
  '42501', null, 'report: a report cannot be filed in someone else''s name');
select throws_ok(
  $$ select count(*) from public.review_reports $$,
  '42501', null, 'report: reporters cannot read reports, not even their own');
select pg_temp.act_as(4);
select throws_ok(
  $$ insert into public.review_reports (review_id, reporter_id, reason, details)
     values (pg_temp.rid(2), pg_temp.uid(4), 'other', repeat('x', 501)) $$,
  '23514', null, 'report: details are limited to 500 characters');
select throws_ok(
  $$ insert into public.review_reports (review_id, reporter_id, reason)
     values (pg_temp.rid(2), pg_temp.uid(4), 'rude') $$,
  '22P02', null, 'report: the reason must be one of the known reasons');

-- Blocks ---------------------------------------------------------------------------------------
select pg_temp.act_as(2);
select lives_ok(
  $$ insert into public.user_blocks (blocker_id, blocked_id) values (pg_temp.uid(2), pg_temp.uid(1)) $$,
  'block: a user can block another user');
select is(
  (select count(*)::int from public.cafe_reviews('10000000-0000-4000-8000-000000000001')
   where user_id = pg_temp.uid(1)),
  0, 'block: the blocker no longer sees the blocked user''s reviews');
select is(
  (select count(*)::int from public.cafe_reviews('10000000-0000-4000-8000-000000000001')
   where user_id = pg_temp.uid(3)),
  1, 'block: other reviews are unaffected');
select pg_temp.act_as(1);
select is(
  (select count(*)::int from public.cafe_reviews('10000000-0000-4000-8000-000000000001')),
  3, 'block: the blocked user still sees everything');
select is(
  (select count(*)::int from public.user_blocks),
  0, 'block: a user cannot see anyone else''s blocks');
select pg_temp.act_as(2);
select throws_ok(
  $$ insert into public.user_blocks (blocker_id, blocked_id) values (pg_temp.uid(2), pg_temp.uid(2)) $$,
  '23514', null, 'block: a user cannot block themselves');
select lives_ok(
  $$ delete from public.user_blocks where blocker_id = pg_temp.uid(2) and blocked_id = pg_temp.uid(1) $$,
  'block: a user can unblock');
select is(
  (select count(*)::int from public.cafe_reviews('10000000-0000-4000-8000-000000000001')
   where user_id = pg_temp.uid(1)),
  1, 'block: unblocking brings the reviews back');

-- Hidden reviews -------------------------------------------------------------------------------
reset role;
select is(
  (select rating_count::int from public.cafe_scores
   where cafe_id = '10000000-0000-4000-8000-000000000001' and metric = 'coffee'),
  3, 'moderation: all three ratings count before a review is hidden');
update public.reviews set hidden_at = now() where id = pg_temp.rid(3);
select is(
  (select rating_count::int from public.cafe_scores
   where cafe_id = '10000000-0000-4000-8000-000000000001' and metric = 'coffee'),
  2, 'moderation: a hidden review stops counting toward the scores');
set local role authenticated;
select pg_temp.act_as(2);
select is(
  (select count(*)::int from public.cafe_reviews('10000000-0000-4000-8000-000000000001')
   where review_id = pg_temp.rid(3)),
  0, 'moderation: a hidden review disappears from the review list');
select is(
  (select count(*)::int from public.review_photos where review_id = pg_temp.rid(3)),
  0, 'moderation: its photo disappears too');

-- Deleting an account --------------------------------------------------------------------------
reset role;
insert into public.user_blocks (blocker_id, blocked_id) values (pg_temp.uid(1), pg_temp.uid(2));
insert into public.user_blocks (blocker_id, blocked_id) values (pg_temp.uid(3), pg_temp.uid(1));
delete from auth.users where id = pg_temp.uid(1);
select is(
  (select (select count(*) from public.profiles where id = pg_temp.uid(1))
        + (select count(*) from public.reviews where user_id = pg_temp.uid(1))
        + (select count(*) from public.saved_cafes where user_id = pg_temp.uid(1))
        + (select count(*) from public.user_blocks
           where blocker_id = pg_temp.uid(1) or blocked_id = pg_temp.uid(1))
        + (select count(*) from public.review_reports where reporter_id = pg_temp.uid(1)))::int,
  0, 'delete account: the profile, reviews, saved cafes, blocks and reports are gone');
select is(
  (select (select count(*) from public.review_drinks where review_id = pg_temp.rid(1))
        + (select count(*) from public.review_ratings where review_id = pg_temp.rid(1))
        + (select count(*) from public.review_tags where review_id = pg_temp.rid(1))
        + (select count(*) from public.review_photos where review_id = pg_temp.rid(1))
        + (select count(*) from public.review_reports where review_id = pg_temp.rid(1)))::int,
  0, 'delete account: so are the review''s drinks, ratings, tags, photo and reports against it');
select is(
  (select count(*)::int from public.reviews where user_id in (pg_temp.uid(2), pg_temp.uid(3))),
  2, 'delete account: other people''s reviews are untouched');
select is(
  (select rating_count::int from public.cafe_scores
   where cafe_id = '10000000-0000-4000-8000-000000000001' and metric = 'coffee'),
  1, 'delete account: scores recompute without the deleted reviews');

select * from finish();
rollback;
