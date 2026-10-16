-- Scoring lives entirely in SQL so the app never computes a score itself.
-- score = (k * city_avg + sum(w * r)) / (k + sum(w)), with w = 0.5 ^ (age_days / half_life_days).

create function public.scoring_constants()
returns table (k numeric, half_life_days numeric, min_count integer)
language sql
immutable
as $$
  select 5::numeric, 365::numeric, 3;
$$;

-- One row per rating that counts toward a cafe metric. Hidden reviews are excluded.
-- Coffee ratings come from drinks flagged counts_toward_coffee; chai and matcha are stored but left out.
create view public.metric_ratings as
  select r.cafe_id, 'coffee'::public.metric as metric, rd.drink_id, rd.rating::numeric as rating,
         r.visit_date, r.id as review_id
  from public.review_drinks rd
  join public.reviews r on r.id = rd.review_id
  join public.drinks d on d.id = rd.drink_id
  where r.hidden_at is null and d.counts_toward_coffee
  union all
  select r.cafe_id, rr.metric, null::smallint, rr.rating::numeric, r.visit_date, r.id
  from public.review_ratings rr
  join public.reviews r on r.id = rr.review_id
  where r.hidden_at is null and rr.rating is not null;

create view public.city_averages as
  select metric, avg(rating) as avg_rating
  from public.metric_ratings
  group by metric;

-- score is null until a cafe has the minimum number of ratings; rating_count is always the raw count.
create view public.cafe_scores as
  select m.cafe_id,
         m.metric,
         count(*) as rating_count,
         case when count(*) >= c.min_count then
           (c.k * ca.avg_rating
             + sum(power(0.5, (current_date - m.visit_date) / c.half_life_days) * m.rating))
           / (c.k + sum(power(0.5, (current_date - m.visit_date) / c.half_life_days)))
         end as score
  from public.metric_ratings m
  cross join public.scoring_constants() c
  join public.city_averages ca on ca.metric = m.metric
  group by m.cafe_id, m.metric, c.k, c.min_count, ca.avg_rating;

-- Per (cafe, drink): the same formula against the Coffee city average, plus median price.
-- Drinks outside the Coffee average (chai, matcha) are scored here too, against their own average.
create view public.cafe_drink_scores as
  with drink_ratings as (
    select r.cafe_id, rd.drink_id, rd.rating::numeric as rating, rd.price_aud, r.visit_date
    from public.review_drinks rd
    join public.reviews r on r.id = rd.review_id
    where r.hidden_at is null
  ),
  drink_city as (
    select drink_id, avg(rating) as avg_rating from drink_ratings group by drink_id
  )
  select dr.cafe_id,
         dr.drink_id,
         count(*) as rating_count,
         case when count(*) >= c.min_count then
           (c.k * dc.avg_rating
             + sum(power(0.5, (current_date - dr.visit_date) / c.half_life_days) * dr.rating))
           / (c.k + sum(power(0.5, (current_date - dr.visit_date) / c.half_life_days)))
         end as score,
         percentile_cont(0.5) within group (order by dr.price_aud) as median_price,
         count(dr.price_aud) as price_reports
  from drink_ratings dr
  cross join public.scoring_constants() c
  join drink_city dc on dc.drink_id = dr.drink_id
  group by dr.cafe_id, dr.drink_id, c.k, c.min_count, dc.avg_rating;

-- Views run with their owner's rights, so scores do not depend on who is looking.
revoke all on public.metric_ratings, public.city_averages, public.cafe_scores,
  public.cafe_drink_scores from anon;
grant select on public.cafe_scores, public.cafe_drink_scores, public.city_averages to authenticated;
revoke all on public.metric_ratings from authenticated;

revoke execute on function public.scoring_constants() from public, anon;
grant execute on function public.scoring_constants() to authenticated;
