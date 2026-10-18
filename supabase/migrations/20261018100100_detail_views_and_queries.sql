-- Cafe page, search, nearby and saved queries, plus the beans and tag-count views they read.

-- Most reported beans per cafe. Hidden reviews are excluded; case and spacing are ignored.
create view public.cafe_top_beans as
  select r.cafe_id,
         mode() within group (order by trim(r.beans)) as beans,
         count(*) as report_count
  from public.reviews r
  where r.hidden_at is null and nullif(trim(r.beans), '') is not null
  group by r.cafe_id, lower(trim(r.beans));

-- Quick tag counts per cafe and metric. Counts follow the tag id, so a rename keeps its count
-- under the new label and a retired tag still counts.
create view public.cafe_tag_counts as
  select r.cafe_id, t.metric, t.id as tag_id, t.label, t.sort_order, count(*) as tag_count
  from public.review_tags rt
  join public.reviews r on r.id = rt.review_id and r.hidden_at is null
  join public.tags t on t.id = rt.tag_id
  group by r.cafe_id, t.metric, t.id, t.label, t.sort_order;

revoke all on public.cafe_top_beans, public.cafe_tag_counts from anon, authenticated;
grant select on public.cafe_top_beans, public.cafe_tag_counts to authenticated;

-- Nearest cafes to a point, for wizard step 1.
create function public.nearby_cafes(
  p_lat double precision,
  p_lng double precision,
  p_limit integer default 5
)
returns table (
  id uuid,
  google_place_id text,
  name text,
  suburb text,
  lat double precision,
  lng double precision,
  distance_m double precision
)
language sql
stable
set search_path = public, extensions
as $$
  with here as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g)
  select c.id, c.google_place_id, c.name, c.suburb,
         st_y(c.location::geometry), st_x(c.location::geometry),
         st_distance(c.location, here.g)
  from public.cafes c
  cross join here
  order by c.location <-> here.g
  limit least(greatest(p_limit, 1), 50);
$$;

