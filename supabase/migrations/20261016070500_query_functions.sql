-- Map query: cafes inside a bounding box with scores for every metric.

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
  select c.id,
         c.google_place_id,
         c.name,
         c.suburb,
         st_y(c.location::geometry),
         st_x(c.location::geometry),
         sel.score,
         coalesce(sel.rating_count, 0),
         cf.score, coalesce(cf.rating_count, 0),
         fd.score, coalesce(fd.rating_count, 0),
         vb.score, coalesce(vb.rating_count, 0),
         wk.score, coalesce(wk.rating_count, 0),
         bd.name,
         bd.score,
         coalesce(cf.rating_count, 0) + coalesce(fd.rating_count, 0)
           + coalesce(vb.rating_count, 0) + coalesce(wk.rating_count, 0) > 0
  from public.cafes c
  left join public.cafe_scores sel on sel.cafe_id = c.id and sel.metric = p_metric
  left join public.cafe_scores cf on cf.cafe_id = c.id and cf.metric = 'coffee'
  left join public.cafe_scores fd on fd.cafe_id = c.id and fd.metric = 'food'
  left join public.cafe_scores vb on vb.cafe_id = c.id and vb.metric = 'vibe'
  left join public.cafe_scores wk on wk.cafe_id = c.id and wk.metric = 'work'
  left join lateral (
    select d.name, ds.score
    from public.cafe_drink_scores ds
    join public.drinks d on d.id = ds.drink_id
    where ds.cafe_id = c.id and ds.score is not null and d.counts_toward_coffee
    order by ds.score desc, ds.rating_count desc
    limit 1
  ) bd on true
  where c.location && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
  order by coalesce(cf.rating_count, 0) + coalesce(fd.rating_count, 0)
         + coalesce(vb.rating_count, 0) + coalesce(wk.rating_count, 0) desc,
           c.name
  limit 500;
$$;

revoke execute on function public.cafes_in_view(
  double precision, double precision, double precision, double precision, public.metric
) from public, anon;
grant execute on function public.cafes_in_view(
  double precision, double precision, double precision, double precision, public.metric
) to authenticated;
