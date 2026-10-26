-- Up to three photos per review. The first is the cover.
-- review_photos gets a position and an optional thumbnail, submit_review takes a list of photos, and
-- cafe_reviews and my_reviews return a photos list per review (a join would repeat the review's row).

create function public.max_review_photos()
returns integer
language sql
immutable
as $$ select 3; $$;

revoke execute on function public.max_review_photos() from public, anon;
grant execute on function public.max_review_photos() to authenticated;

-- Existing photos become position 0. thumb_path is null for them, and the app shows the full image.
alter table public.review_photos
  add column position smallint not null default 0 check (position between 0 and 2),
  add column thumb_path text;
alter table public.review_photos
  drop constraint review_photos_pkey,
  add primary key (review_id, position);

drop function public.submit_review(
  uuid, uuid, jsonb, numeric, numeric, numeric, jsonb, text, text, text, integer, integer,
  double precision, double precision
);
drop function public.cafe_reviews(uuid, public.metric, integer, text, integer, timestamptz, uuid);
drop function public.my_reviews();

create function public.submit_review(
  p_review_id uuid,
  p_cafe_id uuid,
  p_drinks jsonb,
  p_food numeric default null,
  p_vibe numeric default null,
  p_work numeric default null,
  p_tags jsonb default '[]'::jsonb,
  p_comment text default null,
  p_beans text default null,
  p_photos jsonb default '[]'::jsonb,
  p_lat double precision default null,
  p_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_cafe public.cafes;
  v_verified boolean := false;
  v_metrics public.metric[] := '{}';
  v_tag_ids smallint[];
  v_before jsonb;
  v_after jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if (select count(*) from public.reviews
      where user_id = v_uid and created_at > now() - interval '24 hours') >= public.review_rate_limit()
  then
    raise exception 'rate_limit_exceeded' using errcode = 'P0001';
  end if;

  if p_drinks is null or jsonb_typeof(p_drinks) <> 'array' or jsonb_array_length(p_drinks) = 0 then
    raise exception 'invalid_drinks' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_drinks) as x (drink_id smallint)
    left join public.drinks d on d.id = x.drink_id and d.active
    where d.id is null
  ) then
    raise exception 'invalid_drinks' using errcode = '22023';
  end if;

  if p_tags is null or jsonb_typeof(p_tags) <> 'array' then
    raise exception 'invalid_tags' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_tags) e
    where jsonb_typeof(e) <> 'number'
       or (e #>> '{}')::numeric <> trunc((e #>> '{}')::numeric)
  ) then
    raise exception 'invalid_tags' using errcode = '22023';
  end if;
  v_tag_ids := array(select distinct (e #>> '{}')::smallint from jsonb_array_elements(p_tags) e);
  -- Every tag must exist, be active, and belong to a metric this review rates.
  if exists (
    select 1
    from unnest(v_tag_ids) as u (id)
    left join public.tags t on t.id = u.id and t.active
    where t.id is null
       or not (
         t.metric = 'coffee'
         or (t.metric = 'food' and p_food is not null)
         or (t.metric = 'vibe' and p_vibe is not null)
         or (t.metric = 'work' and p_work is not null)
       )
  ) then
    raise exception 'invalid_tags' using errcode = '22023';
  end if;

  if p_photos is null or jsonb_typeof(p_photos) <> 'array' or jsonb_array_length(p_photos) > public.max_review_photos() then
    raise exception 'invalid_photos' using errcode = '22023';
  end if;
  -- Every photo, and its thumbnail, must sit in the caller's own folder.
  if exists (
    select 1 from jsonb_array_elements(p_photos) e
    where jsonb_typeof(e) <> 'object'
       or jsonb_typeof(e -> 'path') <> 'string'
       or (e ->> 'path') not like v_uid::text || '/%'
       or (e ? 'thumb_path' and jsonb_typeof(e -> 'thumb_path') <> 'null'
           and (jsonb_typeof(e -> 'thumb_path') <> 'string'
                or (e ->> 'thumb_path') not like v_uid::text || '/%'))
  ) then
    raise exception 'invalid_photo_path' using errcode = '22023';
  end if;
  if (p_lat is null) <> (p_lng is null)
     or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'invalid_location' using errcode = '22023';
  end if;

  select * into v_cafe from public.cafes where id = p_cafe_id;
  if not found then
    raise exception 'cafe_not_found' using errcode = 'P0002';
  end if;

  if p_lat is not null then
    v_verified := st_dwithin(
      v_cafe.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      public.verified_radius_m()
    );
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_drinks) as x (drink_id smallint)
    join public.drinks d on d.id = x.drink_id
    where d.counts_toward_coffee
  ) then
    v_metrics := v_metrics || 'coffee'::public.metric;
  end if;
  if p_food is not null then v_metrics := v_metrics || 'food'::public.metric; end if;
  if p_vibe is not null then v_metrics := v_metrics || 'vibe'::public.metric; end if;
  if p_work is not null then v_metrics := v_metrics || 'work'::public.metric; end if;

  select coalesce(jsonb_object_agg(m, jsonb_build_object('score', s.score, 'count', coalesce(s.rating_count, 0))), '{}')
    into v_before
    from unnest(v_metrics) as m
    left join public.cafe_scores s on s.cafe_id = p_cafe_id and s.metric = m;

  insert into public.reviews (id, user_id, cafe_id, comment, beans, verified)
  values (p_review_id, v_uid, p_cafe_id, p_comment, nullif(trim(p_beans), ''), v_verified);

  insert into public.review_drinks (review_id, drink_id, rating, milk, price_aud)
  select p_review_id, x.drink_id, x.rating, x.milk, x.price_aud
  from jsonb_to_recordset(p_drinks)
    as x (drink_id smallint, rating numeric, milk public.milk_type, price_aud numeric);

  insert into public.review_ratings (review_id, metric, rating)
  select p_review_id, m.metric, m.rating
  from (values ('food'::public.metric, p_food), ('vibe', p_vibe), ('work', p_work)) as m (metric, rating)
  where m.rating is not null;

  insert into public.review_tags (review_id, tag_id)
  select p_review_id, u.id from unnest(v_tag_ids) as u (id);

  insert into public.review_photos (review_id, position, storage_path, thumb_path, width, height)
  select p_review_id, (t.n - 1)::smallint, t.e ->> 'path', t.e ->> 'thumb_path',
         (t.e ->> 'width')::integer, (t.e ->> 'height')::integer
  from jsonb_array_elements(p_photos) with ordinality as t (e, n);

  select coalesce(jsonb_object_agg(m, jsonb_build_object('score', s.score, 'count', coalesce(s.rating_count, 0))), '{}')
    into v_after
    from unnest(v_metrics) as m
    left join public.cafe_scores s on s.cafe_id = p_cafe_id and s.metric = m;

  return jsonb_build_object(
    'review_id', p_review_id,
    'verified', v_verified,
    'before', v_before,
    'after', v_after
  );
