begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(42);

-- User 1 is a moderator. Users 2 to 4 are not.
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@example.test',
       jsonb_build_object('display_name', 'User ' || g),
       case when g = 1 then '{"role": "moderator"}'::jsonb else '{}'::jsonb end
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
create function pg_temp.coffee_count() returns int language sql as
  $$ select rating_count::int from public.cafe_scores
     where cafe_id = '10000000-0000-4000-8000-000000000001' and metric = 'coffee' $$;

-- Reviews 1 and 2 belong to user 3, review 3 to user 2. All at Cafe 1 with a flat white.
insert into public.reviews (id, user_id, cafe_id, comment, visit_date)
values (pg_temp.rid(1), pg_temp.uid(3), '10000000-0000-4000-8000-000000000001', 'Review one is here.', current_date),
       (pg_temp.rid(2), pg_temp.uid(3), '10000000-0000-4000-8000-000000000001', 'Review two is here.', current_date - 1),
       (pg_temp.rid(3), pg_temp.uid(2), '10000000-0000-4000-8000-000000000001', 'Review three here.', current_date);
insert into public.review_drinks (review_id, drink_id, rating)
select pg_temp.rid(g), 9, 4 from generate_series(1, 3) g;

-- Review 1 has two open reports, review 3 has one.
insert into public.review_reports (review_id, reporter_id, reason, details)
values (pg_temp.rid(1), pg_temp.uid(2), 'spam', 'An advert.'),
       (pg_temp.rid(1), pg_temp.uid(4), 'fake', null),
       (pg_temp.rid(3), pg_temp.uid(3), 'offensive', null);

set local role authenticated;

-- A normal user can do none of it ------------------------------------------------------------
select pg_temp.act_as(2);
select is(public.is_moderator(), false, 'a normal user is not a moderator');
select throws_ok($$ select * from public.moderation_queue() $$, '42501', null,
  'a normal user cannot read the queue');
select throws_ok($$ select public.moderation_review(pg_temp.rid(1)) $$, '42501', null,
  'a normal user cannot read a report');
select throws_ok($$ select public.moderation_open_count() $$, '42501', null,
  'a normal user cannot read the open count');
select throws_ok($$ select * from public.moderation_banned_users() $$, '42501', null,
  'a normal user cannot list banned people');
select throws_ok($$ select public.moderate_review(pg_temp.rid(1), 'hide') $$, '42501', null,
  'a normal user cannot hide a review');
select throws_ok($$ select public.apply_ban(pg_temp.uid(3), pg_temp.uid(2)) $$, '42501', null,
  'a normal user cannot call apply_ban');
select throws_ok($$ select public.lift_ban(pg_temp.uid(3), pg_temp.uid(2)) $$, '42501', null,
  'a normal user cannot call lift_ban');
select is((select count(*)::int from public.moderation_actions), 0,
  'a normal user sees nothing in the log');
select throws_ok($$ select count(*) from public.review_reports $$, '42501', null,
  'a normal user still cannot read reports');

-- The queue and the Report screen --------------------------------------------------------------
select pg_temp.act_as(1);
select is(public.is_moderator(), true, 'the moderator role is read from app_metadata');
select is(public.moderation_open_count(), 2, 'open count: two reviews have open reports');
select is(
  (select array_agg(review_id order by oldest_report_at, review_id) from public.moderation_queue()),
  array[pg_temp.rid(1), pg_temp.rid(3)], 'queue: one row per reported review, oldest report first');
select is((select report_count from public.moderation_queue() where review_id = pg_temp.rid(1)), 2,
  'queue: counts the reports on a review');
select is((select reasons from public.moderation_queue() where review_id = pg_temp.rid(1)),
  array['fake', 'spam'], 'queue: lists the reasons');
select throws_ok($$ select * from public.moderation_queue('everything') $$, '22023', null,
  'queue: an unknown status is refused');
select is(jsonb_array_length(public.moderation_review(pg_temp.rid(1)) -> 'reports'), 2,
  'report: shows every report');
select is(position(pg_temp.uid(2)::text in public.moderation_review(pg_temp.rid(1))::text), 0,
  'report: never names a reporter');
