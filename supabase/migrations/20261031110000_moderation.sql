-- In-app moderation: a moderator role, a report queue, hide and restore, ban and unban, and a log.
--
-- A moderator is a user whose `app_metadata.role` is 'moderator'. Only the service role can set it
-- (see markdown/moderation.md). Every function here checks the role on the server; the app hiding a
-- screen is never the only protection. Bans go through the `moderate-user` Edge Function, because the
-- auth ban needs the admin API, and it calls apply_ban and lift_ban below with the service role.

create type public.moderation_action as enum ('dismiss', 'hide', 'restore', 'ban', 'unban');

-- Who did what, to which review or person, and why. `review_ids` holds the reviews a ban hid, so
-- unbanning restores exactly those and not a review hidden on its own before. clock_timestamp(), not
-- now(), so actions taken in one transaction still have an order.
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references public.profiles (id) on delete set null,
  action public.moderation_action not null,
  review_id uuid references public.reviews (id) on delete set null,
  target_user_id uuid references public.profiles (id) on delete set null,
  note text check (char_length(note) <= 500),
  review_ids uuid[] not null default '{}',
  created_at timestamptz not null default clock_timestamp()
);
create index moderation_actions_target on public.moderation_actions (target_user_id, created_at desc);

-- True while the person's auth ban is in force. Internal: only the functions below call it.
create function public.user_is_banned(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = p_user_id and u.banned_until is not null and u.banned_until > now()
  );
$$;

-- Reads auth.users, not the JWT, so removing the role or banning a moderator takes effect at once.
create function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and u.raw_app_meta_data ->> 'role' = 'moderator'
      and (u.banned_until is null or u.banned_until <= now())
  );
$$;

create function public.require_moderator()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- A banned person's access token keeps working for up to an hour after the ban, until it expires.
-- This closes that window for posting, editing and reporting. The service role has no auth.uid(), so
-- moderation itself is unaffected.
create function public.reject_banned_writer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.user_is_banned((select auth.uid())) then
    raise exception 'account_banned' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger reviews_reject_banned
  before insert or update on public.reviews
  for each row execute function public.reject_banned_writer();
create trigger review_reports_reject_banned
  before insert on public.review_reports
  for each row execute function public.reject_banned_writer();

-- How many reviews have open reports and are still visible, for the Profile row.
create function public.moderation_open_count()
returns integer
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  perform public.require_moderator();
  return (
    select count(distinct rr.review_id)::int
    from public.review_reports rr
    join public.reviews r on r.id = rr.review_id
    where rr.resolved_at is null and r.hidden_at is null
  );
end;
$$;

-- The queue. 'open': visible reviews with open reports, oldest report first, so the 24-hour target
-- shows. 'hidden': hidden reviews, most recently hidden first, so they can be restored. Up to 100
-- rows; at beta volumes that is every row, so there is no paging.
create function public.moderation_queue(p_status text default 'open')
returns table (
  review_id uuid,
  cafe_id uuid,
  cafe_name text,
  suburb text,
  user_id uuid,
  author_name text,
  created_at timestamptz,
  hidden_at timestamptz,
  comment text,
  drinks jsonb,
  ratings jsonb,
  photos jsonb,
  report_count integer,
  reasons text[],
  oldest_report_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
begin
  perform public.require_moderator();
  if p_status is null or p_status not in ('open', 'hidden') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  return query
  select r.id, c.id, c.name, c.suburb, r.user_id, p.display_name, r.created_at, r.hidden_at,
         r.comment,
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
                    jsonb_build_object('path', ph.storage_path, 'thumb_path', ph.thumb_path,
                                       'width', ph.width, 'height', ph.height)
                    order by ph.position)
           from public.review_photos ph
           where ph.review_id = r.id
         ), '[]'::jsonb),
         rep.n, rep.reasons, rep.oldest
  from public.reviews r
  join public.cafes c on c.id = r.cafe_id
  join public.profiles p on p.id = r.user_id
  cross join lateral (
    select count(*)::int as n,
           coalesce(array_agg(distinct x.reason::text), '{}') as reasons,
           min(x.created_at) as oldest
    from public.review_reports x
    where x.review_id = r.id and (p_status = 'hidden' or x.resolved_at is null)
  ) rep
  where (p_status = 'open' and r.hidden_at is null and rep.n > 0)
     or (p_status = 'hidden' and r.hidden_at is not null)
  order by case when p_status = 'open' then rep.oldest end asc,
           case when p_status = 'hidden' then r.hidden_at end desc,
           r.id
  limit 100;
