-- Invented data for local development: Fitzroy, Carlton and the CBD.
-- All users, cafes and reviews are fake. Deterministic: the random seed is fixed.

select setseed(0.42);

-- 10 users
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
       'seed' || g || '@example.test',
       jsonb_build_object('display_name', (array[
         'Ada', 'Ben', 'Chloe', 'Dev', 'Eliza', 'Finn', 'Grace', 'Hugo', 'Isla', 'Jack'])[g])
from generate_series(1, 10) g;

-- 40 cafes: 10 name prefixes x 4 nouns, spread over three suburbs.
insert into public.cafes (id, google_place_id, name, suburb, location)
select ('10000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
       'seed_place_' || g,
       (array['Little', 'Corner', 'Brick', 'Golden', 'Quiet', 'Rusty', 'Paper', 'Lucky', 'Tin', 'Velvet'])[(g - 1) % 10 + 1]
         || ' ' || (array['Bean', 'Cup', 'Roaster', 'Lane'])[(g - 1) / 10 + 1],
       s.suburb,
       st_setsrid(st_makepoint(s.lng + (random() - 0.5) * 0.012, s.lat + (random() - 0.5) * 0.008), 4326)::geography
from generate_series(1, 40) g
cross join lateral (
  select * from (values
    (1, 'Fitzroy', 144.9786, -37.7980),
    (2, 'Carlton', 144.9665, -37.8005),
    (0, 'Melbourne', 144.9631, -37.8136)
  ) as t (n, suburb, lng, lat)
  where t.n = g % 3
) s;

-- About 300 attempted reviews over 18 months; the unique constraint drops same-day duplicates.
insert into public.reviews (user_id, cafe_id, visit_date, comment, beans, verified, created_at)
select ('00000000-0000-4000-8000-' || lpad((1 + floor(random() * 10))::int::text, 12, '0'))::uuid,
       ('10000000-0000-4000-8000-' || lpad((1 + floor(random() * 40))::int::text, 12, '0'))::uuid,
       d.day,
       (array[
         'Rich and balanced, would order again.',
         'A bit bitter for my taste but friendly service.',
         'Silky milk and a lovely crema on top.',
         'Good coffee, slow queue on the weekend.',
         'Solid everyday cup, nothing fancy.',
         'Best one I have had in the neighbourhood.'])[1 + floor(random() * 6)::int],
       (array[null, null, 'Seven Seeds', 'Market Lane', 'Axil', 'St Ali', 'Padre'])[1 + floor(random() * 7)::int],
       random() < 0.3,
       d.day + time '09:00'
from (select g, current_date - floor(random() * 540)::int as day from generate_series(1, 300) g) d
on conflict (user_id, cafe_id, visit_date) do nothing;

-- One or two drinks per review, mostly coffee, occasionally chai, matcha or hot chocolate.
insert into public.review_drinks (review_id, drink_id, rating, milk, price_aud)
select r.id,
       case when random() < 0.08 then 19 + floor(random() * 3)::int else 1 + floor(random() * 18)::int end,
       least(5, greatest(1, round((3.9 + (random() + random() + random() - 1.5)) * 2) / 2)),
       case when random() < 0.7 then (enum_range(null::public.milk_type))[1 + floor(random() * 6)::int] end,
       round((4 + random() * 2.5)::numeric, 1)
from public.reviews r
cross join lateral generate_series(1, 1 + (random() < 0.3 and r.id is not null)::int) n;

-- Food, vibe and work ratings, with some "did not try" (null) rows.
insert into public.review_ratings (review_id, metric, rating)
select r.id, m.metric,
       case when random() < 0.2 then null
            else least(5, greatest(1, round((3.8 + (random() + random() + random() - 1.5)) * 2) / 2)) end
from public.reviews r
cross join (values ('food'::public.metric), ('vibe'), ('work')) as m (metric)
where random() < 0.6;

-- Quick tags.
insert into public.review_tags (review_id, metric, tag)
select r.id, t.metric, t.tag
from public.reviews r
cross join (values
  ('coffee'::public.metric, 'Smooth'), ('coffee', 'Strong'), ('coffee', 'Great milk'),
  ('food', 'Pastries'), ('food', 'Brunch'),
  ('vibe', 'Cozy'), ('vibe', 'Lively'), ('vibe', 'Friendly staff'),
  ('work', 'Wifi'), ('work', 'Power outlets')
) as t (metric, tag)
where random() < 0.12
on conflict do nothing;

-- A few hidden reviews, and one block (Ada has blocked Ben).
update public.reviews set hidden_at = now()
where id in (select id from public.reviews order by id limit 5);

insert into public.user_blocks (blocker_id, blocked_id) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');

-- Each user saves a few cafes.
insert into public.saved_cafes (user_id, cafe_id)
select ('00000000-0000-4000-8000-' || lpad(u::text, 12, '0'))::uuid,
       ('10000000-0000-4000-8000-' || lpad(c::text, 12, '0'))::uuid
from generate_series(1, 10) u
cross join generate_series(1, 40) c
where random() < 0.08
on conflict do nothing;
