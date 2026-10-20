-- Editing a review (M8.4). Ratings, tags and the comment can change; the cafe, visit date, drinks, milk,
-- price, beans and photo cannot. There is no time limit. `edited_at` marks a review that was changed.

alter table public.reviews add column edited_at timestamptz;

-- cafe_reviews and my_reviews gain edited_at (and my_reviews the tags), which changes their return
-- types, so they are dropped and created again.
drop function public.cafe_reviews(uuid, public.metric, integer, text, integer, timestamptz, uuid);
drop function public.my_reviews();

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
  edited_at timestamptz,
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

-- The caller's own reviews with the cafe, drinks, ratings, tags and photo, for My reviews and for
-- loading a review into the edit flow. Runs as the caller, so hidden reviews are not returned.
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
  photo_path text,
  photo_width integer,
  photo_height integer
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
         ph.storage_path, ph.width, ph.height
  from public.reviews r
  join public.cafes c on c.id = r.cafe_id
  left join public.review_photos ph on ph.review_id = r.id
  where r.user_id = (select auth.uid())
  order by r.created_at desc, r.id desc;
$$;

-- Replaces a review's ratings, tags and comment with what the person now has. Own review only, not
-- hidden, no time limit. Drinks must be exactly the ones already on the review (only their ratings
-- change). Food, Vibe and Work are the full new state: null means "didn't try" and removes the
-- rating and that metric's tags. Returns the cafe's scores before and after.
create function public.update_review(
  p_review_id uuid,
  p_drinks jsonb,
  p_food numeric default null,
  p_vibe numeric default null,
  p_work numeric default null,
  p_tags jsonb default '[]'::jsonb,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_review public.reviews;
  v_metrics public.metric[] := array['coffee']::public.metric[];
  v_tag_ids smallint[];
  v_before jsonb;
  v_after jsonb;
  v_all constant public.metric[] := array['coffee', 'food', 'vibe', 'work']::public.metric[];
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_review
  from public.reviews
  where id = p_review_id and user_id = v_uid and hidden_at is null
  for update;
  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;

  if p_comment is null or char_length(trim(p_comment)) not between 10 and 280 then
    raise exception 'invalid_comment' using errcode = '22023';
  end if;

  -- The drinks must match the review's drinks one for one.
  if p_drinks is null or jsonb_typeof(p_drinks) <> 'array' then
    raise exception 'invalid_drinks' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_drinks) e
    where jsonb_typeof(e -> 'drink_id') <> 'number' or jsonb_typeof(e -> 'rating') <> 'number'
  ) then
    raise exception 'invalid_drinks' using errcode = '22023';
  end if;
  if (select count(distinct (e ->> 'drink_id')::int) from jsonb_array_elements(p_drinks) e)
       <> jsonb_array_length(p_drinks)
     or jsonb_array_length(p_drinks) <>
        (select count(*) from public.review_drinks where review_id = p_review_id)
     or exists (
       select 1 from jsonb_array_elements(p_drinks) e
       where not exists (
         select 1 from public.review_drinks rd
         where rd.review_id = p_review_id and rd.drink_id = (e ->> 'drink_id')::int)
     ) then
    raise exception 'invalid_drinks' using errcode = '22023';
  end if;

  if p_food is not null then v_metrics := v_metrics || 'food'::public.metric; end if;
  if p_vibe is not null then v_metrics := v_metrics || 'vibe'::public.metric; end if;
  if p_work is not null then v_metrics := v_metrics || 'work'::public.metric; end if;

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
  -- Every tag must exist, be active, and belong to a metric the review rates after this edit.
  if exists (
    select 1
    from unnest(v_tag_ids) as u (id)
    left join public.tags t on t.id = u.id and t.active
    where t.id is null or not (t.metric = any (v_metrics))
  ) then
    raise exception 'invalid_tags' using errcode = '22023';
  end if;

  select coalesce(jsonb_object_agg(m, jsonb_build_object('score', s.score, 'count', coalesce(s.rating_count, 0))), '{}')
    into v_before
    from unnest(v_all) as m
    left join public.cafe_scores s on s.cafe_id = v_review.cafe_id and s.metric = m;

  update public.review_drinks rd
    set rating = (e ->> 'rating')::numeric
    from jsonb_array_elements(p_drinks) e
    where rd.review_id = p_review_id and rd.drink_id = (e ->> 'drink_id')::int;

  delete from public.review_ratings where review_id = p_review_id;
  insert into public.review_ratings (review_id, metric, rating)
  select p_review_id, m.metric, m.rating
  from (values ('food'::public.metric, p_food), ('vibe', p_vibe), ('work', p_work)) as m (metric, rating)
  where m.rating is not null;

  delete from public.review_tags where review_id = p_review_id;
  insert into public.review_tags (review_id, tag_id)
  select p_review_id, u.id from unnest(v_tag_ids) as u (id);

  update public.reviews
    set comment = trim(p_comment), edited_at = now()
    where id = p_review_id;

  select coalesce(jsonb_object_agg(m, jsonb_build_object('score', s.score, 'count', coalesce(s.rating_count, 0))), '{}')
    into v_after
    from unnest(v_all) as m
    left join public.cafe_scores s on s.cafe_id = v_review.cafe_id and s.metric = m;

  return jsonb_build_object('review_id', p_review_id, 'before', v_before, 'after', v_after);
end;
$$;

revoke execute on function
  public.cafe_reviews(uuid, public.metric, integer, text, integer, timestamptz, uuid),
  public.my_reviews(),
  public.update_review(uuid, jsonb, numeric, numeric, numeric, jsonb, text)
from public, anon;
grant execute on function
  public.cafe_reviews(uuid, public.metric, integer, text, integer, timestamptz, uuid),
  public.my_reviews(),
  public.update_review(uuid, jsonb, numeric, numeric, numeric, jsonb, text)
to authenticated;