end;
$$;

-- People whose ban is in force, most recently banned first. `banned_at` and `note` come from the
-- latest ban in the log, and are null for a ban made in Supabase Studio.
create function public.moderation_banned_users()
returns table (
  user_id uuid,
  display_name text,
  banned_at timestamptz,
  note text,
  hidden_count integer
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
begin
  perform public.require_moderator();

  return query
  select p.id, p.display_name, b.created_at, b.note,
         (select count(*)::int from public.reviews r where r.user_id = p.id and r.hidden_at is not null)
  from auth.users u
  join public.profiles p on p.id = u.id
  left join lateral (
    select a.created_at, a.note
    from public.moderation_actions a
    where a.target_user_id = u.id and a.action = 'ban'
    order by a.created_at desc
    limit 1
  ) b on true
  where u.banned_until is not null and u.banned_until > now()
  order by b.created_at desc nulls last, p.display_name
  limit 100;
end;
$$;

-- One review for the Report screen: the review (hidden or not), every report on it without the
-- reporter, and the author. Reporters stay anonymous to moderators.
create function public.moderation_review(p_review_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_review public.reviews;
begin
  perform public.require_moderator();

  select * into v_review from public.reviews where id = p_review_id;
  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'review', (
      select jsonb_build_object(
        'review_id', v_review.id,
        'cafe_id', c.id,
        'cafe_name', c.name,
        'suburb', c.suburb,
        'visit_date', v_review.visit_date,
        'created_at', v_review.created_at,
        'edited_at', v_review.edited_at,
        'hidden_at', v_review.hidden_at,
        'comment', v_review.comment,
        'beans', v_review.beans,
        'verified', v_review.verified,
        'drinks', coalesce((
          select jsonb_agg(
                   jsonb_build_object('drink_id', d.id, 'name', d.name, 'rating', rd.rating,
                                      'milk', rd.milk, 'price_aud', rd.price_aud)
                   order by rd.rating desc, d.name)
          from public.review_drinks rd
          join public.drinks d on d.id = rd.drink_id
          where rd.review_id = v_review.id
        ), '[]'::jsonb),
        'ratings', coalesce((
          select jsonb_object_agg(rr.metric::text, rr.rating)
          from public.review_ratings rr
          where rr.review_id = v_review.id and rr.rating is not null
        ), '{}'::jsonb),
        'tags', coalesce((
          select jsonb_agg(
                   jsonb_build_object('tag_id', t.id, 'metric', t.metric, 'label', t.label)
                   order by t.metric, t.sort_order)
          from public.review_tags rt
          join public.tags t on t.id = rt.tag_id
          where rt.review_id = v_review.id
        ), '[]'::jsonb),
        'photos', coalesce((
          select jsonb_agg(
                   jsonb_build_object('path', ph.storage_path, 'thumb_path', ph.thumb_path,
                                      'width', ph.width, 'height', ph.height)
                   order by ph.position)
          from public.review_photos ph
          where ph.review_id = v_review.id
        ), '[]'::jsonb)
      )
      from public.cafes c where c.id = v_review.cafe_id
    ),
    'reports', coalesce((
      select jsonb_agg(
               jsonb_build_object('reason', x.reason, 'details', x.details,
                                  'created_at', x.created_at, 'resolved_at', x.resolved_at)
               order by x.created_at)
      from public.review_reports x
      where x.review_id = v_review.id
    ), '[]'::jsonb),
    'author', (
      select jsonb_build_object(
        'user_id', p.id,
        'display_name', p.display_name,
        'joined_at', p.created_at,
        'review_count', (select count(*) from public.reviews r where r.user_id = p.id),
        'hidden_count', (select count(*) from public.reviews r
                         where r.user_id = p.id and r.hidden_at is not null),
        'banned', public.user_is_banned(p.id)
      )
      from public.profiles p where p.id = v_review.user_id
    )
  );
end;
$$;

-- Dismiss (the review is fine: close its reports), hide (hide it and close its reports) or restore
-- (show it again). Each writes one row to the log.
create function public.moderate_review(
  p_review_id uuid,
  p_action public.moderation_action,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_review public.reviews;
begin
  perform public.require_moderator();
  if p_action is null or p_action not in ('dismiss', 'hide', 'restore') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;

  select * into v_review from public.reviews where id = p_review_id for update;
  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;

  if p_action = 'hide' then
    update public.reviews set hidden_at = now() where id = p_review_id and hidden_at is null;
  elsif p_action = 'restore' then
    update public.reviews set hidden_at = null where id = p_review_id;
  end if;

  if p_action in ('dismiss', 'hide') then
    update public.review_reports set resolved_at = now()
    where review_id = p_review_id and resolved_at is null;
  end if;

  insert into public.moderation_actions (moderator_id, action, review_id, target_user_id, note)
  values (auth.uid(), p_action, p_review_id, v_review.user_id, nullif(trim(p_note), ''));
end;
$$;

-- Called by the moderate-user Edge Function after it sets the auth ban. Hides every visible review
-- by the person, closes the reports on them, and logs the ban with the reviews it hid. Returns how
-- many it hid. Safe to call again: a second call hides nothing new.
create function public.apply_ban(p_user_id uuid, p_moderator_id uuid, p_note text default null)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ids uuid[];
begin
  with hidden as (
    update public.reviews set hidden_at = now()
    where user_id = p_user_id and hidden_at is null
    returning id
  )
  select coalesce(array_agg(id), '{}') into v_ids from hidden;

  update public.review_reports set resolved_at = now()
  where resolved_at is null
    and review_id in (select id from public.reviews where user_id = p_user_id);

  insert into public.moderation_actions (moderator_id, action, target_user_id, note, review_ids)
  values (p_moderator_id, 'ban', p_user_id, nullif(trim(p_note), ''), v_ids);

  return cardinality(v_ids);
end;
$$;

-- Called by the moderate-user Edge Function after it lifts the auth ban. Restores the reviews hidden
-- by every ban since the last unban, so a retried ban loses nothing, and leaves reviews hidden on
-- their own alone. Returns how many it restored.
create function public.lift_ban(p_user_id uuid, p_moderator_id uuid, p_note text default null)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ids uuid[];
begin
  select coalesce(array_agg(distinct rid), '{}') into v_ids
  from public.moderation_actions a
  cross join unnest(a.review_ids) as rid
  where a.target_user_id = p_user_id
    and a.action = 'ban'
    and a.created_at > coalesce((
      select max(u.created_at) from public.moderation_actions u
      where u.target_user_id = p_user_id and u.action = 'unban'
    ), '-infinity');

  update public.reviews set hidden_at = null
  where id = any (v_ids) and user_id = p_user_id;

  insert into public.moderation_actions (moderator_id, action, target_user_id, note, review_ids)
  values (p_moderator_id, 'unban', p_user_id, nullif(trim(p_note), ''), v_ids);

  return cardinality(v_ids);
end;
$$;

-- Access ------------------------------------------------------------------------------------------

alter table public.moderation_actions enable row level security;
revoke all on public.moderation_actions from anon, authenticated;
grant select on public.moderation_actions to authenticated;
grant all on public.moderation_actions to service_role;
create policy moderation_actions_select on public.moderation_actions
  for select to authenticated using ((select public.is_moderator()));

revoke execute on function
  public.user_is_banned(uuid),
  public.require_moderator(),
  public.reject_banned_writer(),
  public.apply_ban(uuid, uuid, text),
  public.lift_ban(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function
  public.apply_ban(uuid, uuid, text),
  public.lift_ban(uuid, uuid, text)
to service_role;

revoke execute on function
  public.is_moderator(),
  public.moderation_open_count(),
  public.moderation_queue(text),
  public.moderation_banned_users(),
  public.moderation_review(uuid),
  public.moderate_review(uuid, public.moderation_action, text)
from public, anon;
grant execute on function
  public.is_moderator(),
  public.moderation_open_count(),
  public.moderation_queue(text),
  public.moderation_banned_users(),
  public.moderation_review(uuid),
  public.moderate_review(uuid, public.moderation_action, text)
to authenticated;
