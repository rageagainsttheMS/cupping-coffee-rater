begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(30);

-- Fixtures ---------------------------------------------------------------------------------------
-- Users 1 to 5 (Ada, Ben, Chloe, Dev, Eliza). Ada has blocked Ben.
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@example.test',
       jsonb_build_object('display_name', (array['Ada', 'Ben', 'Chloe', 'Dev', 'Eliza'])[g])
from generate_series(1, 5) g;
insert into public.user_blocks (blocker_id, blocked_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');

-- Cafe A (Fitzroy) is rated, B is about 200 m away and unrated, C is far away.
insert into public.cafes (id, google_place_id, name, suburb, location) values
  ('10000000-0000-4000-8000-00000000000a', 'place_a', 'Cafe Alpha', 'Fitzroy',
   st_setsrid(st_makepoint(144.9780, -37.8000), 4326)::geography),
  ('10000000-0000-4000-8000-00000000000b', 'place_b', 'Cafe Bravo', 'Carlton',
   st_setsrid(st_makepoint(144.9780, -37.8018), 4326)::geography),
  ('10000000-0000-4000-8000-00000000000c', 'place_c', 'Cafe Charlie', 'Brunswick',
   st_setsrid(st_makepoint(145.2000, -37.9000), 4326)::geography);

-- Reviews at A. Review n belongs to user n. Review 5 is hidden. Created one hour apart, newest first.
insert into public.reviews (id, user_id, cafe_id, comment, beans, hidden_at, created_at)
select ('20000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
       ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
       '10000000-0000-4000-8000-00000000000a', 'Review number ' || g || ' here.',
       (array['Market Lane', 'MARKET LANE', 'Axil', null, 'Hidden Roast'])[g],
       case when g = 5 then now() end,
       now() - (g || ' hours')::interval
from generate_series(1, 5) g;

-- Reviews 1, 2, 3 and 5: flat white. Review 4: chai only. Only review 1 reports a price.
insert into public.review_drinks (review_id, drink_id, rating, price_aud)
select ('20000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
       case when g = 4 then 19 else 9 end,
       (array[4.5, 4.0, 5.0, 5.0, 3.0])[g],
       case when g = 1 then 5.5 end
from generate_series(1, 5) g;

-- Food from reviews 1 to 3, work from review 1.
insert into public.review_ratings (review_id, metric, rating)
select ('20000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'food', 4
from generate_series(1, 3) g;
insert into public.review_ratings (review_id, metric, rating)
values ('20000000-0000-4000-8000-000000000001', 'work', 4);

create function pg_temp.tid(p_metric public.metric, p_label text) returns smallint language sql as
  $$ select id from public.tags where metric = p_metric and label = p_label $$;
-- Review 1: Smooth + Wifi. Review 2: Smooth. Review 5 (hidden): Strong.
insert into public.review_tags (review_id, tag_id) values
  ('20000000-0000-4000-8000-000000000001', pg_temp.tid('coffee', 'Smooth')),
  ('20000000-0000-4000-8000-000000000001', pg_temp.tid('work', 'Wifi')),
  ('20000000-0000-4000-8000-000000000002', pg_temp.tid('coffee', 'Smooth')),
  ('20000000-0000-4000-8000-000000000005', pg_temp.tid('coffee', 'Strong'));

insert into public.saved_cafes (user_id, cafe_id)
values ('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-00000000000a');

create function pg_temp.act_as(n int) returns void language sql as
  $$ select set_config('request.jwt.claims',
       json_build_object('sub', ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
                         'role', 'authenticated')::text, true) $$;

-- Views -------------------------------------------------------------------------------------------
select is(
  (select report_count from public.cafe_top_beans
   where cafe_id = '10000000-0000-4000-8000-00000000000a' and lower(beans) = 'market lane'),
  2::bigint, 'beans are counted case-insensitively');
select is(
  (select count(*)::int from public.cafe_top_beans where lower(beans) = 'hidden roast'),
  0, 'beans from hidden reviews are not counted');
select is(
  (select tag_count from public.cafe_tag_counts
   where cafe_id = '10000000-0000-4000-8000-00000000000a' and label = 'Smooth'),
  2::bigint, 'tag counts group by tag id');
select is(
  (select count(*)::int from public.cafe_tag_counts where label = 'Strong'),
  0, 'tags from hidden reviews are not counted');

update public.tags set label = 'Silky' where id = pg_temp.tid('coffee', 'Smooth');
select is(
  (select tag_count from public.cafe_tag_counts
   where cafe_id = '10000000-0000-4000-8000-00000000000a' and label = 'Silky'),
  2::bigint, 'a renamed tag keeps its count under the new label');
update public.tags set active = false where label = 'Silky';
select is(
  (select tag_count from public.cafe_tag_counts
   where cafe_id = '10000000-0000-4000-8000-00000000000a' and label = 'Silky'),
  2::bigint, 'a retired tag still counts');

set local role authenticated;
select pg_temp.act_as(3);

-- nearby_cafes ------------------------------------------------------------------------------------
select is(
  (select array_agg(name order by distance_m) from public.nearby_cafes(-37.8000, 144.9780, 10)),
  array['Cafe Alpha', 'Cafe Bravo', 'Cafe Charlie'], 'nearby cafes are ordered nearest first');
select ok(
  (select distance_m from public.nearby_cafes(-37.8000, 144.9780, 10) where name = 'Cafe Alpha') < 1,
  'distance is in metres and about zero at the cafe');
select is((select count(*)::int from public.nearby_cafes(-37.8000, 144.9780, 1)), 1,
  'nearby cafes respects the limit');

-- search_cafes ------------------------------------------------------------------------------------
select is((select array_agg(name) from public.search_cafes('alph')), array['Cafe Alpha'],
  'search matches the name, ignoring case');
select is((select array_agg(name) from public.search_cafes('carlton')), array['Cafe Bravo'],
  'search matches the suburb');
select is((select count(*)::int from public.search_cafes('%')), 0,
  'percent signs are searched literally');
select is(
  (select array_agg(name) from public.search_cafes('cafe', -37.8000, 144.9780)),
  array['Cafe Alpha', 'Cafe Bravo', 'Cafe Charlie'], 'search with a position returns nearest first');

-- cafe_detail -------------------------------------------------------------------------------------
select is(
  (public.cafe_detail('10000000-0000-4000-8000-00000000000a') #>> '{scores,coffee,count}')::int,
  3, 'detail: coffee count ignores hidden reviews and chai');
select isnt(public.cafe_detail('10000000-0000-4000-8000-00000000000a') #>> '{scores,coffee,score}', null,
  'detail: coffee has a score at three ratings');
select is(
  (select (d ->> 'price_reports')::int
   from jsonb_array_elements(public.cafe_detail('10000000-0000-4000-8000-00000000000a') -> 'drinks') d
   where d ->> 'name' = 'Flat white'),
  1, 'detail: the drink list carries price reports');
select is(
  (select count(*)::int
   from jsonb_array_elements(public.cafe_detail('10000000-0000-4000-8000-00000000000a') -> 'drinks') d
   where d ->> 'name' = 'Chai'),
  0, 'detail: chai is not listed in Phase 1');
select is(
  lower(public.cafe_detail('10000000-0000-4000-8000-00000000000a') #>> '{beans,0,beans}'),
  'market lane', 'detail: the most reported beans come first');
select is(
  (select (t ->> 'count')::int
   from jsonb_array_elements(public.cafe_detail('10000000-0000-4000-8000-00000000000a') -> 'tags') t
   where t ->> 'label' = 'Silky'),
  2, 'detail: tag counts use the current label');
select is((public.cafe_detail('10000000-0000-4000-8000-00000000000a') ->> 'saved')::boolean, false,
  'detail: not saved for a user who has not saved it');
select is(public.cafe_detail('10000000-0000-4000-8000-0000000000ff'), null, 'detail: unknown cafe is null');

-- cafe_reviews ------------------------------------------------------------------------------------
select is(
  (select count(*)::int from public.cafe_reviews('10000000-0000-4000-8000-00000000000a')), 4,
  'reviews: hidden reviews are not returned');
select pg_temp.act_as(1);
select is(
  (select array_agg(author_name order by created_at desc)
   from public.cafe_reviews('10000000-0000-4000-8000-00000000000a')),
  array['Ada', 'Chloe', 'Dev'], 'reviews: a blocked user''s reviews are not returned, newest first');
select pg_temp.act_as(3);
select is(
  (select count(*)::int from public.cafe_reviews('10000000-0000-4000-8000-00000000000a', 'work')), 1,
  'reviews: filter by metric');
select is(
  (select count(*)::int from public.cafe_reviews('10000000-0000-4000-8000-00000000000a', null, 19)), 1,
  'reviews: filter by drink');
with first_page as (
  select * from public.cafe_reviews('10000000-0000-4000-8000-00000000000a', p_page_size => 2)
), last_row as (
  select created_at, review_id from first_page order by created_at, review_id limit 1
)
select is(
  (select count(*)::int from public.cafe_reviews('10000000-0000-4000-8000-00000000000a',
     p_page_size => 2, p_before_created_at => (select created_at from last_row),
     p_before_id => (select review_id from last_row))
   where review_id not in (select review_id from first_page)),
  2, 'reviews: the next page continues after the cursor without overlap');
select is(
  (select jsonb_array_length(drinks) * 10 + jsonb_array_length(tags)
   from public.cafe_reviews('10000000-0000-4000-8000-00000000000a')
   where author_name = 'Ada'),
  12, 'reviews: drinks and tags are returned as arrays');
select throws_ok(
  $$ select * from public.cafe_reviews('10000000-0000-4000-8000-00000000000a', p_sort => 'helpful') $$,
  '22023', 'invalid_sort', 'reviews: only recent sorting is supported in Phase 1');

-- my_saved_cafes ----------------------------------------------------------------------------------
select pg_temp.act_as(1);
select is(
  (select last_drink_name || ' ' || last_rating::text from public.my_saved_cafes()),
  'Flat white 4.5', 'saved: shows the caller''s last drink rating at the cafe');
select pg_temp.act_as(3);
select is((select count(*)::int from public.my_saved_cafes()), 0,
  'saved: other users'' saved cafes are not returned');

select * from finish();
rollback;
