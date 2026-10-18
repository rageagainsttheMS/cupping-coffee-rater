begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(16);

insert into auth.users (id, email)
select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@example.test'
from generate_series(1, 8) g;

insert into public.cafes (id, google_place_id, name, location)
values ('10000000-0000-4000-8000-000000000001', 'place_1', 'Cafe 1',
        st_setsrid(st_makepoint(144.9780, -37.8000), 4326)::geography);

create function pg_temp.act_as(n int) returns void language sql as
  $$ select set_config('request.jwt.claims',
       json_build_object('sub', ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
                         'role', 'authenticated')::text, true) $$;
create function pg_temp.tid(p_metric public.metric, p_label text) returns smallint language sql as
  $$ select id from public.tags where metric = p_metric and label = p_label $$;
create function pg_temp.cafe1() returns uuid language sql as
  $$ select '10000000-0000-4000-8000-000000000001'::uuid $$;

-- Seed and shape.
select is((select count(*)::int from public.tags), 20, 'the quick tags from the product doc are seeded');
select is(
  (select array_agg(label order by sort_order) from public.tags where metric = 'coffee'),
  array['Strong', 'Smooth', 'Bitter', 'Too hot', 'Great milk'], 'coffee tags keep the product doc order');
select throws_ok(
  $$ insert into public.tags (metric, label, sort_order) values ('work', 'Wifi', 99) $$,
  '23505', null, 'a tag label is unique within its metric');
select has_column('public', 'review_tags', 'tag_id', 'review_tags references a tag by id');
select hasnt_column('public', 'review_tags', 'tag', 'review_tags no longer stores label text');
select is((select count(*)::int from public.drinks where not active), 0, 'every seeded drink is active');

-- Access: signed-in read only; anon nothing.
set local role anon;
select throws_ok($$ select * from public.tags $$, '42501', null, 'anonymous users cannot read tags');
reset role;
set local role authenticated;
select pg_temp.act_as(1);
select ok((select count(*) from public.tags) > 0, 'signed-in users can read tags');
select throws_ok($$ update public.tags set label = 'Hacked' $$, '42501', null, 'signed-in users cannot edit tags');

-- submit_review validates tag ids.
select is(
  (public.submit_review(gen_random_uuid(), pg_temp.cafe1(), '[{"drink_id": 9, "rating": 4.5}]',
     p_work => 4,
     p_tags => jsonb_build_array(pg_temp.tid('coffee', 'Smooth'), pg_temp.tid('work', 'Wifi')),
     p_comment => 'Smooth coffee and good wifi.') ->> 'verified')::boolean,
  false, 'a review with a coffee tag and a work tag (work rated) is accepted');
select is((select count(*)::int from public.review_tags), 2, 'both tags are stored by id');

select pg_temp.act_as(2);
select throws_ok(
  $$ select public.submit_review(gen_random_uuid(), '10000000-0000-4000-8000-000000000001',
       '[{"drink_id": 9, "rating": 4}]', p_tags => '[9999]', p_comment => 'Unknown tag id here.') $$,
  '22023', 'invalid_tags', 'an unknown tag id is rejected');
select throws_ok(
  $$ select public.submit_review(gen_random_uuid(), '10000000-0000-4000-8000-000000000001',
       '[{"drink_id": 9, "rating": 4}]', p_tags => jsonb_build_array(pg_temp.tid('food', 'Brunch')),
       p_comment => 'Food tag but no food rating.') $$,
  '22023', 'invalid_tags', 'a tag for a metric the review did not rate is rejected');

-- Retiring a tag or a drink stops new use but keeps history; renaming keeps history.
reset role;
update public.tags set active = false where id = pg_temp.tid('coffee', 'Bitter');
update public.drinks set active = false where id = 8;
set local role authenticated;
select pg_temp.act_as(3);
select throws_ok(
  $$ select public.submit_review(gen_random_uuid(), '10000000-0000-4000-8000-000000000001',
       '[{"drink_id": 9, "rating": 4}]', p_tags => jsonb_build_array(pg_temp.tid('coffee', 'Bitter')),
       p_comment => 'Retired tag should fail.') $$,
  '22023', 'invalid_tags', 'a retired tag is rejected for new reviews');
select throws_ok(
  $$ select public.submit_review(gen_random_uuid(), '10000000-0000-4000-8000-000000000001',
       '[{"drink_id": 8, "rating": 4}]', p_comment => 'Retired drink should fail.') $$,
  '22023', 'invalid_drinks', 'a retired drink is rejected for new reviews');

reset role;
update public.tags set label = 'Silky' where id = pg_temp.tid('coffee', 'Smooth');
select is(
  (select t.label from public.review_tags rt join public.tags t on t.id = rt.tag_id
   where t.metric = 'coffee'),
  'Silky', 'renaming a tag keeps the review linked and shows the new label');

select * from finish();
rollback;
