-- Same scoring formula, but the recency weight is computed in double precision. Numeric power() on
-- every rating made the score views the slowest part of the map query (about 230 ms for 10,000
-- ratings). Columns and types are unchanged; scores differ only in the last decimal places.

create or replace view public.cafe_scores as
  select m.cafe_id,
         m.metric,
         count(*) as rating_count,
         case when count(*) >= c.min_count then
           ((c.k::double precision * ca.avg_rating::double precision
             + sum(power(0.5::double precision, (current_date - m.visit_date)::double precision
                                                / c.half_life_days::double precision)
                   * m.rating::double precision))
            / (c.k::double precision
               + sum(power(0.5::double precision, (current_date - m.visit_date)::double precision
                                                  / c.half_life_days::double precision))))::numeric
         end as score
  from public.metric_ratings m
  cross join public.scoring_constants() c
  join public.city_averages ca on ca.metric = m.metric
  group by m.cafe_id, m.metric, c.k, c.min_count, ca.avg_rating;

create or replace view public.cafe_drink_scores as
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
           ((c.k::double precision * dc.avg_rating::double precision
             + sum(power(0.5::double precision, (current_date - dr.visit_date)::double precision
                                                / c.half_life_days::double precision)
                   * dr.rating::double precision))
            / (c.k::double precision
               + sum(power(0.5::double precision, (current_date - dr.visit_date)::double precision
                                                  / c.half_life_days::double precision))))::numeric
         end as score,
         percentile_cont(0.5) within group (order by dr.price_aud) as median_price,
         count(dr.price_aud) as price_reports
  from drink_ratings dr
  cross join public.scoring_constants() c
  join drink_city dc on dc.drink_id = dr.drink_id
  group by dr.cafe_id, dr.drink_id, c.k, c.min_count, dc.avg_rating;
