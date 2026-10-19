begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(14);

insert into auth.users (id, email)
select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@example.test'
from generate_series(1, 5) g;

insert into public.cafes (id, google_place_id, name, location)
values ('10000000-0000-4000-8000-000000000001', 'place_1', 'Cafe 1',
        st_setsrid(st_makepoint(144.9780, -37.8000), 4326)::geography);

create function pg_temp.uid(n int) returns uuid language sql as
  $$ select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.act_as(n int) returns void language sql as
  $$ select set_config('request.jwt.claims',
       json_build_object('sub', pg_temp.uid(n), 'role', 'authenticated')::text, true) $$;
create function pg_temp.tag(m text, l text) returns smallint language sql as
  $$ select id from public.tags where metric = m::public.metric and label = l $$;

set local role authenticated;

-- Users 1 to 3 rate Work already, so the cafe is one rating short of a Work score.
select pg_temp.act_as(1);
select public.submit_review('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
  '[{"drink_id": 9, "rating": 4}]', p_work => 4, p_comment => 'First review with work.');
select pg_temp.act_as(2);
select public.submit_review('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
  '[{"drink_id": 9, "rating": 4}]', p_work => 5, p_comment => 'Second review with work.');
-- User 3 skips Work, then adds it from the Posted screen.
select pg_temp.act_as(3);
select public.submit_review('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
  '[{"drink_id": 9, "rating": 4}]', p_comment => 'Skipped work at first.');

select is(
  (public.update_review_ratings('20000000-0000-4000-8000-000000000003', p_work => 4.5)
    -> 'before' -> 'work' ->> 'count'),
  '2', 'the response reports the Work count before the update');
select is(
  (select rating::text from public.review_ratings
   where review_id = '20000000-0000-4000-8000-000000000003' and metric = 'work'),
  '4.5', 'the Work rating is stored on the review');
select is(
  (select score is not null from public.cafe_scores
   where cafe_id = '10000000-0000-4000-8000-000000000001' and metric = 'work'),
  true, 'the third Work rating unlocks the Work score');
select is(
  (public.update_review_ratings('20000000-0000-4000-8000-000000000003', p_work => 4.5)
    -> 'after' -> 'work' ->> 'count'),
  '3', 'the response reports the Work count after the update');

-- Tags for the newly rated metric are added; calling again with the same tag is harmless.
select lives_ok(
  format($$select public.update_review_ratings('20000000-0000-4000-8000-000000000003',
    p_work => 4.5, p_tags => '[%s]')$$, pg_temp.tag('work', 'Wifi')),
  'a Work tag is accepted once Work is rated');
select is(
  (select count(*)::int from public.review_tags
   where review_id = '20000000-0000-4000-8000-000000000003' and tag_id = pg_temp.tag('work', 'Wifi')),
  1, 'the tag is stored once');

-- Changing a rating is allowed within the window.
select is(
  (public.update_review_ratings('20000000-0000-4000-8000-000000000003', p_work => 3)
    -> 'after' -> 'work' ->> 'count'),
  '3', 'changing a rating does not add a second one');

-- Rejections.
select throws_ok(
  format($$select public.update_review_ratings('20000000-0000-4000-8000-000000000003',
    p_work => 4, p_tags => '[%s]')$$, pg_temp.tag('vibe', 'Quiet')),
  '22023', 'invalid_tags', 'a tag for a metric the review does not rate is rejected');
select throws_ok(
  $$select public.update_review_ratings('20000000-0000-4000-8000-000000000003')$$,
  '22023', 'invalid_ratings', 'an update with no ratings is rejected');
select throws_ok(
  $$select public.update_review_ratings('20000000-0000-4000-8000-000000000003', p_work => 3.3)$$,
  '23514', null, 'a rating that is not a half step is rejected');

select pg_temp.act_as(4);
select throws_ok(
  $$select public.update_review_ratings('20000000-0000-4000-8000-000000000003', p_vibe => 4)$$,
  'P0002', 'review_not_found', 'another user cannot update the review');

-- Outside the 24 hour window, and for a hidden review.
reset role;
update public.reviews set created_at = now() - interval '25 hours'
  where id = '20000000-0000-4000-8000-000000000003';
set local role authenticated;
select pg_temp.act_as(3);
select throws_ok(
  $$select public.update_review_ratings('20000000-0000-4000-8000-000000000003', p_vibe => 4)$$,
  'P0001', 'edit_window_closed', 'a review older than 24 hours cannot be updated');

reset role;
update public.reviews set created_at = now(), hidden_at = now()
  where id = '20000000-0000-4000-8000-000000000003';
set local role authenticated;
select pg_temp.act_as(3);
select throws_ok(
  $$select public.update_review_ratings('20000000-0000-4000-8000-000000000003', p_vibe => 4)$$,
  'P0002', 'review_not_found', 'a hidden review cannot be updated');

reset role;
set local role anon;
select throws_ok(
  $$select public.update_review_ratings('20000000-0000-4000-8000-000000000003', p_vibe => 4)$$,
  '42501', null, 'anon cannot execute update_review_ratings');
reset role;

select * from finish();
rollback;