select is((public.moderation_review(pg_temp.rid(1)) #>> '{author,review_count}')::int, 2,
  'report: shows how many reviews the author has');

-- Dismiss, hide, restore -----------------------------------------------------------------------
select lives_ok($$ select public.moderate_review(pg_temp.rid(3), 'dismiss', 'Fair criticism.') $$,
  'dismiss: a moderator can dismiss the reports on a review');
select is(public.moderation_open_count(), 1, 'dismiss: the review''s reports are closed');
select is(
  (select count(*)::int from public.cafe_reviews('10000000-0000-4000-8000-000000000001')
   where review_id = pg_temp.rid(3)),
  1, 'dismiss: the review stays visible');

select is(pg_temp.coffee_count(), 3, 'hide: three ratings count before');
select lives_ok($$ select public.moderate_review(pg_temp.rid(1), 'hide') $$,
  'hide: a moderator can hide a review');
select is(pg_temp.coffee_count(), 2, 'hide: the hidden review stops counting toward the scores');
select is(public.moderation_open_count(), 0, 'hide: the review''s reports are closed too');
select is((select count(*)::int from public.moderation_queue('hidden')), 1,
  'hide: the review is listed under Hidden');
select lives_ok($$ select public.moderate_review(pg_temp.rid(1), 'restore') $$,
  'restore: a moderator can restore a review');
select is(pg_temp.coffee_count(), 3, 'restore: the review counts toward the scores again');
select throws_ok($$ select public.moderate_review(pg_temp.rid(1), 'ban') $$, '22023', null,
  'a ban cannot go through moderate_review');
select is(
  (select count(*)::int from public.moderation_actions where moderator_id = pg_temp.uid(1)),
  3, 'log: every action is recorded with the moderator');

-- Ban and unban (the Edge Function sets the auth ban, then calls these) ------------------------
select lives_ok($$ select public.moderate_review(pg_temp.rid(2), 'hide', 'Hidden on its own.') $$,
  'ban setup: one of user 3''s reviews is hidden on its own first');
reset role;
update auth.users set banned_until = now() + interval '100 years' where id = pg_temp.uid(3);
select is(public.apply_ban(pg_temp.uid(3), pg_temp.uid(1), 'Spam.'), 1,
  'ban: hides the person''s visible reviews');

set local role authenticated;
select pg_temp.act_as(3);
select throws_ok(
  $$ select public.submit_review(gen_random_uuid(), '10000000-0000-4000-8000-000000000001',
       '[{"drink_id": 9, "rating": 4}]'::jsonb, p_comment => 'Posting while banned.') $$,
  '42501', null, 'ban: a banned person cannot post with a token issued before the ban');
select throws_ok(
  $$ insert into public.review_reports (review_id, reporter_id, reason)
     values (pg_temp.rid(3), pg_temp.uid(3), 'spam') $$,
  '42501', null, 'ban: a banned person cannot file reports');
select pg_temp.act_as(1);
select is((select array_agg(user_id) from public.moderation_banned_users()), array[pg_temp.uid(3)],
  'ban: the person is listed under Banned');

reset role;
update auth.users set banned_until = null where id = pg_temp.uid(3);
select is(public.lift_ban(pg_temp.uid(3), pg_temp.uid(1)), 1, 'unban: restores what the ban hid');
select ok((select hidden_at is not null from public.reviews where id = pg_temp.rid(2)),
  'unban: a review hidden on its own stays hidden');

select public.apply_ban(pg_temp.uid(3), pg_temp.uid(1));
select is(public.apply_ban(pg_temp.uid(3), pg_temp.uid(1)), 0, 'ban: a retried ban hides nothing new');
select is(public.lift_ban(pg_temp.uid(3), pg_temp.uid(1)), 1,
  'unban: still restores everything after a retried ban');

-- Losing the role ------------------------------------------------------------------------------
update auth.users set banned_until = now() + interval '100 years' where id = pg_temp.uid(1);
set local role authenticated;
select pg_temp.act_as(1);
select is(public.is_moderator(), false, 'a banned moderator is no longer a moderator');
reset role;
update auth.users set banned_until = null, raw_app_meta_data = '{}' where id = pg_temp.uid(1);
set local role authenticated;
select pg_temp.act_as(1);
select throws_ok($$ select * from public.moderation_queue() $$, '42501', null,
  'removing the role takes effect at once, without a new token');

select * from finish();
rollback;
