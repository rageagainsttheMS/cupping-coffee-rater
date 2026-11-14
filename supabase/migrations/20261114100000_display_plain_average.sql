-- Show people the plain average of the ratings, and rank by the weighted score.
-- `score` is now the plain average of a cafe's ratings: two 4-star reviews show 4.0. The Bayesian,
-- recency-weighted score moves to `rank_score` and is used only for ordering, so a single 5-star
-- review still does not outrank forty 4.5-star reviews. Both are null below min_count ratings.
-- Every function that returns `score` (cafe detail, saved cafes, before/after snapshots) now shows
-- the plain average without being redefined. Only the functions that order by score change here.

create or replace view public.cafe_scores as
  select m.cafe_id,
         m.metric,
         count(*) as rating_count,
         case when count(*) >= c.min_count then avg(m.rating) end as score,
         case when count(*) >= c.min_count then
           ((c.k::double precision * ca.avg_rating::double precision
             + sum(power(0.5::double precision, (current_date - m.visit_date)::double precision
                                                / c.half_life_days::double precision)
                   * m.rating::double precision))
            / (c.k::double precision
               + sum(power(0.5::double precision, (current_date - m.visit_date)::double precision
                                                  / c.half_life_days::double precision))))::numeric
         end as rank_score
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
         case when count(*) >= c.min_count then avg(dr.rating) end as score,
         percentile_cont(0.5) within group (order by dr.price_aud) as median_price,
         count(dr.price_aud) as price_reports,
         case when count(*) >= c.min_count then
           ((c.k::double precision * dc.avg_rating::double precision
             + sum(power(0.5::double precision, (current_date - dr.visit_date)::double precision
                                                / c.half_life_days::double precision)
                   * dr.rating::double precision))
            / (c.k::double precision
               + sum(power(0.5::double precision, (current_date - dr.visit_date)::double precision
                                                  / c.half_life_days::double precision))))::numeric
         end as rank_score
  from drink_ratings dr
  cross join public.scoring_constants() c
  join drink_city dc on dc.drink_id = dr.drink_id
  group by dr.cafe_id, dr.drink_id, c.k, c.min_count, dc.avg_rating;

-- The map query gains `rank_score` for the selected metric, which the app sorts cards and picks
-- each cluster's best cafe by. The best drink is chosen by rank_score and shows its plain average.
-- A new output column means the function has to be dropped and recreated.
drop function public.cafes_in_view(
  double precision, double precision, double precision, double precision, public.metric
);

