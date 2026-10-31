begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(12);

-- Fixtures: 45 users so every review in a cafe has a distinct author.
insert into auth.users (id, email)
select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'u' || g || '@example.test'
from generate_series(1, 45) g;

insert into public.cafes (id, google_place_id, name, location)
select ('10000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
       'place_' || g, 'Cafe ' || g,
       st_setsrid(st_makepoint(144.97 + g * 0.001, -37.80), 4326)::geography
from generate_series(1, 10) g;

create function pg_temp.uid(n int) returns uuid language sql as
  $$ select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
create function pg_temp.cid(n int) returns uuid language sql as
  $$ select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;

-- Adds a review with one drink and optional food rating / price. Returns the review id.
create function pg_temp.add_review(
  p_user int, p_cafe int, p_days_ago int, p_drink text, p_rating numeric,
  p_food numeric default null, p_food_tried boolean default false, p_price numeric default null
) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into public.reviews (id, user_id, cafe_id, visit_date, comment)
  values (v_id, pg_temp.uid(p_user), pg_temp.cid(p_cafe), current_date - p_days_ago,
          'Test review comment.');
  insert into public.review_drinks (review_id, drink_id, rating, price_aud)
  values (v_id, (select id from public.drinks where slug = p_drink), p_rating, p_price);
  if p_food_tried or p_food is not null then
    insert into public.review_ratings (review_id, metric, rating) values (v_id, 'food', p_food);
  end if;
  return v_id;
end $$;

create function pg_temp.score(p_cafe int, p_metric public.metric) returns numeric language sql as
  $$ select score from public.cafe_scores where cafe_id = pg_temp.cid(p_cafe) and metric = p_metric $$;
create function pg_temp.cnt(p_cafe int, p_metric public.metric) returns bigint language sql as
  $$ select rating_count from public.cafe_scores where cafe_id = pg_temp.cid(p_cafe) and metric = p_metric $$;

-- Rule 1: a score appears from the first Coffee rating.
select pg_temp.add_review(1, 1, 0, 'flat_white', 4);
select isnt(pg_temp.score(1, 'coffee'), null, 'one Coffee rating: score appears');
select is(pg_temp.cnt(1, 'coffee'), 1::bigint, 'one Coffee rating: raw count is 1');

-- Rule 2: a single 5-star review is pulled toward the city average rather than showing 5.0,
-- and forty 4.5-star reviews score close to 4.5.
select pg_temp.add_review(2, 1, 0, 'flat_white', 4);
select pg_temp.add_review(3, 1, 0, 'flat_white', 4);
select pg_temp.add_review(g, 2, 0, 'flat_white', 4.5) from generate_series(1, 40) g;
select pg_temp.add_review(1, 3, 0, 'flat_white', 5);
select ok(pg_temp.score(3, 'coffee') < 5, 'one 5-star review is shrunk below 5.0');
select ok(pg_temp.score(2, 'coffee') between 4.4 and 4.6, 'forty 4.5s score close to 4.5');
select pg_temp.add_review(2, 3, 0, 'flat_white', 5);
select pg_temp.add_review(3, 3, 0, 'flat_white', 5);
select ok(pg_temp.score(3, 'coffee') < 5, 'three 5-star reviews are shrunk below 5.0');

-- Rule 3: a review from 12 months ago counts less than one from this week.
-- Cafe 4 has the 5 recent and two old 3s; cafe 5 has the 5 old and two recent 3s.
select pg_temp.add_review(1, 4, 7, 'flat_white', 5);
select pg_temp.add_review(2, 4, 365, 'flat_white', 3);
select pg_temp.add_review(3, 4, 365, 'flat_white', 3);
select pg_temp.add_review(1, 5, 365, 'flat_white', 5);
select pg_temp.add_review(2, 5, 7, 'flat_white', 3);
select pg_temp.add_review(3, 5, 7, 'flat_white', 3);
select ok(pg_temp.score(4, 'coffee') > pg_temp.score(5, 'coffee'),
  'recent 5-star outweighs the same 5-star from 12 months ago');

-- Rule 4: "Didn't try" for Food leaves the Food average and count unchanged.
select pg_temp.add_review(1, 6, 0, 'latte', 4, 4, true);
select pg_temp.add_review(2, 6, 0, 'latte', 4, 4.5, true);
select pg_temp.add_review(3, 6, 0, 'latte', 4, 5, true);
create temp table food_before as
  select pg_temp.score(6, 'food') as score, pg_temp.cnt(6, 'food') as cnt;
select pg_temp.add_review(4, 6, 0, 'latte', 4, null, true);
select is(pg_temp.cnt(6, 'food'), (select cnt from food_before), 'did-not-try leaves the Food count unchanged');
select is(pg_temp.score(6, 'food'), (select score from food_before), 'did-not-try leaves the Food score unchanged');

-- Rule 5: chai and matcha are stored but excluded from the Coffee average.
select pg_temp.add_review(1, 7, 0, 'flat_white', 4);
select pg_temp.add_review(2, 7, 0, 'flat_white', 4);
select pg_temp.add_review(3, 7, 0, 'flat_white', 4);
create temp table coffee_before as
  select pg_temp.score(7, 'coffee') as score, pg_temp.cnt(7, 'coffee') as cnt;
select pg_temp.add_review(4, 7, 0, 'chai', 1);
select pg_temp.add_review(5, 7, 0, 'matcha', 1);
select is(pg_temp.cnt(7, 'coffee'), (select cnt from coffee_before), 'chai and matcha do not change the Coffee count');
select is(pg_temp.score(7, 'coffee'), (select score from coffee_before), 'chai and matcha do not change the Coffee score');
select is(
  (select count(*)::int from public.review_drinks rd join public.drinks d on d.id = rd.drink_id
   join public.reviews r on r.id = rd.review_id
   where r.cafe_id = pg_temp.cid(7) and not d.counts_toward_coffee),
  2, 'chai and matcha ratings are still stored');

-- Rule 9: median price ignores a single outlier.
select pg_temp.add_review(g, 8, 0, 'flat_white', 4, null, false, p)
from (values (1, 5.00), (2, 5.50), (3, 5.00), (4, 5.50), (5, 50.00)) as v (g, p);
select is(
  (select median_price from public.cafe_drink_scores
   where cafe_id = pg_temp.cid(8) and drink_id = (select id from public.drinks where slug = 'flat_white')),
  5.50::double precision, 'median price ignores a single outlier');

select * from finish();
rollback;
