begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- The privileges each role needs, stated by 20261021120000_explicit_grants.sql. Local Supabase hands out
-- more than this by default, so this test checks the ones the app depends on and the ones it must not have.

select ok(has_table_privilege('authenticated', 'public.' || t, 'select'), 'authenticated can read ' || t)
from unnest(array[
  'profiles', 'cafes', 'drinks', 'tags', 'reviews', 'review_drinks', 'review_ratings', 'review_tags',
  'review_photos', 'saved_cafes', 'user_blocks', 'cafe_scores', 'cafe_drink_scores', 'city_averages',
  'cafe_top_beans', 'cafe_tag_counts'
]) as t;

select ok(has_table_privilege('authenticated', 'public.saved_cafes', 'insert,update,delete'),
  'authenticated can change its saved cafes');
select ok(has_table_privilege('authenticated', 'public.review_reports', 'insert'),
  'authenticated can file a report');
select ok(not has_table_privilege('authenticated', 'public.review_reports', 'select'),
  'authenticated cannot read reports');
select ok(not has_table_privilege('authenticated', 'public.reviews', 'insert'),
  'authenticated cannot insert reviews directly');
select ok(not has_table_privilege('anon', 'public.profiles', 'select'), 'anon cannot read profiles');
select ok(has_table_privilege('service_role', 'public.cafes', 'insert,update,delete'),
  'service_role can write cafes');

select * from finish();
rollback;
