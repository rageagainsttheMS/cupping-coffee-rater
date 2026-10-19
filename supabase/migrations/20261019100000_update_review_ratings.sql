-- Follow-up on the "Posted" screen: add or change Food, Vibe or Work on your own review.
-- Own review only, and only within 24 hours of posting (the same window as the daily limit).
-- Tags are added, never removed. The comment, drinks, beans and photo are not editable here.

create function public.update_review_ratings(
  p_review_id uuid,
  p_food numeric default null,
  p_vibe numeric default null,
  p_work numeric default null,
  p_tags jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_review public.reviews;
  v_metrics public.metric[] := '{}';
  v_tag_ids smallint[];
  v_before jsonb;
  v_after jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_review
  from public.reviews
  where id = p_review_id and user_id = v_uid and hidden_at is null;
  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;
  if v_review.created_at <= now() - interval '24 hours' then
    raise exception 'edit_window_closed' using errcode = 'P0001';
  end if;

  if p_food is not null then v_metrics := v_metrics || 'food'::public.metric; end if;
  if p_vibe is not null then v_metrics := v_metrics || 'vibe'::public.metric; end if;
  if p_work is not null then v_metrics := v_metrics || 'work'::public.metric; end if;
  if cardinality(v_metrics) = 0 then
    raise exception 'invalid_ratings' using errcode = '22023';
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
  -- Every tag must exist, be active, and belong to a metric this review rates once updated.
  if exists (
    select 1
    from unnest(v_tag_ids) as u (id)
    left join public.tags t on t.id = u.id and t.active
    where t.id is null
       or not (
         t.metric = 'coffee'
         or t.metric = any (v_metrics)
         or exists (
           select 1 from public.review_ratings rr
           where rr.review_id = p_review_id and rr.metric = t.metric and rr.rating is not null
         )
       )
  ) then
    raise exception 'invalid_tags' using errcode = '22023';
  end if;

  select coalesce(jsonb_object_agg(m, jsonb_build_object('score', s.score, 'count', coalesce(s.rating_count, 0))), '{}')
    into v_before
    from unnest(v_metrics) as m
    left join public.cafe_scores s on s.cafe_id = v_review.cafe_id and s.metric = m;

  insert into public.review_ratings (review_id, metric, rating)
  select p_review_id, m.metric, m.rating
  from (values ('food'::public.metric, p_food), ('vibe', p_vibe), ('work', p_work)) as m (metric, rating)
  where m.rating is not null
  on conflict (review_id, metric) do update set rating = excluded.rating;

  insert into public.review_tags (review_id, tag_id)
  select p_review_id, u.id from unnest(v_tag_ids) as u (id)
  on conflict do nothing;

  select coalesce(jsonb_object_agg(m, jsonb_build_object('score', s.score, 'count', coalesce(s.rating_count, 0))), '{}')
    into v_after
    from unnest(v_metrics) as m
    left join public.cafe_scores s on s.cafe_id = v_review.cafe_id and s.metric = m;

  return jsonb_build_object('review_id', p_review_id, 'before', v_before, 'after', v_after);
end;
$$;

revoke execute on function
  public.update_review_ratings(uuid, numeric, numeric, numeric, jsonb)
from public, anon;
grant execute on function
  public.update_review_ratings(uuid, numeric, numeric, numeric, jsonb)
to authenticated;
