begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into public.cafes (id, google_place_id, name, location, place_id_checked_at) values
  ('17000000-0000-4000-8000-000000000001', 'g_old', 'Old Place',
   st_setsrid(st_makepoint(144.9, -37.8), 4326)::geography, now() - interval '400 days');

select public.mark_place_id_checked('17000000-0000-4000-8000-000000000001', 'g_renewed');
select is(
  (select google_place_id from public.cafes where id = '17000000-0000-4000-8000-000000000001'),
  'g_renewed', 'mark_place_id_checked stores the new Place ID');
select ok(
  (select place_id_checked_at > now() - interval '1 minute' from public.cafes
   where id = '17000000-0000-4000-8000-000000000001'),
  'mark_place_id_checked resets place_id_checked_at');
select is(
  (select name from public.cafes where id = '17000000-0000-4000-8000-000000000001'),
  'Old Place', 'the cafe is otherwise untouched');

select ok(exists (select 1 from cron.job where jobname = 'refresh-cafes'), 'the daily refresh job is scheduled');

set local role authenticated;
select throws_ok($$ select public.mark_place_id_checked(gen_random_uuid(), 'x') $$, '42501', null,
  'signed-in users cannot call mark_place_id_checked');
reset role;
set local role anon;
select throws_ok($$ select public.mark_place_id_checked(gen_random_uuid(), 'x') $$, '42501', null,
  'anon cannot call mark_place_id_checked');

select * from finish();
rollback;
