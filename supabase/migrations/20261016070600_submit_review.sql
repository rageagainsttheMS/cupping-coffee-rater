-- submit_review: the only way to create a review.

create function public.verified_radius_m()
returns double precision
language sql
immutable
as $$ select 100::double precision; $$;

create function public.review_rate_limit()
returns integer
language sql
immutable
as $$ select 10; $$;

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
  if p_tags is null or jsonb_typeof(p_tags) <> 'array' then
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

  insert into public.review_tags (review_id, metric, tag)
  select p_review_id, x.metric, x.tag
  from jsonb_to_recordset(p_tags) as x (metric public.metric, tag text)
  on conflict do nothing;

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

revoke execute on function public.submit_review(
  uuid, uuid, jsonb, numeric, numeric, numeric, jsonb, text, text, text, integer, integer,
  double precision, double precision
) from public, anon;
grant execute on function public.submit_review(
  uuid, uuid, jsonb, numeric, numeric, numeric, jsonb, text, text, text, integer, integer,
  double precision, double precision
) to authenticated;

revoke execute on function public.verified_radius_m(), public.review_rate_limit() from public, anon;
grant execute on function public.verified_radius_m(), public.review_rate_limit() to authenticated;