end;
$$;

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
  edited_at timestamptz,
  comment text,
  beans text,
  verified boolean,
  drinks jsonb,
  ratings jsonb,
  tags jsonb,
  photos jsonb
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
  select r.id, r.user_id, p.display_name, r.visit_date, r.created_at, r.edited_at, r.comment, r.beans,
         r.verified,
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
         coalesce((
           select jsonb_agg(
                    jsonb_build_object('path', ph.storage_path, 'thumb_path', ph.thumb_path,
                                       'width', ph.width, 'height', ph.height)
                    order by ph.position)
           from public.review_photos ph
           where ph.review_id = r.id
         ), '[]'::jsonb)
  from public.reviews r
  join public.profiles p on p.id = r.user_id
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

create function public.my_reviews()
returns table (
  review_id uuid,
  cafe_id uuid,
  cafe_name text,
  suburb text,
  visit_date date,
  created_at timestamptz,
  edited_at timestamptz,
  comment text,
  beans text,
  verified boolean,
  drinks jsonb,
  ratings jsonb,
  tags jsonb,
  photos jsonb
)
language sql
stable
set search_path = public, extensions
as $$
  select r.id, c.id, c.name, c.suburb, r.visit_date, r.created_at, r.edited_at, r.comment, r.beans,
         r.verified,
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
         coalesce((
           select jsonb_agg(
                    jsonb_build_object('path', ph.storage_path, 'thumb_path', ph.thumb_path,
                                       'width', ph.width, 'height', ph.height)
                    order by ph.position)
           from public.review_photos ph
           where ph.review_id = r.id
         ), '[]'::jsonb)
  from public.reviews r
  join public.cafes c on c.id = r.cafe_id
  where r.user_id = (select auth.uid())
  order by r.created_at desc, r.id desc;
$$;

revoke execute on function
  public.submit_review(
    uuid, uuid, jsonb, numeric, numeric, numeric, jsonb, text, text, jsonb,
    double precision, double precision),
  public.cafe_reviews(uuid, public.metric, integer, text, integer, timestamptz, uuid),
  public.my_reviews()
from public, anon;
grant execute on function
  public.submit_review(
    uuid, uuid, jsonb, numeric, numeric, numeric, jsonb, text, text, jsonb,
    double precision, double precision),
  public.cafe_reviews(uuid, public.metric, integer, text, integer, timestamptz, uuid),
  public.my_reviews()
to authenticated;
