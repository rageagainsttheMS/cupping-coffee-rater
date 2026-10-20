begin;
create extension if not exists pgtap with schema extensions;

-- Tests run against a database that also holds seed data; start from empty (rolled back at the end).
delete from auth.users;
delete from public.cafes;

select plan(3);

insert into auth.users (id, email)
values ('00000000-0000-4000-8000-000000000001', 'u1@example.test');
insert into public.cafes (id, google_place_id, name, location)
values ('10000000-0000-4000-8000-000000000001', 'place_1', 'Cafe 1',
        st_setsrid(st_makepoint(144.9780, -37.8000), 4326)::geography);
insert into public.reviews (id, user_id, cafe_id, comment)
values ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001', 'A review with drinks in it.');

select lives_ok(
  $$ insert into public.review_drinks (review_id, drink_id, rating) values
       ('20000000-0000-4000-8000-000000000001', 9, 4),
       ('20000000-0000-4000-8000-000000000001', 10, 3.5) $$,
  'drinks: a review can have two different drinks');
select throws_ok(
  $$ insert into public.review_drinks (review_id, drink_id, rating)
     values ('20000000-0000-4000-8000-000000000001', 9, 2) $$,
  '23505', null, 'drinks: the same drink cannot be added to a review twice');
select is(
  (select count(*)::int from public.review_drinks
   where review_id = '20000000-0000-4000-8000-000000000001'),
  2, 'drinks: the review still has just its two drinks');

select * from finish();
rollback;
