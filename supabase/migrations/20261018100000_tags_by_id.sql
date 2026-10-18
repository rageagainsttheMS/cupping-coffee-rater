-- Tags become reference data referenced by id, so labels can change without losing history.
-- Drinks get an active flag for the same reason: retire a drink without touching old reviews.

alter table public.drinks add column active boolean not null default true;

create table public.tags (
  id smallint primary key generated always as identity,
  metric public.metric not null,
  label text not null,
  sort_order smallint not null,
  active boolean not null default true,
  unique (metric, label)
);

insert into public.tags (metric, label, sort_order) values
  ('coffee', 'Strong', 1),
  ('coffee', 'Smooth', 2),
  ('coffee', 'Bitter', 3),
  ('coffee', 'Too hot', 4),
  ('coffee', 'Great milk', 5),
  ('food', 'Brunch', 1),
  ('food', 'Pastries', 2),
  ('food', 'Vegan options', 3),
  ('food', 'Good value', 4),
  ('vibe', 'Quiet', 1),
  ('vibe', 'Lively', 2),
  ('vibe', 'Cozy', 3),
  ('vibe', 'Bright', 4),
  ('vibe', 'Friendly staff', 5),
  ('vibe', 'Slow service', 6),
  ('work', 'Wifi', 1),
  ('work', 'Power outlets', 2),
  ('work', 'Laptop-friendly', 3),
  ('work', 'No laptops at lunch', 4),
  ('work', 'Big tables', 5);

-- Convert review_tags from label text to tag ids. Labels that match no tag are dropped.
alter table public.review_tags add column tag_id smallint references public.tags (id);
update public.review_tags rt
  set tag_id = t.id
  from public.tags t
  where t.metric = rt.metric and t.label = rt.tag;
delete from public.review_tags where tag_id is null;
alter table public.review_tags
  drop constraint review_tags_pkey,
  drop column metric,
  drop column tag,
  alter column tag_id set not null,
  add primary key (review_id, tag_id);
create index review_tags_tag_idx on public.review_tags (tag_id);

-- Same access as drinks: signed-in read only, writes through the service role.
alter table public.tags enable row level security;
revoke all on public.tags from anon;
revoke insert, update, delete, truncate on public.tags from authenticated;
create policy tags_select on public.tags
  for select to authenticated using (true);

-- submit_review: p_tags is now a JSON array of tag ids, and drinks and tags must be active.
create or replace function public.submit_review(
  p_review_id uuid,
  p_cafe_id uuid,
  p_drinks jsonb,
  p_food numeric default null,
  p_vibe numeric default null,
  p_work numeric default null,
  p_tags jsonb default '[]'::jsonb,
  p_comment text default null,
  p_beans text default null,
  p_photo_path text default null,
  p_photo_width integer default null,
  p_photo_height integer default null,
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

  if p_photo_path is not null and p_photo_path not like v_uid::text || '/%' then
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

  if p_photo_path is not null then
    insert into public.review_photos (review_id, storage_path, width, height)
    values (p_review_id, p_photo_path, p_photo_width, p_photo_height);
  end if;

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
