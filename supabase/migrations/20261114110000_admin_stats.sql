-- Read-only numbers and lists for the admin page (docs-site/admin.html): total users and reviews,
-- every review, and every user with when they signed up.
--
-- Moderators can see them (see markdown/moderation.md for granting the role). Each function checks
-- the role on the server with require_moderator(), so the page being public does not matter: anyone
-- else gets a 42501 error and no data. Hidden reviews are included, flagged by hidden_at, because the
-- admin view is the full record, not what the app shows.

-- The stat tiles. "Last 7 days" counts from now, not from the start of a day.
create function public.admin_overview()
returns table (
  total_users integer,
  new_users_7d integer,
  total_reviews integer,
  reviews_7d integer,
  hidden_reviews integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_moderator();
  return query
  select
    (select count(*)::int from public.profiles),
    (select count(*)::int from public.profiles p where p.created_at > now() - interval '7 days'),
    (select count(*)::int from public.reviews),
    (select count(*)::int from public.reviews r where r.created_at > now() - interval '7 days'),
    (select count(*)::int from public.reviews r where r.hidden_at is not null);
end;
$$;

-- Every review, newest first. `coffee` is the average of the review's drink ratings, rounded to one
-- decimal place; null if the review has no drinks.
create function public.admin_reviews()
returns table (
  review_id uuid,
  created_at timestamptz,
  visit_date date,
  cafe_name text,
  suburb text,
  user_id uuid,
  display_name text,
  coffee numeric,
  comment text,
  verified boolean,
  hidden_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_moderator();
  return query
  select r.id, r.created_at, r.visit_date, c.name, c.suburb, r.user_id, p.display_name,
         (select round(avg(d.rating)::numeric, 1) from public.review_drinks d where d.review_id = r.id),
         r.comment, r.verified, r.hidden_at
  from public.reviews r
  join public.cafes c on c.id = r.cafe_id
  join public.profiles p on p.id = r.user_id
  order by r.created_at desc, r.id;
end;
$$;

-- Every user, newest sign-up first, with how many reviews they have posted and when they last did.
create function public.admin_users()
returns table (
  user_id uuid,
  display_name text,
  signed_up_at timestamptz,
  review_count integer,
  last_review_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_moderator();
  return query
  select p.id, p.display_name, p.created_at, count(r.id)::int, max(r.created_at)
  from public.profiles p
  left join public.reviews r on r.user_id = p.id
  group by p.id
  order by p.created_at desc, p.id;
end;
$$;

revoke execute on function
  public.admin_overview(),
  public.admin_reviews(),
  public.admin_users()
from public, anon;
grant execute on function
  public.admin_overview(),
  public.admin_reviews(),
  public.admin_users()
to authenticated;
