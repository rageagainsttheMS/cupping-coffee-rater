-- cafes_in_view joined the cafe_scores view five times, so the full score aggregate ran five times
-- per map query. Read it once into a CTE instead. Same columns, same results.

create or replace function public.cafes_in_view(
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
           coalesce(sum(s.rating_count) filter (where s.metric = 'coffee'), 0) as coffee_count,
           max(s.score) filter (where s.metric = 'food') as food_score,
           coalesce(sum(s.rating_count) filter (where s.metric = 'food'), 0) as food_count,
           max(s.score) filter (where s.metric = 'vibe') as vibe_score,
           coalesce(sum(s.rating_count) filter (where s.metric = 'vibe'), 0) as vibe_count,
           max(s.score) filter (where s.metric = 'work') as work_score,
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
    order by ds.score desc, ds.rating_count desc
    limit 1
  ) bd on true
  order by coalesce(sc.coffee_count, 0) + coalesce(sc.food_count, 0)
         + coalesce(sc.vibe_count, 0) + coalesce(sc.work_count, 0) desc,
           b.name
  limit 500;
$$;
