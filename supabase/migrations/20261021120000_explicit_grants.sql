-- Explicit table privileges for the Data API roles.
--
-- Local Supabase gives `anon`, `authenticated` and `service_role` every privilege on each new table in
-- `public`, and the RLS migration then trims what it doesn't want. A hosted project does not always
-- do that, so there the tables had no SELECT for `authenticated` and the app could not read its own
-- profile ("permission denied for table profiles"). This migration states what each role gets, so
-- local and hosted end up the same. Run it on a database that already has the defaults and it only
-- adds what is missing. Every new table or view needs its own grant from now on.

-- Signed-in people read the shared tables. Row-level security still decides which rows.
grant select on
  public.profiles,
  public.cafes,
  public.drinks,
  public.tags,
  public.reviews,
  public.review_drinks,
  public.review_ratings,
  public.review_tags,
  public.review_photos,
  public.saved_cafes,
  public.user_blocks,
  public.cafe_scores,
  public.cafe_drink_scores,
  public.city_averages,
  public.cafe_top_beans,
  public.cafe_tag_counts
to authenticated;

-- Tables people change directly. The policies limit this to their own rows.
grant insert, update, delete on public.saved_cafes, public.user_blocks to authenticated;
grant insert on public.review_reports to authenticated;

-- Already granted in earlier migrations, repeated so this file is the full list:
grant delete on public.reviews to authenticated;
grant update (display_name, avatar_url, accepted_terms_at) on public.profiles to authenticated;

-- Edge Functions and server-side code use the service role, which skips RLS but still needs privileges.
grant all on all tables in schema public to service_role;

-- Nothing for `anon`: signed-out people get no access (see the RLS migration).