create function public.cafes_in_view(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  p_metric public.metric
)
returns table (
  id uuid,
  google_place_id text,
  name text,
  suburb text,
  lat double precision,
  lng double precision,
  score numeric,
  rank_score numeric,
  rating_count bigint,
  coffee_score numeric,
  coffee_count bigint,
  food_score numeric,
  food_count bigint,
  vibe_score numeric,
  vibe_count bigint,
  work_score numeric,
  work_count bigint,
  best_drink text,
  best_drink_score numeric,
  has_ratings boolean
)
language sql
stable
set search_path = public, extensions
as $$
  with box as (
    select c.*
    from public.cafes c
    where c.location && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
  ),
  scores as materialized (
    select s.cafe_id,
           max(s.score) filter (where s.metric = 'coffee') as coffee_score,
           max(s.rank_score) filter (where s.metric = 'coffee') as coffee_rank,
           coalesce(sum(s.rating_count) filter (where s.metric = 'coffee'), 0) as coffee_count,
           max(s.score) filter (where s.metric = 'food') as food_score,
           max(s.rank_score) filter (where s.metric = 'food') as food_rank,
           coalesce(sum(s.rating_count) filter (where s.metric = 'food'), 0) as food_count,
           max(s.score) filter (where s.metric = 'vibe') as vibe_score,
           max(s.rank_score) filter (where s.metric = 'vibe') as vibe_rank,
           coalesce(sum(s.rating_count) filter (where s.metric = 'vibe'), 0) as vibe_count,
           max(s.score) filter (where s.metric = 'work') as work_score,
           max(s.rank_score) filter (where s.metric = 'work') as work_rank,
           coalesce(sum(s.rating_count) filter (where s.metric = 'work'), 0) as work_count
    from public.cafe_scores s
    where s.cafe_id in (select b.id from box b)
    group by s.cafe_id
  )
  select b.id,
         b.google_place_id,
         b.name,
         b.suburb,
         st_y(b.location::geometry),
         st_x(b.location::geometry),
         case p_metric when 'coffee' then sc.coffee_score when 'food' then sc.food_score
                       when 'vibe' then sc.vibe_score when 'work' then sc.work_score end,
         case p_metric when 'coffee' then sc.coffee_rank when 'food' then sc.food_rank
                       when 'vibe' then sc.vibe_rank when 'work' then sc.work_rank end,
         coalesce(case p_metric when 'coffee' then sc.coffee_count when 'food' then sc.food_count
                                when 'vibe' then sc.vibe_count when 'work' then sc.work_count end, 0)::bigint,
         sc.coffee_score, coalesce(sc.coffee_count, 0)::bigint,
         sc.food_score, coalesce(sc.food_count, 0)::bigint,
         sc.vibe_score, coalesce(sc.vibe_count, 0)::bigint,
         sc.work_score, coalesce(sc.work_count, 0)::bigint,
         bd.name,
         bd.score,
         coalesce(sc.coffee_count, 0) + coalesce(sc.food_count, 0)
           + coalesce(sc.vibe_count, 0) + coalesce(sc.work_count, 0) > 0
  from box b
  left join scores sc on sc.cafe_id = b.id
  left join lateral (
    select d.name, ds.score
    from public.cafe_drink_scores ds
    join public.drinks d on d.id = ds.drink_id
    where ds.cafe_id = b.id and ds.score is not null and d.counts_toward_coffee
    order by ds.rank_score desc, ds.rating_count desc
    limit 1
  ) bd on true
  order by coalesce(sc.coffee_count, 0) + coalesce(sc.food_count, 0)
         + coalesce(sc.vibe_count, 0) + coalesce(sc.work_count, 0) desc,
           b.name
  limit 500;
$$;

revoke execute on function public.cafes_in_view(
  double precision, double precision, double precision, double precision, public.metric
) from public, anon;
grant execute on function public.cafes_in_view(
  double precision, double precision, double precision, double precision, public.metric
) to authenticated;

-- The cafe page lists drinks best first by rank_score; each drink still shows its plain average.
create or replace function public.cafe_detail(p_cafe_id uuid)
returns jsonb
language sql
stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'cafe', jsonb_build_object(
      'id', c.id,
      'google_place_id', c.google_place_id,
      'name', c.name,
      'suburb', c.suburb,
      'lat', st_y(c.location::geometry),
      'lng', st_x(c.location::geometry)
    ),
    'scores', (
      select jsonb_object_agg(m.metric::text,
               jsonb_build_object('score', s.score, 'count', coalesce(s.rating_count, 0)))
      from unnest(enum_range(null::public.metric)) as m (metric)
      left join public.cafe_scores s on s.cafe_id = c.id and s.metric = m.metric
    ),
    'drinks', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'drink_id', d.id,
                 'name', d.name,
                 'score', ds.score,
                 'rating_count', ds.rating_count,
                 'median_price', ds.median_price,
                 'price_reports', ds.price_reports)
               order by ds.rank_score desc nulls last, ds.rating_count desc, d.name)
      from public.cafe_drink_scores ds
      join public.drinks d on d.id = ds.drink_id
      where ds.cafe_id = c.id and d.counts_toward_coffee
    ), '[]'::jsonb),
    'beans', coalesce((
      select jsonb_agg(jsonb_build_object('beans', b.beans, 'count', b.report_count)
                       order by b.report_count desc, b.beans)
      from (
        select beans, report_count from public.cafe_top_beans
        where cafe_id = c.id order by report_count desc, beans limit 5
      ) b
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(
               jsonb_build_object('tag_id', tc.tag_id, 'metric', tc.metric, 'label', tc.label,
                                  'count', tc.tag_count)
               order by tc.metric, tc.tag_count desc, tc.sort_order)
      from public.cafe_tag_counts tc
      where tc.cafe_id = c.id
    ), '[]'::jsonb),
    'saved', exists (
      select 1 from public.saved_cafes sc
      where sc.cafe_id = c.id and sc.user_id = (select auth.uid())
    )
  )
  from public.cafes c
  where c.id = p_cafe_id;
$$;
