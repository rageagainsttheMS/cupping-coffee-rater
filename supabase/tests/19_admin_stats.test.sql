begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(16);

-- User 1 is a moderator. Users 2 and 3 are not.
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@example.test',
       jsonb_build_object('display_name', 'User ' || g),
       case when g = 1 then '{"role": "moderator"}'::jsonb else '{}'::jsonb end
from generate_series(1, 3) g;

create function pg_temp.uid(n int) returns uuid language sql as
  $$ select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.rid(n int) returns uuid language sql as
  $$ select ('20000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.act_as(n int) returns void language sql as
  $$ select set_config('request.jwt.claims',
       json_build_object('sub', pg_temp.uid(n), 'role', 'authenticated')::text, true) $$;

-- User 3 signed up 30 days ago; users 1 and 2 just now.
update public.profiles set created_at = now() - interval '30 days' where id = pg_temp.uid(3);

insert into public.cafes (id, google_place_id, name, suburb, location)
values ('10000000-0000-4000-8000-000000000001', 'place_1', 'Cafe 1', 'Fitzroy',
        st_setsrid(st_makepoint(144.9780, -37.8000), 4326)::geography);

-- Review 1: user 2, today, two drinks (4 and 3.5). Review 2: user 2, 10 days ago, hidden, no drinks.
-- Review 3: user 3, 20 days ago, one drink. User 1 has no reviews.
insert into public.reviews (id, user_id, cafe_id, comment, visit_date, created_at, hidden_at)
values (pg_temp.rid(1), pg_temp.uid(2), '10000000-0000-4000-8000-000000000001', 'Review one is here.',
        current_date, now(), null),
       (pg_temp.rid(2), pg_temp.uid(2), '10000000-0000-4000-8000-000000000001', 'Review two is here.',
        current_date - 10, now() - interval '10 days', now()),
       (pg_temp.rid(3), pg_temp.uid(3), '10000000-0000-4000-8000-000000000001', 'Review three here.',
        current_date - 20, now() - interval '20 days', null);
insert into public.review_drinks (review_id, drink_id, rating)
values (pg_temp.rid(1), 9, 4), (pg_temp.rid(1), 1, 3.5), (pg_temp.rid(3), 9, 5);

set local role authenticated;

-- A normal user gets nothing -------------------------------------------------------------------
select pg_temp.act_as(2);
select throws_ok($$ select * from public.admin_overview() $$, '42501', null,
  'a normal user cannot read the overview');
select throws_ok($$ select * from public.admin_reviews() $$, '42501', null,
  'a normal user cannot list reviews');
select throws_ok($$ select * from public.admin_users() $$, '42501', null,
  'a normal user cannot list users');

-- Overview --------------------------------------------------------------------------------------
select pg_temp.act_as(1);
select is((select total_users from public.admin_overview()), 3, 'overview: counts every user');
select is((select new_users_7d from public.admin_overview()), 2, 'overview: users from the last 7 days');
select is((select total_reviews from public.admin_overview()), 3,
  'overview: counts every review, hidden ones too');
select is((select reviews_7d from public.admin_overview()), 1, 'overview: reviews from the last 7 days');
select is((select hidden_reviews from public.admin_overview()), 1, 'overview: counts hidden reviews');

-- Reviews ---------------------------------------------------------------------------------------
select is((select array_agg(review_id) from public.admin_reviews()),
  array[pg_temp.rid(1), pg_temp.rid(2), pg_temp.rid(3)], 'reviews: all of them, newest first');
select is((select coffee from public.admin_reviews() where review_id = pg_temp.rid(1)), 3.8::numeric,
  'reviews: coffee is the drinks'' average to one decimal place');
select is((select coffee from public.admin_reviews() where review_id = pg_temp.rid(2)), null,
  'reviews: coffee is null without drinks');
select ok((select hidden_at is not null from public.admin_reviews() where review_id = pg_temp.rid(2)),
  'reviews: hidden reviews are flagged');
select is((select cafe_name || ', ' || suburb || ', ' || display_name from public.admin_reviews()
           where review_id = pg_temp.rid(3)), 'Cafe 1, Fitzroy, User 3',
  'reviews: include the cafe and the reviewer''s name');

-- Users -----------------------------------------------------------------------------------------
select is((select user_id from public.admin_users() offset 2 limit 1), pg_temp.uid(3),
  'users: newest sign-up first, so the oldest is last');
select is((select review_count from public.admin_users() where user_id = pg_temp.uid(2)), 2,
  'users: counts their reviews');
select is((select row(review_count, last_review_at)::text from public.admin_users()
           where user_id = pg_temp.uid(1)), row(0, null::timestamptz)::text,
  'users: someone with no reviews has a count of 0 and no last review');

select * from finish();
rollback;