-- Name or suburb search over stored cafes. Nearest first when a position is given, else by name.
create function public.search_cafes(
  p_q text,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (
  id uuid,
  google_place_id text,
  name text,
  suburb text,
  lat double precision,
  lng double precision,
  distance_m double precision
)
language sql
stable
set search_path = public, extensions
as $$
  with q as (
    select '%' || replace(replace(replace(trim(p_q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern,
           case when p_lat is not null and p_lng is not null
                then st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography end as here
  )
  select c.id, c.google_place_id, c.name, c.suburb,
         st_y(c.location::geometry), st_x(c.location::geometry),
         st_distance(c.location, q.here)
  from public.cafes c
  cross join q
  where length(trim(p_q)) > 0
    and (c.name ilike q.pattern or c.suburb ilike q.pattern)
  order by c.location <-> q.here nulls last, c.name
  limit 20;
$$;

-- Everything the cafe page needs in one object.
create function public.cafe_detail(p_cafe_id uuid)
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
               order by ds.score desc nulls last, ds.rating_count desc, d.name)
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

-- Paged reviews, newest first. Row-level security hides blocked users and hidden reviews.
-- Keyset paging: pass the created_at and review_id of the last row of the previous page.
create function public.cafe_reviews(
  p_cafe_id uuid,
  p_metric public.metric default null,
  p_drink_id integer default null,
  p_sort text default 'recent',
  p_page_size integer default 20,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  review_id uuid,
  user_id uuid,
  author_name text,
  visit_date date,
  created_at timestamptz,
  comment text,
  beans text,
  verified boolean,
  drinks jsonb,
  ratings jsonb,
  tags jsonb,
  photo_path text,
  photo_width integer,
  photo_height integer
)
language plpgsql
stable
set search_path = public, extensions
as $$
#variable_conflict use_column
begin
  if p_sort is distinct from 'recent' then
    raise exception 'invalid_sort' using errcode = '22023';
  end if;

  return query
  select r.id, r.user_id, p.display_name, r.visit_date, r.created_at, r.comment, r.beans, r.verified,
         coalesce((
           select jsonb_agg(
                    jsonb_build_object('drink_id', d.id, 'name', d.name, 'rating', rd.rating,
                                       'milk', rd.milk, 'price_aud', rd.price_aud)
                    order by rd.rating desc, d.name)
           from public.review_drinks rd
           join public.drinks d on d.id = rd.drink_id
           where rd.review_id = r.id
         ), '[]'::jsonb),
         coalesce((
           select jsonb_object_agg(rr.metric::text, rr.rating)
           from public.review_ratings rr
           where rr.review_id = r.id and rr.rating is not null
         ), '{}'::jsonb),
         coalesce((
           select jsonb_agg(
                    jsonb_build_object('tag_id', t.id, 'metric', t.metric, 'label', t.label)
                    order by t.metric, t.sort_order)
           from public.review_tags rt
           join public.tags t on t.id = rt.tag_id
           where rt.review_id = r.id
         ), '[]'::jsonb),
         ph.storage_path, ph.width, ph.height
  from public.reviews r
  join public.profiles p on p.id = r.user_id
  left join public.review_photos ph on ph.review_id = r.id
  where r.cafe_id = p_cafe_id
    and (
      p_metric is null
      or (p_metric = 'coffee' and exists (
            select 1 from public.review_drinks rd
            join public.drinks d on d.id = rd.drink_id
            where rd.review_id = r.id and d.counts_toward_coffee))
      or (p_metric <> 'coffee' and exists (
            select 1 from public.review_ratings rr
            where rr.review_id = r.id and rr.metric = p_metric and rr.rating is not null))
    )
    and (
      p_drink_id is null
      or exists (select 1 from public.review_drinks rd
                 where rd.review_id = r.id and rd.drink_id = p_drink_id)
    )
    and (p_before_created_at is null or (r.created_at, r.id) < (p_before_created_at, p_before_id))
  order by r.created_at desc, r.id desc
  limit least(greatest(p_page_size, 1), 50);
end;
$$;

-- The caller's saved cafes with four scores and their own latest drink rating there.
create function public.my_saved_cafes()
returns table (
  id uuid,
  google_place_id text,
  name text,
  suburb text,
  lat double precision,
  lng double precision,
  saved_at timestamptz,
  coffee_score numeric,
  coffee_count bigint,
  food_score numeric,
  food_count bigint,
  vibe_score numeric,
  vibe_count bigint,
  work_score numeric,
  work_count bigint,
  last_drink_name text,
  last_rating numeric
)
language sql
stable
set search_path = public, extensions
as $$
  select c.id, c.google_place_id, c.name, c.suburb,
         st_y(c.location::geometry), st_x(c.location::geometry),
         sc.saved_at,
         cf.score, coalesce(cf.rating_count, 0),
         fd.score, coalesce(fd.rating_count, 0),
         vb.score, coalesce(vb.rating_count, 0),
         wk.score, coalesce(wk.rating_count, 0),
         lr.name, lr.rating
  from public.saved_cafes sc
  join public.cafes c on c.id = sc.cafe_id
  left join public.cafe_scores cf on cf.cafe_id = c.id and cf.metric = 'coffee'
  left join public.cafe_scores fd on fd.cafe_id = c.id and fd.metric = 'food'
  left join public.cafe_scores vb on vb.cafe_id = c.id and vb.metric = 'vibe'
  left join public.cafe_scores wk on wk.cafe_id = c.id and wk.metric = 'work'
  left join lateral (
    select d.name, rd.rating::numeric as rating
    from public.reviews r
    join public.review_drinks rd on rd.review_id = r.id
    join public.drinks d on d.id = rd.drink_id
    where r.user_id = (select auth.uid()) and r.cafe_id = c.id
    order by r.visit_date desc, r.created_at desc, rd.rating desc
    limit 1
  ) lr on true
  where sc.user_id = (select auth.uid())
  order by sc.saved_at desc;
$$;

revoke execute on function
  public.nearby_cafes(double precision, double precision, integer),
  public.search_cafes(text, double precision, double precision),
  public.cafe_detail(uuid),
  public.cafe_reviews(uuid, public.metric, integer, text, integer, timestamptz, uuid),
  public.my_saved_cafes()
from public, anon;
grant execute on function
  public.nearby_cafes(double precision, double precision, integer),
  public.search_cafes(text, double precision, double precision),
  public.cafe_detail(uuid),
  public.cafe_reviews(uuid, public.metric, integer, text, integer, timestamptz, uuid),
  public.my_saved_cafes()
to authenticated;
