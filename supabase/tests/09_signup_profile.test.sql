begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;

select plan(8);

create function pg_temp.uid(n int) returns uuid language sql as
  $$ select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;

-- Email sign-up: the app sends the display name and the terms agreement as user metadata.
insert into auth.users (id, email, raw_user_meta_data) values
  (pg_temp.uid(1), 'a@example.test', '{"display_name": "Ada", "accepted_terms": true}'),
  (pg_temp.uid(2), 'b@example.test', '{"display_name": "Ben"}'),
  (pg_temp.uid(3), 'c@example.test', '{"display_name": "Chloe", "accepted_terms": "false"}'),
  -- Social sign-in: Google sends the person's name as full_name, and nothing about terms.
  (pg_temp.uid(4), 'd@example.test', '{"full_name": "Grace Hopper", "name": "Ignored"}'),
  (pg_temp.uid(5), 'e@example.test', '{"name": "Only Name"}'),
  (pg_temp.uid(6), 'f@example.test', '{}'),
  (pg_temp.uid(7), 'g@example.test', jsonb_build_object('display_name', repeat('x', 80)));

select isnt((select accepted_terms_at from public.profiles where id = pg_temp.uid(1)), null,
  'agreeing to the terms at sign-up records the time');
select is((select accepted_terms_at from public.profiles where id = pg_temp.uid(2)), null,
  'no agreement recorded when none was sent');
select is((select accepted_terms_at from public.profiles where id = pg_temp.uid(3)), null,
  'a false agreement is not recorded');
select is((select display_name from public.profiles where id = pg_temp.uid(4)), 'Grace Hopper',
  'a social user''s display name comes from full_name');
select is((select display_name from public.profiles where id = pg_temp.uid(5)), 'Only Name',
  'then from name');
select is((select display_name from public.profiles where id = pg_temp.uid(6)), 'Coffee lover',
  'and falls back to the default');
select is((select display_name from public.profiles where id = pg_temp.uid(1)), 'Ada',
  'an explicit display_name still wins');
select is((select char_length(display_name) from public.profiles where id = pg_temp.uid(7)), 40,
  'display names are cut to 40 characters');

select * from finish();
rollback;
