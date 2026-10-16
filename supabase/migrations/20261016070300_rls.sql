-- Row-level security on every table. Reviews are written only through submit_review.

alter table public.profiles enable row level security;
alter table public.cafes enable row level security;
alter table public.drinks enable row level security;
alter table public.reviews enable row level security;
alter table public.review_drinks enable row level security;
alter table public.review_ratings enable row level security;
alter table public.review_tags enable row level security;
alter table public.review_photos enable row level security;
alter table public.saved_cafes enable row level security;
alter table public.review_reports enable row level security;
alter table public.user_blocks enable row level security;

-- Anonymous users get nothing. Supabase grants anon access to new tables by default.
revoke all on all tables in schema public from anon;

-- Defence in depth: write access on server-managed tables is removed, not only policy-blocked.
revoke insert, update, delete, truncate on
  public.cafes, public.drinks, public.reviews, public.review_drinks,
  public.review_ratings, public.review_tags, public.review_photos, public.profiles
from authenticated;
grant delete on public.reviews to authenticated;
grant update (display_name, avatar_url, accepted_terms_at) on public.profiles to authenticated;
revoke select on public.review_reports from authenticated;

create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy cafes_select on public.cafes
  for select to authenticated using (true);
create policy drinks_select on public.drinks
  for select to authenticated using (true);

create policy reviews_select on public.reviews
  for select to authenticated
  using (
    hidden_at is null
    and not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = reviews.user_id
    )
  );
create policy reviews_delete_own on public.reviews
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Child tables are visible exactly when their parent review is (the reviews policy applies inside).
create policy review_drinks_select on public.review_drinks
  for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id));
create policy review_ratings_select on public.review_ratings
  for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id));
create policy review_tags_select on public.review_tags
  for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id));
create policy review_photos_select on public.review_photos
  for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id));

create policy saved_cafes_own on public.saved_cafes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy user_blocks_own on public.user_blocks
  for all to authenticated
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()));

create policy review_reports_insert_own on public.review_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()));
